import express from 'express';
import { prisma } from '../server';
import {
  authenticateAdmin,
  requireAdvisoryAccess,
  AuthenticatedRequest,
} from '../middleware/auth';
import { createDisputeSchema } from '../utils/validation';
import {
  ValidationError,
  NotFoundError,
} from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

// Get all disputes
/**
 * @openapi
 * /api/disputes:
 *   get:
 *     tags:
 *       - Disputes
 *     summary: Get all disputes
 *     description: Retrieve a paginated list of all disputes with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         description: Filter by dispute status
 *         schema:
 *           type: string
 *       - name: electionId
 *         in: query
 *         description: Filter by election ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: page
 *         in: query
 *         description: Page number for pagination
 *         schema:
 *           type: string
 *           default: "1"
 *       - name: limit
 *         in: query
 *         description: Number of disputes per page
 *         schema:
 *           type: string
 *           default: "20"
 *     responses:
 *       200:
 *         description: Disputes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 disputes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       status:
 *                         type: string
 *                       evidence:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       election:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           title:
 *                             type: string
 *                           status:
 *                             type: string
 *                       position:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                       candidate:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           fullName:
 *                             type: string
 *                           classYearGroup:
 *                             type: string
 *                       creator:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           role:
 *                             type: string
 *                       assignee:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           role:
 *                             type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     pages:
 *                       type: number
 *       401:
 *         description: Unauthorized - Authentication required
 */
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      status,
      electionId,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (electionId) {
      where.electionId = electionId;
    }

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          election: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          position: {
            select: {
              id: true,
              name: true,
            },
          },
          candidate: {
            select: {
              id: true,
              fullName: true,
              classYearGroup: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        skip: offset,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dispute.count({ where }),
    ]);

    res.json({
      disputes,
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
});

// Get single dispute
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: {
        election: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        position: {
          select: {
            id: true,
            name: true,
          },
        },
        candidate: {
          select: {
            id: true,
            fullName: true,
            classYearGroup: true,
            photoUrl: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundError('Dispute not found');
    }

    res.json(dispute);
  } catch (error) {
    next(error);
  }
});

