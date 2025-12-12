import type { Landmark } from '../types';

export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }

  return angle;
}

export function calculateInclination(p1: Landmark, p2: Landmark): number {
  const deltaY = Math.abs(p2.y - p1.y);
  const deltaX = Math.abs(p2.x - p1.x);
  const angle = Math.atan2(deltaX, deltaY) * (180 / Math.PI);
  return angle;
}

export function isAngleInRange(angle: number, min: number, max: number): boolean {
  return angle >= min && angle <= max;
}
