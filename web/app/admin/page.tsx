'use client';

import { Loader2, AlertTriangle } from 'lucide-react';
import { useGetApiAdminDashboard } from '@/lib/api/admin/admin';
import {
  DashboardStats,
  QuickActions,
  RecentActivity,
  SystemStatus,
} from './components';

export default function AdminDashboard() {
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useGetApiAdminDashboard();

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of your election system
        </p>
      </div>

      {/* Statistics Cards */}
      <DashboardStats stats={stats} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Recent Activity and System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={recentActivity} />
        <SystemStatus smsStats={smsStats} />
      </div>
    </div>
  );
}
