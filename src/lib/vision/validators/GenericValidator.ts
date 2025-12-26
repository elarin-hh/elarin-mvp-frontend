/**
 * Generic Validator
 * Data-driven validator that supports both rep-based and stateless exercises
 * 
 * Modes:
 * - 'reps': Uses state machine (UP→DOWN→UP = 1 rep)
 * - 'hold': No states, just validates position continuously
 * - 'hybrid': Has states + timer
 */

import { BaseValidator } from './BaseValidator';
import type { PoseLandmarks, ValidationResult, ValidationIssue, Severity, Landmark } from '../types';
import type {
    GenericValidatorConfig,
    ValidatorState,
    ValidatorCondition,
    AngleCondition,
    DistanceCondition,
    AlignmentCondition,
    SymmetryCondition,
    CheckDefinition,
    HeuristicConfigDB,
    ExerciseMode
} from '../types/validator-config.types';

const DEFAULT_CONFIG = {
    minConfidence: 0.7,
    feedbackCooldownMs: 350,
    angleHistoryLength: 10
};

export class GenericValidator extends BaseValidator {
    private validatorConfig: GenericValidatorConfig;
    private state: ValidatorState;

    constructor(config: GenericValidatorConfig) {
        super({ minConfidence: config.minConfidence ?? DEFAULT_CONFIG.minConfidence });

        this.validatorConfig = {
            ...config,
            minConfidence: config.minConfidence ?? DEFAULT_CONFIG.minConfidence,
            feedbackCooldownMs: config.feedbackCooldownMs ?? DEFAULT_CONFIG.feedbackCooldownMs,
            angleHistoryLength: config.angleHistoryLength ?? DEFAULT_CONFIG.angleHistoryLength
        };

        this.state = this.createInitialState();
    }

    private createInitialState(): ValidatorState {
        return {
            currentState: this.validatorConfig.initialState,
            framesInState: 0,
            stateHistory: this.validatorConfig.initialState ? [this.validatorConfig.initialState] : [],
            validReps: 0,
            isPositionValid: true,
            angleHistory: []
        };
    }

    public override reset(): void {
        super.reset();
        this.state = this.createInitialState();
    }

    public get validReps(): number {
        return this.state.validReps;
    }

    public get currentStateName(): string | undefined {
        return this.state.currentState;
    }

    public get isPositionValid(): boolean {
        return this.state.isPositionValid;
    }

    validate(landmarks: PoseLandmarks, _frameCount: number = 0): ValidationResult {
        const issues: ValidationIssue[] = [];

        // Calculate primary angle if defined
        let primaryAngle: number | null = null;
        if (this.validatorConfig.primaryAngle) {
            primaryAngle = this.calculatePrimaryAngle(landmarks);
            if (primaryAngle !== null) {
                this.updateAngleHistory(primaryAngle);
            }
        }

        // Mode-specific logic
        if (this.validatorConfig.mode === 'reps' || this.validatorConfig.mode === 'hybrid') {
            // Rep-based: update state machine
            if (this.validatorConfig.states && this.validatorConfig.states.length > 0) {
                const stateChanged = this.updateStateMachine(landmarks);

                // Check for rep completion
                const repIssue = this.checkRepCompletion(stateChanged);
                if (repIssue) issues.push(repIssue);
            }
        }

        // Run configured checks (works for all modes)
        const checkIssues = this.runConfiguredChecks(landmarks);
        issues.push(...checkIssues);

        return this.createResult(this.state.isPositionValid, issues, primaryAngle);
    }

    private calculatePrimaryAngle(landmarks: PoseLandmarks): number | null {
        if (!this.validatorConfig.primaryAngle) return null;

        const [i1, i2, i3] = this.validatorConfig.primaryAngle.landmarks;
        const p1 = landmarks[i1];
        const p2 = landmarks[i2];
        const p3 = landmarks[i3];

        if (!this.isVisible(p1) || !this.isVisible(p2) || !this.isVisible(p3)) {
            return null;
        }

        return this.calculateAngle(p1, p2, p3);
    }

    private updateAngleHistory(primaryAngle: number): void {
        this.state.angleHistory.push({
            timestamp: Date.now(),
            primaryAngle
        });

        const maxLen = this.validatorConfig.angleHistoryLength ?? DEFAULT_CONFIG.angleHistoryLength;
        if (this.state.angleHistory.length > maxLen) {
            this.state.angleHistory.shift();
        }
    }

    private getSmoothedPrimaryAngle(): number {
        const history = this.state.angleHistory;
        if (history.length === 0) return 0;

        const smoothingFrames = this.validatorConfig.primaryAngle?.smoothingFrames ?? 3;
        const recent = history.slice(-smoothingFrames);
        const sum = recent.reduce((acc, h) => acc + h.primaryAngle, 0);
        return sum / recent.length;
    }

