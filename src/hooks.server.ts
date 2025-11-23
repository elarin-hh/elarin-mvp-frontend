import { redirect, type Handle } from '@sveltejs/kit';
import { env } from '$lib/config/env.config';

const isProtectedRoute = (routeId: string | null) => {
  if (!routeId) return false;
  return routeId.startsWith('/(app)');
};

const PERMISSIONS_POLICY =
  "camera=(self), microphone=(), geolocation=(), accelerometer=(), gyroscope=(), interest-cohort=()";

const apiOrigin = (() => {
  try {
    return new URL(env.apiBaseUrl).origin;
  } catch {
    return '';
  }
})();

const scriptSrc = (() => {
  const allowed = ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", 'https://cdn.jsdelivr.net'];
  if (apiOrigin) allowed.push(apiOrigin);
  return `script-src ${allowed.join(' ')}`;
})();

const connectSrc = apiOrigin
  ? `connect-src 'self' https://cdn.jsdelivr.net ${apiOrigin}`
  : "connect-src 'self' https://cdn.jsdelivr.net";

const CSP = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.jsdelivr.net",
  "font-src 'self' data:",
  connectSrc,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "media-src 'self' blob:"
].join('; ');

export const handle: Handle = async ({ event, resolve }) => {
  const routeId = event.route.id;
  const token = event.cookies.get('access_token');

  if (isProtectedRoute(routeId) && !token) {
    throw redirect(302, '/login');
  }

  const response = await resolve(event);
  response.headers.set('Permissions-Policy', PERMISSIONS_POLICY);
  response.headers.set('Content-Security-Policy', CSP);
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
};
