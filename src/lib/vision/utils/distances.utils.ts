import type { Landmark } from '../types';

export function calculateDistance(p1: Landmark, p2: Landmark): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = (p2.z || 0) - (p1.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function calculateDistance2D(p1: Landmark, p2: Landmark): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateVerticalDistance(p1: Landmark, p2: Landmark): number {
  return Math.abs(p2.y - p1.y);
}

export function calculateHorizontalDistance(p1: Landmark, p2: Landmark): number {
  return Math.abs(p2.x - p1.x);
}
