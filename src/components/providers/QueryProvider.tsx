'use client';

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactNode, useMemo } from 'react';

interface QueryProviderProps {
  children: ReactNode;
  isReady?: boolean;
}

export function QueryProvider({ children, isReady = true }: QueryProviderProps) {
  // Create QueryClient with dynamic enabled check
  const queryClient = useMemo(() => {
    return new QueryClient({
      defaultOptions: {
        queries: {
          enabled: isReady,
          staleTime: 60 * 1000, // 1 minute
          gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  }, [isReady]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

