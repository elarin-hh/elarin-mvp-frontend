import { createRestClient, restClient, type ApiResponse } from './rest.client';
import type { ExerciseDto } from './dtos';

// Re-export for backwards compatibility
export type Exercise = ExerciseDto;

const getClient = (fetchFn?: typeof fetch) =>
  fetchFn ? createRestClient(fetchFn) : restClient;

export const exercisesApi = {
  async getAll(fetchFn?: typeof fetch): Promise<ApiResponse<ExerciseDto[]>> {
    return getClient(fetchFn).get<ExerciseDto[]>('/exercises');
  },

  async updateConfig(id: number, config: Record<string, unknown>): Promise<ApiResponse<ExerciseDto>> {
    return restClient.patch<ExerciseDto>(`/exercises/${id}/config`, { config });
  }
};
