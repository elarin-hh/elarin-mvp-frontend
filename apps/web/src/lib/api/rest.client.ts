// REST API client stub
// TODO: Implement actual API calls when backend is ready

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

class RestClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetchWithErrorHandling<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      // TODO: Add actual authorization headers when auth is implemented
      const headers = {
        'Content-Type': 'application/json',
        ...options?.headers
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        return {
          error: {
            message: `HTTP error ${response.status}`,
            code: response.status.toString()
          }
        };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('[API] Error:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'NETWORK_ERROR'
        }
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    // TODO: Replace with actual API call
    console.debug(`[API] GET ${endpoint}`);
    
    // Mock response
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { data: {} as T };
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    // TODO: Replace with actual API call
    console.debug(`[API] POST ${endpoint}`, body);
    
    // Mock response
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { data: {} as T };
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    // TODO: Replace with actual API call
    console.debug(`[API] PUT ${endpoint}`, body);
    
    // Mock response
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { data: {} as T };
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    // TODO: Replace with actual API call
    console.debug(`[API] DELETE ${endpoint}`);
    
    // Mock response
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { data: {} as T };
  }
}

export const restClient = new RestClient();

