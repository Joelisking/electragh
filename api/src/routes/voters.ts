import express from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { prisma } from '../server';
import {
  authenticateAdmin,
  requireECAccess,
} from '../middleware/auth';
import {
  createVoterSchema,
  importVotersSchema,
  ghanaPhoneSchema,
} from '../utils/validation';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only CSV and Excel files are allowed.'
        )
      );
    }
  },
});

// All routes require admin authentication
router.use(authenticateAdmin);
router.use(requireECAccess);

// Get all voters with pagination and filtering
/**
 * @openapi
 * /api/voters:
 *   get:
 *     tags:
 *       - Voters
 *     summary: Get all voters
 *     description: Retrieve a paginated list of voters with optional filtering and search
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number for pagination
 *         schema:
 *           type: string
 *           default: "1"
 *       - name: limit
 *         in: query
 *         description: Number of voters per page
 *         schema:
 *           type: string
 *           default: "50"
 *       - name: search
 *         in: query
 *         description: Search term for name, phone, or unique identifier
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         description: Filter by voter status
 *         schema:
 *           type: string
 *       - name: classYearGroup
 *         in: query
 *         description: Filter by class year group
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Voters retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 voters:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       fullName:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       uniqueIdentifier:
 *                         type: string
 *                       status:
 *                         type: string
 *                       classYearGroup:
 *                         type: string
 *                       isVerified:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - EC access required
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '50',
      search,
      status,
      classYearGroup,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        {
          fullName: {
            contains: search as string,
            mode: 'insensitive',
          },
        },
        { phone: { contains: search as string } },
        {
          uniqueIdentifier: {
            contains: search as string,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (classYearGroup) {
      where.classYearGroup = classYearGroup;
    }

    const [voters, total] = await Promise.all([
      prisma.voter.findMany({
        where,
        skip: offset,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          phone: true,
          classYearGroup: true,
          uniqueIdentifier: true,
          status: true,
          hasVoted: true,
          votedAt: true,
          createdAt: true,
          lastLoginAt: true,
        },
      }),
      prisma.voter.count({ where }),
    ]);

    res.json({
      voters,
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

// Get voter statistics
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalVoters,
      verifiedVoters,
      votedCount,
      statusCounts,
      classYearGroups,
    ] = await Promise.all([
      prisma.voter.count(),
      prisma.voter.count({ where: { status: 'VERIFIED' } }),
      prisma.voter.count({ where: { hasVoted: true } }),
      prisma.voter.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.voter.groupBy({
        by: ['classYearGroup'],
        _count: { classYearGroup: true },
        where: { classYearGroup: { not: null } },
      }),
    ]);

    const turnoutRate =
      totalVoters > 0 ? (votedCount / totalVoters) * 100 : 0;

    res.json({
      totalVoters,
      verifiedVoters,
      votedCount,
      turnoutRate: Math.round(turnoutRate * 100) / 100,
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>),
      classYearBreakdown: classYearGroups.reduce((acc, item) => {
        if (item.classYearGroup) {
          acc[item.classYearGroup] = item._count.classYearGroup;
        }
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    next(error);
  }
});

// Get single voter
router.get('/:id', async (req, res, next) => {
  try {
    const voter = await prisma.voter.findUnique({
      where: { id: req.params.id },
      include: {
        ballots: {
          include: {
            votes: {
              include: {
                position: { select: { name: true } },
                candidate: { select: { fullName: true } },
              },
            },
          },
        },
        smsMessages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!voter) {
      throw new NotFoundError('Voter not found');
    }

    res.json(voter);
  } catch (error) {
    next(error);
  }
});

// Create single voter
/**
 * @openapi
 * /api/voters:
 *   post:
 *     tags:
 *       - Voters
 *     summary: Create new voter
 *     description: Create a new voter with the provided information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - phone
 *               - classYearGroup
 *               - uniqueIdentifier
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 description: Full name of the voter
 *               phone:
 *                 type: string
 *                 description: Ghana phone number
 *               classYearGroup:
 *                 type: string
 *                 description: Class year group of the voter
 *               uniqueIdentifier:
 *                 type: string
 *                 description: Unique identifier for the voter
 *               status:
 *                 type: string
 *                 description: Status of the voter
 *                 default: "active"
 *     responses:
 *       201:
 *         description: Voter created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 fullName:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 classYearGroup:
 *                   type: string
 *                 uniqueIdentifier:
 *                   type: string
 *                 status:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - EC access required
 *       409:
 *         description: Conflict - Phone number already exists
 */
