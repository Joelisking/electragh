'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Clock, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const user = localStorage.getItem('admin-user');
    if (user) {
      try {
        setAdminUser(JSON.parse(user));
      } catch (error) {
        console.error('Failed to parse admin user:', error);
      }
    }

    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem('admin-user');
    router.push('/admin/login');
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Welcome back, {adminUser?.name || 'Admin'}
          </h1>
          <p className="text-xs text-gray-500">{adminUser?.role || 'Administrator'}</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200"
        >
          <Clock className="w-3 h-3 mr-1" />
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
  );
}
