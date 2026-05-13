/**
 * Property 26: Distribution Operation Spacing
 *
 * - After distributeHorizontally with n≥3 components, spacing between consecutive
 *   components (gap between right edge of one and left edge of the next) is equal
 *   within 1px tolerance.
 * - After distributeVertically with n≥3 components, vertical spacing is equal.
 *
 * Key: gaps are measured in ORIGINAL x/y sort order, which is the order the
 * algorithm uses internally. Post-distribution sort order can differ when
 * components overlap (negative gaps), so always look up by ID.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import { distributeHorizontally, distributeVertically } from '../../domain/models/alignmentTools';
import type { TemplateComponent } from '../../domain/types';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const componentArb: fc.Arbitrary<TemplateComponent> = fc.record({
  id: fc.uuid(),
  type: fc.constant('TEXT_LABEL' as const),
  layout: fc.record({
    position: fc.record({
      x: fc.float({ min: 0, max: 600, noNaN: true }),
      y: fc.float({ min: 0, max: 900, noNaN: true }),
      unit: fc.constant('px' as const),
    }),
    size: fc.record({
      width: fc.float({ min: 5, max: 150, noNaN: true }),
      height: fc.float({ min: 5, max: 150, noNaN: true }),
      unit: fc.constant('px' as const),
    }),
    rotation: fc.constant(0),
  }),
  zIndex: fc.integer({ min: 0, max: 100 }),
});

/** At least 3 components. Unique IDs guaranteed via index (fc.uuid shrinks to same value). */
const components3PlusArb = fc.array(componentArb, { minLength: 3, maxLength: 8 }).map(
  (cs) => cs.map((c, i) => ({ ...c, id: `comp-${i}` })),
);

function maxAbsDiff(nums: number[]): number {
  if (nums.length <= 1) return 0;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return max - min;
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Property 26 – Distribution Operation Spacing', () => {
  it('distributeHorizontally produces equal gaps (within 1px) between consecutive components', () => {
    fc.assert(
      fc.property(components3PlusArb, (components) => {
        const ids = components.map((c) => c.id);
        // Sort by ORIGINAL x to get the order the algorithm uses
        const originalSorted = [...components].sort(
          (a, b) => a.layout.position.x - b.layout.position.x,
        );
        const result = distributeHorizontally(components, ids);
        const resultById = new Map(result.map((c) => [c.id, c]));

        // Measure gaps in original sort order (algorithm's internal order)
        const gaps: number[] = [];
        for (let i = 0; i < originalSorted.length - 1; i++) {
          const comp = resultById.get(originalSorted[i].id)!;
          const next = resultById.get(originalSorted[i + 1].id)!;
          const rightEdge = comp.layout.position.x + comp.layout.size.width;
          gaps.push(next.layout.position.x - rightEdge);
        }

        expect(maxAbsDiff(gaps)).toBeLessThanOrEqual(1);
      }),
      propertyTestParams(),
    );
  });

  it('distributeVertically produces equal gaps (within 1px) between consecutive components', () => {
    fc.assert(
      fc.property(components3PlusArb, (components) => {
        const ids = components.map((c) => c.id);
        const originalSorted = [...components].sort(
          (a, b) => a.layout.position.y - b.layout.position.y,
        );
        const result = distributeVertically(components, ids);
        const resultById = new Map(result.map((c) => [c.id, c]));

        const gaps: number[] = [];
        for (let i = 0; i < originalSorted.length - 1; i++) {
          const comp = resultById.get(originalSorted[i].id)!;
          const next = resultById.get(originalSorted[i + 1].id)!;
          const bottomEdge = comp.layout.position.y + comp.layout.size.height;
          gaps.push(next.layout.position.y - bottomEdge);
        }

        expect(maxAbsDiff(gaps)).toBeLessThanOrEqual(1);
      }),
      propertyTestParams(),
    );
  });

  it('distributeHorizontally preserves the outermost left and right positions', () => {
    fc.assert(
      fc.property(components3PlusArb, (components) => {
        const ids = components.map((c) => c.id);
        const originalSorted = [...components].sort(
          (a, b) => a.layout.position.x - b.layout.position.x,
        );
        // Identify anchor components by ID, not by post-distribution sort order
        const leftmostId = originalSorted[0].id;
        const rightmostId = originalSorted[originalSorted.length - 1].id;

        const originalLeftX = originalSorted[0].layout.position.x;
        const last = originalSorted[originalSorted.length - 1];
        const originalRightX = last.layout.position.x + last.layout.size.width;

        const result = distributeHorizontally(components, ids);
        const resultById = new Map(result.map((c) => [c.id, c]));

        const resultLeftX = resultById.get(leftmostId)!.layout.position.x;
        const resultLastComp = resultById.get(rightmostId)!;
        const resultRightX = resultLastComp.layout.position.x + resultLastComp.layout.size.width;

        expect(Math.abs(resultLeftX - originalLeftX)).toBeLessThanOrEqual(0.01);
        expect(Math.abs(resultRightX - originalRightX)).toBeLessThanOrEqual(0.01);
      }),
      propertyTestParams(),
    );
  });

  it('distributeVertically preserves the outermost top and bottom positions', () => {
    fc.assert(
      fc.property(components3PlusArb, (components) => {
        const ids = components.map((c) => c.id);
        const originalSorted = [...components].sort(
          (a, b) => a.layout.position.y - b.layout.position.y,
        );
        const topmostId = originalSorted[0].id;
        const bottommostId = originalSorted[originalSorted.length - 1].id;

        const originalTopY = originalSorted[0].layout.position.y;
        const last = originalSorted[originalSorted.length - 1];
        const originalBottomY = last.layout.position.y + last.layout.size.height;

        const result = distributeVertically(components, ids);
        const resultById = new Map(result.map((c) => [c.id, c]));

        const resultTopY = resultById.get(topmostId)!.layout.position.y;
        const resultLastComp = resultById.get(bottommostId)!;
        const resultBottomY = resultLastComp.layout.position.y + resultLastComp.layout.size.height;

        expect(Math.abs(resultTopY - originalTopY)).toBeLessThanOrEqual(0.01);
        expect(Math.abs(resultBottomY - originalBottomY)).toBeLessThanOrEqual(0.01);
      }),
      propertyTestParams(),
    );
  });

  it('distributing fewer than 3 components returns components unchanged', () => {
    fc.assert(
      fc.property(
        fc.array(componentArb, { minLength: 0, maxLength: 2 }).map(
          (cs) => cs.map((c, i) => ({ ...c, id: `comp-${i}` })),
        ),
        (components) => {
          const ids = components.map((c) => c.id);
          const resultH = distributeHorizontally(components, ids);
          const resultV = distributeVertically(components, ids);

          expect(resultH).toEqual(components);
          expect(resultV).toEqual(components);
        },
      ),
      propertyTestParams(),
    );
  });
});
