import { base } from '$app/paths';

export function asset(path: string): string {
  return `${base}${path}`;
}

