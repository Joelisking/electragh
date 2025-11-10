'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
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
    <div className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* ElectraGH Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-electra-primary to-electra-secondary rounded-xl shadow-md flex items-center justify-center transform hover:scale-105 transition-transform">
              <span className="text-lg font-bold text-white">E</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-electra-primary to-electra-secondary bg-clip-text text-transparent">
                ElectraGH Control Center
              </h1>
              <p className="text-sm text-slate-600">
                Digital Election Management System
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-6">
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
                    'flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105',
                    isActive
                      ? 'bg-gradient-to-r from-electra-primary/20 to-electra-secondary/20 text-electra-primary shadow-md border border-electra-primary/30'
                      : 'text-slate-600 hover:text-electra-primary hover:bg-electra-primary/10 hover:shadow-sm'
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
              <p className="text-sm font-medium text-slate-900">JAK</p>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
            <Badge className="bg-gradient-to-r from-electra-primary/20 to-electra-secondary/20 text-electra-primary border border-electra-primary/30 shadow-sm">
              <Activity className="w-3 h-3 mr-1" />
              Active
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="border-electra-primary/30 text-electra-primary hover:bg-electra-primary hover:text-white transition-all duration-300 shadow-sm hover:shadow-md"
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
