/**
 * CSRF token management.
 *
 * The backend uses double-submit CSRF protection (csrf-csrf library).
 * Flow:
 *   1. On app boot, call GET /api/csrf-token — backend sets __Host-csrf cookie
 *      and returns the token in the response body.
 *   2. Every state-changing request (POST/PUT/PATCH/DELETE) must include
 *      the token in the x-csrf-token header.
 *   3. Token is stored in memory only — never localStorage (XSS risk).
 *   4. On 403 CSRF errors, we re-fetch the token and retry once.
 */

let csrfToken: string | null = null;
let fetchPromise: Promise<string> | null = null;

export async function fetchCsrfToken(): Promise<string> {
  // Deduplicate concurrent calls — only one fetch in flight at a time
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/csrf-token', {
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
    .then((res) => {
      const contentType = res.headers.get('content-type') ?? '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error('Backend server is not reachable');
      }
      return res.json();
    })
    .then((data: { csrfToken: string }) => {
      csrfToken = data.csrfToken;
      fetchPromise = null;
      return csrfToken;
    })
    .catch((err) => {
      fetchPromise = null;
      throw err;
    });

  return fetchPromise;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function clearCsrfToken(): void {
  csrfToken = null;
  fetchPromise = null;
}

export async function getOrFetchCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  return fetchCsrfToken();
}
