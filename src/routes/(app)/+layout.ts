import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { LayoutLoad } from './$types';
import { authActions } from '$lib/services/auth.facade';

export const ssr = false;
export const prerender = false;

export const load: LayoutLoad = async ({ fetch }) => {

  const session = await authActions.checkSession(fetch);
  if (!session.success) {
    throw redirect(302, `${base}/login`);
  }
  return {};
};
