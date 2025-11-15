import { prisma } from '../server';
import { getCached, CACHE_CONFIG, clearResultsCaches } from './cacheService';
import { logger } from '../utils/logger';

/**
 * Optimized Results Service with Caching
 * Designed for high-traffic scenarios with thousands of voters
 */

interface VoteCount {
  positionId: string;
  candidateId: string | null;
  count: number;
}

interface TurnoutStats {
  totalVoters: number;
  totalBallots: number;
  turnoutRate: number;
  hasVotedCount: number;
}

/**
 * Get vote counts for an election using optimized query
 * This reduces N+1 queries by using groupBy
 */
export async function getVoteCounts(electionId: string): Promise<VoteCount[]> {
  const cacheKey = `${CACHE_CONFIG.VOTE_COUNTS.prefix}${electionId}`;

  return getCached(
    cacheKey,
    async () => {
      // Use raw SQL for maximum performance
      const voteCounts = await prisma.$queryRaw<VoteCount[]>`
        SELECT
          v."positionId",
          v."candidateId",
          COUNT(*)::int as count
        FROM votes v
        INNER JOIN ballots b ON b.id = v."ballotId"
        WHERE b."electionId" = ${electionId}
        GROUP BY v."positionId", v."candidateId"
      `;

      return voteCounts;
    },
    CACHE_CONFIG.VOTE_COUNTS.ttl
  );
}

/**
 * Get turnout statistics with caching
 */
export async function getTurnoutStats(electionId: string): Promise<TurnoutStats> {
  return getCached(
    CACHE_CONFIG.TURNOUT_STATS.key,
    async () => {
      const [totalVoters, totalBallots, hasVotedCount] = await Promise.all([
        prisma.voter.count(),
        prisma.ballot.count({ where: { electionId } }),
        prisma.voter.count({ where: { hasVoted: true } }),
      ]);

      const turnoutRate = totalVoters > 0 ? (totalBallots / totalVoters) * 100 : 0;

      return {
        totalVoters,
        totalBallots,
        turnoutRate,
        hasVotedCount,
      };
    },
    CACHE_CONFIG.TURNOUT_STATS.ttl
  );
}

/**
 * Build vote count map for quick lookups
 */
function buildVoteCountMap(voteCounts: VoteCount[]): {
  byCandidate: Map<string, number>;
  abstainByPosition: Map<string, number>;
} {
  const byCandidate = new Map<string, number>();
  const abstainByPosition = new Map<string, number>();

  for (const voteCount of voteCounts) {
    if (voteCount.candidateId === null) {
      // Abstain vote
      abstainByPosition.set(voteCount.positionId, voteCount.count);
    } else {
      // Candidate vote
      byCandidate.set(voteCount.candidateId, voteCount.count);
    }
  }

  return { byCandidate, abstainByPosition };
}

/**
 * Get comprehensive results summary for an election
 * Optimized with single query for all vote counts
 */
export async function getElectionResults(electionId: string) {
  const cacheKey = `${CACHE_CONFIG.RESULTS_BY_POSITION.prefix}${electionId}`;

  return getCached(
    cacheKey,
    async () => {
      // Fetch election with positions and candidates (lightweight query)
      const election = await prisma.election.findUnique({
        where: { id: electionId },
        include: {
          positions: {
            where: { isActive: true },
            include: {
              candidates: {
                where: { isActive: true },
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  fullName: true,
                  classYearGroup: true,
                  photoUrl: true,
                  order: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!election) {
        return null;
      }

      // Get all vote counts in one optimized query
      const voteCounts = await getVoteCounts(electionId);
      const { byCandidate, abstainByPosition } = buildVoteCountMap(voteCounts);

      // Calculate results for each position
      const results = election.positions.map((position) => {
        // Calculate total votes for this position
        let totalVotes = 0;
        const candidateResults = position.candidates.map((candidate) => {
          const votes = byCandidate.get(candidate.id) || 0;
          totalVotes += votes;

          return {
            id: candidate.id,
            name: candidate.fullName,
            classYearGroup: candidate.classYearGroup,
            photoUrl: candidate.photoUrl,
            votes,
            percentage: 0, // Will calculate after we know total
          };
        });

        // Add abstain votes to total
        const abstainCount = abstainByPosition.get(position.id) || 0;
        const totalWithAbstain = totalVotes + abstainCount;

        // Calculate percentages
        candidateResults.forEach((candidate) => {
          candidate.percentage =
            totalWithAbstain > 0
              ? Math.round((candidate.votes / totalWithAbstain) * 10000) / 100
              : 0;
        });

        // Sort by votes descending
        candidateResults.sort((a, b) => b.votes - a.votes);

        // Determine winner
        const winner =
          candidateResults.length > 0 && candidateResults[0].votes > 0
            ? candidateResults[0]
            : null;

        return {
          positionId: position.id,
          positionName: position.name,
          totalVotes: totalWithAbstain,
          validVotes: totalVotes,
          abstainVotes: abstainCount,
          candidates: candidateResults,
          winner,
        };
      });

      return {
        electionId: election.id,
        electionTitle: election.title,
        status: election.status,
        startAt: election.startAt,
        endAt: election.endAt,
        visibility: election.visibility,
        results,
      };
    },
    CACHE_CONFIG.RESULTS_BY_POSITION.ttl
  );
}

/**
 * Get voting timeline with hourly breakdown
 * Optimized with single query and aggregation
 */
export async function getVotingTimeline(electionId: string) {
  // Use raw SQL for efficient hourly aggregation
  const timeline = await prisma.$queryRaw<
    Array<{ hour: string; count: number }>
  >`
    SELECT
      DATE_TRUNC('hour', "castAt") as hour,
      COUNT(*)::int as count
    FROM ballots
    WHERE "electionId" = ${electionId}
    GROUP BY DATE_TRUNC('hour', "castAt")
    ORDER BY hour ASC
  `;

  return timeline.map((item) => ({
    hour: item.hour,
    votes: item.count,
  }));
}

/**
 * Clear results cache (call after vote is cast)
 */
export async function clearResultsCache(): Promise<void> {
  await clearResultsCaches();
  logger.debug('Results cache cleared');
}

/**
 * Get candidate vote count (cached individually)
 */
export async function getCandidateVoteCount(
  candidateId: string,
  electionId: string
): Promise<number> {
  const voteCounts = await getVoteCounts(electionId);
  const { byCandidate } = buildVoteCountMap(voteCounts);
  return byCandidate.get(candidateId) || 0;
}

/**
 * Get real-time stats for admin dashboard
 */
export async function getDashboardStats(electionId: string) {
  const [results, turnout, timeline] = await Promise.all([
    getElectionResults(electionId),
    getTurnoutStats(electionId),
    getVotingTimeline(electionId),
  ]);

  if (!results) {
    return null;
  }

  return {
    ...results,
    statistics: {
      totalVoters: turnout.totalVoters,
      totalBallotsCast: turnout.totalBallots,
      turnoutRate: Math.round(turnout.turnoutRate * 100) / 100,
      hasVotedCount: turnout.hasVotedCount,
      positionsCount: results.results.length,
      candidatesCount: results.results.reduce(
        (sum, p) => sum + p.candidates.length,
        0
      ),
    },
    timeline,
    lastUpdated: new Date().toISOString(),
  };
}
