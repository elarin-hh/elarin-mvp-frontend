import type { FeedbackConfig } from './feedback.types';
import type { ExerciseDifficulty } from '$lib/types/training.types';
import type { ExerciseCompletionConfig, ExerciseMetricDefinition } from './metrics.types';

export interface MLConfig {
  maxFrames: number;
  minFrames: number;
  predictionInterval: number;
  threshold: number;
}

export interface HeuristicConfig {
  [key: string]: number | string | boolean;
}

export interface ExerciseConfig {
  exerciseType?: string;
  exerciseName: string;
  modelPath?: string;
  analysisInterval?: number;
  mlConfig?: MLConfig;
  heuristicConfig?: HeuristicConfig;
  feedbackConfig?: FeedbackConfig;
  components?: string[];
  metrics?: Array<string | ExerciseMetricDefinition>;
  completion?: ExerciseCompletionConfig;
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  available: boolean;
  difficulty?: ExerciseDifficulty;
}
