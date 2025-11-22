import { writable, derived } from 'svelte/store';
import { restClient } from '$lib/api/rest.client';
import { organizationsApi } from '$lib/api/organizations.api';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_dev?: boolean;
}

export interface AuthSession {
  access_token?: string | null;
  refresh_token?: string | null;
  expires_in?: number | null;
  token_type?: string | null;
}

interface AuthState {
  user: User | null;
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: false,
  error: null
};

// Create the store
export const authStore = writable<AuthState>(initialState);

// Derived stores
export const currentUser = derived(authStore, ($state) => $state.user);
export const isAuthenticated = derived(authStore, ($state) => !!$state.session);
export const isLoading = derived(authStore, ($state) => $state.loading);

// Actions
export const authActions = {
  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    fullName: string,
    birthDate: string,
    locale?: string,
    marketingConsent?: boolean
  ) {
    authStore.update((state) => ({ ...state, loading: true, error: null }));

    const response = await restClient.post<{ user: User; session: AuthSession }>(
      '/auth/register',
      {
        email,
        password,
        full_name: fullName,
        birth_date: birthDate,
        locale: locale || 'pt-BR',
        marketing_consent: marketingConsent || false
      }
    );

    if (response.success && response.data) {
      const { user, session } = response.data;
      const sessionInfo = session ? { expires_in: session.expires_in ?? null } : { expires_in: null };

      // Save is_dev flag in localStorage
      if (typeof window !== 'undefined') {
        if (user.is_dev) {
          localStorage.setItem('is_dev', 'true');
        } else {
          localStorage.removeItem('is_dev');
        }
      }

      authStore.update(() => ({
        user,
        session: sessionInfo,
        loading: false,
        error: null
      }));

      return { success: true };
    } else {
      authStore.update((state) => ({
        ...state,
        loading: false,
        error: response.error?.message || 'Registration failed'
      }));

      return { success: false, error: response.error?.message };
    }
  },

  /**
   * Register a new user with organization partner
   */
  async registerWithOrganization(
    email: string,
    password: string,
    fullName: string,
    birthDate: string,
    organizationId: number,
    locale?: string,
    marketingConsent?: boolean
  ) {
    authStore.update((state) => ({ ...state, loading: true, error: null }));

    // Register user with organization in a single request
    const response = await restClient.post<{ user: User; session: AuthSession }>(
      '/auth/register-with-organization',
      {
        email,
        password,
        full_name: fullName,
        birth_date: birthDate,
        organization_id: organizationId,
        locale: locale || 'pt-BR',
        marketing_consent: marketingConsent || false
      }
    );

    if (response.success && response.data) {
      const { user, session } = response.data;
      const sessionInfo = session ? { expires_in: session.expires_in ?? null } : { expires_in: null };

      // Save is_dev flag in localStorage
      if (typeof window !== 'undefined') {
        if (user.is_dev) {
          localStorage.setItem('is_dev', 'true');
        } else {
          localStorage.removeItem('is_dev');
        }
      }

      authStore.update(() => ({
        user,
        session: sessionInfo,
        loading: false,
        error: null
      }));

      return { success: true };
    } else {
      authStore.update((state) => ({
        ...state,
        loading: false,
        error: response.error?.message || 'Registration failed'
      }));

      return { success: false, error: response.error?.message };
    }
  },

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    authStore.update((state) => ({ ...state, loading: true, error: null }));

    const response = await restClient.post<{ user: User; session: AuthSession }>(
      '/auth/login',
      { email, password }
    );

    if (response.success && response.data) {
      const { user, session } = response.data;
      const sessionInfo = session ? { expires_in: session.expires_in ?? null } : { expires_in: null };

      // Save is_dev flag in localStorage
      if (typeof window !== 'undefined') {
        if (user.is_dev) {
          localStorage.setItem('is_dev', 'true');
        } else {
          localStorage.removeItem('is_dev');
        }
      }

      authStore.update(() => ({
        user,
        session: sessionInfo,
        loading: false,
        error: null
      }));

      return { success: true };
    } else {
      authStore.update((state) => ({
        ...state,
        loading: false,
        error: response.error?.message || 'Login failed'
      }));

      return { success: false, error: response.error?.message };
    }
  },

  /**
   * Logout the current user
   */
  async logout() {
    authStore.update((state) => ({ ...state, loading: true }));

    // Clear server HttpOnly cookies and local state
    await restClient.post('/auth/logout');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('is_dev');
    }
    authStore.set(initialState);

    return { success: true };
  },

  /**
   * Check if user has a valid session (on app load)
   */
  async checkSession() {
    const response = await restClient.get<{ user: User }>('/auth/me');

    if (response.success && response.data?.user) {
      const user = response.data.user;
      const sessionInfo: AuthSession = { expires_in: null };

      if (typeof window !== 'undefined') {
        if (user.is_dev) {
          localStorage.setItem('is_dev', 'true');
        } else {
          localStorage.removeItem('is_dev');
        }
      }

      authStore.update(() => ({
        user,
        session: sessionInfo,
        loading: false,
        error: null
      }));

      return { success: true };
    }

    authStore.set(initialState);
    return { success: false };
  },

  /**
   * Clear error message
   */
  clearError() {
    authStore.update((state) => ({ ...state, error: null }));
  }
};
