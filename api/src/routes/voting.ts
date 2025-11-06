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

      if (voter.hasVoted) {
        throw new ConflictError(
          'You have already voted in this election'
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

      // Update voter with OTP
      await prisma.voter.update({
        where: { id: voter.id },
        data: {
          lastOtpCode: otpCode,
          lastOtpSentAt: new Date(),
          otpAttempts:
            voter.lastOtpSentAt &&
            voter.lastOtpSentAt > fiveMinutesAgo
              ? voter.otpAttempts + 1
              : 1,
          status: 'OTP_SENT',
        },
      });

      // Send OTP via SMS
      await sendOtpSms(phone, otpCode, voter.fullName);

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

      if (voter.hasVoted) {
        throw new ConflictError(
          'You have already voted in this election'
        );
      }

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

      // First try provider verification (e.g., Arkesel). If it returns true, accept.
      let isVerified = false;
      try {
        isVerified = await verifyOtpSms(voter.phone, code);
      } catch (e) {
        isVerified = false;
      }

      // Fallback to local code match if provider verification not available/failed
      if (!isVerified) {
        if (voter.lastOtpCode !== code) {
          throw new ValidationError('Invalid OTP code');
        }
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

      res.json({
        message: 'Authentication successful',
        token,
        voter: {
          id: voter.id,
          fullName: voter.fullName,
          phone: voter.phone,
        },
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
        throw new NotFoundError('No active election found');
      }

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
          req.voter!.fullName
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
