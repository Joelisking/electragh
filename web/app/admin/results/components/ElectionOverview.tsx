import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Vote } from 'lucide-react';

interface ElectionOverviewProps {
  title: string;
  status: string;
  totalVoters: number;
  totalBallots: number;
}

export function ElectionOverview({ title, status, totalVoters, totalBallots }: ElectionOverviewProps) {
  const turnoutPercentage = totalVoters > 0 ? (totalBallots / totalVoters) * 100 : 0;
  const pending = totalVoters - totalBallots;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>
          Election Status:{' '}
          <Badge
            variant={status === 'ACTIVE' ? 'default' : 'secondary'}
            className={
              status === 'ACTIVE'
                ? 'bg-green-600'
                : status === 'ENDED'
                ? 'bg-gray-600'
                : 'bg-blue-600'
            }
          >
            {status}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalVoters}</div>
            <div className="text-sm text-gray-600">Total Voters</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalBallots}</div>
            <div className="text-sm text-gray-600">Votes Cast</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{turnoutPercentage.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Turnout</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Voting Progress</span>
            <span>{turnoutPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={turnoutPercentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
