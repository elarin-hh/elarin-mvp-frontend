import { writable, derived } from 'svelte/store';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_dev?: boolean;
  height_cm?: number | null;
  weight_kg?: number | null;
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

export const authStore = writable<AuthState>(initialState);

export const currentUser = derived(authStore, ($state) => $state.user);
export const isAuthenticated = derived(authStore, ($state) => !!$state.session);
export const isLoading = derived(authStore, ($state) => $state.loading);

export const setAuthState = (user: User | null, session: AuthSession | null) => {
  authStore.update((state) => ({
    ...state,
    user,
    session
  }));
};

export const setAuthLoading = (loading: boolean) => {
  authStore.update((state) => ({ ...state, loading }));
};

export const setAuthError = (error: string | null) => {
  authStore.update((state) => ({ ...state, error }));
};

export const resetAuthState = () => {
  authStore.set(initialState);
};
