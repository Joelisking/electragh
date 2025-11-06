import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3 } from 'lucide-react';

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

interface PositionResultsProps {
  positions: Position[];
}

export function PositionResults({ positions }: PositionResultsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Detailed Results
        </CardTitle>
        <CardDescription>Complete breakdown of all positions and candidates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {positions.map((position) => (
            <div key={position.positionId} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg">{position.positionName}</h3>
                <span className="text-sm text-gray-600">{position.totalVotes} total votes</span>
              </div>
              <div className="space-y-3">
                {position.candidates.map((candidate, index) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          index === 0
                            ? 'bg-yellow-500'
                            : index === 1
                            ? 'bg-gray-400'
                            : 'bg-orange-600'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{candidate.name}</span>
                        {candidate.classYearGroup && (
                          <span className="text-sm text-gray-600 ml-2">
                            ({candidate.classYearGroup})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold">{candidate.votes} votes</div>
                        <div className="text-sm text-gray-600">{candidate.percentage}%</div>
                      </div>
                      <div className="w-20">
                        <Progress value={candidate.percentage} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
