'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Vote,
  Users,
  UserCheck,
  BarChart3,
  Settings,
  Shield,
} from 'lucide-react';
import Image from 'next/image';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Election Control', href: '/admin/elections', icon: Vote },
  { name: 'Voters', href: '/admin/voters', icon: Users },
  { name: 'Candidates', href: '/admin/candidates', icon: UserCheck },
  { name: 'Results', href: '/admin/results', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 h-screen">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-electra-primary to-electra-secondary rounded-xl flex items-center justify-center shadow-lg">
            <Image src="/logo.png" alt="ElectraGH" width={20} height={20} className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-electra-primary to-electra-secondary bg-clip-text text-transparent">ElectraGH</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-electra-primary-light/50 text-electra-primary'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn(
                'w-5 h-5 mr-3',
                isActive ? 'text-electra-primary' : 'text-gray-400'
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          ElectraGH Admin v1.0
        </div>
      </div>
    </div>
  );
}