router.post('/', async (req, res, next) => {
  try {
    const voterData = createVoterSchema.parse(req.body);

    // Check for duplicate phone number
    const existingVoter = await prisma.voter.findUnique({
      where: { phone: voterData.phone },
    });

    if (existingVoter) {
      throw new ConflictError(
        'A voter with this phone number already exists'
      );
    }

    const voter = await prisma.voter.create({
      data: voterData,
      select: {
        id: true,
        fullName: true,
        phone: true,
        classYearGroup: true,
        uniqueIdentifier: true,
        status: true,
        createdAt: true,
      },
    });

    logger.info(`Voter created: ${voter.id} (${voter.phone})`);

    res.status(201).json(voter);
  } catch (error) {
    next(error);
  }
});

// Update voter
/**
 * @openapi
 * /api/voters/{id}:
 *   put:
 *     tags:
 *       - Voters
 *     summary: Update voter
 *     description: Update an existing voter's information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Voter ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - phone
 *               - classYearGroup
 *               - uniqueIdentifier
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 description: Full name of the voter
 *               phone:
 *                 type: string
 *                 description: Ghana phone number
 *               classYearGroup:
 *                 type: string
 *                 description: Class year group of the voter
 *               uniqueIdentifier:
 *                 type: string
 *                 description: Unique identifier for the voter
 *               status:
 *                 type: string
 *                 description: Status of the voter
 *     responses:
 *       200:
 *         description: Voter updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 fullName:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 classYearGroup:
 *                   type: string
 *                 uniqueIdentifier:
 *                   type: string
 *                 status:
 *                   type: string
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - EC access required
 *       404:
 *         description: Voter not found
 *       409:
 *         description: Conflict - Phone number already exists
 */
router.put('/:id', async (req, res, next) => {
  try {
    const voterData = createVoterSchema.parse(req.body);

    // Check if voter exists
    const existingVoter = await prisma.voter.findUnique({
      where: { id: req.params.id },
    });

    if (!existingVoter) {
      throw new NotFoundError('Voter not found');
    }

    // Check for duplicate phone number (excluding current voter)
    if (voterData.phone !== existingVoter.phone) {
      const duplicateVoter = await prisma.voter.findUnique({
        where: { phone: voterData.phone },
      });

      if (duplicateVoter) {
        throw new ConflictError(
          'A voter with this phone number already exists'
        );
      }
    }

    const voter = await prisma.voter.update({
      where: { id: req.params.id },
      data: voterData,
      select: {
        id: true,
        fullName: true,
        phone: true,
        classYearGroup: true,
        uniqueIdentifier: true,
        status: true,
        updatedAt: true,
      },
    });

    logger.info(`Voter updated: ${voter.id} (${voter.phone})`);

    res.json(voter);
  } catch (error) {
    next(error);
  }
});

