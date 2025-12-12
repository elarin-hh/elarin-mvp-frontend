export const featureFlags = {
  enableCameraCapture: false,

  enableVisionProcessing: false,

  enableExerciseDetection: false,

  enableTelemetry: true
} as const;

export type FeatureFlag = keyof typeof featureFlags;
