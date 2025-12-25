import { z } from 'zod';
import { restClient, type ApiResponse } from '$lib/api/rest.client';

const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  full_name: z.string().optional().nullable(),
  is_dev: z.boolean().optional().nullable()
});

const sessionSchema = z
  .object({
    access_token: z.string().optional().nullable(),
    refresh_token: z.string().optional().nullable(),
    expires_in: z.number().optional().nullable(),
    token_type: z.string().optional().nullable()
  })
  .partial()
  .optional()
  .nullable();

const authPayloadSchema = z.object({
  user: userSchema,
  session: sessionSchema
});

const meResponseSchema = z.object({
  user: userSchema
});

export type AuthPayload = z.infer<typeof authPayloadSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;

export const authService = {
  login(email: string, password: string): Promise<ApiResponse<AuthPayload>> {
    return restClient.post('/auth/login', { email, password }, authPayloadSchema);
  },

  register(
    email: string,
    password: string,
    fullName: string,
    birthDate: string,
    marketingConsent = false
  ): Promise<ApiResponse<AuthPayload>> {
    return restClient.post(
      '/auth/register',
      {
        email,
        password,
        full_name: fullName,
        birth_date: birthDate,
        marketing_consent: marketingConsent
      },
      authPayloadSchema
    );
  },

  registerWithOrganization(
    email: string,
    password: string,
    fullName: string,
    birthDate: string,
    organizationId: number,
    heightCm: number,
    weightKg: number,
    marketingConsent = false
  ): Promise<ApiResponse<AuthPayload>> {
    const payload: Record<string, any> = {
      email,
      password,
      full_name: fullName,
      birth_date: birthDate,
      organization_id: organizationId,
      height_cm: heightCm,
      weight_kg: weightKg,
      marketing_consent: marketingConsent
    };

    return restClient.post(
      '/auth/register-with-organization',
      payload,
      authPayloadSchema
    );
  },

  logout(): Promise<ApiResponse<unknown>> {
    return restClient.post('/auth/logout');
  },

  me(): Promise<ApiResponse<MeResponse>> {
    return restClient.get('/auth/me', meResponseSchema);
  }
};
