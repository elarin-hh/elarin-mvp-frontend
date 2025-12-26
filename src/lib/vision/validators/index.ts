/**
 * Validator Registry
 * Creates validators based on exercise configuration from database
 */

import type { BaseValidator } from './BaseValidator';
import { GenericValidator, createValidatorConfig } from './GenericValidator';
import type { HeuristicConfigDB } from '../types/validator-config.types';

export type ValidatorConstructor = new (config: any) => BaseValidator;

/**
 * Create a validator from database config
 * @param exerciseId - The exercise slug/type
 * @param heuristicConfig - Config from database (config.heuristicConfig merged with user overrides)
 * @param exerciseName - Display name of exercise
 */
export function createValidator(
  exerciseId: string,
  heuristicConfig: Record<string, unknown> = {},
  exerciseName?: string
): BaseValidator | null {
  if (!heuristicConfig || Object.keys(heuristicConfig).length === 0) {
    console.warn(`No heuristic config provided for exercise: ${exerciseId}`);
    return null;
  }

  const validatorConfig = createValidatorConfig(
    exerciseId,
    exerciseName ?? exerciseId,
    heuristicConfig as HeuristicConfigDB
  );

  return new GenericValidator(validatorConfig);
}

/**
 * Check if we can create a validator for this exercise
 * Always true since GenericValidator handles any config
 */
export function hasValidator(_exerciseId: string): boolean {
  return true;
}

/**
 * Get list of supported exercises
 * @deprecated - all exercises are now supported via GenericValidator
 */
export function getRegisteredExercises(): string[] {
  return [];
}

export { GenericValidator, createValidatorConfig };
export { BaseValidator } from './BaseValidator';
