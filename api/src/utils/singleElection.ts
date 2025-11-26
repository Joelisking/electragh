import { prisma } from '../server';
import { Election } from '@prisma/client';
import { logger } from './logger';
import bcrypt from 'bcrypt';

/**
 * Permanent Single Election System
 *
 * This system maintains a single permanent election that always exists.
 * Admins manage the election's visibility, state, candidates, and voters,
 * but cannot delete or create new elections.
 */

let cachedElection: Election | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5000; // 5 seconds

// Permanent election constants
const PERMANENT_ELECTION_ID = 'permanent-election-001';
const ELECTION_TITLE = 'AGOSA Election';
const ELECTION_DESCRIPTION = 'Official election for AGOSA';

/**
 * Get the permanent election
 * Returns the single permanent election instance, creating it if it doesn't exist
 */
export async function getSingleElection(): Promise<Election> {
  // Check cache first
  const now = Date.now();
  if (cachedElection && now - lastFetchTime < CACHE_DURATION) {
    return cachedElection;
  }

  // Find the permanent election
  let election = await prisma.election.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  // If no election exists, create the permanent one
  if (!election) {
    election = await ensurePermanentElection();
  }

  // Update cache
  cachedElection = election;
  lastFetchTime = now;

  return election;
}

/**
 * Ensure the permanent election exists
 * Creates the permanent election if it doesn't exist
 */
async function ensurePermanentElection(): Promise<Election> {
  logger.info('Creating permanent election');

  // Get or create the first admin user to be the creator
  let adminUser = await prisma.user.findFirst({
    where: {
      role: { in: ['ADMIN', 'EC_MEMBER'] },
    },
  });

  // If no admin exists, create a default one
  if (!adminUser) {
    logger.info('No admin user found, creating default admin');
    const defaultPassword = await bcrypt.hash('Pass123$1', 10);

    adminUser = await prisma.user.create({
      data: {
        name: 'System Administrator',
        phone: '+12603486805',
        role: 'ADMIN',
        passwordHash: defaultPassword,
      },
    });
    logger.info('Created default admin user');
  }

  // Create permanent election with sensible defaults
  const now = new Date();

  // Default to starting tomorrow at 8 AM
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() + 1);
  startDate.setHours(8, 0, 0, 0);

  // Default to ending 7 days later at 8 PM
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);
  endDate.setHours(20, 0, 0, 0);

  const election = await prisma.election.create({
    data: {
      title: ELECTION_TITLE,
      description: ELECTION_DESCRIPTION,
      timezone: 'Africa/Accra',
      startAt: startDate,
      endAt: endDate,
      status: 'DRAFT',
      visibility: 'RESTRICTED',
      allowAbstain: true,
      createdBy: adminUser.id,
    },
  });

  logger.info(`Created permanent election with ID: ${election.id}`);
  return election;
}

/**
 * Get the single election with related data
 */
export async function getSingleElectionWithDetails() {
  const election = await getSingleElection();

  return prisma.election.findUnique({
    where: { id: election.id },
    include: {
      positions: {
        include: {
          candidates: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
      _count: {
        select: {
          ballots: true,
        },
      },
    },
  });
}

/**
 * Update the single election
 */
export async function updateSingleElection(data: Partial<Election>) {
  const election = await getSingleElection();

  const updated = await prisma.election.update({
    where: { id: election.id },
    data,
  });

  // Clear cache
  cachedElection = updated;
  lastFetchTime = Date.now();

  return updated;
}

/**
 * Get the single election ID
 */
export async function getSingleElectionId(): Promise<string> {
  const election = await getSingleElection();
  return election.id;
}

/**
 * Clear the election cache (useful after updates)
 */
export function clearElectionCache() {
  cachedElection = null;
  lastFetchTime = 0;
}

/**
 * Initialize the single election system on startup
 */
export async function initializeSingleElection() {
  try {
    const election = await getSingleElection();
    logger.info(
      `Single election system initialized with election ID: ${election.id}`
    );
    return election;
  } catch (error) {
    logger.error(
      'Failed to initialize single election system',
      error
    );
    throw error;
  }
}
