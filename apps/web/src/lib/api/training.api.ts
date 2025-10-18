// Training API - Elarin NestJS Backend Integration
// Uses NestJS endpoints: /training/sessions, /training/history
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
   * Create a new training session
   * POST /training/sessions
   */
  async createSession(data: CreateSessionRequest): Promise<ApiResponse<TrainingSession>> {
    return restClient.post<TrainingSession>('/training/sessions', data);
  },

  /**
   * Complete a training session
   * POST /training/sessions/complete
   */
  async completeSession(data: CompleteSessionRequest): Promise<ApiResponse<{ session_id: string }>> {
    return restClient.post<{ session_id: string }>('/training/sessions/complete', data);
  },

  /**
   * Get training history
   * GET /training/history?limit=20&offset=0
   */
  async getHistory(limit = 20, offset = 0): Promise<ApiResponse<TrainingSession[]>> {
    return restClient.get<TrainingSession[]>(
      `/training/history?limit=${limit}&offset=${offset}`
    );
  },

  /**
   * Get details of a specific session
   * GET /training/sessions/:id
   */
  async getSessionDetails(sessionId: string): Promise<ApiResponse<TrainingSession>> {
    return restClient.get<TrainingSession>(`/training/sessions/${sessionId}`);
  }
};
