import { writable, derived } from 'svelte/store';
import { restClient } from '$lib/api/rest.client';
import { gymsApi } from '$lib/api/gyms.api';

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
  async register(email: string, password: string, fullName?: string) {
    authStore.update((state) => ({ ...state, loading: true, error: null }));

    const response = await restClient.post<{ user: User; session: AuthSession }>(
      '/auth/register',
      { email, password, full_name: fullName }
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
   * Register a new user with gym partner
   */
  async registerWithGym(
    email: string,
    password: string,
    fullName: string,
    gymId: number
  ) {
    authStore.update((state) => ({ ...state, loading: true, error: null }));

    // Step 1: Register user normally
    const response = await restClient.post<{ user: User; session: AuthSession }>(
      '/auth/register',
      {
        email,
        password,
        full_name: fullName
      }
    );

    if (response.success && response.data) {
      const { user, session } = response.data;

      // Step 2: Link user to gym
      const userIdForLink = parseInt(user.id) || 0;

      if (userIdForLink > 0) {
        const linkResult = await gymsApi.linkUserToGym(userIdForLink, gymId);

        if (!linkResult.success) {
          // Fail the registration if link fails
          authStore.update((state) => ({
            ...state,
            loading: false,
            error: 'Erro ao vincular usuário à academia: ' + linkResult.error
          }));

          return { success: false, error: linkResult.error };
        }
      } else {
        authStore.update((state) => ({
          ...state,
          loading: false,
          error: 'ID de usuário inválido para vinculação'
        }));

        return { success: false, error: 'Invalid user ID' };
      }

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

    await restClient.post('/auth/logout');

    // Clear token, is_dev flag and state
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
