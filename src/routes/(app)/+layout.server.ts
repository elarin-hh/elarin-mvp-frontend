import { redirect, type LayoutServerLoad } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const token = cookies.get('access_token');

  if (!token) {
    throw redirect(302, '/login');
  }

  return {};
};
