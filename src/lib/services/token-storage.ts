import type { TokenStorage } from '$lib/api/http-client';

/**
 * Tokens are stored in HttpOnly cookies set by the backend.
 * We keep a no-op implementation to satisfy the client interface and tests.
 */
export const tokenStorage: TokenStorage = {
  getAccessToken(): string | null {
    return null;
  },
  setAccessToken() {
    // no-op: cookies are managed server-side
  },
  clear() {
    // no-op: cookies are cleared via /auth/logout
  }
};
