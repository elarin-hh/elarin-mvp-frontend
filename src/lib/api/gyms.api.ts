import { restClient } from './rest.client';

export interface Gym {
  id: number;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  responsible_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const gymsApi = {
  /**
   * Get all active gyms
   */
  async getActiveGyms() {
    const response = await restClient.get<Gym[]>('/gyms/active');

    if (response.success && response.data) {
      return { success: true, data: response.data };
    }

    return {
      success: false,
      error: response.error?.message || 'Failed to fetch active gyms'
    };
  },

  /**
   * Link user to gym
   */
  async linkUserToGym(userId: number, gymId: number) {
    const response = await restClient.post<{ message: string; link: any }>(
      '/gyms/link-user',
      { user_id: userId, gym_id: gymId }
    );

    if (response.success && response.data) {
      return { success: true, data: response.data };
    }

    return {
      success: false,
      error: response.error?.message || 'Failed to link user to gym'
    };
  }
};
