/**
 * Fullscreen Service
 * Handles fullscreen mode and orientation detection
 */

/**
 * Request fullscreen mode for an element
 */
export async function requestFullscreen(element?: HTMLElement): Promise<boolean> {
    const target = element || document.documentElement;

    try {
        if (target.requestFullscreen) {
            await target.requestFullscreen();
            return true;
        }

        // Webkit fallback
        const webkitTarget = target as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
        if (webkitTarget.webkitRequestFullscreen) {
            await webkitTarget.webkitRequestFullscreen();
            return true;
        }

        return false;
    } catch (error) {
        console.warn('Fullscreen request failed:', error);
        return false;
    }
}

/**
 * Exit fullscreen mode
 */
export async function exitFullscreen(): Promise<boolean> {
    try {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return true;
        }

        // Webkit fallback
        const webkitDoc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
        if (webkitDoc.webkitExitFullscreen) {
            await webkitDoc.webkitExitFullscreen();
            return true;
        }

        return false;
    } catch (error) {
        console.warn('Exit fullscreen failed:', error);
        return false;
    }
}

/**
 * Check if currently in fullscreen mode
 */
export function isInFullscreen(): boolean {
    return !!(
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement
    );
}

/**
 * Get current screen orientation
 */
export function getOrientation(): 'portrait' | 'landscape' {
    if (typeof window === 'undefined') return 'landscape';
    return window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
}

/**
 * Add fullscreen change listener
 */
export function onFullscreenChange(callback: (isFullscreen: boolean) => void): () => void {
    const handler = () => callback(isInFullscreen());

    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);

    return () => {
        document.removeEventListener('fullscreenchange', handler);
        document.removeEventListener('webkitfullscreenchange', handler);
    };
}

/**
 * Add orientation change listener
 */
export function onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): () => void {
    const handler = () => callback(getOrientation());

    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);

    return () => {
        window.removeEventListener('resize', handler);
        window.removeEventListener('orientationchange', handler);
    };
}
