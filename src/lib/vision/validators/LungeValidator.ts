import { BaseValidator } from './BaseValidator';
import type { PoseLandmarks, ValidationResult } from '../types';

export class LungeValidator extends BaseValidator {
	constructor(config: Record<string, any> = {}) {
		super(config);
	}

	validate(landmarks: PoseLandmarks, frameCount: number = 0): ValidationResult {
		this.currentIssues = [];

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
