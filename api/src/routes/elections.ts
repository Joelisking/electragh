/**
 * @deprecated These routes are deprecated in favor of the single election system.
 * Use /api/election instead for the permanent election management.
 *
 * This file is kept for backwards compatibility but should not be used in new code.
 * The system now operates with a single permanent election that is managed through
 * the /api/election routes.
 */

import express from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import {
  authenticateAdmin,
  requireECAccess,
  AuthenticatedRequest,
} from '../middleware/auth';
import { createElectionSchema } from '../utils/validation';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);
router.use(requireECAccess);

// Get all elections
/**
 * @openapi
 * /api/elections:
 *   get:
 *     tags:
 *       - Elections
 *     summary: Get all elections
 *     description: Retrieve a list of all elections with their positions and candidates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of elections retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   startDate:
 *                     type: string
 *                     format: date-time
 *                   endDate:
 *                     type: string
 *                     format: date-time
 *                   isActive:
 *                     type: boolean
 *                   positions:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         candidates:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               fullName:
 *                                 type: string
 *                               isActive:
 *                                 type: boolean
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - EC access required
 */
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const elections = await prisma.election.findMany({
      include: {
        positions: {
          include: {
            candidates: {
              select: {
                id: true,
                fullName: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            ballots: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(elections);
  } catch (error) {
    next(error);
  }
});

// Get single election
/**
 * @openapi
 * /api/elections/{id}:
 *   get:
 *     tags:
 *       - Elections
 *     summary: Get single election
 *     description: Retrieve detailed information about a specific election
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Election ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Election details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 startDate:
 *                   type: string
 *                   format: date-time
 *                 endDate:
 *                   type: string
 *                   format: date-time
 *                 isActive:
 *                   type: boolean
 *                 positions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       candidates:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             fullName:
 *                               type: string
 *                             order:
 *                               type: number
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - EC access required
 *       404:
 *         description: Election not found
 */
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const election = await prisma.election.findUnique({
      where: { id: req.params.id },
      include: {
        positions: {
          include: {
            candidates: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
        ballots: {
          include: {
            voter: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                classYearGroup: true,
              },
            },
            votes: {
              include: {
                position: { select: { name: true } },
                candidate: { select: { fullName: true } },
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    res.json(election);
  } catch (error) {
    next(error);
  }
});

// Create election
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const electionData = createElectionSchema.parse(req.body);

    // Validate dates
    const startDate = new Date(electionData.startAt);
    const endDate = new Date(electionData.endAt);

    if (startDate >= endDate) {
      throw new ValidationError('End date must be after start date');
    }

    if (startDate < new Date()) {
      throw new ValidationError('Start date cannot be in the past');
    }

    const election = await prisma.election.create({
      data: {
        ...electionData,
        startAt: startDate,
        endAt: endDate,
        createdBy: req.user!.id,
        status: 'DRAFT',
      },
      include: {
        positions: true,
        creator: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    logger.info(
      `Election created: ${election.id} by user ${req.user!.id}`
    );

    res.status(201).json(election);
  } catch (error) {
    next(error);
  }
});

// Update election
router.put('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const electionData = createElectionSchema.parse(req.body);

    const existingElection = await prisma.election.findUnique({
      where: { id: req.params.id },
    });

    if (!existingElection) {
      throw new NotFoundError('Election not found');
    }

    // Prevent updates if election is active or ended
    if (['ACTIVE', 'ENDED'].includes(existingElection.status)) {
      throw new ValidationError(
        'Cannot update an active or ended election'
      );
    }

    // Validate dates
    const startDate = new Date(electionData.startAt);
    const endDate = new Date(electionData.endAt);

    if (startDate >= endDate) {
      throw new ValidationError('End date must be after start date');
    }

    const election = await prisma.election.update({
      where: { id: req.params.id },
      data: {
        ...electionData,
        startAt: startDate,
        endAt: endDate,
      },
      include: {
        positions: {
          include: {
            candidates: true,
          },
        },
      },
    });

    logger.info(
      `Election updated: ${election.id} by user ${req.user!.id}`
    );

    res.json(election);
  } catch (error) {
    next(error);
  }
});

// Start election
router.post(
  '/:id/start',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const bodySchema = z.object({
        startNow: z.boolean().optional().default(true),
        startAt: z.string().datetime().optional(),
        endAt: z.string().datetime().optional(),
      });

      const { startNow, startAt, endAt } = bodySchema.parse(req.body);

      const election = await prisma.election.findUnique({
        where: { id: req.params.id },
        include: {
          positions: {
            include: {
              candidates: {
                where: { isActive: true },
              },
            },
            where: { isActive: true },
          },
        },
      });

      if (!election) {
        throw new NotFoundError('Election not found');
      }

      if (
        election.status !== 'SCHEDULED' &&
        election.status !== 'DRAFT'
      ) {
        throw new ValidationError(
          'Election must be in SCHEDULED or DRAFT status to start'
        );
      }

      // Validate election has positions and candidates
      if (election.positions.length === 0) {
        throw new ValidationError(
          'Election must have at least one position'
        );
      }

      const positionsWithoutCandidates = election.positions.filter(
        (p) => p.candidates.length === 0
      );
      if (positionsWithoutCandidates.length > 0) {
        throw new ValidationError(
          `The following positions have no candidates: ${positionsWithoutCandidates
            .map((p) => p.name)
            .join(', ')}`
        );
      }

      // Determine start and end times
      const now = new Date();
      let finalStartAt: Date;
      let finalEndAt: Date;

      if (startNow) {
        // Start immediately
        finalStartAt = now;
        // If endAt provided, use it; otherwise use existing election endAt or default to 24 hours
        finalEndAt = endAt ? new Date(endAt) : election.endAt;
      } else {
        // Custom start time
        if (!startAt) {
          throw new ValidationError('startAt is required when startNow is false');
        }
        if (!endAt) {
          throw new ValidationError('endAt is required when startNow is false');
        }

        finalStartAt = new Date(startAt);
        finalEndAt = new Date(endAt);

        // Validate times
        if (finalStartAt < now) {
          throw new ValidationError('Start time cannot be in the past');
        }
        if (finalEndAt <= finalStartAt) {
          throw new ValidationError('End time must be after start time');
        }
      }

      const updatedElection = await prisma.election.update({
        where: { id: req.params.id },
        data: {
          status: 'ACTIVE',
          startAt: finalStartAt,
          endAt: finalEndAt,
        },
      });

      logger.info(
        `Election started: ${election.id} by user ${req.user!.id} - Start: ${finalStartAt.toISOString()}, End: ${finalEndAt.toISOString()}`
      );

      res.json({
        message: 'Election started successfully',
        election: updatedElection,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Pause election
router.post(
  '/:id/pause',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const election = await prisma.election.findUnique({
        where: { id: req.params.id },
      });

      if (!election) {
        throw new NotFoundError('Election not found');
      }

      if (election.status !== 'ACTIVE') {
        throw new ValidationError(
          'Only active elections can be paused'
        );
      }

      const updatedElection = await prisma.election.update({
        where: { id: req.params.id },
        data: {
          status: 'PAUSED',
        },
      });

      logger.info(
        `Election paused: ${election.id} by user ${req.user!.id}`
      );

      res.json({
        message: 'Election paused successfully',
        election: updatedElection,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Resume election
router.post(
  '/:id/resume',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const election = await prisma.election.findUnique({
        where: { id: req.params.id },
      });

      if (!election) {
        throw new NotFoundError('Election not found');
      }

      if (election.status !== 'PAUSED') {
        throw new ValidationError(
          'Only paused elections can be resumed'
        );
      }

      const updatedElection = await prisma.election.update({
        where: { id: req.params.id },
        data: {
          status: 'ACTIVE',
        },
      });

      logger.info(
        `Election resumed: ${election.id} by user ${req.user!.id}`
      );

      res.json({
        message: 'Election resumed successfully',
        election: updatedElection,
      });
    } catch (error) {
      next(error);
    }
  }
);

// End election
router.post(
  '/:id/end',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const election = await prisma.election.findUnique({
        where: { id: req.params.id },
      });

      if (!election) {
        throw new NotFoundError('Election not found');
      }

      if (!['ACTIVE', 'PAUSED'].includes(election.status)) {
        throw new ValidationError(
          'Only active or paused elections can be ended'
        );
      }

      const updatedElection = await prisma.election.update({
        where: { id: req.params.id },
        data: {
          status: 'ENDED',
        },
      });

      logger.info(
        `Election ended: ${election.id} by user ${req.user!.id}`
      );

      res.json({
        message: 'Election ended successfully',
        election: updatedElection,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get election results
router.get(
  '/:id/results',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const election = await prisma.election.findUnique({
        where: { id: req.params.id },
        include: {
          positions: {
            include: {
              candidates: {
                include: {
                  _count: {
                    select: {
                      votes: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              ballots: true,
            },
          },
        },
      });

      if (!election) {
        throw new NotFoundError('Election not found');
      }

      // Check if user has permission to view results
      if (
        election.visibility === 'RESTRICTED' &&
        election.status !== 'ENDED'
      ) {
        // Only EC members can view live results
        if (!['ADMIN', 'EC_MEMBER'].includes(req.user!.role)) {
          throw new ValidationError(
            'Insufficient permissions to view live results'
          );
        }
      }

      // Calculate results for each position
      const results = election.positions.map((position) => {
        const totalVotes = position.candidates.reduce(
          (sum, candidate) => sum + candidate._count.votes,
          0
        );

        // For now, we'll just use the candidate votes total
        const totalWithAbstain = totalVotes;

        const candidateResults = position.candidates.map(
          (candidate) => ({
            id: candidate.id,
            name: candidate.fullName,
            classYearGroup: candidate.classYearGroup,
            votes: candidate._count.votes,
            percentage:
              totalWithAbstain > 0
                ? Math.round(
                    (candidate._count.votes / totalWithAbstain) *
                      10000
                  ) / 100
                : 0,
          })
        );

        return {
          positionId: position.id,
          positionName: position.name,
          totalVotes: totalWithAbstain,
          abstainVotes: 0, // TODO: Implement abstain vote counting
          candidates: candidateResults.sort(
            (a, b) => b.votes - a.votes
          ),
        };
      });

      res.json({
        electionId: election.id,
        electionTitle: election.title,
        status: election.status,
        totalBallots: election._count.ballots,
        results,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete election
router.delete(
  '/:id',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const election = await prisma.election.findUnique({
        where: { id: req.params.id },
        include: {
          _count: {
            select: {
              ballots: true,
            },
          },
        },
      });

      if (!election) {
        throw new NotFoundError('Election not found');
      }

      // Prevent deletion if election has votes
      if (election._count.ballots > 0) {
        throw new ValidationError(
          'Cannot delete an election that has received votes'
        );
      }

      // Prevent deletion if election is active
      if (election.status === 'ACTIVE') {
        throw new ValidationError('Cannot delete an active election');
      }

      await prisma.election.delete({
        where: { id: req.params.id },
      });

      logger.info(
        `Election deleted: ${req.params.id} by user ${req.user!.id}`
      );

      res.json({ message: 'Election deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
