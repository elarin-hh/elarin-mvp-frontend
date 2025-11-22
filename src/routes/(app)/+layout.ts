import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
  // Guard moved to +layout.server.ts to work with HttpOnly cookies
  return {};
};
