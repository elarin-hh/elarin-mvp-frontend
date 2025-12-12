import { BaseValidator } from './BaseValidator';
import { MEDIAPIPE_LANDMARKS } from '../constants/mediapipe.constants';
import type { PoseLandmarks, ValidationResult, ValidationIssue } from '../types';

export interface SquatConfig {
	minConfidence?: number;
	kneeDownAngle?: number | null;
	kneeUpAngle?: number | null;
	maxTrunkInclination?: number | null;
	maxLateralInclination?: number | null;
	maxAngleDifference?: number | null;
	minFramesInState?: number | null;
	minFootDistance?: number | null;
	maxFootDistance?: number | null;
	feedbackCooldownMs?: number | null;
	[key: string]: any;
}

const DEFAULT_CONFIG: Required<
	Pick<
		SquatConfig,
		| 'minConfidence'
		| 'kneeDownAngle'
		| 'kneeUpAngle'
		| 'maxTrunkInclination'
		| 'maxLateralInclination'
		| 'maxAngleDifference'
		| 'minFramesInState'
		| 'minFootDistance'
		| 'maxFootDistance'
		| 'feedbackCooldownMs'
	>
> = {
	minConfidence: 0.7,
	kneeDownAngle: 120,
	kneeUpAngle: 160,
	maxTrunkInclination: 20,
	maxLateralInclination: 8,
	maxAngleDifference: 10,
	minFramesInState: 3,
	minFootDistance: 0.1,
	maxFootDistance: 0.2,
	feedbackCooldownMs: 350
};

export class SquatBodyweightValidator extends BaseValidator {
	private currentState: 'UP' | 'DOWN' = 'UP';
	private framesInCurrentState = 0;
	public validReps = 0;
	private repCountedInThisTransition = false;
	private angleHistory: Array<{
		timestamp: number;
		leftKneeAngle: number;
		rightKneeAngle: number;
		leftHipAngle: number;
		rightHipAngle: number;
		trunkInclination: number;
		lateralInclination: number;
	}> = [];
	private maxHistoryLength = 10;
	private lastFeedbackTime = 0;

