import type { BaseValidator } from './BaseValidator';
import { SquatBodyweightValidator } from './SquatBodyweightValidator';
import { HipAbductionValidator } from './HipAbductionValidator';

export type ValidatorConstructor = new (config: any) => BaseValidator;

const VALIDATOR_REGISTRY: Record<string, ValidatorConstructor> = {
  bodyweight_squat: SquatBodyweightValidator,
  standing_hip_abduction: HipAbductionValidator,
};

export function createValidator(exerciseId: string, config: any = {}): BaseValidator | null {
  const ValidatorClass = VALIDATOR_REGISTRY[exerciseId];

  if (!ValidatorClass) {
    return null;
  }

  return new ValidatorClass(config);
}

export function hasValidator(exerciseId: string): boolean {
  return exerciseId in VALIDATOR_REGISTRY;
}

export function getRegisteredExercises(): string[] {
  return Object.keys(VALIDATOR_REGISTRY);
}

export { SquatBodyweightValidator, HipAbductionValidator };
