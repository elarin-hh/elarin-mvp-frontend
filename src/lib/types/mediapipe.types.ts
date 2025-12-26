/**
 * MediaPipe-related type definitions
 * These types represent the MediaPipe Pose API interfaces
 */

/**
 * Individual pose landmark with 3D coordinates and visibility
 */
export interface PoseLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
    presence?: number;
}

/**
 * MediaPipe Pose instance
 */
export interface MediaPipePose {
    setOptions: (options: Record<string, unknown>) => void;
    onResults: (callback: (results: PoseResults) => void) => void;
    send: (inputs: { image: HTMLVideoElement }) => Promise<void>;
}

/**
 * MediaPipe Camera instance
 */
export interface MediaPipeCamera {
    start: () => Promise<void>;
    stop: () => void;
}

/**
 * Results from MediaPipe Pose detection
 */
export interface PoseResults {
    poseLandmarks?: PoseLandmark[];
    image: HTMLVideoElement | HTMLCanvasElement;
}
