/**
 * Exercise Configuration Types
 */

import type { FeedbackConfig } from './feedback.types';

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
  exerciseName: string;
  modelPath: string;
  mlConfig: MLConfig;
  heuristicConfig: HeuristicConfig;
  feedbackConfig: FeedbackConfig;
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  available: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}
