import express from 'express';
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
} from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import {
  getSingleElection,
  getSingleElectionWithDetails,
  updateSingleElection,
  clearElectionCache,
} from '../utils/singleElection';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);
router.use(requireECAccess);

// Get the election
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const election = await getSingleElectionWithDetails();
    res.json(election);
  } catch (error) {
    next(error);
  }
});

// Update the election
router.put('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const electionData = createElectionSchema.parse(req.body);

    const existingElection = await getSingleElection();

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

    const election = await updateSingleElection({
      ...electionData,
      startAt: startDate,
      endAt: endDate,
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
router.post('/start', async (req: AuthenticatedRequest, res, next) => {
  try {
    const election = await getSingleElectionWithDetails();

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

    const updatedElection = await updateSingleElection({
      status: 'ACTIVE',
    });

    clearElectionCache();

    logger.info(
      `Election started: ${election.id} by user ${req.user!.id}`
    );

    res.json({
      message: 'Election started successfully',
      election: updatedElection,
    });
  } catch (error) {
    next(error);
  }
});

// Pause election
router.post('/pause', async (req: AuthenticatedRequest, res, next) => {
  try {
    const election = await getSingleElection();

    if (election.status !== 'ACTIVE') {
      throw new ValidationError('Only active elections can be paused');
    }

    const updatedElection = await updateSingleElection({
      status: 'PAUSED',
    });

    clearElectionCache();

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
});

// Resume election
router.post('/resume', async (req: AuthenticatedRequest, res, next) => {
  try {
    const election = await getSingleElection();

    if (election.status !== 'PAUSED') {
      throw new ValidationError('Only paused elections can be resumed');
    }

    const updatedElection = await updateSingleElection({
      status: 'ACTIVE',
    });

    clearElectionCache();

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
});

// End election
router.post('/end', async (req: AuthenticatedRequest, res, next) => {
  try {
    const election = await getSingleElection();

    if (!['ACTIVE', 'PAUSED'].includes(election.status)) {
      throw new ValidationError(
        'Only active or paused elections can be ended'
      );
    }

    const updatedElection = await updateSingleElection({
      status: 'ENDED',
    });

    clearElectionCache();

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
});

// Get election results
router.get('/results', async (req: AuthenticatedRequest, res, next) => {
  try {
    const election = await getSingleElectionWithDetails();

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

    // Get detailed results with vote counts
    const positions = await prisma.position.findMany({
      where: { electionId: election.id },
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
      orderBy: { order: 'asc' },
    });

    // Calculate results for each position
    const results = positions.map((position) => {
      const totalVotes = position.candidates.reduce(
        (sum, candidate) => sum + candidate._count.votes,
        0
      );

      const candidateResults = position.candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.fullName,
        classYearGroup: candidate.classYearGroup,
        votes: candidate._count.votes,
        percentage:
          totalVotes > 0
            ? Math.round((candidate._count.votes / totalVotes) * 10000) /
              100
            : 0,
      }));

      return {
        positionId: position.id,
        positionName: position.name,
        totalVotes,
        candidates: candidateResults.sort((a, b) => b.votes - a.votes),
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
});

export default router;
