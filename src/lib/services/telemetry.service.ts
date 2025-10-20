// Telemetry service stub for event tracking
// TODO: Implement actual analytics/telemetry when ready

export type TelemetryEvent =
  | 'app_started'
  | 'exercise_selected'
  | 'training_started'
  | 'training_paused'
  | 'training_resumed'
  | 'training_finished'
  | 'error_occurred';

export interface TelemetryEventProps {
  [key: string]: string | number | boolean | null;
}

class TelemetryService {
  private enabled = false;

  /**
   * Initialize telemetry service
   * @param enabled - Whether to enable telemetry
   */
  init(enabled: boolean = false) {
    this.enabled = enabled;
    if (this.enabled) {
      console.debug('[Telemetry] Service initialized');
    }
  }

  /**
   * Emit a telemetry event
   * @param event - Event name
   * @param props - Event properties
   */
  emit(event: TelemetryEvent, props?: TelemetryEventProps) {
    if (!this.enabled) {
      return;
    }

    // TODO: Replace with actual analytics service (e.g., PostHog, Mixpanel, etc.)
    console.debug(`[Telemetry] Event: ${event}`, props);
  }

  /**
   * Track page view
   * @param path - Page path
   */
  pageView(path: string) {
    if (!this.enabled) {
      return;
    }

    // TODO: Replace with actual page view tracking
    console.debug(`[Telemetry] Page view: ${path}`);
  }

  /**
   * Track error
   * @param error - Error object
   * @param context - Additional context
   */
  error(error: Error, context?: Record<string, unknown>) {
    if (!this.enabled) {
      return;
    }

    // TODO: Replace with actual error tracking (e.g., Sentry)
    console.error('[Telemetry] Error:', error.message, context);
  }
}

export const telemetry = new TelemetryService();

