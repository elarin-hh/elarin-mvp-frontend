import { restClient } from './rest.client';

export interface Organization {
  id: number;
  name: string;
  code: string;
  email: string;
  owner_user_id: number | null;
  plan_id: number | null;
  is_active: boolean;
  created_at: string;
}

export const organizationsApi = {
  /**
   * Get all active organizations
   */
  async getActiveOrganizations() {
    const response = await restClient.get<Organization[]>('/organizations/active');

    if (!response.success) {
      return {
        success: false,
        error: response.error?.message || 'Failed to fetch active organizations'
      };
    }

    return { success: true, data: response.data };
  },

  /**
   * Link user to organization
   */
  async linkUserToOrganization(userId: number, organizationId: number) {
    const response = await restClient.post<{ message: string; link: any }>(
      '/organizations/link-user',
      { user_id: userId, organization_id: organizationId }
    );

    if (!response.success) {
      return {
        success: false,
        error: response.error?.message || 'Failed to link user to organization'
      };
    }

    return { success: true, data: response.data };
  }
};
