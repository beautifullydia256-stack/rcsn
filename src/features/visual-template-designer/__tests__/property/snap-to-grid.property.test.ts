/**
 * Property 4: Snap-to-grid positioning.
 *
 * For any position and grid size, the snapped position is always
 * a multiple of the grid size.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import { snapValue } from '../../presentation/hooks/useSnapToGrid';

// Valid grid sizes as defined in the hook
const VALID_GRID_SIZES = [5, 10, 20, 25, 50] as const;

describe('Property 4: Snap-to-grid positioning', () => {
  it('snapped value should be a multiple of gridSize for all valid grid sizes', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -5000, max: 5000, noNaN: true }),
        fc.constantFrom(...VALID_GRID_SIZES),
        (value, gridSize) => {
          const snapped = snapValue(value, gridSize);
          const remainder = Math.abs(snapped % gridSize);
          // Allow tiny floating-point error
          expect(remainder).toBeCloseTo(0, 8);
        }
      ),
      propertyTestParams()
    );
  });

  it('snapped value should be within gridSize/2 of the original value', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -5000, max: 5000, noNaN: true }),
        fc.constantFrom(...VALID_GRID_SIZES),
        (value, gridSize) => {
          const snapped = snapValue(value, gridSize);
          const distance = Math.abs(snapped - value);
          expect(distance).toBeLessThanOrEqual(gridSize / 2 + 1e-9);
        }
      ),
      propertyTestParams()
    );
  });

  it('snapping a value that is already a multiple of gridSize returns the same value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 100 }),
        fc.constantFrom(...VALID_GRID_SIZES),
        (multiplier, gridSize) => {
          const value = multiplier * gridSize;
          const snapped = snapValue(value, gridSize);
          expect(snapped).toBeCloseTo(value, 8);
        }
      ),
      propertyTestParams()
    );
  });

  it('snap is idempotent — snapping twice gives same result as snapping once', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -5000, max: 5000, noNaN: true }),
        fc.constantFrom(...VALID_GRID_SIZES),
        (value, gridSize) => {
          const once = snapValue(value, gridSize);
          const twice = snapValue(once, gridSize);
          expect(twice).toBeCloseTo(once, 8);
        }
      ),
      propertyTestParams()
    );
  });
});
