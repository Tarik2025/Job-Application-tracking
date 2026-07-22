'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/services/api/auth.api';
import { queryKeys } from '@/services/queryKeys';
import type { User } from '@/types/api.types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  invalidate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  invalidate: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider — wraps TanStack Query's useQuery for /auth/me.
 *
 * Design decisions:
 * - Uses TanStack Query (not useState) so the auth state is cached,
 *   deduplicated, and automatically invalidated after login/logout.
 * - Does NOT redirect here — route guards in individual layouts handle that.
 *   This keeps the provider pure and testable.
 * - retry: false — if /auth/me returns 401, we don't retry (user is not logged in).
 * - staleTime: Infinity — user data doesn't change unless we explicitly invalidate.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: () => authApi.me(),
    retry: false,
    staleTime: Infinity,
    // Don't throw on error — 401 is expected when not logged in
    throwOnError: false,
  });

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
  }, [queryClient]);

  const user = data?.user ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        invalidate,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
