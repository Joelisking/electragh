import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { prisma } from '../server';
import {
  authenticateAdmin,
  requireECAccess,
} from '../middleware/auth';
import { createCandidateSchema } from '../utils/validation';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import {
  uploadCandidateImage,
  deleteCandidateImage,
} from '../services/imageStorageService';

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
        )
      );
    }
  },
});

// All routes require admin authentication
router.use(authenticateAdmin);
router.use(requireECAccess);

// Get all candidates for a position
/**
 * @openapi
 * /api/candidates/position/{positionId}:
 *   get:
 *     tags:
 *       - Candidates
 *     summary: Get candidates by position
 *     description: Retrieve all candidates for a specific position
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: positionId
 *         in: path
 *         required: true
 *         description: Position ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Candidates retrieved successfully
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
 *                   fullName:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *                   phone:
 *                     type: string
 *                   bio:
 *                     type: string
 *                   manifesto:
 *                     type: string
 *                   order:
 *                     type: number
 *                   isActive:
 *                     type: boolean
 *                   position:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
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
router.get('/position/:positionId', async (req, res, next) => {
  try {
    const candidates = await prisma.candidate.findMany({
      where: { positionId: req.params.positionId },
      include: {
        position: {
          select: {
            id: true,
            name: true,
            election: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            votes: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    res.json(candidates);
  } catch (error) {
    next(error);
  }
});

// Get all candidates for an election
/**
 * @openapi
 * /api/candidates/election/{electionId}:
 *   get:
 *     tags:
 *       - Candidates
 *     summary: Get candidates by election
 *     description: Retrieve all candidates for a specific election
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         required: true
 *         description: Election ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Candidates retrieved successfully
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
 *                   fullName:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *                   phone:
 *                     type: string
 *                   bio:
 *                     type: string
 *                   manifesto:
 *                     type: string
 *                   order:
 *                     type: number
 *                   isActive:
 *                     type: boolean
 *                   position:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       order:
 *                         type: number
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
router.get('/election/:electionId', async (req, res, next) => {
  try {
    const candidates = await prisma.candidate.findMany({
      where: { electionId: req.params.electionId },
      include: {
        position: {
          select: {
            id: true,
            name: true,
            order: true,
          },
        },
        _count: {
          select: {
            votes: true,
          },
        },
      },
      orderBy: [{ position: { order: 'asc' } }, { order: 'asc' }],
    });

    // Group by position
    const candidatesByPosition = candidates.reduce(
      (acc, candidate) => {
        const positionId = candidate.position.id;
        if (!acc[positionId]) {
          acc[positionId] = {
            position: candidate.position,
            candidates: [],
          };
        }
        acc[positionId].candidates.push(candidate);
        return acc;
      },
      {} as Record<string, any>
    );

    res.json(Object.values(candidatesByPosition));
  } catch (error) {
    next(error);
  }
});

// Get single candidate
router.get('/:id', async (req, res, next) => {
  try {
    const candidate = await prisma.candidate.findUnique({
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
        votes: {
          include: {
            ballot: {
              include: {
                voter: {
                  select: {
                    id: true,
                    fullName: true,
                    classYearGroup: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    res.json(candidate);
  } catch (error) {
    next(error);
  }
});

// Create candidate
router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    const candidateData = createCandidateSchema.parse(req.body);
    const { electionId, positionId } = req.body;

    if (!electionId || !positionId) {
      throw new ValidationError(
        'Election ID and Position ID are required'
      );
    }

    // Check if election and position exist and are editable
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: {
        election: true,
      },
    });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    if (position.electionId !== electionId) {
      throw new ValidationError(
        'Position does not belong to the specified election'
      );
    }

    if (['ACTIVE', 'ENDED'].includes(position.election.status)) {
      throw new ValidationError(
        'Cannot add candidates to an active or ended election'
      );
    }

    // Check for duplicate order within the position
    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        positionId,
        order: candidateData.order,
      },
    });

    if (existingCandidate) {
      throw new ConflictError(
        'A candidate with this order already exists for this position'
      );
    }

    let photoUrl: string | undefined;

    // Process uploaded photo
    if (req.file) {
      try {
        // Process image with Sharp
        const processedImage = await sharp(req.file.buffer)
          .resize(400, 400, {
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: 85 })
          .toBuffer();

        // Generate unique filename
        const filename = `${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}.webp`;

        // Upload to storage service
        const uploadResult = await uploadCandidateImage(
          processedImage,
          filename
        );

        if (!uploadResult.success) {
          throw new ValidationError('Failed to upload image');
        }

        photoUrl = uploadResult.url;
      } catch (error) {
        logger.error('Image processing error:', error);
        throw new ValidationError('Failed to process uploaded image');
      }
    }

    const candidate = await prisma.candidate.create({
      data: {
        ...candidateData,
        electionId,
        positionId,
        photoUrl,
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
      },
    });

    logger.info(
      `Candidate created: ${candidate.id} for position ${positionId}`
    );

    res.status(201).json(candidate);
  } catch (error) {
    next(error);
  }
});

// Update candidate
router.put('/:id', upload.single('photo'), async (req, res, next) => {
  try {
    const candidateData = createCandidateSchema.parse(req.body);

    const existingCandidate = await prisma.candidate.findUnique({
      where: { id: req.params.id },
      include: {
        election: true,
        position: true,
      },
    });

    if (!existingCandidate) {
      throw new NotFoundError('Candidate not found');
    }

    // Check if election is editable
    if (
      ['ACTIVE', 'ENDED'].includes(existingCandidate.election.status)
    ) {
      throw new ValidationError(
        'Cannot update candidates in an active or ended election'
      );
    }

    // Check for duplicate order within the position (excluding current candidate)
    if (candidateData.order !== existingCandidate.order) {
      const duplicateCandidate = await prisma.candidate.findFirst({
        where: {
          positionId: existingCandidate.positionId,
          order: candidateData.order,
          id: { not: req.params.id },
        },
      });

      if (duplicateCandidate) {
        throw new ConflictError(
          'A candidate with this order already exists for this position'
        );
      }
    }

    let photoUrl = existingCandidate.photoUrl;

    // Process new uploaded photo
    if (req.file) {
      try {
        // Delete old photo if it exists
        if (existingCandidate.photoUrl) {
          await deleteCandidateImage(existingCandidate.photoUrl);
        }

        // Process image with Sharp
        const processedImage = await sharp(req.file.buffer)
          .resize(400, 400, {
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: 85 })
          .toBuffer();

        // Generate unique filename
        const filename = `${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}.webp`;

        // Upload to storage service
        const uploadResult = await uploadCandidateImage(
          processedImage,
          filename
        );

        if (!uploadResult.success) {
          throw new ValidationError('Failed to upload image');
        }

        photoUrl = uploadResult.url;
      } catch (error) {
        logger.error('Image processing error:', error);
        throw new ValidationError('Failed to process uploaded image');
      }
    }

    const candidate = await prisma.candidate.update({
      where: { id: req.params.id },
      data: {
        ...candidateData,
        photoUrl,
      },
      include: {
        position: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info(`Candidate updated: ${candidate.id}`);

    res.json(candidate);
  } catch (error) {
    next(error);
  }
});

// Toggle candidate active status
router.patch('/:id/toggle-active', async (req, res, next) => {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: req.params.id },
      include: {
        election: true,
      },
    });

    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    // Check if election is editable
    if (['ACTIVE', 'ENDED'].includes(candidate.election.status)) {
      throw new ValidationError(
        'Cannot modify candidates in an active or ended election'
      );
    }

    const updatedCandidate = await prisma.candidate.update({
      where: { id: req.params.id },
      data: {
        isActive: !candidate.isActive,
      },
    });

    logger.info(
      `Candidate ${
        candidate.isActive ? 'deactivated' : 'activated'
      }: ${candidate.id}`
    );

    res.json({
      message: `Candidate ${
        candidate.isActive ? 'deactivated' : 'activated'
      } successfully`,
      candidate: updatedCandidate,
    });
  } catch (error) {
    next(error);
  }
});

// Reorder candidates within a position
router.post('/reorder', async (req, res, next) => {
  try {
    const { positionId, candidates } = req.body;

    if (!positionId || !Array.isArray(candidates)) {
      throw new ValidationError(
        'Position ID and candidates array are required'
      );
    }

    // Check if position exists and is editable
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: {
        election: true,
      },
    });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    if (['ACTIVE', 'ENDED'].includes(position.election.status)) {
      throw new ValidationError(
        'Cannot reorder candidates in an active or ended election'
      );
    }

    // Validate candidates belong to the position
    const existingCandidates = await prisma.candidate.findMany({
      where: {
        positionId,
        id: { in: candidates.map((c: any) => c.id) },
      },
    });

    if (existingCandidates.length !== candidates.length) {
      throw new ValidationError(
        'Some candidates do not belong to this position'
      );
    }

    // Update candidates in transaction
    await prisma.$transaction(
      candidates.map((candidate: any, index: number) =>
        prisma.candidate.update({
          where: { id: candidate.id },
          data: { order: index },
        })
      )
    );

    logger.info(`Candidates reordered for position ${positionId}`);

    res.json({ message: 'Candidates reordered successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete candidate
router.delete('/:id', async (req, res, next) => {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: req.params.id },
      include: {
        election: true,
        _count: {
          select: {
            votes: true,
          },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    // Check if election is editable
    if (['ACTIVE', 'ENDED'].includes(candidate.election.status)) {
      throw new ValidationError(
        'Cannot delete candidates from an active or ended election'
      );
    }

    // Prevent deletion if candidate has votes
    if (candidate._count.votes > 0) {
      throw new ValidationError(
        'Cannot delete a candidate who has received votes'
      );
    }

    // Delete photo file if it exists
    if (candidate.photoUrl) {
      await deleteCandidateImage(candidate.photoUrl);
    }

    await prisma.candidate.delete({
      where: { id: req.params.id },
    });

    logger.info(`Candidate deleted: ${req.params.id}`);

    res.json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
