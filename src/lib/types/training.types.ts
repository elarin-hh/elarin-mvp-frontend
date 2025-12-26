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

/**
 * Feedback mode for analysis
 */
export type FeedbackMode = 'hybrid' | 'ml_only' | 'heuristic_only';

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
