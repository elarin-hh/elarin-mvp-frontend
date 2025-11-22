// Tokens are now stored in HttpOnly cookies set exclusively by the backend.
// Frontend code should never read or write them directly.
export const tokenStorage = {
  getAccessToken(): string | null {
    return null;
  },
  getRefreshToken(): string | null {
    return null;
  },
  setTokens() {
    // no-op: cookies are managed server-side
  },
  clear() {
    // no-op: cookies are cleared via /auth/logout
  }
};
