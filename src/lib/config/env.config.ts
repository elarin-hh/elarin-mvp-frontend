export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || ''
} as const;

export function isDeveloper(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('is_dev') === 'true';
}
