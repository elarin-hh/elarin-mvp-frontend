export * from './types';

export * from './constants/mediapipe.constants';

export * from './utils/angles.utils';
export * from './utils/distances.utils';
export * from './utils/landmarks.utils';
export * from './utils/exercise-metrics.utils';

export { BaseValidator, GenericValidator, createValidator, hasValidator, getRegisteredExercises } from './validators';

export { FeedbackSystem } from './core/FeedbackSystem';
export { ExerciseAnalyzer } from './core/ExerciseAnalyzer';

export { GenericExerciseClassifier } from './ml/GenericClassifier';

export {
  loadExerciseConfig,
  getExerciseConfig
} from './config/exerciseConfigs';

export type { MLResult, FeedbackRecord, FeedbackSystemConfig } from './core/FeedbackSystem';
export type { AnalyzerMetrics, AnalyzerCallbacks, ExtendedMetrics } from './core/ExerciseAnalyzer';
export type { ClassifierConfig, ErrorStatistics } from './ml/GenericClassifier';
