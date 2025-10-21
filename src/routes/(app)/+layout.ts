import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
  // Check if user is authenticated
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');

    if (!token) {
      // Redirect to login if not authenticated
      throw redirect(302, '/login');
    }
  }

  return {};
};
