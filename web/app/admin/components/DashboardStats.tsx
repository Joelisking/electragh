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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="bg-gradient-to-br from-white to-electra-primary-light/20 shadow-lg border-electra-primary/10 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">Total Voters</CardTitle>
          <div className="bg-electra-primary/10 p-2 rounded-lg">
            <Users className="h-4 w-4 text-electra-primary" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-gray-900">{stats?.totalVoters?.toLocaleString() || 0}</div>
          <p className="text-xs text-gray-600 mt-1">Registered voters</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-white to-electra-primary-light/20 shadow-lg border-electra-primary/10 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">Ballots Cast</CardTitle>
          <div className="bg-electra-secondary/10 p-2 rounded-lg">
            <Vote className="h-4 w-4 text-electra-secondary" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-gray-900">{stats?.totalBallots?.toLocaleString() || 0}</div>
          <p className="text-xs text-gray-600 mt-1">Votes submitted</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-white to-electra-primary-light/20 shadow-lg border-electra-primary/10 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">Turnout Rate</CardTitle>
          <div className="bg-orange-100 p-2 rounded-lg">
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-gray-900">{stats?.turnoutRate?.toFixed(1) || 0}%</div>
          <p className="text-xs text-gray-600 mt-1">Voter participation</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-white to-electra-primary-light/20 shadow-lg border-electra-primary/10 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">Election Status</CardTitle>
          <div className="bg-purple-100 p-2 rounded-lg">
            <Shield className="h-4 w-4 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold text-gray-900">{stats?.activeElections || 0}</div>
          <p className="text-xs text-gray-600 mt-1">
            {stats?.activeElections === 1 ? 'Active' : 'Inactive'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
