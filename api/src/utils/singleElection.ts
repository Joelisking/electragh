import { prisma } from '../server';
import { Election } from '@prisma/client';
import { logger } from './logger';

/**
 * Single Election System Utilities
 *
 * This system is designed to manage a single election at a time.
 * The election is automatically created if it doesn't exist.
 */

let cachedElection: Election | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5000; // 5 seconds

/**
 * Get or create the single election
 * Returns the single election instance, creating it if it doesn't exist
 */
export async function getSingleElection(): Promise<Election> {
  // Check cache first
  const now = Date.now();
  if (cachedElection && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedElection;
  }

  // Find the first election (should only be one)
  let election = await prisma.election.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  // If no election exists, create a default one
  if (!election) {
    logger.info('No election found, creating default election');

    // Get the first admin user to be the creator
    const adminUser = await prisma.user.findFirst({
      where: {
        role: { in: ['ADMIN', 'EC_MEMBER'] },
      },
    });

    if (!adminUser) {
      throw new Error('No admin user found to create election');
    }

    // Create default election with reasonable defaults
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(8, 0, 0, 0); // 8 AM today

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7); // 7 days from start
    endDate.setHours(20, 0, 0, 0); // 8 PM

    election = await prisma.election.create({
      data: {
        title: 'School Election',
        description: 'Official school election for student leadership positions',
        timezone: 'Africa/Accra',
        startAt: startDate,
        endAt: endDate,
        status: 'DRAFT',
        visibility: 'RESTRICTED',
        allowAbstain: true,
        createdBy: adminUser.id,
      },
    });

    logger.info(`Created default election with ID: ${election.id}`);
  }

  // Update cache
  cachedElection = election;
  lastFetchTime = now;

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
    logger.info(`Single election system initialized with election ID: ${election.id}`);
    return election;
  } catch (error) {
    logger.error('Failed to initialize single election system', error);
    throw error;
  }
}
