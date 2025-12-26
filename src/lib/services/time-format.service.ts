/**
 * Time Formatting Service
 * Utility functions for formatting time and duration values
 */

/**
 * Format seconds to MM:SS string
 */
export function formatTime(seconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const m = Math.floor(safeSeconds / 60);
    const s = safeSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format remaining time, returns '--:--' if null
 */
export function formatRemainingLabel(remainingSeconds: number | null): string {
    if (remainingSeconds === null) return '--:--';
    return formatTime(remainingSeconds);
}

/**
 * Clamp percentage between 0 and 100
 */
export function clampPercent(value: number): number {
    return Math.max(0, Math.min(100, value));
}

/**
 * Calculate elapsed time from start timestamp
 */
export function calculateElapsedSeconds(startTime: number | null): number {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime) / 1000);
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDurationMs(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);
    return formatTime(totalSeconds);
}
