/**
 * Generic Validator Configuration Types
 * Data-driven configuration for exercise heuristics
 * 
 * Supports two exercise modes:
 * 1. Rep-based (state machine): Squats, Lunges - counts UP→DOWN→UP transitions
 * 2. Time-based (stateless): Planks, Balance - validates position continuously
 */

import type { Severity } from './feedback.types';

// ============================================================================
// LANDMARK TYPES
// ============================================================================

/** MediaPipe landmark indices for angle calculations (3 points) */
export type LandmarkTriplet = [number, number, number];

/** MediaPipe landmark indices for distance calculations (2 points) */
export type LandmarkPair = [number, number];

// ============================================================================
// CONDITION TYPES
// ============================================================================

/** Comparison operators for numeric conditions */
export type ComparisonOperator = '<' | '>' | '<=' | '>=' | 'between';

/** Angle condition - validates angle between 3 landmarks */
export interface AngleCondition {
    type: 'angle';
    landmarks: LandmarkTriplet;
    operator: ComparisonOperator;
    value: number | [number, number]; // Single or [min, max] for 'between'
}

/** Distance condition - validates normalized distance between 2 landmarks */
export interface DistanceCondition {
    type: 'distance';
    landmarks: LandmarkPair;
    operator: ComparisonOperator;
    value: number | [number, number];
}

/** Alignment condition - validates vertical or horizontal alignment */
export interface AlignmentCondition {
    type: 'alignment';
    axis: 'vertical' | 'horizontal';
    landmarks: LandmarkPair;
    tolerance: number;
}

/** Symmetry condition - validates left/right balance */
export interface SymmetryCondition {
    type: 'symmetry';
    leftLandmarks: LandmarkTriplet | LandmarkPair;
    rightLandmarks: LandmarkTriplet | LandmarkPair;
    maxDifference: number;
}

/** Union of all condition types */
export type ValidatorCondition =
    | AngleCondition
    | DistanceCondition
    | AlignmentCondition
    | SymmetryCondition;

// ============================================================================
// STATE MACHINE (for rep-based exercises)
// ============================================================================

/** State definition for rep-based exercises */
export interface StateDefinition {
    name: string;
    entryConditions: ValidatorCondition[];
    minFrames?: number;
}

/** Rep counting rule */
export interface RepRule {
    sequence: string[];  // e.g., ['UP', 'DOWN', 'UP']
    trigger: 'on_complete' | 'on_transition';
}

// ============================================================================
// VALIDATION CHECKS
// ============================================================================

/** Check definition - runs every frame or in specific states */
export interface CheckDefinition {
    id: string;
    name: string;
    condition: ValidatorCondition;
    severity: Severity;
    messages: {
        pass: string;
        fail: string;
    };
    activeInStates?: string[];  // Only for rep-based exercises
    cooldownMs?: number;
}

// ============================================================================
// EXERCISE MODES
// ============================================================================

/**
 * Exercise mode determines validation strategy:
 * - 'reps': Uses state machine, counts repetitions
 * - 'hold': No states, validates position continuously, uses timer
 * - 'hybrid': Has states but also uses timer (e.g., isometric squat hold)
 */
export type ExerciseMode = 'reps' | 'hold' | 'hybrid';

// ============================================================================
// HEURISTIC CONFIG (stored in database config.heuristicConfig)
// ============================================================================

/**
 * Heuristic configuration from database
 * This is what gets stored in config.heuristicConfig
 */
export interface HeuristicConfigDB {
    // Mode
    mode?: ExerciseMode;

    // State machine (for 'reps' mode)
    states?: StateDefinition[];
    initialState?: string;
    repRule?: RepRule;

    // Primary angle tracking
    primaryAngle?: {
        landmarks: LandmarkTriplet;
        name: string;
        smoothingFrames?: number;
    };

    // Validation checks
    checks?: CheckDefinition[];

    // Global settings
    feedbackCooldownMs?: number;
    minConfidence?: number;
}

// ============================================================================
// FULL VALIDATOR CONFIG (runtime)
// ============================================================================

/**
 * Full validator configuration used at runtime
 * This is the normalized form used by GenericValidator
 */
export interface GenericValidatorConfig {
    exerciseId: string;
    exerciseName: string;

    // Exercise mode
    mode: ExerciseMode;

    // State machine (only for 'reps' mode)
    states?: StateDefinition[];
    initialState?: string;
    repRule?: RepRule;

    // Primary movement tracking
    primaryAngle?: {
        landmarks: LandmarkTriplet;
        name: string;
        smoothingFrames?: number;
    };

    // Validation checks (run in both modes)
    checks: CheckDefinition[];

    // Global settings
    minConfidence: number;
    feedbackCooldownMs: number;
    angleHistoryLength: number;
}

// ============================================================================
// RUNTIME STATE
// ============================================================================

/** Runtime state for GenericValidator */
export interface ValidatorState {
    currentState?: string;
    framesInState: number;
    stateHistory: string[];
    validReps: number;
    isPositionValid: boolean;
    angleHistory: Array<{
        timestamp: number;
        primaryAngle: number;
    }>;
}

