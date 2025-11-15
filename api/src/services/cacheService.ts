import Redis from 'ioredis';
import { logger } from '../utils/logger';

/**
 * Redis Cache Service for high-traffic optimization
 * Reduces database load by caching frequently accessed data
 */

let redisClient: Redis | null = null;

// Cache configuration
const CACHE_CONFIG = {
  // Election data - rarely changes during voting period
  ELECTION: { ttl: 300, key: 'election:single' }, // 5 minutes
  ELECTION_DETAILS: { ttl: 180, key: 'election:details' }, // 3 minutes

  // Positions and candidates - static during voting
  POSITIONS: { ttl: 600, key: 'positions:all' }, // 10 minutes
  CANDIDATES: { ttl: 600, key: 'candidates:all' }, // 10 minutes
  CANDIDATES_BY_POSITION: { ttl: 600, prefix: 'candidates:position:' }, // 10 minutes

  // Vote counts - update frequently during active voting
  VOTE_COUNTS: { ttl: 30, prefix: 'votes:count:' }, // 30 seconds
  TURNOUT_STATS: { ttl: 60, key: 'stats:turnout' }, // 1 minute

  // Voter status - to prevent duplicate voting checks
  VOTER_STATUS: { ttl: 120, prefix: 'voter:status:' }, // 2 minutes

  // Results - cache heavily when election is not active
  RESULTS_SUMMARY: { ttl: 60, key: 'results:summary' }, // 1 minute
  RESULTS_BY_POSITION: { ttl: 60, prefix: 'results:position:' }, // 1 minute
};

/**
 * Initialize Redis connection
 */
export function initializeRedis() {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn('REDIS_URL not configured - caching disabled, will fall back to database queries');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      // Optimize for Cloud Run's connection limits
      enableReadyCheck: true,
      enableOfflineQueue: true,
      lazyConnect: false,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    return null;
  }
}

/**
 * Get Redis client
 */
export function getRedisClient(): Redis | null {
  return redisClient;
}

/**
 * Generic cache getter with fallback
 */
export async function getCached<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  if (!redisClient) {
    // No Redis available, fetch directly
    return fetchFunction();
  }

  try {
    // Try to get from cache
    const cached = await redisClient.get(key);

    if (cached) {
      logger.debug(`Cache HIT: ${key}`);
      return JSON.parse(cached) as T;
    }

    logger.debug(`Cache MISS: ${key}`);

    // Fetch fresh data
    const data = await fetchFunction();

    // Store in cache (fire and forget to not block response)
    redisClient.setex(key, ttl, JSON.stringify(data)).catch((err) => {
      logger.error(`Failed to cache ${key}:`, err);
    });

    return data;
  } catch (error) {
    logger.error(`Cache error for ${key}:`, error);
    // Fallback to direct fetch on cache error
    return fetchFunction();
  }
}

/**
 * Set cache value
 */
export async function setCache(key: string, value: any, ttl: number = 300): Promise<void> {
  if (!redisClient) return;

  try {
    await redisClient.setex(key, ttl, JSON.stringify(value));
    logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    logger.error(`Failed to set cache ${key}:`, error);
  }
}

/**
 * Delete cache entry
 */
export async function deleteCache(key: string | string[]): Promise<void> {
  if (!redisClient) return;

  try {
    const keys = Array.isArray(key) ? key : [key];
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.debug(`Cache DELETE: ${keys.join(', ')}`);
    }
  } catch (error) {
    logger.error(`Failed to delete cache:`, error);
  }
}

/**
 * Delete cache entries by pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!redisClient) return;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.debug(`Cache DELETE pattern ${pattern}: ${keys.length} keys`);
    }
  } catch (error) {
    logger.error(`Failed to delete cache pattern ${pattern}:`, error);
  }
}

/**
 * Clear all election-related caches (on updates)
 */
export async function clearElectionCaches(): Promise<void> {
  if (!redisClient) return;

  try {
    await Promise.all([
      deleteCache([
        CACHE_CONFIG.ELECTION.key,
        CACHE_CONFIG.ELECTION_DETAILS.key,
        CACHE_CONFIG.POSITIONS.key,
        CACHE_CONFIG.CANDIDATES.key,
        CACHE_CONFIG.RESULTS_SUMMARY.key,
        CACHE_CONFIG.TURNOUT_STATS.key,
      ]),
      deleteCachePattern(CACHE_CONFIG.CANDIDATES_BY_POSITION.prefix + '*'),
      deleteCachePattern(CACHE_CONFIG.RESULTS_BY_POSITION.prefix + '*'),
      deleteCachePattern(CACHE_CONFIG.VOTE_COUNTS.prefix + '*'),
    ]);
    logger.info('Cleared all election-related caches');
  } catch (error) {
    logger.error('Failed to clear election caches:', error);
  }
}

/**
 * Clear voter-specific cache
 */
export async function clearVoterCache(voterId: string): Promise<void> {
  if (!redisClient) return;

  try {
    await deleteCache(`${CACHE_CONFIG.VOTER_STATUS.prefix}${voterId}`);
    logger.debug(`Cleared cache for voter: ${voterId}`);
  } catch (error) {
    logger.error(`Failed to clear voter cache for ${voterId}:`, error);
  }
}

/**
 * Clear results cache (after vote cast or election end)
 */
export async function clearResultsCaches(): Promise<void> {
  if (!redisClient) return;

  try {
    await Promise.all([
      deleteCache([
        CACHE_CONFIG.RESULTS_SUMMARY.key,
        CACHE_CONFIG.TURNOUT_STATS.key,
      ]),
      deleteCachePattern(CACHE_CONFIG.RESULTS_BY_POSITION.prefix + '*'),
      deleteCachePattern(CACHE_CONFIG.VOTE_COUNTS.prefix + '*'),
    ]);
    logger.debug('Cleared results caches');
  } catch (error) {
    logger.error('Failed to clear results caches:', error);
  }
}

/**
 * Health check for Redis
 */
export async function checkRedisHealth(): Promise<boolean> {
  if (!redisClient) return false;

  try {
    const result = await redisClient.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

// Export cache config for use in other modules
export { CACHE_CONFIG };
