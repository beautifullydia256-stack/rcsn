/**
 * Property 25: Alignment Operation Correctness
 *
 * - After alignLeft, all selected components have the same x (minimum of original x values).
 * - After alignRight, all selected components have the same right edge.
 * - After alignTop, all selected components have the same y.
 * - After alignBottom, all selected components have the same bottom edge.
 * - After alignCenter, all selected components have the same horizontal center.
 * - After alignMiddle, all selected components have the same vertical center.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import {
  alignLeft,
  alignCenter,
  alignRight,
  alignTop,
  alignMiddle,
  alignBottom,
} from '../../domain/models/alignmentTools';
import type { TemplateComponent } from '../../domain/types';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const componentArb: fc.Arbitrary<TemplateComponent> = fc.record({
  id: fc.uuid(),
  type: fc.constant('TEXT_LABEL' as const),
  layout: fc.record({
    position: fc.record({
      x: fc.float({ min: 0, max: 800, noNaN: true }),
      y: fc.float({ min: 0, max: 1100, noNaN: true }),
      unit: fc.constant('px' as const),
    }),
    size: fc.record({
      width: fc.float({ min: 10, max: 300, noNaN: true }),
      height: fc.float({ min: 10, max: 300, noNaN: true }),
      unit: fc.constant('px' as const),
    }),
    rotation: fc.constant(0),
  }),
  zIndex: fc.integer({ min: 0, max: 100 }),
});

/** At least 1 component for alignment to be meaningful. */
const componentsArb = fc.array(componentArb, { minLength: 1, maxLength: 8 });

function approxEqual(a: number, b: number, tol = 0.01): boolean {
  return Math.abs(a - b) <= tol;
}

function allApproxEqual(nums: number[], tol = 0.01): boolean {
  if (nums.length === 0) return true;
  const first = nums[0];
  return nums.every((n) => approxEqual(n, first, tol));
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Property 25 – Alignment Operation Correctness', () => {
  it('alignLeft: all selected components have the same x = min original x', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const ids = components.map((c) => c.id);
        const minX = Math.min(...components.map((c) => c.layout.position.x));
        const result = alignLeft(components, ids);
        const resultXs = result
          .filter((c) => ids.includes(c.id))
          .map((c) => c.layout.position.x);

        expect(allApproxEqual(resultXs)).toBe(true);
        if (resultXs.length > 0) {
          expect(approxEqual(resultXs[0], minX)).toBe(true);
        }
      }),
      propertyTestParams(),
    );
  });

  it('alignRight: all selected components have the same right edge = max original right edge', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const ids = components.map((c) => c.id);
        const maxRight = Math.max(
          ...components.map((c) => c.layout.position.x + c.layout.size.width),
        );
        const result = alignRight(components, ids);
        const resultRights = result
          .filter((c) => ids.includes(c.id))
          .map((c) => c.layout.position.x + c.layout.size.width);

        expect(allApproxEqual(resultRights)).toBe(true);
        if (resultRights.length > 0) {
          expect(approxEqual(resultRights[0], maxRight)).toBe(true);
        }
      }),
      propertyTestParams(),
    );
  });

  it('alignTop: all selected components have the same y = min original y', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const ids = components.map((c) => c.id);
        const minY = Math.min(...components.map((c) => c.layout.position.y));
        const result = alignTop(components, ids);
        const resultYs = result
          .filter((c) => ids.includes(c.id))
          .map((c) => c.layout.position.y);

        expect(allApproxEqual(resultYs)).toBe(true);
        if (resultYs.length > 0) {
          expect(approxEqual(resultYs[0], minY)).toBe(true);
        }
      }),
      propertyTestParams(),
    );
  });

  it('alignBottom: all selected components have the same bottom edge = max original bottom', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const ids = components.map((c) => c.id);
        const maxBottom = Math.max(
          ...components.map((c) => c.layout.position.y + c.layout.size.height),
        );
        const result = alignBottom(components, ids);
        const resultBottoms = result
          .filter((c) => ids.includes(c.id))
          .map((c) => c.layout.position.y + c.layout.size.height);

        expect(allApproxEqual(resultBottoms)).toBe(true);
        if (resultBottoms.length > 0) {
          expect(approxEqual(resultBottoms[0], maxBottom)).toBe(true);
        }
      }),
      propertyTestParams(),
    );
  });

  it('alignCenter: all selected components have the same horizontal center = avg center', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const ids = components.map((c) => c.id);
        const avgCenterX =
          components.reduce((s, c) => s + c.layout.position.x + c.layout.size.width / 2, 0) /
          components.length;

        const result = alignCenter(components, ids);
        const resultCenters = result
          .filter((c) => ids.includes(c.id))
          .map((c) => c.layout.position.x + c.layout.size.width / 2);

        expect(allApproxEqual(resultCenters)).toBe(true);
        if (resultCenters.length > 0) {
          expect(approxEqual(resultCenters[0], avgCenterX)).toBe(true);
        }
      }),
      propertyTestParams(),
    );
  });

  it('alignMiddle: all selected components have the same vertical center = avg center', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const ids = components.map((c) => c.id);
        const avgCenterY =
          components.reduce((s, c) => s + c.layout.position.y + c.layout.size.height / 2, 0) /
          components.length;

        const result = alignMiddle(components, ids);
        const resultCenters = result
          .filter((c) => ids.includes(c.id))
          .map((c) => c.layout.position.y + c.layout.size.height / 2);

        expect(allApproxEqual(resultCenters)).toBe(true);
        if (resultCenters.length > 0) {
          expect(approxEqual(resultCenters[0], avgCenterY)).toBe(true);
        }
      }),
      propertyTestParams(),
    );
  });

  it('alignment functions do not change unselected components', () => {
    fc.assert(
      fc.property(
        fc.array(componentArb, { minLength: 2, maxLength: 8 }),
        (components) => {
          // Only select the first component; rest are unselected
          const selectedId = components[0].id;
          const unselected = components.slice(1);

          for (const fn of [alignLeft, alignCenter, alignRight, alignTop, alignMiddle, alignBottom]) {
            const result = fn(components, [selectedId]);
            for (const orig of unselected) {
              const res = result.find((c) => c.id === orig.id)!;
              expect(approxEqual(res.layout.position.x, orig.layout.position.x)).toBe(true);
              expect(approxEqual(res.layout.position.y, orig.layout.position.y)).toBe(true);
            }
          }
        },
      ),
      propertyTestParams(),
    );
  });
});
