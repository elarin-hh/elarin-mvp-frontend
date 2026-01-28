import { z } from 'zod';
import { createRestClient, restClient, type ApiResponse } from '$lib/api/rest.client';

const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  full_name: z.string().optional().nullable(),
  is_dev: z.boolean().optional().nullable(),
  height_cm: z.number().optional().nullable(),
  weight_kg: z.number().optional().nullable()
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

const getClient = (fetchFn?: typeof fetch) =>
  fetchFn ? createRestClient(fetchFn) : restClient;

export const authService = {
  login(
    email: string,
    password: string,
    fetchFn?: typeof fetch
  ): Promise<ApiResponse<AuthPayload>> {
    return getClient(fetchFn).post('/auth/login', { email, password }, authPayloadSchema);
  },

  register(
    email: string,
    password: string,
    fullName: string,
    birthDate: string,
    marketingConsent = false,
    fetchFn?: typeof fetch
  ): Promise<ApiResponse<AuthPayload>> {
    return getClient(fetchFn).post(
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
    marketingConsent = false,
    fetchFn?: typeof fetch
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

    return getClient(fetchFn).post(
      '/auth/register-with-organization',
      payload,
      authPayloadSchema
    );
  },

  logout(fetchFn?: typeof fetch): Promise<ApiResponse<unknown>> {
    return getClient(fetchFn).post('/auth/logout');
  },

  me(fetchFn?: typeof fetch): Promise<ApiResponse<MeResponse>> {
    return getClient(fetchFn).get('/auth/me', meResponseSchema);
  }
};
