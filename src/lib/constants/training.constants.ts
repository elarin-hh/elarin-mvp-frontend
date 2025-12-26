/**
 * Training-related constants
 */

/**
 * Scoring configuration
 */
export const SCORE_ALPHA = 0.2;
export const ML_WEIGHT = 0.6;
export const HEUR_WEIGHT = 0.4;

/**
 * Score bands with color coding
 */
export const SCORE_BANDS = [
    { min: 85, color: '#22c55e' },
    { min: 70, color: '#fbbf24' },
    { min: 50, color: '#f97316' },
    { min: 0, color: '#ef4444' },
] as const;

/**
 * Severity penalties for feedback scoring
 */
export const SEVERITY_PENALTIES: Record<string, number> = {
    critical: 60,
    high: 40,
    medium: 25,
    low: 10,
};

/**
 * Repetition tracking defaults
 */
export const DEFAULT_REP_SLOTS = 30;
export const MAX_REP_SLOTS_CAP = 60;

/**
 * Default active components
 */
export const DEFAULT_COMPONENTS: string[] = [];
