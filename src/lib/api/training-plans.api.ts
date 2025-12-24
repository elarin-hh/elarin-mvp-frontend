import { createRestClient, restClient, type ApiResponse } from './rest.client';

export interface TrainingPlanItem {
  id: number;
  position: number;
  template_id: number | null;
  exercise_type: string | null;
  exercise_name?: string | null;
  target_reps?: number | null;
  target_sets?: number | null;
  target_duration_sec?: number | null;
  rest_seconds?: number | null;
}

export interface AssignedTrainingPlan {
  assignment_id: number;
  plan_id: number;
  name: string;
  description?: string | null;
  items: TrainingPlanItem[];
}

export interface TrainingPlanSession {
  session_id: number;
  plan_id: number;
  plan_name?: string | null;
  plan_description?: string | null;
  assignment_id: number;
  items: TrainingPlanItem[];
}

const getClient = (fetchFn?: typeof fetch) =>
  fetchFn ? createRestClient(fetchFn) : restClient;

export const trainingPlansApi = {
  async getAssigned(fetchFn?: typeof fetch): Promise<ApiResponse<AssignedTrainingPlan[]>> {
    return getClient(fetchFn).get<AssignedTrainingPlan[]>('/training-plans/assigned');
  },

  async startSession(planId: number): Promise<ApiResponse<TrainingPlanSession>> {
    return restClient.post<TrainingPlanSession>(`/training-plans/${planId}/start`, {});
  },

  async finishSession(sessionId: number): Promise<ApiResponse<{ message: string }>> {
    return restClient.post<{ message: string }>(`/training-plans/sessions/${sessionId}/finish`, {});
  }
};
