/**
 * Training Feature - Barrel Export
 * 
 * This module contains all training-related functionality:
 * - Training session management
 * - Exercise analysis
 * - Scoring and feedback
 * - Vision/pose detection
 */

// Re-export from existing locations for backwards compatibility
export { trainingStore, trainingActions } from '$lib/stores/training.store';
export { trainingPlanStore, trainingPlanActions } from '$lib/stores/training-plan.store';
export { trainingPlanSummaryActions } from '$lib/stores/training-plan-summary.store';

// Vision/analysis
export { ExerciseAnalyzer } from '$lib/vision/core/ExerciseAnalyzer';
export { FeedbackSystem } from '$lib/vision/core/FeedbackSystem';

// Services
export {
    clampScore,
    getMlScore,
    getHeuristicScore,
    combineScores,
    calculateFrameScore,
    updateEmaScore,
    getScoreColor,
    gradientForScore,
} from '$lib/services/scoring.service';

export {
    formatTime,
    formatRemainingLabel,
    clampPercent,
    calculateElapsedSeconds,
} from '$lib/services/time-format.service';

// API
export { trainingApi } from '$lib/api/training.api';
export { trainingPlansApi } from '$lib/api/training-plans.api';

// Types
export type {
    TrainingPhase,
    LayoutMode,
    SettingsTab,
    FeedbackMode,
    GoalMetricDisplay,
    SummaryMetricDisplay,
} from '$lib/types/training.types';
