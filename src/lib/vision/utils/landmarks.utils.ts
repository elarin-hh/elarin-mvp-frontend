import type { Landmark, PoseLandmarks } from '../types';

export function isVisible(landmark: Landmark, threshold: number = 0.5): boolean {
  return landmark && landmark.visibility !== undefined && landmark.visibility > threshold;
}

export function areAllVisible(landmarks: Landmark[], threshold: number = 0.5): boolean {
  return landmarks.every(lm => isVisible(lm, threshold));
}

export function prepareLandmarksForML(landmarks: PoseLandmarks): number[] {
  const features: number[] = [];
  for (const landmark of landmarks) {
    features.push(landmark.x, landmark.y, landmark.z || 0);
  }
  return features;
}

export function normalizeLandmarks(landmarks: PoseLandmarks): PoseLandmarks {
  const centerX = landmarks.reduce((sum, lm) => sum + lm.x, 0) / landmarks.length;
  const centerY = landmarks.reduce((sum, lm) => sum + lm.y, 0) / landmarks.length;

  return landmarks.map(lm => ({
    ...lm,
    x: lm.x - centerX,
    y: lm.y - centerY
  }));
}

export function cloneLandmarks(landmarks: PoseLandmarks): PoseLandmarks {
  return landmarks.map(lm => ({ ...lm }));
}
