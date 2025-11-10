import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vote, Users, CheckCircle, Settings } from 'lucide-react';

interface ElectionStatsProps {
  positionsCount: number;
  candidatesCount: number;
  votesCount: number;
}

export function ElectionStats({
  positionsCount,
  candidatesCount,
  votesCount,
}: ElectionStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="bg-gradient-to-br from-white to-blue-50/30 shadow-lg border-blue-200/30 hover:shadow-xl hover:scale-105 transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">
                Positions
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {positionsCount}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-white to-electra-primary-light/30 shadow-lg border-electra-primary/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">
                Candidates
              </p>
              <p className="text-3xl font-bold text-electra-primary">
                {candidatesCount}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-white to-purple-50/30 shadow-lg border-purple-200/30 hover:shadow-xl hover:scale-105 transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">
                Votes Cast
              </p>
              <p className="text-3xl font-bold text-purple-600">
                {votesCount}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-white to-electra-secondary/10 shadow-lg border-electra-secondary/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">
                System
              </p>
              <Badge className="bg-electra-primary-light/50 text-electra-secondary border border-electra-primary/30 mt-2 shadow-sm hover:shadow-md transition-all duration-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Operational
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
