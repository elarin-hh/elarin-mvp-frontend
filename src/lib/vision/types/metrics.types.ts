import type { CompletionMode } from '$lib/types/training.types';

export type MetricDisplayContext = 'next' | 'training' | 'summary';

export type DurationDisplayMode = 'elapsed' | 'remaining';

export type ExerciseMetricType = 'duration' | 'reps' | (string & {});

export interface ExerciseMetricDefinition {
  id: string;
  type: ExerciseMetricType;
  target?: number | null;
  name?: string;
  unit?: string;
  display?: DurationDisplayMode;
  showIn?: MetricDisplayContext[];
}

export interface ExerciseCompletionConfig {
  mode?: CompletionMode;
  metrics?: string[];
}
