/**
 * Auth Feature - Barrel Export
 * 
 * This module contains all authentication-related functionality:
 * - Login/Register
 * - Token management
 * - User session
 */

// Services
export { authService } from '$lib/services/auth.service';
export { authActions } from '$lib/services/auth.facade';
export { tokenStorage } from '$lib/services/token-storage';

// Stores
export { currentUser, isAuthenticated, isLoading } from '$lib/stores/auth.store';

// API
export { authApi } from '$lib/api/auth.api';

// Consent
export {
    getBiometricConsentState,
    hasBiometricConsent,
    grantBiometricConsent,
    revokeBiometricConsent,
} from '$lib/services/consent.service';
