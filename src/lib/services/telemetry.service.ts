export type TelemetryEvent =
  | 'app_started'
  | 'login'
  | 'exercise_selected'
  | 'training_started'
  | 'training_paused'
  | 'training_resumed'
  | 'training_finished'
  | 'vision_error'
  | 'network_error'
  | 'ui_error'
  | 'error_occurred';

export interface TelemetryEventProps {
  [key: string]: string | number | boolean | null;
}

class TelemetryService {
  private enabled = false;
  private consentKey = 'elarin_telemetry_consent';
  private consentTtlMs = 180 * 24 * 60 * 60 * 1000; // 180 days

  private readConsent(): { enabled: boolean; grantedAt?: string; expiresAt?: string } {
    if (typeof window === 'undefined') return { enabled: false };
    const stored = localStorage.getItem(this.consentKey);
    if (!stored) return { enabled: false };
    try {
      const parsed = JSON.parse(stored) as { enabled: boolean; expiresAt?: string; grantedAt?: string };
      if (!parsed.enabled) return { enabled: false };
      if (parsed.expiresAt) {
        const exp = new Date(parsed.expiresAt);
        if (Number.isNaN(exp.getTime()) || exp.getTime() < Date.now()) {
          this.clearConsent();
          return { enabled: false };
        }
      }
      return { enabled: true, grantedAt: parsed.grantedAt, expiresAt: parsed.expiresAt };
    } catch {
      return { enabled: false };
    }
  }

  private persistConsent(enabled: boolean) {
    if (typeof window === 'undefined') return;
    const expiresAt = new Date(Date.now() + this.consentTtlMs).toISOString();
    const payload = { enabled, grantedAt: new Date().toISOString(), expiresAt };
    localStorage.setItem(this.consentKey, JSON.stringify(payload));
  }

  private clearConsent() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.consentKey);
  }

  init(enabled: boolean = false) {
    const consent = this.readConsent();
    const hasConsent = consent.enabled;
    this.enabled = enabled && hasConsent;
    if (!hasConsent && enabled) {
      this.clearConsent();
    }
  }

  emit(event: TelemetryEvent, props?: TelemetryEventProps) {
    if (!this.enabled) {
      return;
    }
    // Placeholder transport: log to console or future backend/beacon
    console.debug('[telemetry]', event, props || {});
  }

  pageView(path: string) {
    if (!this.enabled) {
      return;
    }
    this.emit('app_started', { path });
  }

  error(error: Error, context?: Record<string, unknown>) {
    if (!this.enabled) {
      return;
    }
    this.emit('ui_error', {
      message: error.message,
      ...context
    });
  }

  enable() {
    this.persistConsent(true);
    this.enabled = true;
  }

  disable() {
    this.clearConsent();
    this.enabled = false;
  }

  getStatus(): { enabled: boolean; grantedAt?: string; expiresAt?: string } {
    return this.readConsent();
  }
}

export const telemetry = new TelemetryService();
