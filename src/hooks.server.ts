import { redirect, type Handle } from '@sveltejs/kit';

const isProtectedRoute = (routeId: string | null) => {
  if (!routeId) return false;
  return routeId.startsWith('/(app)');
};

const PERMISSIONS_POLICY =
  "camera=(self), microphone=(), geolocation=(), accelerometer=(), gyroscope=(), interest-cohort=()";

export const handle: Handle = async ({ event, resolve }) => {
  const routeId = event.route.id;
  const token = event.cookies.get('access_token');

  if (isProtectedRoute(routeId) && !token) {
    throw redirect(302, '/login');
  }

  const response = await resolve(event);
  response.headers.set('Permissions-Policy', PERMISSIONS_POLICY);
  return response;
};
