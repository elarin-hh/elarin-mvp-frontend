// Exercises API - Elarin NestJS Backend Integration
// Uses NestJS endpoints: /exercises
import { restClient, type ApiResponse } from './rest.client';

/**
 * Exercise model from backend (user-specific, auto-created on registration)
 */
export interface Exercise {
  id: number;
  user_id: number;
  type: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Exercises API client
 * All endpoints require authentication (Bearer token)
 * Exercises are automatically created when user registers
 * No create/update/delete endpoints (exercises are fixed)
 */
export const exercisesApi = {
  /**
   * Get all exercises for the current user (active and inactive)
   * GET /exercises
   * @returns List of all user exercises
   */
  async getAll(): Promise<ApiResponse<Exercise[]>> {
    return restClient.get<Exercise[]>('/exercises');
  },
};