    private updateStateMachine(landmarks: PoseLandmarks): boolean {
        if (!this.validatorConfig.states || !this.state.currentState) return false;

        const currentStateDef = this.validatorConfig.states.find(
            s => s.name === this.state.currentState
        );

        if (!currentStateDef) return false;

        // Check if we should transition to another state
        for (const stateDef of this.validatorConfig.states) {
            if (stateDef.name === this.state.currentState) continue;

            const canEnter = this.evaluateConditions(landmarks, stateDef.entryConditions);
            const hasMinFrames = !currentStateDef.minFrames ||
                this.state.framesInState >= currentStateDef.minFrames;

            if (canEnter && hasMinFrames) {
                this.state.currentState = stateDef.name;
                this.state.framesInState = 0;
                this.state.stateHistory.push(stateDef.name);

                // Keep history bounded
                if (this.state.stateHistory.length > 20) {
                    this.state.stateHistory.shift();
                }

                return true;
            }
        }

        this.state.framesInState++;
        return false;
    }

    private evaluateConditions(landmarks: PoseLandmarks, conditions: ValidatorCondition[]): boolean {
        return conditions.every(condition => this.evaluateCondition(landmarks, condition));
    }

    private evaluateCondition(landmarks: PoseLandmarks, condition: ValidatorCondition): boolean {
        switch (condition.type) {
            case 'angle':
                return this.evaluateAngleCondition(landmarks, condition);
            case 'distance':
                return this.evaluateDistanceCondition(landmarks, condition);
            case 'alignment':
                return this.evaluateAlignmentCondition(landmarks, condition);
            case 'symmetry':
                return this.evaluateSymmetryCondition(landmarks, condition);
            default:
                return false;
        }
    }

    private evaluateAngleCondition(landmarks: PoseLandmarks, condition: AngleCondition): boolean {
        const [i1, i2, i3] = condition.landmarks;
        const p1 = landmarks[i1];
        const p2 = landmarks[i2];
        const p3 = landmarks[i3];

        if (!this.isVisible(p1) || !this.isVisible(p2) || !this.isVisible(p3)) {
            return false;
        }

        const angle = this.calculateAngle(p1, p2, p3);
        return this.compareValue(angle, condition.operator, condition.value);
    }

    private evaluateDistanceCondition(landmarks: PoseLandmarks, condition: DistanceCondition): boolean {
        const [i1, i2] = condition.landmarks;
        const p1 = landmarks[i1];
        const p2 = landmarks[i2];

        if (!this.isVisible(p1) || !this.isVisible(p2)) {
            return false;
        }

        const distance = this.calculateDistance(p1, p2);
        return this.compareValue(distance, condition.operator, condition.value);
    }

    private evaluateAlignmentCondition(landmarks: PoseLandmarks, condition: AlignmentCondition): boolean {
        const [i1, i2] = condition.landmarks;
        const p1 = landmarks[i1];
        const p2 = landmarks[i2];

        if (!this.isVisible(p1) || !this.isVisible(p2)) {
            return false;
        }

        if (condition.axis === 'vertical') {
            return this.checkVerticalAlignment(p1, p2, condition.tolerance);
        } else {
            return this.checkHorizontalAlignment(p1, p2, condition.tolerance);
        }
    }

    private evaluateSymmetryCondition(landmarks: PoseLandmarks, condition: SymmetryCondition): boolean {
        const leftValue = this.calculateFromLandmarks(landmarks, condition.leftLandmarks);
        const rightValue = this.calculateFromLandmarks(landmarks, condition.rightLandmarks);

        if (leftValue === null || rightValue === null) {
            return false;
        }

        return Math.abs(leftValue - rightValue) <= condition.maxDifference;
    }

    private calculateFromLandmarks(
        landmarks: PoseLandmarks,
        indices: [number, number, number] | [number, number]
    ): number | null {
        if (indices.length === 3) {
            const [i1, i2, i3] = indices;
            const p1 = landmarks[i1];
            const p2 = landmarks[i2];
            const p3 = landmarks[i3];
            if (!this.isVisible(p1) || !this.isVisible(p2) || !this.isVisible(p3)) return null;
            return this.calculateAngle(p1, p2, p3);
        } else {
            const [i1, i2] = indices;
            const p1 = landmarks[i1];
            const p2 = landmarks[i2];
            if (!this.isVisible(p1) || !this.isVisible(p2)) return null;
            return this.calculateDistance(p1, p2);
        }
    }

    private compareValue(
        actual: number,
        operator: '<' | '>' | '<=' | '>=' | 'between',
        expected: number | [number, number]
    ): boolean {
        if (operator === 'between') {
            const [min, max] = expected as [number, number];
            return actual >= min && actual <= max;
        }

        const value = expected as number;
        switch (operator) {
            case '<': return actual < value;
            case '>': return actual > value;
            case '<=': return actual <= value;
            case '>=': return actual >= value;
            default: return false;
        }
    }

