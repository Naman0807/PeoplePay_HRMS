const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// ── Shared error class ─────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ── Token-refresh helpers ──────────────────────────────────────────────

/** Module-level promise so concurrent 401s share a single refresh call. */
let refreshPromise: Promise<string> | null = null;

/** Read the refresh token from the zustand persist key `pp360-auth`. */
function readRefreshToken(): string | null {
  try {
    const raw = localStorage.getItem('pp360-auth');
    if (!raw) return null;
    // zustand persist wraps value as { state: { refreshToken, … }, version: … }
    const parsed = JSON.parse(raw);
    return parsed?.state?.refreshToken ?? null;
  } catch {
    return null;
  }
}

/** Remove both token keys from localStorage. */
function clearAuth(): void {
  localStorage.removeItem('pp360_access_token');
  localStorage.removeItem('pp360-auth');
}

/** Clear tokens and send the user back to the login page. */
function redirectToLogin(): void {
  clearAuth();
  window.location.href = '/login';
}

/**
 * Calls `POST /auth/refresh`, persists the new access token in
 * localStorage **and** the zustand auth-store state, then returns it.
 */
async function doRefresh(): Promise<string> {
  const refreshToken = readRefreshToken();
  if (!refreshToken) {
    redirectToLogin();
    throw new ApiError(401, 'NO_REFRESH_TOKEN', 'Session expired');
  }

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    redirectToLogin();
    const err = body?.error;
    throw new ApiError(
      res.status,
      err?.code || 'REFRESH_FAILED',
      err?.message || 'Token refresh failed',
    );
  }

  const newAccessToken: string | undefined = body?.data?.accessToken;
  if (!newAccessToken) {
    redirectToLogin();
    throw new ApiError(500, 'NO_TOKEN_IN_RESPONSE', 'Malformed refresh response');
  }

  // 1. Update the raw localStorage key that apiFetch reads directly.
  localStorage.setItem('pp360_access_token', newAccessToken);

  // 2. Sync the zustand auth-store (in-memory state + persisted storage).
  //    Dynamic import avoids a circular dependency between client ↔ authStore.
  try {
    const { useAuthStore } = await import('@/src/store/authStore');
    useAuthStore.setState({ accessToken: newAccessToken });
  } catch {
    // Fallback: patch the persisted zustand state in localStorage directly.
    try {
      const raw = localStorage.getItem('pp360-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.state.accessToken = newAccessToken;
        localStorage.setItem('pp360-auth', JSON.stringify(parsed));
      }
    } catch {
      /* best-effort */
    }
  }

  return newAccessToken;
}

/**
 * Single-flight wrapper around `doRefresh()`.  If multiple calls arrive
 * while a refresh is in-flight they all await the same promise instead of
 * firing duplicate requests.
 */
function getRefreshedToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ── Public API ─────────────────────────────────────────────────────────

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pp360_access_token') : null;

  // If the access token is missing entirely on a protected route, go to login.
  if (!token && typeof window !== 'undefined' && !path.startsWith('/auth/')) {
    window.location.href = '/login';
    throw new ApiError(401, 'NO_TOKEN', 'Not authenticated');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // ── 401 → attempt refresh + single retry ─────────────────────────
  // Auth endpoints are excluded: a 401 from `/auth/login` means "wrong
  // credentials", not "expired session". Refreshing there would redirect and
  // wipe the error the form is about to show.
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/')) {
    try {
      const newToken = await getRefreshedToken();

      const retryHeaders: Record<string, string> = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };

      const retryRes = await fetch(`${API_URL}${path}`, { ...options, headers: retryHeaders });
      const retryBody = await retryRes.json().catch(() => null);

      if (!retryRes.ok) {
        const errBody = retryBody?.error;
        throw new ApiError(
          retryRes.status,
          errBody?.code || 'UNKNOWN',
          errBody?.message || `Request failed: ${retryRes.status}`,
        );
      }

      return retryBody?.data as T;
    } catch (err) {
      // If the refresh itself threw an ApiError (redirect already happened), re-throw.
      if (err instanceof ApiError) throw err;
      // Unexpected error — clear auth and bail.
      clearAuth();
      throw err;
    }
  }

  // ── Non-401 responses ────────────────────────────────────────────
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errBody = body?.error;
    throw new ApiError(res.status, errBody?.code || 'UNKNOWN', errBody?.message || `Request failed: ${res.status}`);
  }

  return body?.data as T;
}
