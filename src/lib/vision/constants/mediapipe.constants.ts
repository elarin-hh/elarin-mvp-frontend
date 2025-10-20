/**
 * MediaPipe Pose Landmarks Constants
 * ===================================
 *
 * Índices dos landmarks do MediaPipe Pose.
 * Compartilhado por todos os validadores para evitar duplicação.
 *
 * Referência: https://google.github.io/mediapipe/solutions/pose.html
 */

import type { Landmark, PoseLandmarks } from '../types';

export const MEDIAPIPE_LANDMARKS = {
  // Face
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,

  // Upper Body
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,

  // Hands
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,

  // Lower Body
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,

  // Feet
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
} as const;

/**
 * Grupos de landmarks por região do corpo
 */
export const LANDMARK_GROUPS = {
  FACE: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  UPPER_BODY: [11, 12, 13, 14, 15, 16],
  HANDS: [17, 18, 19, 20, 21, 22],
  LOWER_BODY: [23, 24, 25, 26, 27, 28],
  FEET: [29, 30, 31, 32],

  // Grupos funcionais
  LEFT_ARM: [11, 13, 15, 17, 19, 21],
  RIGHT_ARM: [12, 14, 16, 18, 20, 22],
  LEFT_LEG: [23, 25, 27, 29, 31],
  RIGHT_LEG: [24, 26, 28, 30, 32],

  CORE: [11, 12, 23, 24], // Shoulders + Hips
  TORSO: [11, 12, 23, 24] // Alias
} as const;

/**
 * Par bilateral (esquerda-direita)
 */
export interface BilateralPair {
  left: number;
  right: number;
  name: string;
}

/**
 * Pares bilaterais (esquerda-direita)
 */
export const BILATERAL_PAIRS: BilateralPair[] = [
  { left: MEDIAPIPE_LANDMARKS.LEFT_SHOULDER, right: MEDIAPIPE_LANDMARKS.RIGHT_SHOULDER, name: 'SHOULDER' },
  { left: MEDIAPIPE_LANDMARKS.LEFT_ELBOW, right: MEDIAPIPE_LANDMARKS.RIGHT_ELBOW, name: 'ELBOW' },
  { left: MEDIAPIPE_LANDMARKS.LEFT_WRIST, right: MEDIAPIPE_LANDMARKS.RIGHT_WRIST, name: 'WRIST' },
  { left: MEDIAPIPE_LANDMARKS.LEFT_HIP, right: MEDIAPIPE_LANDMARKS.RIGHT_HIP, name: 'HIP' },
  { left: MEDIAPIPE_LANDMARKS.LEFT_KNEE, right: MEDIAPIPE_LANDMARKS.RIGHT_KNEE, name: 'KNEE' },
  { left: MEDIAPIPE_LANDMARKS.LEFT_ANKLE, right: MEDIAPIPE_LANDMARKS.RIGHT_ANKLE, name: 'ANKLE' },
  { left: MEDIAPIPE_LANDMARKS.LEFT_HEEL, right: MEDIAPIPE_LANDMARKS.RIGHT_HEEL, name: 'HEEL' },
  { left: MEDIAPIPE_LANDMARKS.LEFT_FOOT_INDEX, right: MEDIAPIPE_LANDMARKS.RIGHT_FOOT_INDEX, name: 'FOOT_INDEX' }
];

/**
 * Landmarks de perna
 */
export interface LegLandmarks {
  hip: Landmark;
  knee: Landmark;
  ankle: Landmark;
  heel: Landmark;
  footIndex: Landmark;
}

/**
 * Landmarks de braço
 */
export interface ArmLandmarks {
  shoulder: Landmark;
  elbow: Landmark;
  wrist: Landmark;
  pinky: Landmark;
  index: Landmark;
  thumb: Landmark;
}

/**
 * Landmarks do core (ombros + quadris)
 */
export interface CoreLandmarks {
  leftShoulder: Landmark;
  rightShoulder: Landmark;
  leftHip: Landmark;
  rightHip: Landmark;
}

/**
 * Helper: Obtém landmarks da perna esquerda
 */
export function getLeftLegLandmarks(landmarks: PoseLandmarks): LegLandmarks {
  return {
    hip: landmarks[MEDIAPIPE_LANDMARKS.LEFT_HIP],
    knee: landmarks[MEDIAPIPE_LANDMARKS.LEFT_KNEE],
    ankle: landmarks[MEDIAPIPE_LANDMARKS.LEFT_ANKLE],
    heel: landmarks[MEDIAPIPE_LANDMARKS.LEFT_HEEL],
    footIndex: landmarks[MEDIAPIPE_LANDMARKS.LEFT_FOOT_INDEX]
  };
}

/**
 * Helper: Obtém landmarks da perna direita
 */
export function getRightLegLandmarks(landmarks: PoseLandmarks): LegLandmarks {
  return {
    hip: landmarks[MEDIAPIPE_LANDMARKS.RIGHT_HIP],
    knee: landmarks[MEDIAPIPE_LANDMARKS.RIGHT_KNEE],
    ankle: landmarks[MEDIAPIPE_LANDMARKS.RIGHT_ANKLE],
    heel: landmarks[MEDIAPIPE_LANDMARKS.RIGHT_HEEL],
    footIndex: landmarks[MEDIAPIPE_LANDMARKS.RIGHT_FOOT_INDEX]
  };
}

/**
 * Helper: Obtém landmarks do braço esquerdo
 */
export function getLeftArmLandmarks(landmarks: PoseLandmarks): ArmLandmarks {
  return {
    shoulder: landmarks[MEDIAPIPE_LANDMARKS.LEFT_SHOULDER],
    elbow: landmarks[MEDIAPIPE_LANDMARKS.LEFT_ELBOW],
    wrist: landmarks[MEDIAPIPE_LANDMARKS.LEFT_WRIST],
    pinky: landmarks[MEDIAPIPE_LANDMARKS.LEFT_PINKY],
    index: landmarks[MEDIAPIPE_LANDMARKS.LEFT_INDEX],
    thumb: landmarks[MEDIAPIPE_LANDMARKS.LEFT_THUMB]
  };
}

/**
 * Helper: Obtém landmarks do braço direito
 */
export function getRightArmLandmarks(landmarks: PoseLandmarks): ArmLandmarks {
  return {
    shoulder: landmarks[MEDIAPIPE_LANDMARKS.RIGHT_SHOULDER],
    elbow: landmarks[MEDIAPIPE_LANDMARKS.RIGHT_ELBOW],
    wrist: landmarks[MEDIAPIPE_LANDMARKS.RIGHT_WRIST],
    pinky: landmarks[MEDIAPIPE_LANDMARKS.RIGHT_PINKY],
    index: landmarks[MEDIAPIPE_LANDMARKS.RIGHT_INDEX],
    thumb: landmarks[MEDIAPIPE_LANDMARKS.RIGHT_THUMB]
  };
}

/**
 * Helper: Obtém landmarks do core (ombros + quadris)
 */
export function getCoreLandmarks(landmarks: PoseLandmarks): CoreLandmarks {
  return {
    leftShoulder: landmarks[MEDIAPIPE_LANDMARKS.LEFT_SHOULDER],
    rightShoulder: landmarks[MEDIAPIPE_LANDMARKS.RIGHT_SHOULDER],
    leftHip: landmarks[MEDIAPIPE_LANDMARKS.LEFT_HIP],
    rightHip: landmarks[MEDIAPIPE_LANDMARKS.RIGHT_HIP]
  };
}
