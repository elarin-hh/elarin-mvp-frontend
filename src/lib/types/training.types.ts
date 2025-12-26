/**
 * Training-related type definitions
 */

/**
 * Phases of a training session
 */
export type TrainingPhase =
    | 'positioning'
    | 'confirmation'
    | 'description'
    | 'countdown'
    | 'training'
    | 'summary';

/**
 * Layout modes for the training view
 */
export type LayoutMode = 'side-by-side' | 'user-centered' | 'coach-centered';

/**
 * Tab options for the settings panel
 */
export type SettingsTab = 'display' | 'skeleton' | 'sound' | 'dev';

// Re-export FeedbackMode from vision types (single source of truth)
export type { FeedbackMode } from '$lib/vision/types/feedback.types';

/**
 * Display metric for goals in "next exercise" view
 */
export interface GoalMetricDisplay {
    id: string;
    label: string;
    value: string;
}

/**
 * Display metric for summary view
 */
export interface SummaryMetricDisplay {
    id: string;
    label: string;
    value: string;
    target: string | null;
}
