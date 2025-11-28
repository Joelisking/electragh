import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';
import {
  requestOtpSchema,
  verifyOtpSchema,
  castVoteSchema,
} from '../utils/validation';
import {
  otpRateLimiter,
  votingRateLimiter,
} from '../middleware/rateLimiter';
import {
  authenticateVoter,
  AuthenticatedRequest,
} from '../middleware/auth';
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '../middleware/errorHandler';
import {
  sendOtpSms,
  sendVoteConfirmationSms,
  verifyOtpSms,
} from '../services/smsService';
import { logger } from '../utils/logger';

const router = express.Router();

// Logout voter (clear cookie)
/**
 * @openapi
 * /api/voting/logout:
 *   post:
 *     tags:
 *       - Voting
 *     summary: Logout voter
 *     description: Clear the voter's authentication cookie
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

  res.clearCookie('voting-token', cookieOptions);

  res.json({ message: 'Logout successful' });
});

// Request OTP for voter authentication
/**
 * @openapi
 * /api/voting/request-otp:
 *   post:
 *     tags:
 *       - Voting
 *     summary: Request OTP for voting
 *     description: Request a one-time password to authenticate a voter for voting
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Voter's phone number
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OTP sent successfully"
 *                 phone:
 *                   type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: Voter not found
 *       409:
 *         description: Voter has already voted
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/request-otp',
  otpRateLimiter,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { phone } = requestOtpSchema.parse(req.body);

      // Find voter
      const voter = await prisma.voter.findUnique({
        where: { phone },
        select: {
          id: true,
          fullName: true,
          phone: true,
          status: true,
          hasVoted: true,
          lastOtpSentAt: true,
          otpAttempts: true,
        },
      });

      if (!voter) {
        throw new NotFoundError(
          'Voter not found with this phone number'
        );
      }

      // Block OTP requests for voters who have already voted
      if (voter.hasVoted) {
        throw new ConflictError(
          'You have already voted in this election. Thank you for participating!'
        );
      }

      // Check if too many recent OTP attempts
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (
        voter.lastOtpSentAt &&
        voter.lastOtpSentAt > fiveMinutesAgo &&
        voter.otpAttempts >= 3
      ) {
        throw new ValidationError(
          'Too many OTP attempts. Please wait 5 minutes before requesting again.'
        );
      }

      // Generate 6-digit OTP
      const otpCode = Math.random()
        .toString()
        .slice(2, 8)
        .padStart(6, '0');
      const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Send OTP via SMS FIRST to determine if provider-side OTP is used
      const smsResult = await sendOtpSms(phone, otpCode, voter.fullName, voter.id);

      // Only store OTP code in DB if NOT using Twilio Verify (which manages OTP server-side)
      // For Twilio Verify, set lastOtpCode to null since Twilio manages the code
      const shouldStoreLocalOtp = !smsResult.messageId?.startsWith('VE'); // Twilio Verify SIDs start with VE

      // Update voter with OTP
      await prisma.voter.update({
        where: { id: voter.id },
        data: {
          lastOtpCode: shouldStoreLocalOtp ? otpCode : null, // Don't store local code for Twilio Verify
          lastOtpSentAt: new Date(),
          otpAttempts:
            voter.lastOtpSentAt &&
            voter.lastOtpSentAt > fiveMinutesAgo
              ? voter.otpAttempts + 1
              : 1,
          status: 'OTP_SENT',
        },
      });

      logger.info(`OTP sent to voter ${voter.id} (${phone}) - Provider OTP: ${!shouldStoreLocalOtp}, MessageID: ${smsResult.messageId}`);

      logger.info(`OTP sent to voter ${voter.id} (${phone})`);

      res.json({
        message: 'OTP sent successfully',
        expiresAt: otpExpiry.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verify OTP and authenticate voter
/**
 * @openapi
 * /api/voting/verify-otp:
 *   post:
 *     tags:
 *       - Voting
 *     summary: Verify OTP for voting
 *     description: Verify the one-time password sent to the voter via SMS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - code
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Voter's phone number in international format
 *                 example: "+233240000000"
 *               code:
 *                 type: string
 *                 description: 6-digit OTP code
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Authentication successful
 *       400:
 *         description: Validation error or invalid/expired OTP
 *       404:
 *         description: Voter not found
 */
