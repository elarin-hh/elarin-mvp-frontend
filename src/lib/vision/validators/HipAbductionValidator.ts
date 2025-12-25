import { BaseValidator } from './BaseValidator';
import { MEDIAPIPE_LANDMARKS } from '../constants/mediapipe.constants';
import type { PoseLandmarks, ValidationResult, ValidationIssue, Landmark } from '../types';

export interface HipAbductionConfig {
	minConfidence?: number;
	hipAbductionAngle?: number | null;
	hipNeutralAngle?: number | null;
	maxTorsoLean?: number | null;
	maxKneeBend?: number | null;
	minFramesInState?: number | null;
	feedbackCooldownMs?: number | null;
	[key: string]: any;
}

const DEFAULT_CONFIG: Required<
	Pick<
		HipAbductionConfig,
		| 'minConfidence'
		| 'hipAbductionAngle'
		| 'hipNeutralAngle'
		| 'maxTorsoLean'
		| 'maxKneeBend'
		| 'minFramesInState'
		| 'feedbackCooldownMs'
	>
> = {
	minConfidence: 0.7,
	hipAbductionAngle: 45,
	hipNeutralAngle: 175,
	maxTorsoLean: 15,
	maxKneeBend: 160,
	minFramesInState: 3,
	feedbackCooldownMs: 350
};

interface ExerciseAngles {
	leftHipAbductionAngle: number;
	rightHipAbductionAngle: number;
	leftKneeAngle: number;
	rightKneeAngle: number;
	torsoInclination: number;
}

export class HipAbductionValidator extends BaseValidator {
	private currentState: 'NEUTRAL' | 'ABDUCTED' = 'NEUTRAL';
	private framesInCurrentState = 0;
	public validReps = 0;
	private repCountedInThisTransition = false;
	private reachedAbduction = false;
	private angleHistory: Array<{
		timestamp: number;
		leftHipAbductionAngle: number;
		rightHipAbductionAngle: number;
		leftKneeAngle: number;
		rightKneeAngle: number;
		torsoInclination: number;
	}> = [];
	private maxHistoryLength = 10;
	private lastFeedbackTime = 0;

	constructor(config: HipAbductionConfig = {}) {
		super(config);
		this.config = {
			...DEFAULT_CONFIG,
			...this.config,
			...config
		};
	}

	validate(landmarks: PoseLandmarks, _frameCount: number = 0): ValidationResult {
		const angles = this.calculateKeyAngles(landmarks);
		if (!angles) {
			return {
				isValid: false,
				issues: [
					this.createValidationResult(
						false,
						'landmarks_visibility',
						'Marcos não visíveis o suficiente para avaliar',
						'critical'
					)
				],
				summary: {
					totalIssues: 1,
					message: 'Marcos não visíveis',
					priority: 'critical'
				}
			};
		}

		this.updateAngleHistory(angles);
		this.updateState(angles);

		const results = this.runChecks(landmarks, angles);
		this.currentIssues = results.filter((r) => !r.isValid);

		const hasCriticalOrHigh = this.currentIssues.some(
			(i) => i.severity === 'critical' || i.severity === 'high'
		);

		return {
			isValid: !hasCriticalOrHigh,
			issues: this.currentIssues,
			summary: this.getSummary(),
			details: results
		};
	}

