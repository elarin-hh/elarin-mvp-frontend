import { restClient, type ApiResponse } from './rest.client';

export interface Exercise {
  id: number;
  type: string;
  name_en: string;
  name_pt: string;
  description_en?: string;
  description_pt?: string;
  category: string;
  difficulty: number;
  ml_model_path?: string;
  is_active: boolean;
}

export interface TrainingMetric {
  id: number;
  user_id: number;
  organization_id?: number;
  exercise: string;
  reps: number;
  sets: number;
  duration_ms: number;
  valid_ratio: number;
  created_at: string;
  plan_session_id?: number | null;
  plan_item_id?: number | null;
  sequence_index?: number | null;
}

export interface SaveTrainingRequest {
  exercise_type: string;
  reps_completed: number;
  sets_completed: number;
  duration_seconds: number;
  avg_confidence?: number;
  plan_session_id?: number;
  plan_item_id?: number;
  sequence_index?: number;
}

export const trainingApi = {
  async getExercises(): Promise<ApiResponse<Exercise[]>> {
    return restClient.get<Exercise[]>('/exercises');
  },

  async getExerciseByType(type: string): Promise<ApiResponse<Exercise>> {
    return restClient.get<Exercise>(`/exercises/${type}`);
  },

  async saveTraining(data: SaveTrainingRequest): Promise<ApiResponse<TrainingMetric>> {
    return restClient.post<TrainingMetric>('/training/save', data);
  },

  async getHistory(limit = 20, offset = 0): Promise<ApiResponse<TrainingMetric[]>> {
    return restClient.get<TrainingMetric[]>(
      `/training/history?limit=${limit}&offset=${offset}`
    );
  },

  async getTrainingDetails(metricId: number): Promise<ApiResponse<TrainingMetric>> {
    return restClient.get<TrainingMetric>(`/training/${metricId}`);
  }
};
