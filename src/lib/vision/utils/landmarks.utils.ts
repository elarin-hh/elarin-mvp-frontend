/**
 * Landmark Manipulation Utilities
 */

import type { Landmark, PoseLandmarks } from '../types';

/**
 * Verifica se um landmark está visível
 * @param landmark Landmark a verificar
 * @param threshold Threshold de visibilidade (padrão: 0.5)
 * @returns true se visível
 */
export function isVisible(landmark: Landmark, threshold: number = 0.5): boolean {
  return landmark && landmark.visibility !== undefined && landmark.visibility > threshold;
}

/**
 * Verifica se todos os landmarks de um array estão visíveis
 * @param landmarks Landmarks a verificar
 * @param threshold Threshold de visibilidade
 * @returns true se todos visíveis
 */
export function areAllVisible(landmarks: Landmark[], threshold: number = 0.5): boolean {
  return landmarks.every(lm => isVisible(lm, threshold));
}

/**
 * Prepara landmarks para inferência ML (flatten para array 1D)
 * @param landmarks Array de landmarks
 * @returns Array com [x1, y1, z1, x2, y2, z2, ...]
 */
export function prepareLandmarksForML(landmarks: PoseLandmarks): number[] {
  const features: number[] = [];
  for (const landmark of landmarks) {
    features.push(landmark.x, landmark.y, landmark.z || 0);
  }
  return features;
}

/**
 * Normaliza landmarks para o centro da tela
 * @param landmarks Landmarks a normalizar
 * @returns Landmarks normalizados
 */
export function normalizeLandmarks(landmarks: PoseLandmarks): PoseLandmarks {
  // Encontra o centro
  const centerX = landmarks.reduce((sum, lm) => sum + lm.x, 0) / landmarks.length;
  const centerY = landmarks.reduce((sum, lm) => sum + lm.y, 0) / landmarks.length;

  // Normaliza
  return landmarks.map(lm => ({
    ...lm,
    x: lm.x - centerX,
    y: lm.y - centerY
  }));
}

/**
 * Clona landmarks (deep copy)
 * @param landmarks Landmarks a clonar
 * @returns Cópia profunda dos landmarks
 */
export function cloneLandmarks(landmarks: PoseLandmarks): PoseLandmarks {
  return landmarks.map(lm => ({ ...lm }));
}
