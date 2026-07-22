'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { fetchCsrfToken, clearCsrfToken } from '@/services/api/csrf';

interface CSRFContextValue {
  isReady: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

const CSRFContext = createContext<CSRFContextValue>({
  isReady: false,
  error: false,
  refresh: async () => {},
});

interface CSRFProviderProps {
  children: ReactNode;
}

/**
 * CSRF Provider — fetches the CSRF token once on app boot.
 *
 * The token is stored in memory (csrf.ts module scope).
 * The Axios interceptor reads it from there on every state-changing request.
 *
 * This provider:
 * 1. Fetches the token on mount
 * 2. Exposes isReady so the app can wait before rendering forms
 * 3. Exposes refresh() for manual token refresh after CSRF errors
 * 4. Handles fetch failures gracefully — the app still renders,
 *    individual mutations will fail with a clear error
 */
export function CSRFProvider({ children }: CSRFProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(false);

  const initialize = useCallback(async () => {
    try {
      await fetchCsrfToken();
      setIsReady(true);
      setError(false);
    } catch {
      // Don't block the app — mutations will handle CSRF errors individually
      setIsReady(true);
      setError(true);
    }
  }, []);

  const refresh = useCallback(async () => {
    clearCsrfToken();
    await initialize();
  }, [initialize]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <CSRFContext.Provider value={{ isReady, error, refresh }}>
      {children}
    </CSRFContext.Provider>
  );
}

export function useCSRF(): CSRFContextValue {
  return useContext(CSRFContext);
}
