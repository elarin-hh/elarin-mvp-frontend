import { restClient, type ApiResponse } from './rest.client';

export interface DeleteAccountResponse {
  message: string;
}

class AuthApi {
  async deleteAccount(): Promise<ApiResponse<DeleteAccountResponse>> {
    return restClient.delete<DeleteAccountResponse>('/auth/account');
  }
}

export const authApi = new AuthApi();
