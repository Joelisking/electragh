import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';
import { z } from 'zod';
import { loginSchema, phoneSchema, createAdminSchema } from '../utils/validation';
import { authRateLimiter } from '../middleware/rateLimiter';
import {
  ValidationError,
  AuthenticationError,
} from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { verifyOtpSms, sendOtpSms } from '../services/smsService';

const router = express.Router();

// Logout (clear cookies)
/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Logout admin user
 *     description: Clear the admin's authentication cookies
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logout successful"
 */
router.post('/logout', (req, res) => {
  const cookieOptions: any = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  };

  res.clearCookie('admin-token', cookieOptions);
  res.clearCookie('admin-refresh-token', cookieOptions);

  res.json({ message: 'Logout successful' });
});

// Admin/EC login
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: User login
 *     description: Authenticate user with email/phone and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               phone:
 *                 type: string
 *                 description: User's phone number
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: User's password
 *             oneOf:
 *               - required: [email, password]
 *               - required: [phone, password]
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                       nullable: true
 *                     phone:
 *                       type: string
 *                       nullable: true
 *                     role:
 *                       type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication failed
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const { phone, password } = loginSchema.parse(req.body);

    // Find user by phone
    const user = await prisma.user.findFirst({
      where: { phone },
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      password,
      user.passwordHash
    );
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: req.ip,
      },
    });

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    logger.info(
      `User ${user.phone} logged in successfully`
    );

    // Set HTTP-Only cookies for tokens
    const cookieOptions: any = {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === 'production', // HTTPS in production, allow HTTP in development
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in production
      path: '/', // Ensure cookie is sent for all paths
    };

    res.cookie('admin-token', accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000, // 1 hour (matches JWT expiry)
    });

    res.cookie('admin-refresh-token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
});

// Send OTP (Auth namespace, provider-driven, no DB dependency)
router.post('/send-otp', async (req, res, next) => {
  try {
    const bodySchema = z.object({
      phone: phoneSchema,
      fullName: z.string().min(2).max(100).default('User'),
    });
    const { phone, fullName } = bodySchema.parse(req.body);

    // Use provider-driven OTP; the code in message will be replaced with %otp_code% by Arkesel
    const result = await sendOtpSms(phone, '000000', fullName);

    if (!result.success) {
      throw new ValidationError(result.error || 'Failed to send OTP');
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
});

// Verify OTP (Auth namespace) - Only for admin OTP login, not voters
// Note: Voters use /api/voting/verify-otp instead
router.post('/verify-otp', async (req, res, next) => {
  try {
    const bodySchema = z
      .object({
        phone: phoneSchema,
        // Accept either `otp` (from test script) or `code` (elsewhere)
        otp: z
          .string()
          .length(6)
          .regex(/^\d{6}$/)
          .optional(),
        code: z
          .string()
          .length(6)
          .regex(/^\d{6}$/)
          .optional(),
      })
      .refine((d) => !!d.otp || !!d.code, {
        message: 'OTP code is required',
        path: ['otp'],
      });

    const parsed = bodySchema.parse(req.body);
    const code = parsed.otp || parsed.code!;

    const isVerified = await verifyOtpSms(parsed.phone, code);

    if (!isVerified) {
      throw new ValidationError('Invalid or expired OTP code');
    }

    // This endpoint is ONLY for admin users authenticating via OTP
    // Voters should use /api/voting/verify-otp
    const user = await prisma.user.findFirst({
      where: { phone: parsed.phone },
    });

    if (!user) {
      throw new AuthenticationError('No admin account found with this phone number');
    }

    // Generate JWT tokens for admin
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: req.ip,
      },
    });

    logger.info(`Admin user ${user.phone} logged in via OTP`);

    // Set HTTP-Only cookies for admin tokens
    const cookieOptions: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    };

    res.cookie('admin-token', accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.cookie('admin-refresh-token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: 'OTP verified successfully',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Refresh access token
 *     description: Get a new access token using a valid refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                       nullable: true
 *                     phone:
 *                       type: string
 *                       nullable: true
 *                     role:
 *                       type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token required');
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    ) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    res.json({
      accessToken,
      user,
    });
  } catch (error) {
    next(error);
  }
});

// Site manager route to register admins
/**
 * @openapi
 * /api/auth/register-admin:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new admin (Site Manager only)
 *     description: Create a new admin user account (requires SITE_MANAGER_KEY)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - password
 *               - siteManagerKey
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               phone:
 *                 type: string
 *                 description: Admin's phone number
 *               password:
 *                 type: string
 *                 minLength: 8
 *               role:
 *                 type: string
 *                 enum: [ADMIN, EC_MEMBER, ADVISORY_COUNCIL]
 *                 default: ADMIN
 *               siteManagerKey:
 *                 type: string
 *                 description: Site manager authentication key
 *     responses:
 *       201:
 *         description: Admin created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 admin:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Validation error or phone already exists
 *       401:
 *         description: Invalid site manager key
 */
router.post('/register-admin', authRateLimiter, async (req, res, next) => {
  try {
    const { siteManagerKey, ...adminData } = req.body;

    // Verify site manager key
    if (!process.env.SITE_MANAGER_KEY || siteManagerKey !== process.env.SITE_MANAGER_KEY) {
      throw new AuthenticationError('Invalid site manager key');
    }

    const { name, phone, password, role } = createAdminSchema.parse(adminData);

    // Check if phone already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      throw new ValidationError('Phone number already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name,
        phone,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    logger.info(`New admin created: ${admin.phone} (${admin.role})`);

    res.status(201).json({
      message: 'Admin created successfully',
      admin,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
