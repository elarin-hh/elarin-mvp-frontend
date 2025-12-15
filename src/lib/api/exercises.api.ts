import { createRestClient, restClient, type ApiResponse } from './rest.client';

export interface Exercise {
  id: number;
  user_id: number;
  type: string;
  name: string;
  name_pt?: string | null;
  is_active: boolean;
  image_url?: string | null;
  config?: Record<string, any>;
  created_at: string;
}

const getClient = (fetchFn?: typeof fetch) =>
  fetchFn ? createRestClient(fetchFn) : restClient;

export const exercisesApi = {
  async getAll(fetchFn?: typeof fetch): Promise<ApiResponse<Exercise[]>> {
    return getClient(fetchFn).get<Exercise[]>('/exercises');
  },

  async updateConfig(id: number, config: Record<string, any>): Promise<ApiResponse<Exercise>> {
    return restClient.patch<Exercise>(`/exercises/${id}/config`, { config });
  }
};
