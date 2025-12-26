// API clients
export { restClient, createRestClient } from './rest.client';
export type { ApiResponse } from './http-client';
export { authApi } from './auth.api';
export { exercisesApi } from './exercises.api';
export { trainingApi } from './training.api';
export { trainingPlansApi } from './training-plans.api';
export { organizationsApi } from './organizations.api';

// DTOs - centralized exports
export * from './dtos';

// Backwards compatibility type aliases
export type { Exercise } from './exercises.api';
export type { TrainingMetric, SaveTrainingRequest } from './training.api';
export type { TrainingPlanItem, AssignedTrainingPlan, TrainingPlanSession } from './training-plans.api';
export type { Organization } from './organizations.api';
