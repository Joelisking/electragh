'use client';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export default function QueryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Retry failed requests with exponential backoff
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Cache data aggressively during voting period
        staleTime: 3 * 60 * 1000, // 3 minutes - election data rarely changes
        gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer

        // Reduce refetch frequency to save bandwidth
        refetchOnWindowFocus: false, // Don't refetch when user returns to tab
        refetchOnMount: true, // Refetch on component mount
        refetchOnReconnect: true, // Refetch when connection restored

        // Network mode optimization
        networkMode: 'online', // Only fetch when online
      },
      mutations: {
        // Retry mutations only once to avoid duplicate votes
        retry: 1,
        retryDelay: 1000,

        // Network mode for mutations
        networkMode: 'online',
      },
    },
  }));

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}
