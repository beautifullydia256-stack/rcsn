/**
 * Visual Template Designer - Rotation Utilities
 *
 * Pure utilities for normalizing rotation angles.
 */

/**
 * Normalize a rotation angle to the range [0, 360).
 * Works correctly for negative angles and angles > 360.
 */
export function normalizeRotation(angle: number): number {
  const mod = angle % 360;
  const result = mod < 0 ? mod + 360 : mod;
  // Guard against floating-point rounding producing exactly 360 (e.g. -5e-324 % 360 + 360)
  return result === 360 ? 0 : result;
}
