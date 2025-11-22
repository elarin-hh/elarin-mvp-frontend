const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const isBrowser = typeof document !== 'undefined';

function buildCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 7): string {
  const secure = isBrowser && window.location.protocol === 'https:';
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'SameSite=Lax',
    secure ? 'Secure' : undefined,
    Number.isFinite(maxAgeSeconds) ? `Max-Age=${Math.max(0, Math.trunc(maxAgeSeconds))}` : undefined
  ].filter(Boolean);

  return parts.join('; ');
}

function deleteCookie(name: string): string {
  return `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function readCookie(name: string): string | null {
  if (!isBrowser) return null;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return readCookie(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return readCookie(REFRESH_TOKEN_KEY);
  },

  setTokens(accessToken: string | null, refreshToken?: string | null, maxAgeSeconds?: number) {
    if (!isBrowser) {
      return;
    }

    if (accessToken) {
      document.cookie = buildCookie(ACCESS_TOKEN_KEY, accessToken, maxAgeSeconds);
    } else {
      document.cookie = deleteCookie(ACCESS_TOKEN_KEY);
    }

    if (refreshToken !== undefined) {
      if (refreshToken) {
        document.cookie = buildCookie(REFRESH_TOKEN_KEY, refreshToken, maxAgeSeconds);
      } else {
        document.cookie = deleteCookie(REFRESH_TOKEN_KEY);
      }
    }
  },

  clear() {
    if (!isBrowser) {
      return;
    }
    document.cookie = deleteCookie(ACCESS_TOKEN_KEY);
    document.cookie = deleteCookie(REFRESH_TOKEN_KEY);
  }
};
