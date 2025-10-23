import { authActions } from '$lib/stores/auth.store';

export const authService = {
  async signIn(email: string, password: string) {
    const result = await authActions.login(email, password);

    if (result.success) {
      return {
        data: { user: { email }, session: { access_token: 'token' } },
        error: null
      };
    } else {
      return {
        data: null,
        error: { message: result.error || 'Login failed' }
      };
    }
  },

  async signUp(email: string, password: string, fullName?: string) {
    const result = await authActions.register(email, password, fullName);

    if (result.success) {
      return {
        data: { user: { email }, session: { access_token: 'token' } },
        error: null
      };
    } else {
      return {
        data: null,
        error: { message: result.error || 'Registration failed' }
      };
    }
  },

  async signOut() {
    await authActions.logout();
    return { error: null };
  },

  async getSession() {
    const result = await authActions.checkSession();

    if (result.success) {
      return {
        data: { session: { access_token: 'token' } },
        error: null
      };
    } else {
      return {
        data: { session: null },
        error: null
      };
    }
  }
};

