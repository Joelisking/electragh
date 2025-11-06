import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Vote, BarChart3, Shield } from 'lucide-react';

interface Stats {
  totalVoters?: number;
  totalBallots?: number;
  turnoutRate?: number;
  activeElections?: number;
}

interface DashboardStatsProps {
  stats: Stats;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Voters</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalVoters?.toLocaleString() || 0}</div>
          <p className="text-xs text-muted-foreground">Registered voters</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ballots Cast</CardTitle>
          <Vote className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalBallots?.toLocaleString() || 0}</div>
          <p className="text-xs text-muted-foreground">Votes submitted</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Turnout Rate</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.turnoutRate?.toFixed(1) || 0}%</div>
          <p className="text-xs text-muted-foreground">Voter participation</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Election Status</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.activeElections || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.activeElections === 1 ? 'Active' : 'Inactive'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
