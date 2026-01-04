import { createRestClient, restClient, type ApiResponse } from './rest.client';
import type {
  TrainingPlanItemDto,
  AssignedTrainingPlanDto,
  TrainingPlanSessionDto,
} from './dtos';

// Re-export for backwards compatibility
export type TrainingPlanItem = TrainingPlanItemDto;
export type AssignedTrainingPlan = AssignedTrainingPlanDto;
export type TrainingPlanSession = TrainingPlanSessionDto;

const getClient = (fetchFn?: typeof fetch) =>
  fetchFn ? createRestClient(fetchFn) : restClient;

export const trainingPlansApi = {
  async getAssigned(fetchFn?: typeof fetch): Promise<ApiResponse<AssignedTrainingPlanDto[]>> {
    return getClient(fetchFn).get<AssignedTrainingPlanDto[]>('/training-plans/assigned');
  },

  async startSession(planId: number): Promise<ApiResponse<TrainingPlanSessionDto>> {
    return restClient.post<TrainingPlanSessionDto>(`/training-plans/${planId}/start`, {});
  },

  async finishSession(
    sessionId: number,
    summary?: { total_duration_ms?: number; exercise_count?: number; score?: number | null },
  ): Promise<ApiResponse<{ message: string }>> {
    return restClient.post<{ message: string }>(
      `/training-plans/sessions/${sessionId}/finish`,
      summary ?? {},
    );
  }
};