    private checkRepCompletion(stateChanged: boolean): ValidationIssue | null {
        if (!stateChanged || !this.validatorConfig.repRule) return null;

        const { repRule } = this.validatorConfig;
        const history = this.state.stateHistory;
        const sequence = repRule.sequence;

        // Check if recent history matches the rep sequence
        if (history.length < sequence.length) return null;

        const recentStates = history.slice(-sequence.length);
        const matches = sequence.every((s, i) => recentStates[i] === s);

        if (matches) {
            this.state.validReps++;

            // Clear matched portion from history
            this.state.stateHistory = [this.state.currentState!];

            return this.createValidationResult(
                true,
                'rep_counted',
                `Repetição ${this.state.validReps} completa!`,
                'low',
                { repNumber: this.state.validReps }
            );
        }

        return null;
    }

    /**
     * Run configured checks
     * Returns two things:
     * 1. Issues for feedback (respects cooldown)
     * 2. Updates internal state for position validity (with hysteresis to prevent flickering)
     */
    private runConfiguredChecks(landmarks: PoseLandmarks): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        let anyCheckFailed = false;

        for (const check of this.validatorConfig.checks) {
            // Skip if not active in current state (only for rep-based)
            if (check.activeInStates && this.state.currentState) {
                if (!check.activeInStates.includes(this.state.currentState)) {
                    continue;
                }
            }

            // ALWAYS evaluate the condition (for validity tracking)
            const passed = this.evaluateCondition(landmarks, check.condition);

            if (!passed) {
                anyCheckFailed = true;

                // Always add to issues list so UI shows persistent feedback
                // Audio/notification throttling should be handled by the consumer (FeedbackSystem/UI)
                issues.push(this.createValidationResult(
                    false,
                    check.id,
                    check.messages.fail,
                    check.severity,
                    { checkName: check.name }
                ));
            }
        }

        // Track if any check is currently failing
        this.state.isPositionValid = !anyCheckFailed;

        return issues;
    }

    private createResult(
        isValid: boolean,
        issues: ValidationIssue[],
        primaryAngle: number | null
    ): ValidationResult {
        return {
            isValid,
            issues,
            summary: {
                totalIssues: issues.length,
                message: isValid ? 'Execução correta' : issues[0]?.message ?? 'Verificar posição',
                priority: this.getHighestSeverity(issues),
                validReps: this.state.validReps,
                currentState: this.state.currentState,
                framesInState: this.state.framesInState
            },
            debug: {
                primaryAngle,
                currentState: this.state.currentState,
                framesInState: this.state.framesInState,
                mode: this.validatorConfig.mode,
                isPositionValid: this.state.isPositionValid
            }
        };
    }

    private getHighestSeverity(issues: ValidationIssue[]): Severity {
        const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low'];
        for (const severity of severityOrder) {
            if (issues.some(i => i.severity === severity)) {
                return severity;
            }
        }
        return 'low';
    }

    public getSummary() {
        return {
            exerciseId: this.validatorConfig.exerciseId,
            exerciseName: this.validatorConfig.exerciseName,
            mode: this.validatorConfig.mode,
            validReps: this.state.validReps,
            currentState: this.state.currentState,
            isPositionValid: this.state.isPositionValid,
            stateHistory: [...this.state.stateHistory],
            angleHistory: this.state.angleHistory.map(h => h.primaryAngle)
        };
    }
}

// ============================================================================
// FACTORY FUNCTION: Convert DB heuristicConfig to GenericValidatorConfig
// ============================================================================

/**
 * Convert database heuristicConfig to GenericValidatorConfig
 * Expects new format with states and checks
 */
export function createValidatorConfig(
    exerciseId: string,
    exerciseName: string,
    heuristicConfig: HeuristicConfigDB
): GenericValidatorConfig {
    const mode: ExerciseMode = heuristicConfig.mode ?? 'reps';

    return {
        exerciseId,
        exerciseName,
        mode,
        states: heuristicConfig.states,
        initialState: heuristicConfig.initialState ?? heuristicConfig.states?.[0]?.name,
        repRule: heuristicConfig.repRule,
        primaryAngle: heuristicConfig.primaryAngle,
        checks: heuristicConfig.checks ?? [],
        minConfidence: heuristicConfig.minConfidence ?? DEFAULT_CONFIG.minConfidence,
        feedbackCooldownMs: heuristicConfig.feedbackCooldownMs ?? DEFAULT_CONFIG.feedbackCooldownMs,
        angleHistoryLength: DEFAULT_CONFIG.angleHistoryLength
    };
}

