/**
 * Angle Calculation Utilities
 */

import type { Landmark } from '../types';

/**
 * Calcula o ângulo entre três pontos (em graus)
 * @param a Primeiro ponto
 * @param b Ponto do vértice (centro do ângulo)
 * @param c Terceiro ponto
 * @returns Ângulo em graus (0-180)
 */
export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }

  return angle;
}

/**
 * Calcula o ângulo de inclinação de um segmento em relação ao eixo vertical
 * @param p1 Ponto inicial
 * @param p2 Ponto final
 * @returns Ângulo em graus (0-90)
 */
export function calculateInclination(p1: Landmark, p2: Landmark): number {
  const deltaY = Math.abs(p2.y - p1.y);
  const deltaX = Math.abs(p2.x - p1.x);
  const angle = Math.atan2(deltaX, deltaY) * (180 / Math.PI);
  return angle;
}

/**
 * Verifica se um ângulo está dentro de um intervalo
 * @param angle Ângulo a verificar
 * @param min Ângulo mínimo
 * @param max Ângulo máximo
 * @returns true se está no intervalo
 */
export function isAngleInRange(angle: number, min: number, max: number): boolean {
  return angle >= min && angle <= max;
}
