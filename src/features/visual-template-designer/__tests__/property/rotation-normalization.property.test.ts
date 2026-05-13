/**
 * Property 3: Rotation angle normalization.
 *
 * For any rotation value, after normalizing to the 0-360 range,
 * the result is always in [0, 360).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import { normalizeRotation } from '../../domain/utils/rotation';

describe('Property 3: Rotation angle normalization', () => {
  it('should always produce a result in [0, 360)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -100000, max: 100000, noNaN: true }),
        (angle) => {
          const result = normalizeRotation(angle);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThan(360);
        }
      ),
      propertyTestParams()
    );
  });

  it('should be idempotent — normalizing twice gives the same result', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -100000, max: 100000, noNaN: true }),
        (angle) => {
          const once = normalizeRotation(angle);
          const twice = normalizeRotation(once);
          // Use toBeCloseTo to handle floating-point edge cases
          expect(twice).toBeCloseTo(once, 10);
        }
      ),
      propertyTestParams()
    );
  });

  it('should map equivalent angles to the same normalized value', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        fc.integer({ min: -10, max: 10 }),
        (angle, turns) => {
          const equivalent = angle + turns * 360;
          const r1 = normalizeRotation(angle);
          const r2 = normalizeRotation(equivalent);
          expect(r1).toBeCloseTo(r2, 10);
        }
      ),
      propertyTestParams()
    );
  });

  it('should return 0 for multiples of 360', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 100 }),
        (n) => {
          const angle = n * 360;
          const result = normalizeRotation(angle);
          expect(result).toBeCloseTo(0, 10);
        }
      ),
      propertyTestParams()
    );
  });

  it('should keep values already in [0, 360) unchanged', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 359.9999, noNaN: true }),
        (angle) => {
          const result = normalizeRotation(angle);
          expect(result).toBeCloseTo(angle, 10);
        }
      ),
      propertyTestParams()
    );
  });
});
