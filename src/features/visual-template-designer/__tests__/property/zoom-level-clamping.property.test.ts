/**
 * Property 5: Zoom level clamping.
 *
 * For any zoom input, clampZoom always produces a value in [25, 400].
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import { clampZoom } from '../../presentation/hooks/useZoom';

describe('Property 5: Zoom level clamping', () => {
  it('should always return a value in [25, 400]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -10000, max: 10000, noNaN: true }),
        (zoom) => {
          const clamped = clampZoom(zoom);
          expect(clamped).toBeGreaterThanOrEqual(25);
          expect(clamped).toBeLessThanOrEqual(400);
        }
      ),
      propertyTestParams()
    );
  });

  it('should return the input unchanged when already in [25, 400]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 25, max: 400, noNaN: true }),
        (zoom) => {
          const clamped = clampZoom(zoom);
          expect(clamped).toBe(zoom);
        }
      ),
      propertyTestParams()
    );
  });

  it('should return 25 for any value below 25', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10000, max: 24.9999, noNaN: true }),
        (zoom) => {
          const clamped = clampZoom(zoom);
          expect(clamped).toBe(25);
        }
      ),
      propertyTestParams()
    );
  });

  it('should return 400 for any value above 400', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 400.0001, max: 10000, noNaN: true }),
        (zoom) => {
          const clamped = clampZoom(zoom);
          expect(clamped).toBe(400);
        }
      ),
      propertyTestParams()
    );
  });

  it('should be idempotent — clamping twice gives the same result as clamping once', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -10000, max: 10000, noNaN: true }),
        (zoom) => {
          const once = clampZoom(zoom);
          const twice = clampZoom(once);
          expect(twice).toBe(once);
        }
      ),
      propertyTestParams()
    );
  });
});
