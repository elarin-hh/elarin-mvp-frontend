import { restClient } from './rest.client';
import type { OrganizationDto } from './dtos';

// Re-export for backwards compatibility
export type Organization = OrganizationDto;

export const organizationsApi = {
  async getActiveOrganizations() {
    const response = await restClient.get<OrganizationDto[]>('/organizations/active');

    if (!response.success) {
      return {
        success: false,
        error: response.error?.message
      };
    }

    return { success: true, data: response.data };
  },

  async linkUserToOrganization(userId: number, organizationId: number) {
    const response = await restClient.post<{ message: string; link: unknown }>(
      '/organizations/link-user',
      { user_id: userId, organization_id: organizationId }
    );

    if (!response.success) {
      return {
        success: false,
        error: response.error?.message
      };
    }

    return { success: true, data: response.data };
  }
};
