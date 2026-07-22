/**
 * Axios HTTP client — the single network layer for the entire application.
 *
 * Responsibilities:
 * - Attach CSRF token to all state-changing requests
 * - Handle 401 (session expired) → redirect to login
 * - Handle 403 (CSRF invalid) → refresh token and retry once
 * - Handle 403 (account deactivated) → redirect to login with message
 * - Handle 429 (rate limit) → surface structured error with retry-after
 * - Normalize all error shapes into ApiError
 * - Never expose raw Axios errors to feature code
 *
 * What this does NOT do:
 * - Retry on network errors (TanStack Query handles retry logic)
 * - Cache responses (TanStack Query handles caching)
 * - Transform response data (each API service does that)
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getOrFetchCsrfToken, clearCsrfToken, fetchCsrfToken } from './csrf';

// ─── Error Types ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class AuthError extends ApiError {
  constructor(message: string) {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string) {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends ApiError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message, 429, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends ApiError {
  constructor() {
    super('Cannot reach the server. Make sure the backend is running.', 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

// ─── State-changing methods that require CSRF ─────────────────────────────────

const CSRF_METHODS = new Set(['post', 'put', 'patch', 'delete']);

// ─── Redirect helper (safe for SSR) ──────────────────────────────────────────

function redirectToHome(reason?: string): void {
  if (typeof window === 'undefined') return;
  const url = reason
    ? `/?reason=${encodeURIComponent(reason)}`
    : '/';
  // Avoid redirect loop if already on home/login/signup
  const current = window.location.pathname;
  if (current === '/' || current === '/login' || current === '/signup') return;
  window.location.href = url;
}

// ─── Create Axios instance ────────────────────────────────────────────────────

const client: AxiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,          // Always send cookies (JWT + CSRF)
  timeout: 30_000,                // 30s — generous for AI endpoints
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request interceptor — attach CSRF token ─────────────────────────────────

client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toLowerCase() ?? '';

    if (CSRF_METHODS.has(method)) {
      // Skip CSRF for multipart uploads — token is added manually in upload()
      const isMultipart = config.headers['Content-Type']
        ?.toString()
        .includes('multipart/form-data');

      if (!isMultipart) {
        try {
          const token = await getOrFetchCsrfToken();
          config.headers['x-csrf-token'] = token;
        } catch {
          // If CSRF fetch fails, proceed anyway — backend will reject with 403
          // and the response interceptor will handle the retry
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — normalize errors ─────────────────────────────────

// Track CSRF retry to prevent infinite loops
let csrfRetryInFlight = false;

client.interceptors.response.use(
  (response: AxiosResponse) => {
    // If the proxy returned an HTML page instead of JSON, the backend is down
    const contentType = String(response.headers['content-type'] ?? '');
    if (contentType.includes('text/html')) {
      return Promise.reject(new NetworkError());
    }
    return response;
  },
  async (error) => {
    const status: number = error.response?.status ?? 0;
    const data = error.response?.data ?? {};
    const message: string = data.error ?? data.message ?? 'An unexpected error occurred';
    const originalConfig: AxiosRequestConfig & { _csrfRetried?: boolean } =
      error.config ?? {};

    // No response — network error
    if (!error.response) {
      return Promise.reject(new NetworkError());
    }

    // 401 — session expired or invalid token
    if (status === 401) {
      const isAuthRoute =
        originalConfig.url?.includes('/auth/login') ||
        originalConfig.url?.includes('/auth/register') ||
        originalConfig.url?.includes('/auth/me') ||
        originalConfig.url?.includes('/auth/forgot-password') ||
        originalConfig.url?.includes('/auth/reset-password') ||
        originalConfig.url?.includes('/admin/login') ||
        originalConfig.url?.includes('/admin/me');

      if (!isAuthRoute) {
        redirectToHome('session_expired');
      }

      return Promise.reject(new AuthError(message));
    }

    // 403 — could be CSRF failure or account deactivated
    if (status === 403) {
      const isAccountDeactivated = message.toLowerCase().includes('deactivated');
      if (isAccountDeactivated) {
        redirectToHome('account_deactivated');
        return Promise.reject(new ForbiddenError(message));
      }

      // CSRF token expired — refresh and retry once
      const method = originalConfig.method?.toLowerCase() ?? '';
      if (
        CSRF_METHODS.has(method) &&
        !originalConfig._csrfRetried &&
        !csrfRetryInFlight
      ) {
        csrfRetryInFlight = true;
        originalConfig._csrfRetried = true;

        try {
          clearCsrfToken();
          const newToken = await fetchCsrfToken();
          csrfRetryInFlight = false;

          // Retry the original request with the new token
          const retryConfig = {
            ...originalConfig,
            headers: {
              ...originalConfig.headers,
              'x-csrf-token': newToken,
            },
          };
          return client(retryConfig);
        } catch {
          csrfRetryInFlight = false;
        }
      }

      return Promise.reject(new ForbiddenError(message));
    }

    // 429 — rate limited
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after']
        ? parseInt(error.response.headers['retry-after'], 10)
        : undefined;
      return Promise.reject(new RateLimitError(message, retryAfter));
    }

    // 409 — conflict (duplicate application, etc.)
    if (status === 409) {
      return Promise.reject(
        new ApiError(message, 409, 'CONFLICT', data.existing ?? data.details),
      );
    }

    // 400 — validation error
    if (status === 400) {
      return Promise.reject(new ApiError(message, 400, 'VALIDATION_ERROR'));
    }

    // 404 — not found
    if (status === 404) {
      return Promise.reject(new ApiError(message, 404, 'NOT_FOUND'));
    }

    // 415 — wrong content type (should never happen from our client)
    if (status === 415) {
      return Promise.reject(new ApiError(message, 415, 'UNSUPPORTED_MEDIA_TYPE'));
    }

    // 500+ — server error
    if (status >= 500) {
      return Promise.reject(
        new ApiError('Something went wrong on our end. Please try again.', status, 'SERVER_ERROR'),
      );
    }

    // Fallback
    return Promise.reject(new ApiError(message, status));
  },
);

export default client;

// ─── Typed helpers ────────────────────────────────────────────────────────────

/**
 * Type-safe GET request.
 * Use for all read operations.
 */
export async function get<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await client.get<T>(url, config);
  return response.data;
}

/**
 * Type-safe POST request.
 * Use for create operations and actions.
 */
export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await client.post<T>(url, data, config);
  return response.data;
}

/**
 * Type-safe PUT request.
 * Use for full update operations.
 */
export async function put<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await client.put<T>(url, data, config);
  return response.data;
}

/**
 * Type-safe PATCH request.
 * Use for partial update operations.
 */
export async function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await client.patch<T>(url, data, config);
  return response.data;
}

/**
 * Type-safe DELETE request.
 */
export async function del<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await client.delete<T>(url, config);
  return response.data;
}

/**
 * Multipart file upload — bypasses JSON content-type.
 * CSRF is handled by the request interceptor (skipped for multipart).
 */
export async function upload<T>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  const token = await getOrFetchCsrfToken().catch(() => null);
  const response = await client.post<T>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { 'x-csrf-token': token } : {}),
    },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });
  return response.data;
}

/**
 * Raw CSV download — returns a Blob for file saving.
 */
export async function downloadBlob(url: string): Promise<Blob> {
  const response = await client.get(url, { responseType: 'blob' });
  return response.data as Blob;
}
