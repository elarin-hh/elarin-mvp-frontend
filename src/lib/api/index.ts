/**
 * Exports centralizados de todas as APIs
 * Evita conflitos de tipos com nomes iguais (Exercise)
 */
export { restClient, createRestClient } from './rest.client';
export type { ApiResponse } from './http-client';
export { authApi } from './auth.api';
export { exercisesApi } from './exercises.api';
export type { Exercise as ExerciseDto } from './exercises.api';
export { trainingApi } from './training.api';
export type { Exercise as TrainingExercise } from './training.api';
export { organizationsApi } from './organizations.api';
