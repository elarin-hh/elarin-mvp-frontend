import { writable, derived } from 'svelte/store';
import { restClient } from '$lib/api/rest.client';

export interface User {
  id: string;
  email: string;
  full_name?: string;
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

    // Clear token and state
    restClient.setToken(null);
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
