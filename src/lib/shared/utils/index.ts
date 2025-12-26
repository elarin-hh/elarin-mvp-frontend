/**
 * Shared Utilities Barrel Export
 * 
 * Common utility functions used across features
 */

// Asset utilities
export { asset } from '$lib/utils/assets';

// Fullscreen utilities
export {
    requestFullscreen,
    exitFullscreen,
    isInFullscreen,
    getOrientation,
    onFullscreenChange,
    onOrientationChange,
} from '$lib/services/fullscreen.service';

// Time utilities
export {
    formatTime,
    formatRemainingLabel,
    clampPercent,
    calculateElapsedSeconds,
    formatDurationMs,
} from '$lib/services/time-format.service';
