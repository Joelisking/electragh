import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, TrendingUp } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  classYearGroup?: string;
  votes: number;
  percentage: number;
}

interface Position {
  positionId: string;
  positionName: string;
  totalVotes: number;
  candidates: Candidate[];
}

interface LeadingCandidatesProps {
  positions: Position[];
}

export function LeadingCandidates({ positions }: LeadingCandidatesProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankColor = (rank: number) => {
    if (rank === 0) return 'from-yellow-400 to-yellow-600'; // Gold
    if (rank === 1) return 'from-gray-300 to-gray-500'; // Silver
    if (rank === 2) return 'from-orange-400 to-orange-600'; // Bronze
    return 'from-blue-400 to-blue-600';
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 0) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank === 1) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (rank === 2) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50/50 shadow-lg border-electra-primary/10 hover:shadow-xl transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-electra-primary/5 to-electra-secondary/5 rounded-t-lg border-b border-gray-100">
        <CardTitle className="flex items-center gap-3 text-electra-secondary">
          <div className="p-2 bg-electra-primary/10 rounded-lg">
            <Trophy className="w-5 h-5 text-electra-primary" />
          </div>
          Leading Candidates
        </CardTitle>
        <CardDescription>
          Current leaders for each position in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {positions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No results available yet</p>
            </div>
          ) : (
            positions.map((position) => {
              const leader = position.candidates[0]; // Already sorted by votes
              const hasVotes = position.totalVotes > 0;

              return (
                <div
                  key={position.positionId}
                  className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition-all duration-200">
                  {/* Position Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-electra-primary" />
                      {position.positionName}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {position.totalVotes} votes
                    </Badge>
                  </div>

                  {/* Top 3 Candidates */}
                  {hasVotes ? (
                    <div className="space-y-3">
                      {position.candidates.slice(0, 3).map((candidate, index) => (
                        <div
                          key={candidate.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:border-electra-primary/30 transition-all duration-200">
                          {/* Rank Badge */}
                          <div
                            className={`w-10 h-10 rounded-full bg-gradient-to-br ${getRankColor(
                              index
                            )} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                            {index + 1}
                          </div>

                          {/* Avatar */}
                          <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                            <AvatarImage src={undefined} />
                            <AvatarFallback className="bg-blue-600 text-white text-sm">
                              {getInitials(candidate.name)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Candidate Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 truncate">
                                {candidate.name}
                              </p>
                              {index === 0 && (
                                <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                              )}
                            </div>
                            {candidate.classYearGroup && (
                              <p className="text-xs text-gray-600">
                                Class of {candidate.classYearGroup}
                              </p>
                            )}
                          </div>

                          {/* Vote Stats */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-electra-primary">
                              {candidate.votes}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getRankBadgeColor(index)}`}>
                              {candidate.percentage}%
                            </Badge>
                          </div>
                        </div>
                      ))}

                      {/* Show count of remaining candidates */}
                      {position.candidates.length > 3 && (
                        <p className="text-sm text-gray-500 text-center pt-2">
                          +{position.candidates.length - 3} more candidate
                          {position.candidates.length - 3 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No votes cast yet
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
