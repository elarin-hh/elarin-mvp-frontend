import { authService, type AuthPayload } from '$lib/services/auth.service';
import { tokenStorage } from '$lib/services/token-storage';
import {
  setAuthError,
  setAuthLoading,
  setAuthState,
  resetAuthState,
  type User
} from '$lib/stores/auth.store';

function persistDevFlag(user?: User | null) {
  if (typeof window === 'undefined') return;
  if (user?.is_dev) {
    localStorage.setItem('is_dev', 'true');
  } else {
    localStorage.removeItem('is_dev');
  }
}

function applyAuthPayload(payload: AuthPayload) {
  const { user, session } = payload;
  const sessionInfo = session ? { expires_in: session.expires_in ?? null } : { expires_in: null };

  if (session?.access_token) {
    tokenStorage.setAccessToken(session.access_token!);
  }

  persistDevFlag(user as User | null);
  setAuthState(user as User, sessionInfo);
}

export const authActions = {
  async register(
    email: string,
    password: string,
    fullName: string,
    birthDate: string,
    marketingConsent?: boolean
  ) {
    setAuthLoading(true);
    setAuthError(null);

    const response = await authService.register(
      email,
      password,
      fullName,
      birthDate,
      marketingConsent
    );

    setAuthLoading(false);

    if (!response.success) {
      const message = response.error?.message;
      setAuthError(message);
      return { success: false, error: message };
    }

    applyAuthPayload(response.data);
    return { success: true };
  },

  async registerWithOrganization(
    email: string,
    password: string,
    fullName: string,
    birthDate: string,
    organizationId: number,
    heightCm: number,
    weightKg: number,
    marketingConsent?: boolean
  ) {
    setAuthLoading(true);
    setAuthError(null);

    const response = await authService.registerWithOrganization(
      email,
      password,
      fullName,
      birthDate,
      organizationId,
      heightCm,
      weightKg,
      marketingConsent
    );

    setAuthLoading(false);

    if (!response.success) {
      const message = response.error?.message;
      setAuthError(message);
      return { success: false, error: message };
    }

    applyAuthPayload(response.data);
    return { success: true };
  },

  async login(email: string, password: string) {
    setAuthLoading(true);
    setAuthError(null);

    const response = await authService.login(email, password);
    setAuthLoading(false);

    if (!response.success) {
      const message = response.error?.message;
      setAuthError(message);
      return { success: false, error: message };
    }

    applyAuthPayload(response.data);
    return { success: true };
  },

  async logout() {
    setAuthLoading(true);
    const response = await authService.logout();
    if (!response.success) {
      console.error('Falha ao chamar endpoint de logout do backend', response.error);
    }
    persistDevFlag(null);
    tokenStorage.clear();
    resetAuthState();
    setAuthLoading(false);
    return { success: true };
  },

  forceLogout() {
    persistDevFlag(null);
    tokenStorage.clear();
    resetAuthState();
    setAuthLoading(false);
  },

  async checkSession() {
    setAuthLoading(true);
    const response = await authService.me();
    setAuthLoading(false);

    if (response.success && response.data?.user) {
      applyAuthPayload({ user: response.data.user, session: null });
      return { success: true };
    }

    persistDevFlag(null);
    resetAuthState();
    return { success: false };
  },

  clearError() {
    setAuthError(null);
  }
};
