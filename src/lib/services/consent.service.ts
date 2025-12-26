/**
 * Consent Service
 * Manages user consent preferences (biometric, marketing, etc.)
 */

import {
    BIOMETRIC_CONSENT_KEY,
    BIOMETRIC_CONSENT_TS_KEY,
    BIOMETRIC_CONSENT_EXP_KEY,
} from '$lib/constants';

export interface ConsentState {
    granted: boolean;
    timestamp: number | null;
    expiresAt: number | null;
}

/**
 * Check if biometric consent has been granted and is still valid
 */
export function getBiometricConsentState(): ConsentState {
    if (typeof localStorage === 'undefined') {
        return { granted: false, timestamp: null, expiresAt: null };
    }

    const consent = localStorage.getItem(BIOMETRIC_CONSENT_KEY);
    const timestamp = localStorage.getItem(BIOMETRIC_CONSENT_TS_KEY);
    const expiresAt = localStorage.getItem(BIOMETRIC_CONSENT_EXP_KEY);

    const parsedTs = timestamp ? parseInt(timestamp, 10) : null;
    const parsedExp = expiresAt ? parseInt(expiresAt, 10) : null;

    // Check if consent has expired
    if (parsedExp && Date.now() > parsedExp) {
        clearBiometricConsent();
        return { granted: false, timestamp: null, expiresAt: null };
    }

    return {
        granted: consent === 'true',
        timestamp: parsedTs,
        expiresAt: parsedExp,
    };
}

/**
 * Check if biometric consent is granted
 */
export function hasBiometricConsent(): boolean {
    return getBiometricConsentState().granted;
}

/**
 * Grant biometric consent with optional expiration
 */
export function grantBiometricConsent(expirationDays?: number): void {
    if (typeof localStorage === 'undefined') return;

    const now = Date.now();
    localStorage.setItem(BIOMETRIC_CONSENT_KEY, 'true');
    localStorage.setItem(BIOMETRIC_CONSENT_TS_KEY, String(now));

    if (expirationDays && expirationDays > 0) {
        const expiresAt = now + expirationDays * 24 * 60 * 60 * 1000;
        localStorage.setItem(BIOMETRIC_CONSENT_EXP_KEY, String(expiresAt));
    } else {
        localStorage.removeItem(BIOMETRIC_CONSENT_EXP_KEY);
    }
}

/**
 * Revoke biometric consent
 */
export function revokeBiometricConsent(): void {
    clearBiometricConsent();
}

/**
 * Clear all biometric consent data
 */
function clearBiometricConsent(): void {
    if (typeof localStorage === 'undefined') return;

    localStorage.removeItem(BIOMETRIC_CONSENT_KEY);
    localStorage.removeItem(BIOMETRIC_CONSENT_TS_KEY);
    localStorage.removeItem(BIOMETRIC_CONSENT_EXP_KEY);
}
