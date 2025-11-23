import { env } from '$lib/config/env.config';
import { createHttpClient, type ApiResponse } from './http-client';
import { tokenStorage } from '$lib/services/token-storage';

const API_BASE_URL = env.apiBaseUrl;

export const restClient = createHttpClient({
  baseUrl: API_BASE_URL,
  tokenStorage
});

export type { ApiResponse };
export { createHttpClient };
