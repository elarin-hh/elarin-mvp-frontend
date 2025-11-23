import type { ZodSchema } from 'zod';

export interface TokenStorage {
  getAccessToken(): string | null;
  setAccessToken?(token: string | null): void;
  clear(): void;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
}

export type ApiResponse<T> =
  | { success: true; data: T; status: number }
  | { success: false; error: ApiError; status: number };

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpClientConfig {
  baseUrl: string;
  fetchFn?: typeof fetch;
  tokenStorage?: TokenStorage;
}

export class HttpClient {
  private baseUrl: string;
  private fetchFn: typeof fetch;
  private tokenStorage?: TokenStorage;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl;
    this.fetchFn = config.fetchFn || fetch;
    this.tokenStorage = config.tokenStorage;
  }

  async get<T>(path: string, schema?: ZodSchema<T>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, schema);
  }

  async post<T>(path: string, body?: unknown, schema?: ZodSchema<T>): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body, schema);
  }

  async put<T>(path: string, body?: unknown, schema?: ZodSchema<T>): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body, schema);
  }

  async patch<T>(path: string, body?: unknown, schema?: ZodSchema<T>): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, body, schema);
  }

  async delete<T>(path: string, schema?: ZodSchema<T>): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, schema);
  }

  private buildUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    if (!this.baseUrl.endsWith('/') && !path.startsWith('/')) {
      return `${this.baseUrl}/${path}`;
    }

    return `${this.baseUrl}${path}`;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const token = this.tokenStorage?.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async parseResponse<T>(response: Response, schema?: ZodSchema<T>): Promise<ApiResponse<T>> {
    const status = response.status;
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (status === 204 || status === 205) {
      return { success: true, data: undefined as T, status };
    }

    if (!isJson) {
      return {
        success: false,
        status,
        error: {
          message: 'Invalid content type, expected application/json',
          code: 'INVALID_CONTENT_TYPE',
          status
        }
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        success: false,
        status,
        error: {
          message: 'Failed to parse JSON response',
          code: 'INVALID_JSON',
          status
        }
      };
    }

    if (!response.ok) {
      if (status === 401) {
        this.tokenStorage?.clear();
      }

      const message =
        (payload as { message?: string; error?: string })?.message ||
        (payload as { error?: string })?.error ||
        `HTTP error ${status}`;

      return {
        success: false,
        status,
        error: {
          message,
          code: (payload as { statusCode?: string | number })?.statusCode?.toString() || status.toString(),
          status
        }
      };
    }

    if (schema) {
      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        return {
          success: false,
          status,
          error: {
            message: 'Response validation failed',
            code: 'INVALID_RESPONSE_SCHEMA',
            status
          }
        };
      }
      return { success: true, data: parsed.data, status };
    }

    return { success: true, data: payload as T, status };
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    schema?: ZodSchema<T>
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.fetchFn(this.buildUrl(path), {
        method,
        headers: this.buildHeaders(),
        credentials: 'include',
        body: body !== undefined ? JSON.stringify(body) : undefined
      });

      return this.parseResponse<T>(response, schema);
    } catch (error) {
      return {
        success: false,
        status: 0,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'NETWORK_ERROR',
          status: 0
        }
      };
    }
  }
}

export const createHttpClient = (config: HttpClientConfig) => new HttpClient(config);
