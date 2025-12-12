export * from './types';

export * from './constants/mediapipe.constants';

export * from './utils/angles.utils';
export * from './utils/distances.utils';
export * from './utils/landmarks.utils';

export { BaseValidator } from './validators/BaseValidator';
export { SquatBodyweightValidator } from './validators/SquatBodyweightValidator';
export { LungeValidator } from './validators/LungeValidator';
export { createValidator, hasValidator, getRegisteredExercises } from './validators';

export { FeedbackSystem } from './core/FeedbackSystem';
export { ExerciseAnalyzer } from './core/ExerciseAnalyzer';

export { GenericExerciseClassifier } from './ml/GenericClassifier';

export {
  loadExerciseConfig,
  getExerciseConfig,
  getAvailableExercises,
  isExerciseAvailable
} from './config/exerciseConfigs';

export type { MLResult, FeedbackRecord, FeedbackSystemConfig } from './core/FeedbackSystem';
export type { AnalyzerMetrics, AnalyzerCallbacks, ExtendedMetrics } from './core/ExerciseAnalyzer';
export type { ClassifierConfig, ErrorStatistics } from './ml/GenericClassifier';
