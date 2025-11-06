import express from 'express';
import { prisma } from '../server';
import {
  authenticateAdmin,
  requireECAccess,
} from '../middleware/auth';
import { createPositionSchema } from '../utils/validation';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { getSingleElectionId, getSingleElection } from '../utils/singleElection';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);
router.use(requireECAccess);

// Get all positions for the single election
/**
 * @openapi
 * /api/positions:
 *   get:
 *     tags:
 *       - Positions
 *     summary: Get all positions
 *     description: Retrieve all positions for the election
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Positions retrieved successfully
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
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   order:
 *                     type: number
 *                   maxCandidates:
 *                     type: number
 *                   isActive:
 *                     type: boolean
 *                   candidates:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         fullName:
 *                           type: string
 *                         order:
 *                           type: number
 *                   _count:
 *                     type: object
 *                     properties:
 *                       votes:
 *                         type: number
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - EC access required
 */
router.get('/', async (req, res, next) => {
  try {
    const electionId = await getSingleElectionId();
    const positions = await prisma.position.findMany({
      where: { electionId },
      include: {
        candidates: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            votes: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    res.json(positions);
  } catch (error) {
    next(error);
  }
});

// Get single position
/**
 * @openapi
 * /api/positions/{id}:
 *   get:
 *     tags:
 *       - Positions
 *     summary: Get single position
 *     description: Retrieve detailed information about a specific position
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Position ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Position retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 order:
 *                   type: number
 *                 maxCandidates:
 *                   type: number
 *                 isActive:
 *                   type: boolean
 *                 election:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     title:
 *                       type: string
 *                     status:
 *                       type: string
 *                 candidates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       fullName:
 *                         type: string
 *                       order:
 *                         type: number
 *                 votes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       candidate:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           fullName:
 *                             type: string
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - EC access required
 *       404:
 *         description: Position not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const position = await prisma.position.findUnique({
      where: { id: req.params.id },
      include: {
        election: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        candidates: {
          orderBy: { order: 'asc' },
        },
        votes: {
          include: {
            candidate: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    res.json(position);
  } catch (error) {
    next(error);
  }
});

// Create position
router.post('/', async (req, res, next) => {
  try {
    const positionData = createPositionSchema.parse(req.body);

    // Get the single election
    const election = await getSingleElection();

    if (['ACTIVE', 'ENDED'].includes(election.status)) {
      throw new ValidationError(
        'Cannot add positions to an active or ended election'
      );
    }

    // Check for duplicate order within the election
    const existingPosition = await prisma.position.findFirst({
      where: {
        electionId: election.id,
        order: positionData.order,
      },
    });

    if (existingPosition) {
      throw new ConflictError(
        'A position with this order already exists in the election'
      );
    }

    const position = await prisma.position.create({
      data: {
        ...positionData,
        electionId: election.id,
      },
      include: {
        election: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    logger.info(
      `Position created: ${position.id} in election ${election.id}`
    );

    res.status(201).json(position);
  } catch (error) {
    next(error);
  }
});

// Update position
router.put('/:id', async (req, res, next) => {
  try {
    const positionData = createPositionSchema.parse(req.body);

    const existingPosition = await prisma.position.findUnique({
      where: { id: req.params.id },
      include: {
        election: true,
      },
    });

    if (!existingPosition) {
      throw new NotFoundError('Position not found');
    }

    // Check if election is editable
    if (
      ['ACTIVE', 'ENDED'].includes(existingPosition.election.status)
    ) {
      throw new ValidationError(
        'Cannot update positions in an active or ended election'
      );
    }

    // Check for duplicate order within the election (excluding current position)
    if (positionData.order !== existingPosition.order) {
      const duplicatePosition = await prisma.position.findFirst({
        where: {
          electionId: existingPosition.electionId,
          order: positionData.order,
          id: { not: req.params.id },
        },
      });

      if (duplicatePosition) {
        throw new ConflictError(
          'A position with this order already exists in the election'
        );
      }
    }

    const position = await prisma.position.update({
      where: { id: req.params.id },
      data: positionData,
      include: {
        candidates: true,
      },
    });

    logger.info(`Position updated: ${position.id}`);

    res.json(position);
  } catch (error) {
    next(error);
  }
});

// Toggle position active status
router.patch('/:id/toggle-active', async (req, res, next) => {
  try {
    const position = await prisma.position.findUnique({
      where: { id: req.params.id },
      include: {
        election: true,
      },
    });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    // Check if election is editable
    if (['ACTIVE', 'ENDED'].includes(position.election.status)) {
      throw new ValidationError(
        'Cannot modify positions in an active or ended election'
      );
    }

    const updatedPosition = await prisma.position.update({
      where: { id: req.params.id },
      data: {
        isActive: !position.isActive,
      },
    });

    logger.info(
      `Position ${position.isActive ? 'deactivated' : 'activated'}: ${
        position.id
      }`
    );

    res.json({
      message: `Position ${
        position.isActive ? 'deactivated' : 'activated'
      } successfully`,
      position: updatedPosition,
    });
  } catch (error) {
    next(error);
  }
});

// Reorder positions
router.post('/reorder', async (req, res, next) => {
  try {
    const { positions } = req.body;

    if (!Array.isArray(positions)) {
      throw new ValidationError('Positions array is required');
    }

    // Get the single election
    const election = await getSingleElection();

    if (['ACTIVE', 'ENDED'].includes(election.status)) {
      throw new ValidationError(
        'Cannot reorder positions in an active or ended election'
      );
    }

    // Validate positions belong to the election
    const existingPositions = await prisma.position.findMany({
      where: {
        electionId: election.id,
        id: { in: positions.map((p: any) => p.id) },
      },
    });

    if (existingPositions.length !== positions.length) {
      throw new ValidationError(
        'Some positions do not belong to this election'
      );
    }

    // Update positions in transaction
    await prisma.$transaction(
      positions.map((position: any, index: number) =>
        prisma.position.update({
          where: { id: position.id },
          data: { order: index + 1 },
        })
      )
    );

    logger.info(`Positions reordered for election ${election.id}`);

    res.json({ message: 'Positions reordered successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete position
router.delete('/:id', async (req, res, next) => {
  try {
    const position = await prisma.position.findUnique({
      where: { id: req.params.id },
      include: {
        election: true,
        _count: {
          select: {
            votes: true,
            candidates: true,
          },
        },
      },
    });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    // Check if election is editable
    if (['ACTIVE', 'ENDED'].includes(position.election.status)) {
      throw new ValidationError(
        'Cannot delete positions from an active or ended election'
      );
    }

    // Prevent deletion if position has votes
    if (position._count.votes > 0) {
      throw new ValidationError(
        'Cannot delete a position that has received votes'
      );
    }

    await prisma.position.delete({
      where: { id: req.params.id },
    });

    logger.info(`Position deleted: ${req.params.id}`);

    res.json({ message: 'Position deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
