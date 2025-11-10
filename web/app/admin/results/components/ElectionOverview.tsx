import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Vote } from 'lucide-react';

interface ElectionOverviewProps {
  title: string;
  status: string;
  totalVoters: number;
  totalBallots: number;
}

export function ElectionOverview({
  title,
  status,
  totalVoters,
  totalBallots,
}: ElectionOverviewProps) {
  const turnoutPercentage =
    totalVoters > 0 ? (totalBallots / totalVoters) * 100 : 0;
  const pending = totalVoters - totalBallots;

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50/50 shadow-lg border-electra-primary/10 hover:shadow-xl transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-electra-primary/5 to-electra-secondary/5 rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-electra-secondary">
          <div className="p-2 bg-electra-primary/10 rounded-lg">
            <Vote className="w-5 h-5 text-electra-primary" />
          </div>
          {title}
        </CardTitle>
        <div className="text-gray-600">
          Election Status:{' '}
          <Badge
            variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200/30 hover:shadow-md transition-all duration-200">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {totalVoters}
            </div>
            <div className="text-sm font-medium text-gray-600">
              Total Voters
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-electra-primary-light/30 to-electra-primary-light/50 rounded-xl border border-electra-primary/20 hover:shadow-md transition-all duration-200">
            <div className="text-3xl font-bold text-electra-primary mb-1">
              {totalBallots}
            </div>
            <div className="text-sm font-medium text-gray-600">
              Votes Cast
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl border border-purple-200/30 hover:shadow-md transition-all duration-200">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {turnoutPercentage.toFixed(1)}%
            </div>
            <div className="text-sm font-medium text-gray-600">
              Turnout
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl border border-orange-200/30 hover:shadow-md transition-all duration-200">
            <div className="text-3xl font-bold text-orange-600 mb-1">
              {pending}
            </div>
            <div className="text-sm font-medium text-gray-600">
              Pending
            </div>
          </div>
        </div>
        <div className="mt-8 p-4 bg-gradient-to-r from-electra-primary/5 to-electra-secondary/5 rounded-xl border border-electra-primary/10">
          <div className="flex justify-between text-sm font-medium text-gray-700 mb-3">
            <span>Voting Progress</span>
            <span className="text-electra-primary font-semibold">
              {turnoutPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={turnoutPercentage}
            className="h-3 bg-gradient-to-r from-electra-primary to-electra-secondary shadow-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
