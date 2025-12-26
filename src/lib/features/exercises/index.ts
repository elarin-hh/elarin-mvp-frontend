/**
 * Exercises Feature - Barrel Export
 * 
 * This module contains all exercise-related functionality:
 * - Exercise listing
 * - Exercise configuration
 * - Exercise templates
 */

// API
export { exercisesApi } from '$lib/api/exercises.api';

// Types
export type {
    ExerciseDto,
    ExerciseTemplateDto,
    UserExerciseDto,
} from '$lib/api/dtos/exercise.dto';

// Vision - Exercise validators
export { createValidator, hasValidator, getRegisteredExercises } from '$lib/vision/validators';
