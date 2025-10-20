/**
 * Distance Calculation Utilities
 */

import type { Landmark } from '../types';

/**
 * Calcula a distância euclidiana entre dois pontos
 * @param p1 Primeiro ponto
 * @param p2 Segundo ponto
 * @returns Distância normalizada
 */
export function calculateDistance(p1: Landmark, p2: Landmark): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = (p2.z || 0) - (p1.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calcula a distância apenas no plano 2D (x, y)
 * @param p1 Primeiro ponto
 * @param p2 Segundo ponto
 * @returns Distância 2D normalizada
 */
export function calculateDistance2D(p1: Landmark, p2: Landmark): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calcula a distância vertical entre dois pontos
 * @param p1 Primeiro ponto
 * @param p2 Segundo ponto
 * @returns Diferença em Y (normalizada)
 */
export function calculateVerticalDistance(p1: Landmark, p2: Landmark): number {
  return Math.abs(p2.y - p1.y);
}

/**
 * Calcula a distância horizontal entre dois pontos
 * @param p1 Primeiro ponto
 * @param p2 Segundo ponto
 * @returns Diferença em X (normalizada)
 */
export function calculateHorizontalDistance(p1: Landmark, p2: Landmark): number {
  return Math.abs(p2.x - p1.x);
}
