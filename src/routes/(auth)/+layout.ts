import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
  // Check if user is already authenticated
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');

    if (token) {
      // Redirect to exercises if already authenticated
      throw redirect(302, '/exercises');
    }
  }

  return {};
};
