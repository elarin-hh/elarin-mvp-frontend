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
  modelPath?: string;
  analysisInterval?: number;
  mlConfig?: MLConfig;
  heuristicConfig?: HeuristicConfig;
  feedbackConfig?: FeedbackConfig;
  components?: string[];
  metrics?: string[];
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  available: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}
