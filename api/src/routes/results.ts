import express from 'express';
import { prisma } from '../server';
import {
  authenticateAdmin,
  requireECAccess,
  AuthenticatedRequest,
} from '../middleware/auth';
import {
  NotFoundError,
  ValidationError,
} from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Get live results (EC access only)
/**
 * @openapi
 * /api/results/live/{electionId}:
 *   get:
 *     tags:
 *       - Results
 *     summary: Get live election results
 *     description: Retrieve live voting results for a specific election (EC access only)
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
 *         description: Live results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                     positions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           candidates:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                 name:
 *                                   type: string
 *                                 votes:
 *                                   type: number
 *                                 percentage:
 *                                   type: number
 *                                 classYearGroup:
 *                                   type: string
 *                                 photoUrl:
 *                                   type: string
 *                                   nullable: true
 *                 totalVoters:
 *                   type: number
 *                 totalBallots:
 *                   type: number
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - EC access required
 *       404:
 *         description: Election not found
 */
router.get(
  '/live/:electionId',
  authenticateAdmin,
  requireECAccess,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { electionId } = req.params;

      const election = await prisma.election.findUnique({
        where: { id: electionId },
        include: {
          positions: {
            where: { isActive: true },
            include: {
              candidates: {
                where: { isActive: true },
                include: {
                  _count: {
                    select: {
                      votes: true,
                    },
                  },
                },
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

      if (!election) {
        throw new NotFoundError('Election not found');
      }

      // Get total registered voters
      const totalVoters = await prisma.voter.count();

      // Get abstain votes for each position
      const abstainVotes = await prisma.vote.groupBy({
        by: ['positionId'],
        where: {
          candidateId: null,
          ballot: {
            electionId,
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
      const results = election.positions.map((position) => {
        const totalVotes = position.candidates.reduce(
          (sum, candidate) => sum + candidate._count.votes,
          0
        );

        const abstainCount = abstainMap[position.id] || 0;
        const totalWithAbstain = totalVotes + abstainCount;

        const candidateResults = position.candidates.map(
          (candidate) => ({
            id: candidate.id,
            name: candidate.fullName,
            classYearGroup: candidate.classYearGroup,
            photoUrl: candidate.photoUrl,
            votes: candidate._count.votes,
            percentage:
              totalWithAbstain > 0
                ? Math.round(
                    (candidate._count.votes / totalWithAbstain) *
                      10000
                  ) / 100
                : 0,
          })
        );

        // Sort by votes descending
        candidateResults.sort((a, b) => b.votes - a.votes);

        return {
          positionId: position.id,
          positionName: position.name,
          totalVotes: totalWithAbstain,
          validVotes: totalVotes,
          abstainVotes: abstainCount,
          candidates: candidateResults,
          winner:
            candidateResults.length > 0 &&
            candidateResults[0].votes > 0
              ? candidateResults[0]
              : null,
        };
      });

      // Calculate overall statistics
      const totalBallotsCast = election._count.ballots;
      const turnoutRate =
        totalVoters > 0 ? (totalBallotsCast / totalVoters) * 100 : 0;

      // Get voting timeline (votes per hour)
      const votingTimeline = await prisma.ballot.groupBy({
        by: ['castAt'],
        where: { electionId },
        _count: { id: true },
        orderBy: { castAt: 'asc' },
      });

      // Group by hour
      const timelineByHour = votingTimeline.reduce((acc, ballot) => {
        const hour =
          new Date(ballot.castAt).toISOString().slice(0, 13) +
          ':00:00.000Z';
        acc[hour] = (acc[hour] || 0) + ballot._count.id;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        electionId: election.id,
        electionTitle: election.title,
        status: election.status,
        startAt: election.startAt,
        endAt: election.endAt,
        statistics: {
          totalVoters,
          totalBallotsCast,
          turnoutRate: Math.round(turnoutRate * 100) / 100,
          positionsCount: election.positions.length,
          candidatesCount: election.positions.reduce(
            (sum, p) => sum + p.candidates.length,
            0
          ),
        },
        results,
        timeline: Object.entries(timelineByHour).map(
          ([hour, count]) => ({
            hour,
            votes: count,
          })
        ),
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get public results (no authentication required)
/**
 * @openapi
 * /api/results/public/{electionId}:
 *   get:
 *     tags:
 *       - Results
 *     summary: Get public election results
 *     description: Retrieve public voting results for a specific election (no authentication required)
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
 *         description: Public results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                     positions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           candidates:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                 name:
 *                                   type: string
 *                                 votes:
 *                                   type: number
 *                                 percentage:
 *                                   type: number
 *                                 classYearGroup:
 *                                   type: string
 *                                 photoUrl:
 *                                   type: string
 *                                   nullable: true
 *                 totalVoters:
 *                   type: number
 *                 totalBallots:
 *                   type: number
 *                 turnoutRate:
 *                   type: number
 *       404:
 *         description: Election not found
 */
router.get(
  '/public/:electionId',
  async (req, res, next) => {
    try {
      const { electionId } = req.params;

      const election = await prisma.election.findUnique({
        where: { id: electionId },
        include: {
          positions: {
            where: { isActive: true },
            include: {
              candidates: {
                where: { isActive: true },
                include: {
                  _count: {
                    select: {
                      votes: true,
                    },
                  },
                },
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

      if (!election) {
        throw new NotFoundError('Election not found');
      }

      // Get total registered voters
      const totalVoters = await prisma.voter.count();

      // Calculate results for each position
      const positions = election.positions.map((position) => {
        const totalVotes = position.candidates.reduce(
          (sum, candidate) => sum + candidate._count.votes,
          0
        );

        const candidateResults = position.candidates.map(
          (candidate) => ({
            id: candidate.id,
            name: candidate.fullName,
            classYearGroup: candidate.classYearGroup,
            photoUrl: candidate.photoUrl,
            votes: candidate._count.votes,
            percentage:
              totalVotes > 0
                ? Math.round((candidate._count.votes / totalVotes) * 10000) / 100
                : 0,
          })
        );

        // Sort by votes descending
        candidateResults.sort((a, b) => b.votes - a.votes);

        return {
          id: position.id,
          name: position.name,
          candidates: candidateResults,
        };
      });

      const totalBallots = election._count.ballots;
      const turnoutRate = totalVoters > 0 ? (totalBallots / totalVoters) * 100 : 0;

      res.json({
        election: {
          id: election.id,
          title: election.title,
          status: election.status,
          positions,
        },
        totalVoters,
        totalBallots,
        turnoutRate: Math.round(turnoutRate * 100) / 100,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get final results (public if enabled)
router.get(
  '/final/:electionId',
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { electionId } = req.params;

      const election = await prisma.election.findUnique({
        where: { id: electionId },
        include: {
          positions: {
            where: { isActive: true },
            include: {
              candidates: {
                where: { isActive: true },
                include: {
                  _count: {
                    select: {
                      votes: true,
                    },
                  },
                },
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!election) {
        throw new NotFoundError('Election not found');
      }

      // Check if results are public
      if (
        election.visibility === 'RESTRICTED' &&
        election.status !== 'ENDED'
      ) {
        // Check if user is authenticated and has permission
        if (
          !req.user ||
          !['ADMIN', 'EC_MEMBER'].includes(req.user.role)
        ) {
          throw new ValidationError('Results are not yet public');
        }
      }

      // Only show final results if election has ended
      if (
        election.status !== 'ENDED' &&
        election.visibility !== 'LIVE_PUBLIC'
      ) {
        throw new ValidationError(
          'Final results are only available after the election ends'
        );
      }

      // Get abstain votes for each position
      const abstainVotes = await prisma.vote.groupBy({
        by: ['positionId'],
        where: {
          candidateId: null,
          ballot: {
            electionId,
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

      // Calculate final results
      const results = election.positions.map((position) => {
        const totalVotes = position.candidates.reduce(
          (sum, candidate) => sum + candidate._count.votes,
          0
        );

        const abstainCount = abstainMap[position.id] || 0;
        const totalWithAbstain = totalVotes + abstainCount;

        const candidateResults = position.candidates.map(
          (candidate) => ({
            id: candidate.id,
            name: candidate.fullName,
            classYearGroup: candidate.classYearGroup,
            photoUrl: candidate.photoUrl,
            votes: candidate._count.votes,
            percentage:
              totalWithAbstain > 0
                ? Math.round(
                    (candidate._count.votes / totalWithAbstain) *
                      10000
                  ) / 100
                : 0,
          })
        );

        // Sort by votes descending
        candidateResults.sort((a, b) => b.votes - a.votes);

        // Determine winner (candidate with most votes, if any)
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

      res.json({
        electionId: election.id,
        electionTitle: election.title,
        description: election.description,
        status: election.status,
        startAt: election.startAt,
        endAt: election.endAt,
        results,
        publishedAt: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Export results as CSV
router.get(
  '/export/:electionId',
  authenticateAdmin,
  requireECAccess,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { electionId } = req.params;
      const { format = 'csv' } = req.query;

      const election = await prisma.election.findUnique({
        where: { id: electionId },
        include: {
          positions: {
            include: {
              candidates: {
                include: {
                  votes: {
                    include: {
                      ballot: {
                        include: {
                          voter: {
                            select: {
                              fullName: true,
                              classYearGroup: true,
                              phone: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!election) {
        throw new NotFoundError('Election not found');
      }

      if (format === 'csv') {
        // Generate CSV export
        let csvContent =
          'Position,Candidate,Class/Year,Votes,Percentage\n';

        for (const position of election.positions) {
          const totalVotes = position.candidates.reduce(
            (sum, candidate) => sum + candidate.votes.length,
            0
          );

          for (const candidate of position.candidates) {
            const votes = candidate.votes.length;
            const percentage =
              totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

            csvContent += `"${position.name}","${
              candidate.fullName
            }","${
              candidate.classYearGroup || ''
            }",${votes},${percentage.toFixed(2)}\n`;
          }
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="election-results-${election.id}.csv"`
        );
        res.send(csvContent);
      } else {
        // JSON export
        const results = election.positions.map((position) => ({
          position: position.name,
          candidates: position.candidates.map((candidate) => ({
            name: candidate.fullName,
            classYear: candidate.classYearGroup,
            votes: candidate.votes.length,
            voters: candidate.votes.map((vote) => ({
              voterName: vote.ballot.voter.fullName,
              voterClass: vote.ballot.voter.classYearGroup,
              votedAt: vote.castAt,
            })),
          })),
        }));

        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="election-results-${election.id}.json"`
        );
        res.json({
          election: {
            id: election.id,
            title: election.title,
            startAt: election.startAt,
            endAt: election.endAt,
          },
          results,
          exportedAt: new Date().toISOString(),
        });
      }

      logger.info(
        `Results exported for election ${electionId} by user ${
          req.user!.id
        }`
      );
    } catch (error) {
      next(error);
    }
  }
);

// Get turnout statistics
router.get(
  '/turnout/:electionId',
  authenticateAdmin,
  requireECAccess,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { electionId } = req.params;

      const election = await prisma.election.findUnique({
        where: { id: electionId },
      });

      if (!election) {
        throw new NotFoundError('Election not found');
      }

      // Get total voters and votes cast
      const [totalVoters, totalBallots] = await Promise.all([
        prisma.voter.count(),
        prisma.ballot.count({ where: { electionId } }),
      ]);

      // Get turnout by class/year group
      const turnoutByClass = await prisma.ballot.groupBy({
        by: ['voterId'],
        where: { electionId },
        _count: { id: true },
      });

      // Get voter class distribution
      const votersByClass = await prisma.voter.groupBy({
        by: ['classYearGroup'],
        _count: { id: true },
        where: { classYearGroup: { not: null } },
      });

      // Get voting timeline (by hour)
      const votingTimeline = await prisma.ballot.findMany({
        where: { electionId },
        select: { castAt: true },
        orderBy: { castAt: 'asc' },
      });

      // Group by hour
      const timelineByHour = votingTimeline.reduce((acc, ballot) => {
        const hour = new Date(ballot.castAt).getHours();
        const date = new Date(ballot.castAt).toDateString();
        const key = `${date} ${hour}:00`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const turnoutRate =
        totalVoters > 0 ? (totalBallots / totalVoters) * 100 : 0;

      res.json({
        electionId,
        totalVoters,
        totalBallots,
        turnoutRate: Math.round(turnoutRate * 100) / 100,
        votersByClass: votersByClass.reduce((acc, item) => {
          if (item.classYearGroup) {
            acc[item.classYearGroup] = item._count.id;
          }
          return acc;
        }, {} as Record<string, number>),
        timeline: Object.entries(timelineByHour)
          .map(([time, count]) => ({
            time,
            votes: count,
          }))
          .sort(
            (a, b) =>
              new Date(a.time).getTime() - new Date(b.time).getTime()
          ),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
