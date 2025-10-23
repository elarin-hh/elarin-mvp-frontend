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

  init(enabled: boolean = false) {
    this.enabled = enabled;
  }

  emit(event: TelemetryEvent, props?: TelemetryEventProps) {
    if (!this.enabled) {
      return;
    }
  }

  pageView(path: string) {
    if (!this.enabled) {
      return;
    }
  }

  error(error: Error, context?: Record<string, unknown>) {
    if (!this.enabled) {
      return;
    }
  }
}

export const telemetry = new TelemetryService();
