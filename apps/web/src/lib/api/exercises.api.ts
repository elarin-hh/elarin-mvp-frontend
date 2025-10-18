// Exercises API - Elarin NestJS Backend Integration
// Uses NestJS endpoints: /exercises
import { restClient, type ApiResponse } from './rest.client';

/**
 * Exercise model from backend
 */
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
  created_at?: string;
  updated_at?: string;
}

/**
 * Exercises API client
 * All endpoints require authentication (Bearer token)
 */
export const exercisesApi = {
  /**
   * Get all active exercises
   * GET /exercises
   * @returns List of all active exercises
   */
  async getAll(): Promise<ApiResponse<Exercise[]>> {
    return restClient.get<Exercise[]>('/exercises');
  },

  /**
   * Get exercise by type
   * GET /exercises/:type
   * @param type - Exercise type (e.g., 'squat', 'push_up', 'plank')
   * @returns Exercise details
   */
  async getByType(type: string): Promise<ApiResponse<Exercise>> {
    return restClient.get<Exercise>(`/exercises/${type}`);
  }
};
