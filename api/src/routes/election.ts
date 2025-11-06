import express from 'express';
import { prisma } from '../server';
import {
  authenticateAdmin,
  requireECAccess,
  AuthenticatedRequest,
} from '../middleware/auth';
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

/**
 * Get the permanent election details
 */
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const election = await getSingleElectionWithDetails();
    res.json(election);
  } catch (error) {
    next(error);
  }
});

/**
 * Update election settings
 * Only allows updating basic settings, not critical fields
 */
router.patch('/settings', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { title, description, startAt, endAt, timezone, allowAbstain } = req.body;

    const existingElection = await getSingleElection();

    // Prevent date updates if election is active or ended
    if (['ACTIVE', 'ENDED'].includes(existingElection.status)) {
      if (startAt || endAt) {
        throw new ValidationError(
          'Cannot update election dates when election is active or ended'
        );
      }
    }

    // Validate dates if provided
    if (startAt && endAt) {
      const startDate = new Date(startAt);
      const endDate = new Date(endAt);

      if (startDate >= endDate) {
        throw new ValidationError('End date must be after start date');
      }
    }

    // Build update object with only allowed fields
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startAt !== undefined) updateData.startAt = new Date(startAt);
    if (endAt !== undefined) updateData.endAt = new Date(endAt);
    if (timezone !== undefined) updateData.timezone = timezone;
    if (allowAbstain !== undefined) updateData.allowAbstain = allowAbstain;

    const election = await updateSingleElection(updateData);

    logger.info(
      `Election settings updated by user ${req.user!.id}`
    );

    res.json({
      message: 'Election settings updated successfully',
      election,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Toggle election visibility
 */
router.patch('/visibility', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { visibility } = req.body;

    if (!visibility || !['RESTRICTED', 'PUBLIC', 'LIVE_PUBLIC'].includes(visibility)) {
      throw new ValidationError(
        'Invalid visibility value. Must be RESTRICTED, PUBLIC, or LIVE_PUBLIC'
      );
    }

    const election = await updateSingleElection({ visibility });

    clearElectionCache();

    logger.info(
      `Election visibility changed to ${visibility} by user ${req.user!.id}`
    );

    res.json({
      message: 'Election visibility updated successfully',
      election,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Start/Activate the election
 */
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
      `Election started by user ${req.user!.id}`
    );

    res.json({
      message: 'Election started successfully',
      election: updatedElection,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Pause the election
 */
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
      `Election paused by user ${req.user!.id}`
    );

    res.json({
      message: 'Election paused successfully',
      election: updatedElection,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Resume the election
 */
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
      `Election resumed by user ${req.user!.id}`
    );

    res.json({
      message: 'Election resumed successfully',
      election: updatedElection,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * End the election
 */
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
      `Election ended by user ${req.user!.id}`
    );

    res.json({
      message: 'Election ended successfully',
      election: updatedElection,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Reset the election for a new cycle
 * This archives old data and prepares the election for a new run
 */
router.post('/reset', async (req: AuthenticatedRequest, res, next) => {
  try {
    const election = await getSingleElection();

    if (election.status === 'ACTIVE') {
      throw new ValidationError(
        'Cannot reset an active election. Please end it first.'
      );
    }

    // Archive old ballots and votes by marking them with the old election cycle
    // In a more complex system, you might want to create an archive table

    // Clear all ballots and votes
    await prisma.vote.deleteMany({
      where: {
        ballot: {
          electionId: election.id,
        },
      },
    });

    await prisma.ballot.deleteMany({
      where: {
        electionId: election.id,
      },
    });

    // Reset voter voting status
    await prisma.voter.updateMany({
      data: {
        hasVoted: false,
        votedAt: null,
      },
    });

    // Reset election to DRAFT status
    const updatedElection = await updateSingleElection({
      status: 'DRAFT',
    });

    clearElectionCache();

    logger.info(
      `Election reset for new cycle by user ${req.user!.id}`
    );

    res.json({
      message: 'Election reset successfully. Ready for new cycle.',
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

    // Get abstain votes for each position
    const abstainVotes = await prisma.vote.groupBy({
      by: ['positionId'],
      where: {
        candidateId: null,
        ballot: {
          electionId: election.id,
        },
      },
      _count: {
        id: true,
      },
    });

    const abstainMap = abstainVotes.reduce((acc, item) => {
      acc[item.positionId] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Calculate results for each position
    const results = positions.map((position) => {
      const totalVotes = position.candidates.reduce(
        (sum, candidate) => sum + candidate._count.votes,
        0
      );

      const abstainCount = abstainMap[position.id] || 0;
      const totalWithAbstain = totalVotes + abstainCount;

      const candidateResults = position.candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.fullName,
        classYearGroup: candidate.classYearGroup,
        votes: candidate._count.votes,
        percentage:
          totalWithAbstain > 0
            ? Math.round((candidate._count.votes / totalWithAbstain) * 10000) /
              100
            : 0,
      }));

      return {
        positionId: position.id,
        positionName: position.name,
        totalVotes: totalWithAbstain,
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
