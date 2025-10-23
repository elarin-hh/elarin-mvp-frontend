/**
 * Validator Registry
 * ==================
 *
 * Registro centralizado de validadores por exercício.
 * Permite carregar o validator correto dinamicamente.
 */

import type { BaseValidator } from './BaseValidator';
import { SquatValidator } from './SquatValidator';
import { LungeValidator } from './LungeValidator';

export type ValidatorConstructor = new (config: any) => BaseValidator;

/**
 * Registro de validators por exercício
 */
const VALIDATOR_REGISTRY: Record<string, ValidatorConstructor> = {
	squat: SquatValidator,
	lunge: LungeValidator,
	push_up: SquatValidator // Temporário - usar squat como fallback
};

/**
 * Cria uma instância do validator apropriado para o exercício
 */
export function createValidator(exerciseId: string, config: any = {}): BaseValidator | null {
	const ValidatorClass = VALIDATOR_REGISTRY[exerciseId];

	if (!ValidatorClass) {
		return null;
	}

	return new ValidatorClass(config);
}

/**
 * Verifica se existe um validator para o exercício
 */
export function hasValidator(exerciseId: string): boolean {
	return exerciseId in VALIDATOR_REGISTRY;
}

/**
 * Lista todos os exercícios com validators registrados
 */
export function getRegisteredExercises(): string[] {
	return Object.keys(VALIDATOR_REGISTRY);
}

export {  SquatValidator, LungeValidator };
