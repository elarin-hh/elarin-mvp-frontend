export interface ConsentFlags {
  general: boolean;
  biometric: boolean;
  telemetry: boolean;
  marketing?: boolean;
  updatedAt?: string;
}

export interface TelemetryConsent {
  enabled: boolean;
  grantedAt?: string;
  expiresAt?: string;
}
