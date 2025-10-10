// Feature flags for progressive enhancement
export const featureFlags = {
  // Camera capture will be enabled in next phase
  enableCameraCapture: false,
  
  // MediaPipe vision processing will be enabled in next phase
  enableVisionProcessing: false,
  
  // Real-time exercise detection will be enabled in next phase
  enableExerciseDetection: false,
  
  // Telemetry and analytics (currently stub only)
  enableTelemetry: false
} as const;

export type FeatureFlag = keyof typeof featureFlags;

