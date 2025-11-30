import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { LayoutLoad } from './$types';
import { authActions } from '$lib/services/auth.facade';

export const ssr = false;
export const prerender = true;

export const load: LayoutLoad = async () => {
  if (import.meta.env.SSR) {
    // Skip auth check during prerender/fallback generation
    return {};
  }
  const session = await authActions.checkSession();
  if (!session.success) {
    throw redirect(302, `${base}/login`);
  }
  return {};
};
