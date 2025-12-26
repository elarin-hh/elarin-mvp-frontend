/**
 * Scoring Service
 * Handles score calculation logic for training feedback
 */

import { SEVERITY_PENALTIES, ML_WEIGHT, HEUR_WEIGHT, SCORE_ALPHA } from '$lib/constants';
import type { FeedbackRecord } from '$lib/vision';

/**
 * Clamp a score value between 0 and 100
 */
export function clampScore(value: number): number {
    return Math.max(0, Math.min(100, value));
}

/**
 * Extract ML score from feedback record
 */
export function getMlScore(feedback: FeedbackRecord): number | null {
    const rawQuality = (feedback.ml as { quality?: unknown } | null)?.quality ?? null;

    const parsedQuality =
        typeof rawQuality === 'string'
            ? parseFloat(rawQuality)
            : (rawQuality as number | null);

    if (typeof parsedQuality === 'number' && !Number.isNaN(parsedQuality)) {
        return clampScore(parsedQuality);
    }

    const confidenceValue =
        feedback.ml?.confidence ?? feedback.combined.confidence ?? null;

    if (typeof confidenceValue === 'number' && !Number.isNaN(confidenceValue)) {
        return clampScore(confidenceValue * 100);
    }

    return null;
}

/**
 * Calculate heuristic score based on validation issues
 */
export function getHeuristicScore(feedback: FeedbackRecord): number | null {
    const heuristic = feedback.heuristic;
    if (!heuristic || !heuristic.available) return null;

    if (heuristic.isValid) return 95;

    const issues = heuristic.issues || [];
    const penalty = issues.reduce((acc, issue) => {
        const weight =
            SEVERITY_PENALTIES[
            (issue.severity as keyof typeof SEVERITY_PENALTIES)
            ] ?? 0;
        return acc + weight;
    }, 0);

    return clampScore(100 - penalty);
}

/**
 * Combine ML and heuristic scores with weights
 */
export function combineScores(
    mlScore: number | null,
    heuristicScore: number | null,
): number | null {
    if (mlScore === null && heuristicScore === null) return null;
    if (mlScore === null) return heuristicScore;
    if (heuristicScore === null) return mlScore;
    return clampScore(mlScore * ML_WEIGHT + heuristicScore * HEUR_WEIGHT);
}

/**
 * Calculate frame score from feedback record
 */
export function calculateFrameScore(feedback: FeedbackRecord): number | null {
    const mlScore = getMlScore(feedback);
    const heuristicScore = getHeuristicScore(feedback);
    return combineScores(mlScore, heuristicScore);
}

/**
 * Update EMA (Exponential Moving Average) score
 */
export function updateEmaScore(currentEma: number, newFrameScore: number): number {
    return clampScore(SCORE_ALPHA * newFrameScore + (1 - SCORE_ALPHA) * currentEma);
}

/**
 * Get color for a given score based on score bands
 */
export function getScoreColor(score: number, scoreBands: Array<{ min: number; color: string }>): string {
    for (const band of scoreBands) {
        if (score >= band.min) {
            return band.color;
        }
    }
    return scoreBands[scoreBands.length - 1]?.color || '#ef4444';
}

/**
 * Calculate gradient colors based on score
 */
export function gradientForScore(score: number): { start: string; end: string } {
    if (score >= 75) {
        return { start: '#22c55e', end: '#16a34a' }; // green
    } else if (score >= 50) {
        return { start: '#fbbf24', end: '#f59e0b' }; // yellow/amber
    } else if (score >= 25) {
        return { start: '#f97316', end: '#ea580c' }; // orange
    } else {
        return { start: '#ef4444', end: '#dc2626' }; // red
    }
}
