import { env } from '$lib/config/env.config';
import { createHttpClient, type ApiResponse } from './http-client';
import { tokenStorage } from '$lib/services/token-storage';

const API_BASE_URL = env.apiBaseUrl;

export const createRestClient = (fetchFn?: typeof fetch) =>
  createHttpClient({
    baseUrl: API_BASE_URL,
    tokenStorage,
    fetchFn
  });

export const restClient = createRestClient();

export type { ApiResponse };
export const setUnauthorizedHandler = (
  handler: ((context: { path: string; status: number; message?: string }) => void) | null
) => restClient.setUnauthorizedHandler(handler);
export { createHttpClient };
