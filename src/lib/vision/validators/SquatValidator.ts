/**
 * Squat Validator - Detecção de Repetições Válidas
 * ==================================================
 *
 * Validador específico para exercício de agachamento.
 * Detecta repetições válidas e fornece feedback em tempo real.
 */

import { BaseValidator } from './BaseValidator';
import { MEDIAPIPE_LANDMARKS } from '../constants/mediapipe.constants';
import type { PoseLandmarks, ValidationResult, ValidationIssue } from '../types';

export interface SquatConfig {
	kneeDownAngle?: number | null;
	kneeUpAngle?: number | null;
	maxTrunkInclination?: number | null;
	maxLateralInclination?: number | null;
	maxAngleDifference?: number | null;
	minFramesInState?: number | null;
	maxKneeOverToe?: number | null;
	footDistanceTolerance?: number | null;
	minFootDistance?: number | null;
	maxFootDistance?: number | null;
	[key: string]: any;
}

export class SquatValidator extends BaseValidator {
	private currentState: 'ALTO' | 'BAIXO' = 'ALTO';
	private framesInCurrentState: number = 0;
	public validReps: number = 0;
	private lastValidRepTime: number = 0;
	private repCountedInThisTransition: boolean = false;
	private angleHistory: Array<{
		timestamp: number;
		leftKneeAngle: number;
		rightKneeAngle: number;
		leftHipAngle: number;
		rightHipAngle: number;
		trunkInclination: number;
		lateralInclination: number;
	}> = [];
	private maxHistoryLength: number = 10;
	private lastFeedbackTime: number = 0;
	private feedbackCooldown: number = 1000;
	private initialFootDistance: number | null = null;

	constructor(config: SquatConfig = {}) {
		super(config);
		this.config = {
			...this.config,
			kneeDownAngle: config.kneeDownAngle ?? null,
			kneeUpAngle: config.kneeUpAngle ?? null,
			maxTrunkInclination: config.maxTrunkInclination ?? null,
			maxLateralInclination: config.maxLateralInclination ?? null,
			maxAngleDifference: config.maxAngleDifference ?? null,
			minFramesInState: config.minFramesInState ?? null,
			maxKneeOverToe: config.maxKneeOverToe ?? null,
			footDistanceTolerance: config.footDistanceTolerance ?? null,
			minFootDistance: config.minFootDistance ?? null,
			maxFootDistance: config.maxFootDistance ?? null,
			...config
		};
	}

	/**
	 * Valida a execução do squat com detecção de repetições válidas
	 */
	validate(landmarks: PoseLandmarks, frameCount: number = 0): ValidationResult {
		this.currentIssues = [];
		const results: (ValidationIssue | null)[] = [];

		const angles = this.calculateKeyAngles(landmarks);
		if (!angles) {
			return {
				isValid: false,
				issues: [],
				summary: {
					totalIssues: 0,
					message: 'Marcos não visíveis',
					priority: 'critical'
				}
			};
		}

		this.updateAngleHistory(angles);

		const newState = this.detectStateChange(angles);
		if (newState !== this.currentState) {
			this.framesInCurrentState = 0;
			this.currentState = newState;
			this.repCountedInThisTransition = false;
		} else {
			this.framesInCurrentState++;
		}

		results.push(this.validateTrunkStability(landmarks, angles));
		results.push(this.validateBilateralSymmetry(angles));
		results.push(this.validateFootDistance(landmarks));

		const repResult = this.detectValidRepetition(angles);
		if (repResult) {
			results.push(repResult);
		}

		results.push(this.getCurrentPositionFeedback(angles));

		results.forEach((r) => {
			if (r) {
				if (!r.isValid) {
					this.currentIssues.push(r);
				}
			}
		});

		const hasCriticalIssues = this.currentIssues.some((i) => i.severity === 'critical');
		const hasHighIssues = this.currentIssues.some((i) => i.severity === 'high');
		const isValid = !hasCriticalIssues && !hasHighIssues;

		return {
			isValid,
			issues: this.currentIssues,
			summary: this.getSummary(),
			details: results.filter((r) => r !== null) as ValidationIssue[]
		};
	}

	/**
	 * Calcula ângulos principais para detecção
	 */
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

	/**
	 * Atualiza histórico de ângulos para debounce
	 */
	private updateAngleHistory(angles: ReturnType<typeof this.calculateKeyAngles>) {
		if (!angles) return;

		this.angleHistory.push({
			timestamp: Date.now(),
			...angles
		});

		if (this.angleHistory.length > this.maxHistoryLength) {
			this.angleHistory.shift();
		}
	}

