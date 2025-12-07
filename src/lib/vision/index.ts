/**
 * Vision System - Main Export
 * ============================
 *
 * Sistema completo de visão computacional para análise de exercícios.
 */

// Types
export * from './types';

// Constants
export * from './constants/mediapipe.constants';

// Utils
export * from './utils/angles.utils';
export * from './utils/distances.utils';
export * from './utils/landmarks.utils';

// Validators
export { BaseValidator } from './validators/BaseValidator';
export { SquatBodyweightValidator } from './validators/SquatBodyweightValidator';
export { LungeValidator } from './validators/LungeValidator';
export { createValidator, hasValidator, getRegisteredExercises } from './validators';

// Core
export { FeedbackSystem } from './core/FeedbackSystem';
export { ExerciseAnalyzer } from './core/ExerciseAnalyzer';

// ML
export { GenericExerciseClassifier } from './ml/GenericClassifier';

// Config
export {
  loadExerciseConfig,
  getExerciseConfig,
  getAvailableExercises,
  isExerciseAvailable
} from './config/exerciseConfigs';

// Re-export types for convenience
export type { MLResult, FeedbackRecord, FeedbackSystemConfig } from './core/FeedbackSystem';
export type { AnalyzerMetrics, AnalyzerCallbacks, ExtendedMetrics } from './core/ExerciseAnalyzer';
export type { ClassifierConfig, ErrorStatistics } from './ml/GenericClassifier';
