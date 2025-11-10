import express from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../server';
import {
  authenticateAdmin,
  requireRole,
  AuthenticatedRequest,
} from '../middleware/auth';
import { createUserSchema } from '../utils/validation';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

// Get dashboard statistics (all authenticated users)
/**
 * @openapi
 * /api/admin/dashboard:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get admin dashboard statistics
 *     description: Retrieve comprehensive statistics and metrics for the admin dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     totalVoters:
 *                       type: number
 *                       description: Total number of registered voters
 *                     totalElections:
 *                       type: number
 *                       description: Total number of elections
 *                     activeElections:
 *                       type: number
 *                       description: Number of currently active elections
 *                     totalBallots:
 *                       type: number
 *                       description: Total number of ballots cast
 *                     turnoutRate:
 *                       type: number
 *                       description: Voter turnout percentage
 *                 voterStatusBreakdown:
 *                   type: object
 *                   additionalProperties:
 *                     type: number
 *                   description: Breakdown of voters by status
 *                 smsStats:
 *                   type: object
 *                   additionalProperties:
 *                     type: number
 *                   description: SMS message statistics by status
 *                 recentActivity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       action:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       user:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           role:
 *                             type: string
 *                       voter:
 *                         type: object
 *                         properties:
 *                           fullName:
 *                             type: string
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get(
  '/dashboard',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const [
        totalVoters,
        totalElections,
        activeElections,
        totalBallots,
        recentActivity,
      ] = await Promise.all([
        prisma.voter.count(),
        prisma.election.count(),
        prisma.election.count({ where: { status: 'ACTIVE' } }),
        prisma.ballot.count(),
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { timestamp: 'desc' },
          include: {
            user: {
              select: {
                name: true,
                role: true,
              },
            },
            voter: {
              select: {
                fullName: true,
              },
            },
          },
        }),
      ]);

      // Get voter status breakdown
      const voterStatusBreakdown = await prisma.voter.groupBy({
        by: ['status'],
        _count: { status: true },
      });

      // Get SMS statistics
      const smsStats = await prisma.smsMessage.groupBy({
        by: ['status'],
        _count: { status: true },
      });

      res.json({
        statistics: {
          totalVoters,
          totalElections,
          activeElections,
          totalBallots,
          turnoutRate:
            totalVoters > 0
              ? Math.round((totalBallots / totalVoters) * 10000) / 100
              : 0,
        },
        voterStatusBreakdown: voterStatusBreakdown.reduce(
          (
            acc: Record<string, number>,
            item: { status: string; _count: { status: number } }
          ) => {
            acc[item.status] = item._count.status;
            return acc;
          },
          {} as Record<string, number>
        ),
        smsStats: smsStats.reduce(
          (
            acc: Record<string, number>,
            item: { status: string; _count: { status: number } }
          ) => {
            acc[item.status] = item._count.status;
            return acc;
          },
          {} as Record<string, number>
        ),
        recentActivity: recentActivity.map((log: any) => ({
          id: log.id,
          action: log.action,
          resource: log.resource,
          timestamp: log.timestamp,
          user: log.user?.name || 'System',
          userRole: log.user?.role,
          voter: log.voter?.fullName,
          metadata: log.metadata,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all users (Admin only)
router.get(
  '/users',
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          lastLoginAt: true,
          lastLoginIp: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(users);
    } catch (error) {
      next(error);
    }
  }
);

// Create user (Admin only)
router.post(
  '/users',
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userData = createUserSchema.parse(req.body);

      // Check for duplicate phone
      const existingUser = await prisma.user.findFirst({
        where: {
          phone: userData.phone,
        },
      });

      if (existingUser) {
        throw new ConflictError(
          'A user with this phone already exists'
        );
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);

      const user = await prisma.user.create({
        data: {
          name: userData.name,
          phone: userData.phone,
          role: userData.role,
          passwordHash,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });

      logger.info(
        `User created: ${user.id} (${user.phone}) by ${
          req.user!.id
        }`
      );

      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }
);

// Update user (Admin only)
router.put(
  '/users/:id',
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { name, email, phone, role, password } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { id: req.params.id },
      });

      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Check for duplicate email or phone (excluding current user)
      if (email || phone) {
        const duplicateUser = await prisma.user.findFirst({
          where: {
            AND: [
              { id: { not: req.params.id } },
              {
                OR: [
                  email ? { email } : {},
                  phone ? { phone } : {},
                ].filter(
                  (condition) => Object.keys(condition).length > 0
                ),
              },
            ],
          },
        });

        if (duplicateUser) {
          throw new ConflictError(
            'A user with this email or phone already exists'
          );
        }
      }

      const updateData: any = {};

      if (name) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (role) updateData.role = role;

      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 12);
      }

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          updatedAt: true,
        },
      });

      logger.info(`User updated: ${user.id} by ${req.user!.id}`);

      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

// Delete user (Admin only)
router.delete(
  '/users/:id',
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Prevent self-deletion
      if (req.params.id === req.user!.id) {
        throw new ValidationError('Cannot delete your own account');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      await prisma.user.delete({
        where: { id: req.params.id },
      });

      logger.info(
        `User deleted: ${req.params.id} by ${req.user!.id}`
      );

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Get audit logs (Admin and EC only)
router.get(
  '/audit-logs',
  requireRole('ADMIN', 'EC_MEMBER'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        page = '1',
        limit = '50',
        action,
        resource,
        userId,
        startDate,
        endDate,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const where: any = {};

      if (action)
        where.action = {
          contains: action as string,
          mode: 'insensitive',
        };
      if (resource) where.resource = resource;
      if (userId) where.userId = userId;

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate)
          where.timestamp.gte = new Date(startDate as string);
        if (endDate)
          where.timestamp.lte = new Date(endDate as string);
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                name: true,
                phone: true,
                role: true,
              },
            },
            voter: {
              select: {
                fullName: true,
                phone: true,
              },
            },
            election: {
              select: {
                title: true,
              },
            },
          },
          skip: offset,
          take: limitNum,
          orderBy: { timestamp: 'desc' },
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get system health status (Admin only)
router.get(
  '/system/health',
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Check database connectivity
      const dbHealth = await prisma.$queryRaw`SELECT 1 as status`;

      // Get system statistics
      const [totalUsers, totalVoters, totalElections, recentErrors] =
        await Promise.all([
          prisma.user.count(),
          prisma.voter.count(),
          prisma.election.count(),
          prisma.auditLog.count({
            where: {
              timestamp: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
              metadata: {
                path: ['responseStatus'],
                equals: 'error',
              },
            },
          }),
        ]);

      // Check SMS service health
      const recentSmsFailures = await prisma.smsMessage.count({
        where: {
          status: 'FAILED',
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
      });

      const smsHealthy = recentSmsFailures < 10; // Less than 10 failures in the last hour

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: dbHealth ? 'healthy' : 'unhealthy',
            responseTime: 'N/A',
          },
          sms: {
            status: smsHealthy ? 'healthy' : 'degraded',
            recentFailures: recentSmsFailures,
          },
        },
        statistics: {
          totalUsers,
          totalVoters,
          totalElections,
          recentErrors,
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Clear old audit logs (Admin only)
router.delete(
  '/audit-logs/cleanup',
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { days = '90' } = req.query;
      const daysNum = parseInt(days as string);

      if (daysNum < 30) {
        throw new ValidationError(
          'Cannot delete audit logs newer than 30 days'
        );
      }

      const cutoffDate = new Date(
        Date.now() - daysNum * 24 * 60 * 60 * 1000
      );

      const result = await prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(
        `Audit log cleanup: ${
          result.count
        } logs deleted (older than ${daysNum} days) by ${
          req.user!.id
        }`
      );

      res.json({
        message: 'Audit logs cleaned up successfully',
        deletedCount: result.count,
        cutoffDate: cutoffDate.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
