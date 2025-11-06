'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  phoneNumber: string;
  fullName?: string;
  isAuthenticated: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (phoneNumber: string, fullName?: string) => void;
  logout: () => void;
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem('voting-auth');
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