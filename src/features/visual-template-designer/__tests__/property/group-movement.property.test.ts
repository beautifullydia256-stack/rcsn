/**
 * Property 24: Group Movement Consistency
 *
 * - Moving a group by (dx, dy) moves ALL components in the group by exactly (dx, dy).
 * - Moving by (0, 0) changes nothing.
 * - Moving then moving back returns to original positions.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import { groupComponents, moveGroup } from '../../domain/models/groupManagement';
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
      y: fc.float({ min: 0, max: 600, noNaN: true }),
      unit: fc.constant('px' as const),
    }),
    size: fc.record({
      width: fc.float({ min: 10, max: 200, noNaN: true }),
      height: fc.float({ min: 10, max: 200, noNaN: true }),
      unit: fc.constant('px' as const),
    }),
    rotation: fc.constant(0),
  }),
  zIndex: fc.integer({ min: 0, max: 100 }),
});

const componentsArb = fc.array(componentArb, { minLength: 1, maxLength: 8 });
const deltaArb = fc.float({ min: -300, max: 300, noNaN: true });

function approxEqual(a: number, b: number, tol = 0.001): boolean {
  return Math.abs(a - b) <= tol;
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Property 24 – Group Movement Consistency', () => {
  it('moving a group by (dx, dy) shifts every member by exactly (dx, dy)', () => {
    fc.assert(
      fc.property(componentsArb, deltaArb, deltaArb, (components, dx, dy) => {
        const ids = components.map((c) => c.id);
        const groupId = 'g1';
        const grouped = groupComponents(components, ids, groupId);
        const moved = moveGroup(grouped, groupId, dx, dy);

        for (const original of grouped) {
          if (original.groupId !== groupId) continue;
          const result = moved.find((c) => c.id === original.id)!;
          expect(approxEqual(result.layout.position.x, original.layout.position.x + dx)).toBe(true);
          expect(approxEqual(result.layout.position.y, original.layout.position.y + dy)).toBe(true);
        }
      }),
      propertyTestParams(),
    );
  });

  it('moving by (0, 0) does not change any position', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const ids = components.map((c) => c.id);
        const groupId = 'g1';
        const grouped = groupComponents(components, ids, groupId);
        const moved = moveGroup(grouped, groupId, 0, 0);

        for (const c of grouped) {
          const result = moved.find((r) => r.id === c.id)!;
          expect(approxEqual(result.layout.position.x, c.layout.position.x)).toBe(true);
          expect(approxEqual(result.layout.position.y, c.layout.position.y)).toBe(true);
        }
      }),
      propertyTestParams(),
    );
  });

  it('moving then moving back returns to original positions', () => {
    fc.assert(
      fc.property(componentsArb, deltaArb, deltaArb, (components, dx, dy) => {
        const ids = components.map((c) => c.id);
        const groupId = 'g1';
        const grouped = groupComponents(components, ids, groupId);

        const moved = moveGroup(grouped, groupId, dx, dy);
        const restored = moveGroup(moved, groupId, -dx, -dy);

        for (const original of grouped) {
          const result = restored.find((c) => c.id === original.id)!;
          expect(approxEqual(result.layout.position.x, original.layout.position.x)).toBe(true);
          expect(approxEqual(result.layout.position.y, original.layout.position.y)).toBe(true);
        }
      }),
      propertyTestParams(),
    );
  });

  it('components NOT in the group are unaffected by group movement', () => {
    fc.assert(
      fc.property(
        fc.array(componentArb, { minLength: 2, maxLength: 8 }),
        deltaArb,
        deltaArb,
        (components, dx, dy) => {
          // Only group the first component; rest are ungrouped
          const groupedId = components[0].id;
          const groupId = 'g1';
          const withGroup = groupComponents(components, [groupedId], groupId);
          const moved = moveGroup(withGroup, groupId, dx, dy);

          // Non-grouped components must be identical
          for (const original of withGroup) {
            if (original.groupId === groupId) continue;
            const result = moved.find((c) => c.id === original.id)!;
            expect(approxEqual(result.layout.position.x, original.layout.position.x)).toBe(true);
            expect(approxEqual(result.layout.position.y, original.layout.position.y)).toBe(true);
          }
        },
      ),
      propertyTestParams(),
    );
  });
});