	/**
	 * Detecta mudança de estado com debounce
	 */
	private detectStateChange(angles: ReturnType<typeof this.calculateKeyAngles>): 'ALTO' | 'BAIXO' {
		if (!angles) return this.currentState;

		const avgKneeAngle = (angles.leftKneeAngle + angles.rightKneeAngle) / 2;
		const smoothedAngle =
			this.config.minFramesInState !== null ? this.getSmoothedAngle() : avgKneeAngle;

		if (this.currentState === 'ALTO') {
			if (
				this.config.kneeDownAngle !== null &&
				smoothedAngle <= this.config.kneeDownAngle &&
				(this.config.minFramesInState === null ||
					this.framesInCurrentState >= this.config.minFramesInState)
			) {
				return 'BAIXO';
			}
		} else if (this.currentState === 'BAIXO') {
			if (
				this.config.kneeUpAngle !== null &&
				smoothedAngle >= this.config.kneeUpAngle &&
				(this.config.minFramesInState === null ||
					this.framesInCurrentState >= this.config.minFramesInState)
			) {
				return 'ALTO';
			}
		}

		return this.currentState;
	}

	/**
	 * Calcula ângulo suavizado (média móvel)
	 */
	private getSmoothedAngle(): number {
		if (this.angleHistory.length < 3) {
			const current = this.angleHistory[this.angleHistory.length - 1];
			return (current.leftKneeAngle + current.rightKneeAngle) / 2;
		}

		const recent = this.angleHistory.slice(-3);
		const avgAngles = recent.map((frame) => (frame.leftKneeAngle + frame.rightKneeAngle) / 2);
		return avgAngles.reduce((sum, angle) => sum + angle, 0) / avgAngles.length;
	}

	/**
	 * Calcula inclinação frontal do tronco
	 */
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

