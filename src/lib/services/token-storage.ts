import type { TokenStorage } from '$lib/api/http-client';

/**
 * Tokens are stored in HttpOnly cookies set by the backend.
 * We keep a no-op implementation to satisfy the client interface and tests.
 */
const TOKEN_KEY = 'auth_token';

export const tokenStorage: TokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  setAccessToken(token: string | null) {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  }
};
