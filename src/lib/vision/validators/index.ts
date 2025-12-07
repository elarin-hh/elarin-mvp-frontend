/**
 * Validator Registry
 * ==================
 *
 * Registro centralizado de validadores por exercicio.
 * Permite carregar o validator correto dinamicamente.
 */

import type { BaseValidator } from './BaseValidator';
import { SquatBodyweightValidator } from './SquatBodyweightValidator';
import { LungeValidator } from './LungeValidator';

export type ValidatorConstructor = new (config: any) => BaseValidator;

/**
 * Registro de validators por exercicio
 */
const VALIDATOR_REGISTRY: Record<string, ValidatorConstructor> = {
  bodyweight_squat: SquatBodyweightValidator,
  lunge: LungeValidator,
};

/**
 * Cria uma instancia do validator apropriado para o exercicio
 */
export function createValidator(exerciseId: string, config: any = {}): BaseValidator | null {
  const ValidatorClass = VALIDATOR_REGISTRY[exerciseId];

  if (!ValidatorClass) {
    return null;
  }

  return new ValidatorClass(config);
}

/**
 * Verifica se existe um validator para o exercicio
 */
export function hasValidator(exerciseId: string): boolean {
  return exerciseId in VALIDATOR_REGISTRY;
}

/**
 * Lista todos os exercicios com validators registrados
 */
export function getRegisteredExercises(): string[] {
  return Object.keys(VALIDATOR_REGISTRY);
}

export { SquatBodyweightValidator, LungeValidator };