		return Math.abs((Math.atan2(deltaX, deltaY) * 180) / Math.PI);
	}

	/**
	 * Calcula inclinação lateral do tronco
	 */
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

	/**
	 * Valida estabilidade do tronco (lateral)
	 */
	private validateTrunkStability(
		landmarks: PoseLandmarks,
		angles: ReturnType<typeof this.calculateKeyAngles>
	): ValidationIssue | null {
		if (!angles) return null;

		const maxLateralInclination = this.config.maxLateralInclination;

		if (maxLateralInclination !== null && angles.lateralInclination > maxLateralInclination) {
			return this.createValidationResult(
				false,
				'trunk_stability',
				'Tronco inclinado para o lado - mantenha ombros nivelados',
				'high',
				{
					lateralInclination: angles.lateralInclination.toFixed(1) + '°',
					frontalInclination: angles.trunkInclination.toFixed(1) + '°',
					maxLateralAllowed: maxLateralInclination + '°',
					recommendation: 'Mantenha os ombros nivelados, não incline para os lados'
				}
			);
		}

		return this.createValidationResult(
			true,
			'trunk_stability',
			'Tronco estável e equilibrado',
			'low',
			{
				frontalInclination: angles.trunkInclination.toFixed(1) + '°',
				lateralInclination: angles.lateralInclination.toFixed(1) + '°'
			}
		);
	}

	/**
	 * Valida simetria bilateral
	 */
	private validateBilateralSymmetry(
		angles: ReturnType<typeof this.calculateKeyAngles>
	): ValidationIssue | null {
		if (!angles) return null;

		const angleDifference = Math.abs(angles.leftKneeAngle - angles.rightKneeAngle);

		if (this.config.maxAngleDifference !== null && angleDifference > this.config.maxAngleDifference) {
			return this.createValidationResult(
				false,
				'bilateral_symmetry',
				'Assimetria detectada - um lado está mais baixo',
				'high',
				{
					difference: angleDifference.toFixed(1) + '°',
					maxAllowed: this.config.maxAngleDifference + '°',
					recommendation: 'Mantenha ambos os lados na mesma altura'
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

	/**
	 * Valida distância entre as pernas (largura dos ombros)
	 */
	private validateFootDistance(landmarks: PoseLandmarks): ValidationIssue | null {
		const leftAnkle = landmarks[MEDIAPIPE_LANDMARKS.LEFT_ANKLE];
		const rightAnkle = landmarks[MEDIAPIPE_LANDMARKS.RIGHT_ANKLE];

		if (!this.isVisible(leftAnkle) || !this.isVisible(rightAnkle)) {
			return null;
		}

		const currentFootDistance = Math.abs(rightAnkle.x - leftAnkle.x);
		const normalizedDistance = currentFootDistance;

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

	/**
	 * Detecta repetição válida
	 */
	private detectValidRepetition(
		angles: ReturnType<typeof this.calculateKeyAngles>
	): ValidationIssue | null {
		if (!angles) return null;

		const currentTime = Date.now();
		const avgKneeAngle = (angles.leftKneeAngle + angles.rightKneeAngle) / 2;

		if (avgKneeAngle < 120 && this.repCountedInThisTransition) {
			this.repCountedInThisTransition = false;
		}

		if (
			this.currentState === 'ALTO' &&
			!this.repCountedInThisTransition &&
			(this.config.minFramesInState === null ||
				this.framesInCurrentState >= this.config.minFramesInState)
		) {
			const recentHistory = this.angleHistory.slice(-10);
			const wasInBottom =
				this.config.kneeDownAngle !== null &&
				recentHistory.some(
					(frame) => (frame.leftKneeAngle + frame.rightKneeAngle) / 2 <= this.config.kneeDownAngle!
				);

			if (wasInBottom) {
				this.validReps++;
				this.lastValidRepTime = currentTime;
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

	/**
	 * Fornece feedback da posição atual
	 */
	private getCurrentPositionFeedback(
		angles: ReturnType<typeof this.calculateKeyAngles>
	): ValidationIssue | null {
		if (!angles) return null;

		const avgKneeAngle = (angles.leftKneeAngle + angles.rightKneeAngle) / 2;
		const currentTime = Date.now();
		let feedback: string | null = null;
		let severity: 'low' | 'medium' | 'high' | 'critical' | 'success' = 'low';

		if (this.currentState === 'ALTO') {
			if (this.config.kneeDownAngle !== null && this.config.kneeUpAngle !== null) {
				if (avgKneeAngle < this.config.kneeUpAngle && avgKneeAngle > this.config.kneeDownAngle) {
					feedback = 'Ajuste a posição - prepare-se para descer';
					severity = 'medium';
				} else if (avgKneeAngle >= this.config.kneeUpAngle) {
					feedback = 'Posição inicial correta - pronto para agachar';
					severity = 'low';
				}
			}
		} else if (this.currentState === 'BAIXO') {
			if (this.config.kneeDownAngle !== null) {
				if (avgKneeAngle > this.config.kneeDownAngle) {
					feedback = `Desça mais - atinja o paralelo (≤${this.config.kneeDownAngle}°)`;
					severity = 'high';
				} else if (avgKneeAngle <= this.config.kneeDownAngle) {
					feedback = 'Profundidade ideal - agora suba';
					severity = 'low';
				}
			}
		}

		if (feedback) {
			this.lastFeedbackTime = currentTime;
			return this.createValidationResult(severity === 'low', 'position_feedback', feedback, severity, {
				kneeAngle: avgKneeAngle.toFixed(1) + '°',
				state: this.currentState,
				recommendation: this.getRecommendation(avgKneeAngle)
			});
		}

		return null;
	}

	/**
	 * Fornece recomendação baseada no ângulo
	 */
	private getRecommendation(kneeAngle: number): string {
		const upAngle = this.config.kneeUpAngle ?? 150;
		const downAngle = this.config.kneeDownAngle ?? 80;
		const midAngle = (upAngle + downAngle) / 2;

		if (kneeAngle >= upAngle) {
			return 'Posição inicial - pronto para agachar';
		} else if (kneeAngle > midAngle) {
			return 'Continue descendo até o paralelo';
		} else if (kneeAngle > downAngle) {
			return `Desça mais - atinja o paralelo (≤${downAngle}°)`;
		} else if (kneeAngle <= downAngle) {
			return 'Profundidade ideal - agora suba';
		} else {
			return 'Continue o movimento';
		}
	}

	/**
	 * Gera resumo das validações com informações de repetições
	 */
	getSummary() {
		const issuesBySeverity = {
			critical: this.currentIssues.filter((i) => i.severity === 'critical').length,
			high: this.currentIssues.filter((i) => i.severity === 'high').length,
			medium: this.currentIssues.filter((i) => i.severity === 'medium').length,
			low: this.currentIssues.filter((i) => i.severity === 'low').length
		};

		const totalIssues = this.currentIssues.length;
		const hasCritical = issuesBySeverity.critical > 0;

		return {
			totalIssues,
			issuesBySeverity,
			priority: hasCritical ? ('critical' as const) : issuesBySeverity.high > 0 ? ('high' as const) : ('medium' as const),
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
