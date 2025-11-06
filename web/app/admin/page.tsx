'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Vote,
  BarChart3,
  Shield,
  MessageSquare,
  Settings,
  AlertTriangle,
  Clock,
  CheckCircle,
  UserCheck,
  Loader2,
  LogOut,
} from 'lucide-react';
import { useGetApiAdminDashboard } from '@/lib/api/admin/admin';

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('admin-token');
    const user = localStorage.getItem('admin-user');

    if (!token || !user) {
      router.push('/admin/login');
      return;
    }

    try {
      setAdminUser(JSON.parse(user));
      setIsAuthenticated(true);
    } catch {
      localStorage.removeItem('admin-token');
      localStorage.removeItem('admin-user');
      router.push('/admin/login');
    }
  }, [router]);

  const {
    data: dashboardData,
    isLoading,
    error,
  } = useGetApiAdminDashboard({
    query: {
      enabled: isAuthenticated,
    },
  });

  const handleLogout = () => {
    localStorage.removeItem('admin-token');
    localStorage.removeItem('admin-user');
    router.push('/admin/login');
  };

  // Show loading while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-green-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Failed to Load Dashboard
        </h2>
        <p className="text-gray-600">
          Unable to load dashboard data. Please try again later.
        </p>
      </div>
    );
  }

  const stats = dashboardData.statistics;
  const recentActivity = dashboardData.recentActivity || [];
  const smsStats = dashboardData.smsStats || {};

  const getActivityIcon = (action: string) => {
    if (action.toLowerCase().includes('voter')) return <Users className="w-4 h-4 text-blue-600" />;
    if (action.toLowerCase().includes('vote')) return <Vote className="w-4 h-4 text-green-600" />;
    if (action.toLowerCase().includes('election')) return <Shield className="w-4 h-4 text-purple-600" />;
    return <MessageSquare className="w-4 h-4 text-orange-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {adminUser?.name}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <Clock className="w-3 h-3 mr-1" />
            Last updated: {new Date().toLocaleTimeString()}
          </Badge>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Voters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVoters?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered voters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ballots Cast</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBallots?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Votes submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turnout Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.turnoutRate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Voter participation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Elections</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeElections || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <Users className="h-6 w-6" />
              <span className="text-sm">Manage Voters</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <Vote className="h-6 w-6" />
              <span className="text-sm">Elections</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <UserCheck className="h-6 w-6" />
              <span className="text-sm">Candidates</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
            >
              <BarChart3 className="h-6 w-6" />
              <span className="text-sm">Results</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest system events and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      {getActivityIcon(activity.action)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.action}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.user || 'System'} • {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No recent activity to display
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current system health and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Election System</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Operational
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">SMS Service</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">SMS Messages</span>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {Object.values(smsStats).reduce((total, count) => total + count, 0).toLocaleString()} sent
                </Badge>
              </div>

              {Object.entries(smsStats).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      status === 'SENT' ? 'bg-green-500' :
                      status === 'FAILED' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`} />
                    <span className="text-sm capitalize">{status.toLowerCase()}</span>
                  </div>
                  <Badge variant="secondary">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
