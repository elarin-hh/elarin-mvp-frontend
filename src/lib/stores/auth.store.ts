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
  access_token: string;
  refresh_token?: string;
  user: User;
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

      // Save token
      if (session?.access_token) {
        restClient.setToken(session.access_token);
      }

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
        session,
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

      // Save token
      if (session?.access_token) {
        restClient.setToken(session.access_token);
      }

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
        session,
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

      // Save token
      if (session?.access_token) {
        restClient.setToken(session.access_token);
      }

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
        session,
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

    // Clear token, is_dev flag and state (no backend call needed for JWT logout)
    restClient.setToken(null);
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
    const token = restClient.getToken();

    if (!token) {
      authStore.set(initialState);
      return { success: false };
    }

    // Token exists, assume valid for now
    // In a production app, you'd validate it with the backend
    authStore.update((state) => ({ ...state, loading: false }));

    return { success: true };
  },

  /**
   * Clear error message
   */
  clearError() {
    authStore.update((state) => ({ ...state, error: null }));
  }
};
