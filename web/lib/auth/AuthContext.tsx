'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';

interface User {
  phoneNumber: string;
  fullName?: string;
  isAuthenticated: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (phoneNumber: string, fullName?: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing authentication on mount
    const storedAuth = localStorage.getItem('voting-auth');
    if (storedAuth) {
      try {
        const parsedAuth = JSON.parse(storedAuth);
        if (parsedAuth.phoneNumber && parsedAuth.isAuthenticated) {
          setUser(parsedAuth);
        }
      } catch (error) {
        // Clear invalid stored auth
        localStorage.removeItem('voting-auth');
      }
    }
    setIsLoading(false);

    // Listen for global logout events (from 401 interceptor)
    const handleGlobalLogout = () => {
      setUser(null);
    };

    window.addEventListener('auth:logout', handleGlobalLogout);

    return () => {
      window.removeEventListener('auth:logout', handleGlobalLogout);
    };
  }, []);

  const login = (phoneNumber: string, fullName?: string) => {
    const userData: User = {
      phoneNumber,
      fullName,
      isAuthenticated: true,
    };
    setUser(userData);
    localStorage.setItem('voting-auth', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      // Call backend to clear HTTP-Only cookie
      await apiClient.post('/api/voting/logout');
    } catch (error) {
      // Even if the logout endpoint fails, clear local state
      console.error('Logout endpoint error:', error);
    } finally {
      // Clear local authentication state
      setUser(null);
      localStorage.removeItem('voting-auth');
      localStorage.removeItem('voting-token');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: user?.isAuthenticated || false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}