// Training API - Elarin Backend Integration
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

export interface TrainingSession {
  id: string;
  user_id: string;
  exercise_type: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  reps_completed: number;
  sets_completed: number;
  duration_seconds: number;
  avg_confidence?: number;
  started_at: string;
  finished_at?: string;
}

export interface CreateSessionRequest {
  exercise_type: string;
}

export interface CompleteSessionRequest {
  session_id: string;
  reps_completed: number;
  sets_completed: number;
  duration_seconds: number;
  avg_confidence?: number;
}

export const trainingApi = {
  /**
   * Get all available exercises
   */
  async getExercises(): Promise<ApiResponse<Exercise[]>> {
    return restClient.get<Exercise[]>('/api/v1/exercises');
  },

  /**
   * Get a specific exercise by type
   */
  async getExerciseByType(type: string): Promise<ApiResponse<Exercise>> {
    return restClient.get<Exercise>(`/api/v1/exercises/${type}`);
  },

  /**
   * Create a new training session
   */
  async createSession(data: CreateSessionRequest): Promise<ApiResponse<TrainingSession>> {
    return restClient.post<TrainingSession>('/api/v1/train/session', data);
  },

  /**
   * Complete a training session
   */
  async completeSession(data: CompleteSessionRequest): Promise<ApiResponse<{ session_id: string }>> {
    return restClient.post<{ session_id: string }>('/api/v1/train/complete', data);
  },

  /**
   * Get training history
   */
  async getHistory(limit = 20, offset = 0): Promise<ApiResponse<TrainingSession[]>> {
    return restClient.get<TrainingSession[]>(
      `/api/v1/train/history?limit=${limit}&offset=${offset}`
    );
  },

  /**
   * Get details of a specific session
   */
  async getSessionDetails(sessionId: string): Promise<ApiResponse<TrainingSession>> {
    return restClient.get<TrainingSession>(`/api/v1/train/session/${sessionId}`);
  }
};
