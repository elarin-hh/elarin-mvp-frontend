/**
 * Lunge Validator - Validação de Afundo
 * =======================================
 *
 * Validator para exercício de afundo (lunge).
 * TODO: Implementar validações específicas
 */

import { BaseValidator } from './BaseValidator';
import type { PoseLandmarks, ValidationResult } from '../types';

export class LungeValidator extends BaseValidator {
	constructor(config: Record<string, any> = {}) {
		super(config);
	}

	/**
	 * Valida a execução do lunge
	 * TODO: Implementar lógica completa
	 */
	validate(landmarks: PoseLandmarks, frameCount: number = 0): ValidationResult {
		this.currentIssues = [];

		// Por enquanto, retorna válido sempre (stub)
		return {
			isValid: true,
			issues: [],
			summary: {
				totalIssues: 0,
				message: 'Lunge validator - em desenvolvimento',
				priority: 'low'
			}
		};
	}
}