	constructor(config: SquatConfig = {}) {
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

	private calculateKeyAngles(landmarks: PoseLandmarks) {
		const leftKnee = landmarks[MEDIAPIPE_LANDMARKS.LEFT_KNEE];
		const rightKnee = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_KNEE];
		const leftHip = landmarks[MEDIAPIPE_LANDMARKS.LEFT_HIP];
		const rightHip = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_HIP];
		const leftAnkle = landmarks[MEDIAPIPE_LANDMARKS.LEFT_ANKLE];
		const rightAnkle = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_ANKLE];
		const leftShoulder = landmarks[MEDIAPIPE_LANDMARKS.LEFT_SHOULDER];
		const rightShoulder = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_SHOULDER];

		if (
			!this.isVisible(leftKnee) ||
			!this.isVisible(rightKnee) ||
			!this.isVisible(leftHip) ||
			!this.isVisible(rightHip) ||
			!this.isVisible(leftAnkle) ||
			!this.isVisible(rightAnkle) ||
			!this.isVisible(leftShoulder) ||
			!this.isVisible(rightShoulder)
		) {
			return null;
		}

		return {
			leftKneeAngle: this.calculateAngle(leftHip, leftKnee, leftAnkle),
			rightKneeAngle: this.calculateAngle(rightHip, rightKnee, rightAnkle),
			leftHipAngle: this.calculateAngle(leftKnee, leftHip, leftShoulder),
			rightHipAngle: this.calculateAngle(rightKnee, rightHip, rightShoulder),
			trunkInclination: this.calculateTrunkInclination(
				leftShoulder,
				rightShoulder,
				leftHip,
				rightHip
			),
			lateralInclination: this.calculateLateralInclination(
				leftShoulder,
				rightShoulder,
				leftHip,
				rightHip
			)
		};
	}

	private updateAngleHistory(angles: ReturnType<typeof this.calculateKeyAngles>) {
		this.angleHistory.push({
			timestamp: Date.now(),
			...angles
		});

		if (this.angleHistory.length > this.maxHistoryLength) {
			this.angleHistory.shift();
		}
	}

	private updateState(angles: ReturnType<typeof this.calculateKeyAngles>) {
		const avgKneeAngle = (angles.leftKneeAngle + angles.rightKneeAngle) / 2;
		const smoothedAngle =
			this.config.minFramesInState !== null ? this.getSmoothedAngle() : avgKneeAngle;

		let newState: 'UP' | 'DOWN' = this.currentState;

		if (
			this.currentState === 'UP' &&
			this.config.kneeDownAngle !== null &&
			smoothedAngle <= this.config.kneeDownAngle &&
			(this.config.minFramesInState === null ||
				this.framesInCurrentState >= this.config.minFramesInState)
		) {
			newState = 'DOWN';
		}

		if (
			this.currentState === 'DOWN' &&
			this.config.kneeUpAngle !== null &&
			smoothedAngle >= this.config.kneeUpAngle &&
			(this.config.minFramesInState === null ||
				this.framesInCurrentState >= this.config.minFramesInState)
		) {
			newState = 'UP';
		}

		if (newState !== this.currentState) {
			this.framesInCurrentState = 0;
			this.currentState = newState;
			this.repCountedInThisTransition = false;
		} else {
			this.framesInCurrentState++;
		}
	}

	private getSmoothedAngle(): number {
		if (this.angleHistory.length < 3) {
			const current = this.angleHistory[this.angleHistory.length - 1];
			return (current.leftKneeAngle + current.rightKneeAngle) / 2;
		}

		const recent = this.angleHistory.slice(-3);
		const avgAngles = recent.map((frame) => (frame.leftKneeAngle + frame.rightKneeAngle) / 2);
		return avgAngles.reduce((sum, angle) => sum + angle, 0) / avgAngles.length;
	}

	private runChecks(
		landmarks: PoseLandmarks,
		angles: ReturnType<typeof this.calculateKeyAngles>
	): ValidationIssue[] {
		const checks: Array<() => ValidationIssue | null> = [
			() => this.validateTrunkControl(landmarks, angles),
			() => this.validateBilateralSymmetry(angles),
			() => this.validateFootDistance(landmarks),
			() => this.detectValidRepetition(angles),
			() => this.getCurrentPositionFeedback(angles)
		];

		return checks
			.map((fn) => fn())
			.filter((result): result is ValidationIssue => result !== null);
	}

	private calculateTrunkInclination(
		leftShoulder: any,
		rightShoulder: any,
		leftHip: any,
		rightHip: any
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

	private calculateLateralInclination(
		leftShoulder: any,
		rightShoulder: any,
		leftHip: any,
		rightHip: any
	): number {
		const shoulderDeltaY = Math.abs(rightShoulder.y - leftShoulder.y);
		const shoulderDeltaX = Math.abs(rightShoulder.x - leftShoulder.x);
		const shoulderAngle = Math.abs((Math.atan2(shoulderDeltaY, shoulderDeltaX) * 180) / Math.PI);

		const hipDeltaY = Math.abs(rightHip.y - leftHip.y);
		const hipDeltaX = Math.abs(rightHip.x - leftHip.x);
		const hipAngle = Math.abs((Math.atan2(hipDeltaY, hipDeltaX) * 180) / Math.PI);

		return Math.max(shoulderAngle, hipAngle);
	}

	private validateTrunkControl(
		landmarks: PoseLandmarks,
		angles: ReturnType<typeof this.calculateKeyAngles>
	): ValidationIssue | null {
		const issues: ValidationIssue[] = [];
		const lateralDirection = this.getLateralDirection(landmarks);
		const directionLabel = lateralDirection === 'right' ? 'direita' : lateralDirection === 'left' ? 'esquerda' : 'lado';

		if (
			this.config.maxLateralInclination !== null &&
			angles.lateralInclination > this.config.maxLateralInclination
		) {
			issues.push(
				this.createValidationResult(
					false,
					'trunk_lateral_inclination',
					`Tronco inclinado para a ${directionLabel} - mantenha ombros nivelados`,
					'high',
					{
						lateralInclination: angles.lateralInclination.toFixed(1) + '°',
						maxLateralAllowed: this.config.maxLateralInclination + '°',
						recommendation: 'Mantenha os ombros nivelados, não incline para os lados',
						direction: lateralDirection
					}
				)
			);
		}

		if (
			this.config.maxTrunkInclination !== null &&
			angles.trunkInclination > this.config.maxTrunkInclination
		) {
			issues.push(
				this.createValidationResult(
					false,
					'trunk_frontal_inclination',
					'Tronco muito inclinado à frente - mantenha a coluna neutra',
					'high',
					{
						trunkInclination: angles.trunkInclination.toFixed(1) + '°',
						maxAllowed: this.config.maxTrunkInclination + '°',
						recommendation: 'Mantenha peito aberto e quadril alinhado sob os ombros'
					}
				)
			);
		}

		if (issues.length > 0) {
			return issues[0];
		}

		return this.createValidationResult(
			true,
			'trunk_control',
			'Tronco estável e alinhado',
			'low',
			{
				frontalInclination: angles.trunkInclination.toFixed(1) + '°',
				lateralInclination: angles.lateralInclination.toFixed(1) + '°',
				direction: lateralDirection
			}
		);
	}

	private getLateralDirection(landmarks: PoseLandmarks): 'left' | 'right' | 'neutral' {
		const leftShoulder = landmarks[MEDIAPIPE_LANDMARKS.LEFT_SHOULDER];
		const rightShoulder = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_SHOULDER];

		if (!this.isVisible(leftShoulder) || !this.isVisible(rightShoulder)) {
			return 'neutral';
		}

		const shoulderDeltaY = rightShoulder.y - leftShoulder.y;
		const threshold = 0.005;

		if (Math.abs(shoulderDeltaY) < threshold) {
			return 'neutral';
		}

		return shoulderDeltaY > 0 ? 'right' : 'left';
	}

	private validateBilateralSymmetry(
		angles: ReturnType<typeof this.calculateKeyAngles>
	): ValidationIssue | null {
		const angleDifference = Math.abs(angles.leftKneeAngle - angles.rightKneeAngle);
		const lowerSide = angles.leftKneeAngle < angles.rightKneeAngle ? 'esquerdo' : 'direito';
		const recommendation =
			lowerSide === 'esquerdo'
				? 'Eleve ligeiramente o lado esquerdo para nivelar'
				: 'Eleve ligeiramente o lado direito para nivelar';

		if (
			this.config.maxAngleDifference !== null &&
			angleDifference > this.config.maxAngleDifference
		) {
			return this.createValidationResult(
				false,
				'bilateral_symmetry',
				`Assimetria de joelhos - joelho ${lowerSide} mais baixo`,
				'high',
				{
					difference: angleDifference.toFixed(1) + '°',
					maxAllowed: this.config.maxAngleDifference + '°',
					leftKneeAngle: angles.leftKneeAngle.toFixed(1) + '°',
					rightKneeAngle: angles.rightKneeAngle.toFixed(1) + '°',
					lowerSide,
					recommendation
				}
			);
		}

		return this.createValidationResult(
			true,
			'bilateral_symmetry',
			'Simetria bilateral mantida',
			'low',
			{
				difference: angleDifference.toFixed(1) + '°'
			}
		);
	}

	private validateFootDistance(landmarks: PoseLandmarks): ValidationIssue | null {
		const leftAnkle = landmarks[MEDIAPIPE_LANDMARKS.LEFT_ANKLE];
		const rightAnkle = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_ANKLE];

		if (!this.isVisible(leftAnkle) || !this.isVisible(rightAnkle)) {
			return null;
		}

		const normalizedDistance = Math.abs(rightAnkle.x - leftAnkle.x);

		if (this.config.minFootDistance !== null && normalizedDistance < this.config.minFootDistance) {
			return this.createValidationResult(
				false,
				'foot_distance',
				'Pés muito próximos - abra mais as pernas',
				'high',
				{
					distance: (normalizedDistance * 100).toFixed(1) + '%',
					minRequired: (this.config.minFootDistance * 100).toFixed(1) + '%',
					recommendation: 'Abra as pernas na largura dos ombros'
				}
			);
		}

		if (this.config.maxFootDistance !== null && normalizedDistance > this.config.maxFootDistance) {
			return this.createValidationResult(
				false,
				'foot_distance',
				'Pés muito afastados - aproxime as pernas',
				'high',
				{
					distance: (normalizedDistance * 100).toFixed(1) + '%',
					maxAllowed: (this.config.maxFootDistance * 100).toFixed(1) + '%',
					recommendation: 'Aproxime as pernas para a largura dos ombros'
				}
			);
		}

		return this.createValidationResult(
			true,
			'foot_distance',
			'Distância entre pernas correta',
			'low',
			{
				distance: (normalizedDistance * 100).toFixed(1) + '%'
			}
		);
	}

	private detectValidRepetition(
		angles: ReturnType<typeof this.calculateKeyAngles>
	): ValidationIssue | null {
		const avgKneeAngle = (angles.leftKneeAngle + angles.rightKneeAngle) / 2;

		const resetThreshold =
			(this.config.kneeUpAngle ?? DEFAULT_CONFIG.kneeUpAngle) - 10;

		if (avgKneeAngle < resetThreshold && this.repCountedInThisTransition) {
			this.repCountedInThisTransition = false;
		}

		if (
			this.currentState === 'UP' &&
			!this.repCountedInThisTransition &&
			(this.config.minFramesInState === null ||
				this.framesInCurrentState >= this.config.minFramesInState)
		) {
			const wasInBottom =
				this.config.kneeDownAngle !== null &&
				this.angleHistory.slice(-10).some(
					(frame) => (frame.leftKneeAngle + frame.rightKneeAngle) / 2 <= this.config.kneeDownAngle!
				);

			if (wasInBottom) {
				this.validReps++;
				this.repCountedInThisTransition = true;

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
		}

		return null;
	}

	private getCurrentPositionFeedback(
		angles: ReturnType<typeof this.calculateKeyAngles>
	): ValidationIssue | null {
		const avgKneeAngle = (angles.leftKneeAngle + angles.rightKneeAngle) / 2;
		const currentTime = Date.now();
		const cooldown = this.config.feedbackCooldownMs ?? 0;

		let feedback: string | null = null;
		let severity: 'low' | 'medium' | 'high' | 'critical' | 'success' = 'low';

		if (this.currentState === 'UP') {
			if (this.config.kneeDownAngle !== null && this.config.kneeUpAngle !== null) {
				if (avgKneeAngle < this.config.kneeUpAngle && avgKneeAngle > this.config.kneeDownAngle) {
					feedback = 'Ajuste a posição - prepare-se para descer';
					severity = 'medium';
				} else if (avgKneeAngle >= this.config.kneeUpAngle) {
					feedback = 'Posição inicial correta - pronto para agachar';
					severity = 'low';
				}
			}
		} else if (this.currentState === 'DOWN') {
			if (this.config.kneeDownAngle !== null) {
				if (avgKneeAngle > this.config.kneeDownAngle) {
					feedback = `Desça mais - atinja o paralelo (?${this.config.kneeDownAngle}°)`;
					severity = 'high';
				} else if (avgKneeAngle <= this.config.kneeDownAngle) {
					feedback = 'Profundidade ideal - agora suba';
					severity = 'low';
				}
			}
		}

		if (feedback) {
			const isCoolingDown = cooldown > 0 && currentTime - this.lastFeedbackTime < cooldown;
			if (isCoolingDown && severity !== 'high') {
				return null;
			}

			this.lastFeedbackTime = currentTime;
			return this.createValidationResult(severity === 'low', 'position_feedback', feedback, severity, {
				kneeAngle: avgKneeAngle.toFixed(1) + '°',
				state: this.currentState,
				recommendation: this.getRecommendation(avgKneeAngle)
			});
		}

		return null;
	}

	private getRecommendation(kneeAngle: number): string {
		const upAngle = this.config.kneeUpAngle ?? DEFAULT_CONFIG.kneeUpAngle;
		const downAngle = this.config.kneeDownAngle ?? DEFAULT_CONFIG.kneeDownAngle;
		const midAngle = (upAngle + downAngle) / 2;

		if (kneeAngle >= upAngle) {
			return 'Posição inicial - pronto para agachar';
		} else if (kneeAngle > midAngle) {
			return 'Continue descendo até o paralelo';
		} else if (kneeAngle > downAngle) {
			return `Desça mais - atinja o paralelo (?${downAngle}°)`;
		} else if (kneeAngle <= downAngle) {
			return 'Profundidade ideal - agora suba';
		}

		return 'Continue o movimento';
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