	private calculateKeyAngles(landmarks: PoseLandmarks): ExerciseAngles | null {
		const leftHip = landmarks[MEDIAPIPE_LANDMARKS.LEFT_HIP];
		const rightHip = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_HIP];
		const leftKnee = landmarks[MEDIAPIPE_LANDMARKS.LEFT_KNEE];
		const rightKnee = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_KNEE];
		const leftAnkle = landmarks[MEDIAPIPE_LANDMARKS.LEFT_ANKLE];
		const rightAnkle = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_ANKLE];
		const leftShoulder = landmarks[MEDIAPIPE_LANDMARKS.LEFT_SHOULDER];
		const rightShoulder = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_SHOULDER];

		if (
			!this.isVisible(leftHip) ||
			!this.isVisible(rightHip) ||
			!this.isVisible(leftKnee) ||
			!this.isVisible(rightKnee) ||
			!this.isVisible(leftAnkle) ||
			!this.isVisible(rightAnkle) ||
			!this.isVisible(leftShoulder) ||
			!this.isVisible(rightShoulder)
		) {
			return null;
		}

		const leftHipAbductionAngle = this.calculateHipAbductionAngle(leftHip, leftAnkle);
		const rightHipAbductionAngle = this.calculateHipAbductionAngle(rightHip, rightAnkle);

		return {
			leftHipAbductionAngle,
			rightHipAbductionAngle,
			leftKneeAngle: this.calculateAngle(leftHip, leftKnee, leftAnkle),
			rightKneeAngle: this.calculateAngle(rightHip, rightKnee, rightAnkle),
			torsoInclination: this.calculateTorsoInclination(
				leftShoulder,
				rightShoulder,
				leftHip,
				rightHip
			)
		};
	}

	private calculateHipAbductionAngle(hip: Landmark, ankle: Landmark): number {
		const deltaX = Math.abs(ankle.x - hip.x);
		const deltaY = Math.abs(ankle.y - hip.y);

		const angle = (Math.atan2(deltaX, deltaY) * 180) / Math.PI;
		return angle;
	}

	private calculateTorsoInclination(
		leftShoulder: Landmark,
		rightShoulder: Landmark,
		leftHip: Landmark,
		rightHip: Landmark
	): number {
		const shoulderCenter = {
			x: (leftShoulder.x + rightShoulder.x) / 2,
			y: (leftShoulder.y + rightShoulder.y) / 2
		};
		const hipCenter = {
			x: (leftHip.x + rightHip.x) / 2,
			y: (leftHip.y + rightHip.y) / 2
		};

		const deltaX = shoulderCenter.x - hipCenter.x;
		const deltaY = shoulderCenter.y - hipCenter.y;

		return Math.abs((Math.atan2(Math.abs(deltaX), Math.abs(deltaY)) * 180) / Math.PI);
	}

	private updateAngleHistory(angles: ExerciseAngles) {
		this.angleHistory.push({
			timestamp: Date.now(),
			...angles
		});

		if (this.angleHistory.length > this.maxHistoryLength) {
			this.angleHistory.shift();
		}
	}

	private updateState(angles: ExerciseAngles) {
		const maxAbductionAngle = Math.max(
			angles.leftHipAbductionAngle,
			angles.rightHipAbductionAngle
		);
		const smoothedAngle =
			this.config.minFramesInState !== null ? this.getSmoothedAbductionAngle() : maxAbductionAngle;

		let newState: 'NEUTRAL' | 'ABDUCTED' = this.currentState;

		if (
			this.currentState === 'NEUTRAL' &&
			this.config.hipAbductionAngle !== null &&
			smoothedAngle >= this.config.hipAbductionAngle &&
			(this.config.minFramesInState === null ||
				this.framesInCurrentState >= this.config.minFramesInState)
		) {
			newState = 'ABDUCTED';
		}

		if (
			this.currentState === 'ABDUCTED' &&
			this.config.hipNeutralAngle !== null &&
			smoothedAngle <= (180 - this.config.hipNeutralAngle) &&
			(this.config.minFramesInState === null ||
				this.framesInCurrentState >= this.config.minFramesInState)
		) {
			newState = 'NEUTRAL';
		}

		if (newState !== this.currentState) {
			this.framesInCurrentState = 0;
			this.currentState = newState;
			this.repCountedInThisTransition = false;
			if (newState === 'ABDUCTED') {
				this.reachedAbduction = true;
			}
		} else {
			this.framesInCurrentState++;
		}
	}

	private getSmoothedAbductionAngle(): number {
		if (this.angleHistory.length < 3) {
			const current = this.angleHistory[this.angleHistory.length - 1];
			return Math.max(current.leftHipAbductionAngle, current.rightHipAbductionAngle);
		}

		const recent = this.angleHistory.slice(-3);
		const maxAngles = recent.map((frame) =>
			Math.max(frame.leftHipAbductionAngle, frame.rightHipAbductionAngle)
		);
		return maxAngles.reduce((sum, angle) => sum + angle, 0) / maxAngles.length;
	}

	private runChecks(
		landmarks: PoseLandmarks,
		angles: ExerciseAngles
	): ValidationIssue[] {
		const checks: Array<() => ValidationIssue | null> = [
			() => this.validateKneeExtension(angles),
			() => this.validateTorsoAlignment(angles),
			() => this.detectValidRepetition(angles),
			() => this.getCurrentPositionFeedback(angles)
		];

		return checks
			.map((fn) => fn())
			.filter((result): result is ValidationIssue => result !== null);
	}

	private validateKneeExtension(
		angles: ExerciseAngles
	): ValidationIssue | null {
		const minKneeAngle = Math.min(angles.leftKneeAngle, angles.rightKneeAngle);

		if (
			this.config.maxKneeBend !== null &&
			minKneeAngle < this.config.maxKneeBend &&
			this.currentState === 'ABDUCTED'
		) {
			return this.createValidationResult(
				false,
				'knee_flexion',
				'Mantenha o joelho estendido durante o movimento',
				'medium',
				{
					kneeAngle: minKneeAngle.toFixed(1) + '°',
					minRequired: this.config.maxKneeBend + '°',
					recommendation: 'Estenda completamente o joelho da perna que está elevando'
				}
			);
		}

		return this.createValidationResult(
			true,
			'knee_extension',
			'Joelho corretamente estendido',
			'low',
			{
				leftKneeAngle: angles.leftKneeAngle.toFixed(1) + '°',
				rightKneeAngle: angles.rightKneeAngle.toFixed(1) + '°'
			}
		);
	}

	private validateTorsoAlignment(
		angles: ExerciseAngles
	): ValidationIssue | null {
		if (
			this.config.maxTorsoLean !== null &&
			angles.torsoInclination > this.config.maxTorsoLean
		) {
			return this.createValidationResult(
				false,
				'torso_lean',
				'Evite inclinar o tronco - mantenha-se ereto',
				'medium',
				{
					torsoInclination: angles.torsoInclination.toFixed(1) + '°',
					maxAllowed: this.config.maxTorsoLean + '°',
					recommendation: 'Mantenha o tronco vertical, use o core para estabilizar'
				}
			);
		}

		return this.createValidationResult(
			true,
			'torso_alignment',
			'Tronco corretamente alinhado',
			'low',
			{
				torsoInclination: angles.torsoInclination.toFixed(1) + '°'
			}
		);
	}

	private detectValidRepetition(
		angles: ExerciseAngles
	): ValidationIssue | null {
		if (this.currentState !== 'NEUTRAL') {
			return null;
		}

		if (!this.reachedAbduction || this.repCountedInThisTransition) {
			return null;
		}

		if (
			this.config.minFramesInState !== null &&
			this.framesInCurrentState < this.config.minFramesInState
		) {
			return null;
		}

		this.validReps++;
		this.repCountedInThisTransition = true;
		this.reachedAbduction = false;

		return this.createValidationResult(
			true,
			'valid_repetition',
			`Repetição válida #${this.validReps}!`,
			'success',
			{
				totalReps: this.validReps,
				message: 'Excelente! Movimento completo detectado',
				sound: 'beep'
			}
		);
	}

	private getCurrentPositionFeedback(
		angles: ExerciseAngles
	): ValidationIssue | null {
		const maxAbductionAngle = Math.max(
			angles.leftHipAbductionAngle,
			angles.rightHipAbductionAngle
		);
		const currentTime = Date.now();
		const cooldown = this.config.feedbackCooldownMs ?? 0;

		let feedback: string | null = null;
		let severity: 'low' | 'medium' | 'high' | 'critical' | 'success' = 'low';

		if (this.currentState === 'NEUTRAL') {
			if (this.config.hipAbductionAngle !== null) {
				if (maxAbductionAngle < 10) {
					feedback = 'Posição inicial correta - pronto para elevar a perna';
					severity = 'low';
				}
			}
		} else if (this.currentState === 'ABDUCTED') {
			if (this.config.hipAbductionAngle !== null) {
				if (maxAbductionAngle < this.config.hipAbductionAngle * 0.7) {
					feedback = `Eleve mais a perna para completar a abdução (~${this.config.hipAbductionAngle}°)`;
					severity = 'medium';
				} else if (maxAbductionAngle >= this.config.hipAbductionAngle) {
					feedback = 'Ótima abdução - agora retorne à posição inicial';
					severity = 'low';
				}
			}
		}

		if (feedback) {
			const isCoolingDown = cooldown > 0 && currentTime - this.lastFeedbackTime < cooldown;
			if (isCoolingDown && severity === 'low') {
				return null;
			}

			this.lastFeedbackTime = currentTime;
			return this.createValidationResult(
				severity === 'low',
				'position_feedback',
				feedback,
				severity,
				{
					abductionAngle: maxAbductionAngle.toFixed(1) + '°',
					state: this.currentState,
					recommendation: this.getRecommendation(maxAbductionAngle)
				}
			);
		}

		return null;
	}

	private getRecommendation(abductionAngle: number): string {
		const targetAngle = this.config.hipAbductionAngle ?? DEFAULT_CONFIG.hipAbductionAngle;

		if (abductionAngle < 10) {
			return 'Posição inicial - pronto para elevar a perna lateralmente';
		} else if (abductionAngle < targetAngle * 0.5) {
			return `Continue elevando a perna - alvo: ${targetAngle}°`;
		} else if (abductionAngle < targetAngle) {
			return `Quase lá - eleve mais um pouco (~${targetAngle}°)`;
		} else {
			return 'Abdução completa - mantenha e retorne controladamente';
		}
	}

	getSummary() {
		const issuesBySeverity = {
			critical: this.currentIssues.filter((i) => i.severity === 'critical').length,
			high: this.currentIssues.filter((i) => i.severity === 'high').length,
			medium: this.currentIssues.filter((i) => i.severity === 'medium').length,
			low: this.currentIssues.filter((i) => i.severity === 'low').length
		};

		const totalIssues = this.currentIssues.length;
		const hasCritical = issuesBySeverity.critical > 0;
		const hasHigh = issuesBySeverity.high > 0;
		const hasMedium = issuesBySeverity.medium > 0;

		return {
			totalIssues,
			issuesBySeverity,
			priority: hasCritical
				? ('critical' as const)
				: hasHigh
					? ('high' as const)
					: hasMedium
						? ('medium' as const)
						: ('low' as const),
			message:
				totalIssues === 0
					? `Execução correta! Repetições: ${this.validReps}`
					: `${totalIssues} problema(s) detectado(s)`,
			validReps: this.validReps,
			currentState: this.currentState,
			framesInState: this.framesInCurrentState
		};
	}
}
