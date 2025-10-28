// Training API - Elarin NestJS Backend Integration
// Uses NestJS endpoints: /training/save, /training/history
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
}

export interface SaveTrainingRequest {
  exercise_type: string;
  reps_completed: number;
  sets_completed: number;
  duration_seconds: number;
  avg_confidence?: number;
}

export const trainingApi = {
  /**
   * Get all available exercises
   * @deprecated Use exercisesApi.getAll() instead
   */
  async getExercises(): Promise<ApiResponse<Exercise[]>> {
    return restClient.get<Exercise[]>('/exercises');
  },

  /**
   * Get a specific exercise by type
   * @deprecated Use exercisesApi.getByType() instead
   */
  async getExerciseByType(type: string): Promise<ApiResponse<Exercise>> {
    return restClient.get<Exercise>(`/exercises/${type}`);
  },

  /**
   * Save completed training session
   * POST /training/save
   */
  async saveTraining(data: SaveTrainingRequest): Promise<ApiResponse<TrainingMetric>> {
    return restClient.post<TrainingMetric>('/training/save', data);
  },

  /**
   * Get training history
   * GET /training/history?limit=20&offset=0
   */
  async getHistory(limit = 20, offset = 0): Promise<ApiResponse<TrainingMetric[]>> {
    return restClient.get<TrainingMetric[]>(
      `/training/history?limit=${limit}&offset=${offset}`
    );
  },

  /**
   * Get details of a specific training
   * GET /training/:id
   */
  async getTrainingDetails(metricId: number): Promise<ApiResponse<TrainingMetric>> {
    return restClient.get<TrainingMetric>(`/training/${metricId}`);
  }
};