router.post(
  '/verify-otp',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { phone, code } = verifyOtpSchema.parse(req.body);

      const voter = await prisma.voter.findUnique({
        where: { phone },
        select: {
          id: true,
          fullName: true,
          phone: true,
          lastOtpCode: true,
          lastOtpSentAt: true,
          hasVoted: true,
        },
      });

      if (!voter) {
        throw new NotFoundError('Voter not found');
      }

      // Allow voters who have already voted to still log in (to view results)
      // The voting page will prevent them from voting again

      // Check OTP validity
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (
        !voter.lastOtpSentAt ||
        voter.lastOtpSentAt < fiveMinutesAgo
      ) {
        throw new ValidationError(
          'OTP has expired. Please request a new one.'
        );
      }

      // First try provider verification (e.g., Arkesel OTP API, Twilio Verify)
      let isVerified = false;
      try {
        logger.info(`Attempting provider verification for voter ${voter.id} with phone ${voter.phone}`);
        isVerified = await verifyOtpSms(voter.phone, code);
        logger.info(`Provider verification result for voter ${voter.id}: ${isVerified} (type: ${typeof isVerified})`);
      } catch (e) {
        logger.error(`Provider verification error for voter ${voter.id}:`, e);
        isVerified = false;
      }

      logger.info(`After provider check - isVerified value: ${isVerified}, will check local: ${!isVerified}`);

      // Fallback to local code match ONLY if provider verification not available/failed AND local code exists
      if (!isVerified) {
        // If lastOtpCode is null, it means we're using Twilio Verify which manages OTP server-side
        // In this case, if provider verification failed, the OTP is genuinely invalid
        if (!voter.lastOtpCode) {
          logger.warn(`Provider verification failed and no local OTP stored for voter ${voter.id} - using Twilio Verify`);
          throw new ValidationError('Invalid OTP code');
        }

        logger.info(`Provider verification failed, checking local OTP for voter ${voter.id}`);
        logger.info(`Stored OTP: ${voter.lastOtpCode}, Provided OTP: ${code}`);

        if (voter.lastOtpCode !== code) {
          logger.warn(`Local OTP verification failed for voter ${voter.id}`);
          throw new ValidationError('Invalid OTP code');
        }

        logger.info(`Local OTP verification successful for voter ${voter.id}`);
      } else {
        logger.info(`✓ Provider verification succeeded, skipping local check for voter ${voter.id}`);
      }

      // Update voter status
      await prisma.voter.update({
        where: { id: voter.id },
        data: {
          status: 'VERIFIED',
          lastLoginAt: new Date(),
          lastLoginIp: req.ip,
          lastOtpCode: null, // Clear OTP after use
          otpAttempts: 0,
        },
      });

      // Generate voter session token
      const token = jwt.sign(
        { voterId: voter.id, phone: voter.phone },
        process.env.JWT_SECRET!,
        { expiresIn: '2h' } // Long enough for voting process
      );

      logger.info(`Voter ${voter.id} authenticated successfully`);

      // Set HTTP-Only cookie with the token
      const cookieOptions: any = {
        httpOnly: true, // Prevents JavaScript access (XSS protection)
        secure: process.env.NODE_ENV === 'production', // HTTPS in production, allow HTTP in development
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in production
        maxAge: 2 * 60 * 60 * 1000, // 2 hours (matches JWT expiry)
        path: '/', // Ensure cookie is sent for all paths
      };

      // In production, don't set domain to allow cookie to work across subdomains
      // The cookie will be set for the exact domain that set it
      res.cookie('voting-token', token, cookieOptions);

      logger.info(`[Voter Auth] Set cookie - secure: ${cookieOptions.secure}, sameSite: ${cookieOptions.sameSite}, path: ${cookieOptions.path}`);

      res.json({
        message: 'Authentication successful',
        voter: {
          id: voter.id,
          fullName: voter.fullName,
          phone: voter.phone,
        },
        token, // Also return token in body for mobile devices that might not handle cookies properly
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current election and voter's voting status
/**
 * @openapi
 * /api/voting/election:
 *   get:
 *     tags:
 *       - Voting
 *     summary: Get current election and voting status
 *     description: Get the current active election with positions and candidates, plus voter's voting status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current election retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 election:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     positions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           order:
 *                             type: number
 *                           candidates:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 fullName:
 *                                   type: string
 *                                 classYearGroup:
 *                                   type: string
 *                                 photoUrl:
 *                                   type: string
 *                                 bio:
 *                                   type: string
 *                 votingStatus:
 *                   type: object
 *                   properties:
 *                     hasVoted:
 *                       type: boolean
 *                     votedPositions:
 *                       type: array
 *                       items:
 *                         type: string
 *                     canVote:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: No active election found
 */
router.get(
  '/election',
  authenticateVoter,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const now = new Date();
      logger.info(`[Get Election] Current time: ${now.toISOString()}`);

      // First, let's see if there are ANY active elections
      const activeElections = await prisma.election.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          status: true,
          startAt: true,
          endAt: true,
        },
      });

      logger.info(`[Get Election] Found ${activeElections.length} ACTIVE elections`);
      activeElections.forEach((e) => {
        logger.info(
          `[Get Election] Election: ${e.title} (${e.id}) - Status: ${e.status}, Start: ${e.startAt.toISOString()}, End: ${e.endAt.toISOString()}`
        );
        logger.info(
          `[Get Election] Time checks - startAt <= now: ${e.startAt <= now}, endAt > now: ${e.endAt > now}`
        );
      });

      const currentElection = await prisma.election.findFirst({
        where: {
          status: 'ACTIVE',
          startAt: { lte: new Date() },
          endAt: { gt: new Date() },
        },
        include: {
          positions: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: {
              candidates: {
                where: { isActive: true },
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  fullName: true,
                  classYearGroup: true,
                  photoUrl: true,
                  bio: true,
                },
              },
            },
          },
        },
      });

      if (!currentElection) {
        logger.warn('[Get Election] No election matched all criteria (ACTIVE + time range)');
        throw new NotFoundError('No active election found');
      }

      logger.info(`[Get Election] Found current election: ${currentElection.title} (${currentElection.id})`);

      // Check if voter has already voted
      const existingBallot = await prisma.ballot.findUnique({
        where: {
          electionId_voterId: {
            electionId: currentElection.id,
            voterId: req.voter!.id,
          },
        },
        include: {
          votes: {
            select: {
              positionId: true,
              candidateId: true,
            },
          },
        },
      });

      res.json({
        election: currentElection,
        votingStatus: {
          hasVoted: !!existingBallot,
          votedPositions:
            existingBallot?.votes.map((v) => v.positionId) || [],
          canVote: !existingBallot,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Cast votes (all positions at once)
/**
 * @openapi
 * /api/voting/cast:
 *   post:
 *     tags:
 *       - Voting
 *     summary: Cast votes for all positions
 *     description: Submit votes for all election positions at once
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - votes
 *             properties:
 *               votes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - positionId
 *                   properties:
 *                     positionId:
 *                       type: string
 *                       format: uuid
 *                       description: Position ID to vote for
 *                     candidateId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                       description: Candidate ID (null for abstain)
 *     responses:
 *       200:
 *         description: Votes cast successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 ballotId:
 *                   type: string
 *                   format: uuid
 *                 votesCount:
 *                   type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: No active election found
 *       409:
 *         description: Voter has already voted
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/cast',
  votingRateLimiter,
  authenticateVoter,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const votes = req.body.votes; // Array of { positionId, candidateId }

      if (!Array.isArray(votes) || votes.length === 0) {
        throw new ValidationError('Votes array is required');
      }

      // Validate each vote
      for (const vote of votes) {
        castVoteSchema.parse(vote);
      }

      const currentElection = await prisma.election.findFirst({
        where: {
          status: 'ACTIVE',
          startAt: { lte: new Date() },
          endAt: { gt: new Date() },
        },
        include: {
          positions: {
            where: { isActive: true },
            include: {
              candidates: {
                where: { isActive: true },
                select: { id: true },
              },
            },
          },
        },
      });

      if (!currentElection) {
        throw new ValidationError('No active election found');
      }

      // Check if voter has already voted
      const existingBallot = await prisma.ballot.findUnique({
        where: {
          electionId_voterId: {
            electionId: currentElection.id,
            voterId: req.voter!.id,
          },
        },
      });

      if (existingBallot) {
        throw new ConflictError(
          'You have already voted in this election'
        );
      }

      // Validate votes against election positions
      const positionIds = currentElection.positions.map((p) => p.id);
      const candidateIds = currentElection.positions.flatMap((p) =>
        p.candidates.map((c) => c.id)
      );

      for (const vote of votes) {
        if (!positionIds.includes(vote.positionId)) {
          throw new ValidationError(
            `Invalid position ID: ${vote.positionId}`
          );
        }

        if (
          vote.candidateId &&
          !candidateIds.includes(vote.candidateId)
        ) {
          throw new ValidationError(
            `Invalid candidate ID: ${vote.candidateId}`
          );
        }
      }

      // Create ballot and votes in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create ballot
        const ballot = await tx.ballot.create({
          data: {
            electionId: currentElection.id,
            voterId: req.voter!.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          },
        });

        // Create votes
        const voteRecords = await Promise.all(
          votes.map((vote) =>
            tx.vote.create({
              data: {
                ballotId: ballot.id,
                positionId: vote.positionId,
                candidateId: vote.candidateId || null,
              },
            })
          )
        );

        // Update voter status
        await tx.voter.update({
          where: { id: req.voter!.id },
          data: {
            hasVoted: true,
            votedAt: new Date(),
            status: 'VOTED',
          },
        });

        return { ballot, votes: voteRecords };
      });

      logger.info(
        `Voter ${req.voter!.id} cast ${
          votes.length
        } votes in election ${currentElection.id}`
      );

      // Send vote confirmation SMS
      try {
        await sendVoteConfirmationSms(
          req.voter!.phone,
          req.voter!.fullName,
          req.voter!.id
        );
        logger.info(
          `Vote confirmation SMS sent to voter ${req.voter!.id}`
        );
      } catch (smsError) {
        // Log SMS error but don't fail the vote
        logger.error(
          'Failed to send vote confirmation SMS:',
          smsError
        );
      }

      res.json({
        message: 'Votes cast successfully',
        ballotId: result.ballot.id,
        votesCount: result.votes.length,
        timestamp: result.ballot.castAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
