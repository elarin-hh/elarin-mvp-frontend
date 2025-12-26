/**
 * Skeleton rendering constants
 */

/**
 * Skeleton color CSS variables
 */
export const SKELETON_COLORS = {
    correct: 'var(--color-skeleton-correct)',
    incorrect: 'var(--color-skeleton-incorrect)',
    neutral: 'var(--color-skeleton-neutral)',
} as const;

/**
 * Skeleton line styling
 */
export const SKELETON_STYLE = {
    lineWidth: 5,
    pointRadius: 7,
    opacity: 0.9,
    glow: 0,
} as const;

/**
 * Torso line styling (separate from limbs)
 */
export const TORSO_LINE = {
    enabled: true,
    lineWidth: 5,
    color: '',
} as const;
