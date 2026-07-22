'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { ApiError, AuthError, RateLimitError } from '@/services/api/client';

/**
 * TanStack Query provider with production-grade defaults.
 *
 * Retry strategy:
 * - Never retry on 401 (auth errors) — user needs to re-login
 * - Never retry on 400/404/409 (client errors) — retrying won't help
 * - Never retry on 429 (rate limit) — backend will reject again
 * - Retry up to 2 times on 500+ (server errors) with exponential backoff
 * - Retry up to 3 times on network errors
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Don't refetch on window focus in development
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
        // Stale time: 1 minute default — individual queries override this
        staleTime: 60 * 1000,
        // Retry logic
        retry: (failureCount, error) => {
          if (error instanceof AuthError) return false;
          if (error instanceof RateLimitError) return false;
          if (error instanceof ApiError) {
            if (error.status === 400) return false;
            if (error.status === 404) return false;
            if (error.status === 409) return false;
            if (error.status === 403) return false;
            if (error.status >= 500) return failureCount < 2;
          }
          // Network errors — retry up to 3 times
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30_000),
      },
      mutations: {
        // Mutations don't retry by default — they have side effects
        retry: false,
      },
    },
  });
}

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // useState ensures QueryClient is not recreated on every render
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