// Create dispute (EC members only)
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    // Only EC members can create disputes
    if (!['ADMIN', 'EC_MEMBER'].includes(req.user!.role)) {
      throw new ValidationError(
        'Only EC members can create disputes'
      );
    }

    const disputeData = createDisputeSchema.parse(req.body);

    // Validate election exists
    const election = await prisma.election.findUnique({
      where: { id: disputeData.electionId },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    // Validate position exists (if provided)
    if (disputeData.positionId) {
      const position = await prisma.position.findUnique({
        where: { id: disputeData.positionId },
      });

      if (
        !position ||
        position.electionId !== disputeData.electionId
      ) {
        throw new NotFoundError(
          'Position not found or does not belong to this election'
        );
      }
    }

    // Validate candidate exists (if provided)
    if (disputeData.candidateId) {
      const candidate = await prisma.candidate.findUnique({
        where: { id: disputeData.candidateId },
      });

      if (
        !candidate ||
        candidate.electionId !== disputeData.electionId
      ) {
        throw new NotFoundError(
          'Candidate not found or does not belong to this election'
        );
      }

      // If candidate is provided, position should also be provided and match
      if (
        disputeData.positionId &&
        candidate.positionId !== disputeData.positionId
      ) {
        throw new ValidationError(
          'Candidate does not belong to the specified position'
        );
      }
    }

    const dispute = await prisma.dispute.create({
      data: {
        ...disputeData,
        createdBy: req.user!.id,
        status: 'OPEN',
      },
      include: {
        election: {
          select: {
            id: true,
            title: true,
          },
        },
        position: {
          select: {
            id: true,
            name: true,
          },
        },
        candidate: {
          select: {
            id: true,
            fullName: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    logger.info(
      `Dispute created: ${dispute.id} by user ${req.user!.id}`
    );

    res.status(201).json(dispute);
  } catch (error) {
    next(error);
  }
});

// Update dispute (Advisory Council can handle)
router.put(
  '/:id',
  requireAdvisoryAccess,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { status, notes, assignedTo } = req.body;

      const existingDispute = await prisma.dispute.findUnique({
        where: { id: req.params.id },
      });

      if (!existingDispute) {
        throw new NotFoundError('Dispute not found');
      }

      // Validate status
      const validStatuses = [
        'OPEN',
        'UNDER_REVIEW',
        'RESOLVED',
        'DISMISSED',
      ];
      if (status && !validStatuses.includes(status)) {
        throw new ValidationError('Invalid dispute status');
      }

      // Validate assignee exists (if provided)
      if (assignedTo) {
        const assignee = await prisma.user.findUnique({
          where: { id: assignedTo },
        });

        if (!assignee) {
          throw new NotFoundError('Assignee not found');
        }

        if (
          !['ADMIN', 'EC_MEMBER', 'ADVISORY_COUNCIL'].includes(
            assignee.role
          )
        ) {
          throw new ValidationError(
            'Assignee must be an admin, EC member, or advisory council member'
          );
        }
      }

      const updateData: any = {};

      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (assignedTo !== undefined)
        updateData.assignedTo = assignedTo;

      const dispute = await prisma.dispute.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          election: {
            select: {
              id: true,
              title: true,
            },
          },
          position: {
            select: {
              id: true,
              name: true,
            },
          },
          candidate: {
            select: {
              id: true,
              fullName: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      logger.info(
        `Dispute updated: ${dispute.id} by user ${req.user!.id}`
      );

      res.json(dispute);
    } catch (error) {
      next(error);
    }
  }
);

// Assign dispute to user
router.post(
  '/:id/assign',
  requireAdvisoryAccess,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { assignedTo } = req.body;

      if (!assignedTo) {
        throw new ValidationError('Assignee ID is required');
      }

      const dispute = await prisma.dispute.findUnique({
        where: { id: req.params.id },
      });

      if (!dispute) {
        throw new NotFoundError('Dispute not found');
      }

      // Validate assignee exists
      const assignee = await prisma.user.findUnique({
        where: { id: assignedTo },
      });

      if (!assignee) {
        throw new NotFoundError('Assignee not found');
      }

      if (
        !['ADMIN', 'EC_MEMBER', 'ADVISORY_COUNCIL'].includes(
          assignee.role
        )
      ) {
        throw new ValidationError(
          'Assignee must be an admin, EC member, or advisory council member'
        );
      }

      const updatedDispute = await prisma.dispute.update({
        where: { id: req.params.id },
        data: {
          assignedTo,
          status:
            dispute.status === 'OPEN'
              ? 'UNDER_REVIEW'
              : dispute.status,
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      logger.info(
        `Dispute ${req.params.id} assigned to user ${assignedTo} by ${
          req.user!.id
        }`
      );

      res.json({
        message: 'Dispute assigned successfully',
        dispute: updatedDispute,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get dispute statistics
router.get(
  '/stats/overview',
  requireAdvisoryAccess,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const [
        totalDisputes,
        openDisputes,
        underReviewDisputes,
        resolvedDisputes,
        dismissedDisputes,
        disputesByElection,
      ] = await Promise.all([
        prisma.dispute.count(),
        prisma.dispute.count({ where: { status: 'OPEN' } }),
        prisma.dispute.count({ where: { status: 'UNDER_REVIEW' } }),
        prisma.dispute.count({ where: { status: 'RESOLVED' } }),
        prisma.dispute.count({ where: { status: 'DISMISSED' } }),
        prisma.dispute.groupBy({
          by: ['electionId'],
          _count: { id: true },
        }),
      ]);

      res.json({
        totalDisputes,
        statusBreakdown: {
          open: openDisputes,
          underReview: underReviewDisputes,
          resolved: resolvedDisputes,
          dismissed: dismissedDisputes,
        },
        disputesByElection: disputesByElection.map((item) => ({
          electionId: item.electionId,
          count: item._count.id,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete dispute (Admin only)
router.delete(
  '/:id',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Only admins can delete disputes
      if (req.user!.role !== 'ADMIN') {
        throw new ValidationError(
          'Only administrators can delete disputes'
        );
      }

      const dispute = await prisma.dispute.findUnique({
        where: { id: req.params.id },
      });

      if (!dispute) {
        throw new NotFoundError('Dispute not found');
      }

      await prisma.dispute.delete({
        where: { id: req.params.id },
      });

      logger.info(
        `Dispute deleted: ${req.params.id} by user ${req.user!.id}`
      );

      res.json({ message: 'Dispute deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