// Delete voter (soft delete)
/**
 * @openapi
 * /api/voters/{id}:
 *   delete:
 *     tags:
 *       - Voters
 *     summary: Delete voter
 *     description: Soft delete a voter (marks as inactive)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Voter ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Voter deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Voter deleted successfully"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - EC access required
 *       404:
 *         description: Voter not found
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const voter = await prisma.voter.findUnique({
      where: { id: req.params.id },
    });

    if (!voter) {
      throw new NotFoundError('Voter not found');
    }

    // Check if voter has voted
    if (voter.hasVoted) {
      throw new ValidationError(
        'Cannot delete a voter who has already voted'
      );
    }

    await prisma.voter.delete({
      where: { id: req.params.id },
    });

    logger.info(`Voter deleted: ${req.params.id} (${voter.phone})`);

    res.json({ message: 'Voter deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Bulk import voters from CSV/Excel
router.post(
  '/import',
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError('File is required');
      }

      let votersData: any[] = [];

      // Parse file based on type
      if (req.file.mimetype === 'text/csv') {
        const csvText = req.file.buffer.toString('utf-8');
        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) =>
            header.toLowerCase().replace(/\s+/g, '_'),
        });
        votersData = parsed.data as any[];
      } else {
        // Excel file
        const workbook = XLSX.read(req.file.buffer, {
          type: 'buffer',
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as any[][];

        if (jsonData.length < 2) {
          throw new ValidationError(
            'Excel file must have at least a header row and one data row'
          );
        }

        // Convert to object format
        const headers = jsonData[0].map((h: string) =>
          h.toLowerCase().replace(/\s+/g, '_')
        );
        votersData = jsonData.slice(1).map((row) => {
          const obj: any = {};
          headers.forEach((header: string, index: number) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });
      }

      // Validate and normalize data
      const validVoters: any[] = [];
      const errors: any[] = [];

      for (let i = 0; i < votersData.length; i++) {
        const row = votersData[i];
        const rowNum = i + 1;

        try {
          // Normalize phone number
          let phone = row.phone?.toString().trim();
          if (
            phone &&
            !phone.startsWith('+233') &&
            !phone.startsWith('0')
          ) {
            phone = '+233' + phone;
          }

          const voterData = {
            full_name: row.full_name?.toString().trim(),
            phone: phone,
            class_year_group:
              row.class_year_group?.toString().trim() || undefined,
            unique_id: row.unique_id?.toString().trim() || undefined,
          };

          // Validate using schema
          const validatedVoter =
            importVotersSchema.element.parse(voterData);
          validVoters.push({
            ...validatedVoter,
            rowNumber: rowNum,
          });
        } catch (error: any) {
          errors.push({
            row: rowNum,
            data: row,
            errors: error.errors || [{ message: error.message }],
          });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation errors found',
          validCount: validVoters.length,
          errorCount: errors.length,
          errors: errors.slice(0, 10), // Limit to first 10 errors
          totalErrors: errors.length,
        });
      }

      // Check for duplicates within the import
      const phoneNumbers = validVoters.map((v) => v.phone);
      const duplicatePhones = phoneNumbers.filter(
        (phone, index) => phoneNumbers.indexOf(phone) !== index
      );

      if (duplicatePhones.length > 0) {
        return res.status(400).json({
          error: 'Duplicate phone numbers found in import',
          duplicates: [...new Set(duplicatePhones)],
        });
      }

      // Check for existing voters in database
      const existingVoters = await prisma.voter.findMany({
        where: {
          phone: { in: phoneNumbers },
        },
        select: { phone: true, fullName: true },
      });

      if (existingVoters.length > 0) {
        return res.status(409).json({
          error: 'Some voters already exist in the database',
          existing: existingVoters,
          message:
            'Please remove existing voters from your import file or use update functionality',
        });
      }

      // Import voters in batches
      const batchSize = 100;
      const importedVoters: any[] = [];

      for (let i = 0; i < validVoters.length; i += batchSize) {
        const batch = validVoters.slice(i, i + batchSize);
        const votersToCreate = batch.map((voter) => ({
          fullName: voter.full_name,
          phone: voter.phone,
          classYearGroup: voter.class_year_group,
          uniqueIdentifier: voter.unique_id,
          status: 'INVITED' as const,
        }));

        const createdVoters = await prisma.voter.createMany({
          data: votersToCreate,
          skipDuplicates: true,
        });

        importedVoters.push(...votersToCreate);
      }

      logger.info(
        `Bulk import completed: ${importedVoters.length} voters imported`
      );

      res.json({
        message: 'Voters imported successfully',
        imported: importedVoters.length,
        total: validVoters.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Send test SMS to voter
router.post('/:id/send-test-sms', async (req, res, next) => {
  try {
    const voter = await prisma.voter.findUnique({
      where: { id: req.params.id },
    });

    if (!voter) {
      throw new NotFoundError('Voter not found');
    }

    // Create SMS message record
    await prisma.smsMessage.create({
      data: {
        voterId: voter.id,
        type: 'ADMIN_NOTIFICATION',
        to: voter.phone,
        body: `Test message from Ghana Election Platform. This is to verify your phone number is working correctly. - Electoral Commission`,
        provider: 'mock',
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    logger.info(
      `Test SMS sent to voter ${voter.id} (${voter.phone})`
    );

    res.json({ message: 'Test SMS sent successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
