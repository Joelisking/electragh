'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Shield,
  Users,
  UserCheck,
  BarChart3,
  Settings,
  Vote,
  Activity,
  FileText,
  LogOut,
} from 'lucide-react';

const navigationItems = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: Activity,
    exact: true,
  },
  {
    label: 'Voters',
    href: '/admin/voters',
    icon: Users,
  },
  {
    label: 'Candidates',
    href: '/admin/candidates',
    icon: UserCheck,
  },
  {
    label: 'Results',
    href: '/admin/results',
    icon: BarChart3,
  },
  {
    label: 'Disputes',
    href: '/admin/disputes',
    icon: FileText,
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

export default function AdminNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {};

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Election Control Center
              </h1>
              <p className="text-sm text-gray-600">
                AGOSA Elections - Electoral Commission
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}>
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Info and Logout */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">JAK</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
            <Badge className="bg-green-100 text-green-800 border-0">
              <Activity className="w-3 h-3 mr-1" />
              Active
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
