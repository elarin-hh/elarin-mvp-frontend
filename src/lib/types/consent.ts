export interface ConsentFlags {
  general: boolean;
  biometric: boolean;
  telemetry: boolean;
  marketing?: boolean;
  updatedAt?: string;
  expiresAt?: string;
}

export interface TelemetryConsent {
  enabled: boolean;
  grantedAt?: string;
  expiresAt?: string;
}
