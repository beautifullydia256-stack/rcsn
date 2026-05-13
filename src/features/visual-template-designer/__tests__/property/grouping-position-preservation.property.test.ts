/**
 * Property 23: Component Grouping Position Preservation
 *
 * After grouping, each component's position relative to other components in
 * the group is unchanged. After moving the group, all relative positions
 * within the group are still preserved.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import {
  groupComponents,
  moveGroup,
} from '../../domain/models/groupManagement';
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

/** At least 2 components so we can check pairwise relative positions. */
const componentsArb = fc.array(componentArb, { minLength: 2, maxLength: 8 });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativePositions(
  components: TemplateComponent[],
  ids: string[],
): Map<string, { dx: number; dy: number }> {
  const positions = new Map(ids.map((id) => [
    id,
    components.find((c) => c.id === id)!.layout.position,
  ]));
  const firstId = ids[0];
  const origin = positions.get(firstId)!;
  const relatives = new Map<string, { dx: number; dy: number }>();
  for (const id of ids) {
    const pos = positions.get(id)!;
    relatives.set(id, { dx: pos.x - origin.x, dy: pos.y - origin.y });
  }
  return relatives;
}

function approxEqual(a: number, b: number, tol = 0.001): boolean {
  return Math.abs(a - b) <= tol;
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Property 23 – Component Grouping Position Preservation', () => {
  it('grouping does not change any component position', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const ids = components.map((c) => c.id);
        const groupId = 'group-1';

        const before = components.map((c) => ({ id: c.id, ...c.layout.position }));
        const grouped = groupComponents(components, ids, groupId);
        const after = grouped.map((c) => ({ id: c.id, ...c.layout.position }));

        expect(after).toEqual(before);
      }),
      propertyTestParams(),
    );
  });

  it('relative positions within a group are preserved after grouping', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const ids = components.map((c) => c.id);
        const groupId = 'group-1';

        const relsBefore = relativePositions(components, ids);
        const grouped = groupComponents(components, ids, groupId);
        const relsAfter = relativePositions(grouped, ids);

        for (const id of ids) {
          const before = relsBefore.get(id)!;
          const after = relsAfter.get(id)!;
          expect(approxEqual(before.dx, after.dx)).toBe(true);
          expect(approxEqual(before.dy, after.dy)).toBe(true);
        }
      }),
      propertyTestParams(),
    );
  });

  it('relative positions within a group are preserved after moving the group', () => {
    fc.assert(
      fc.property(
        componentsArb,
        fc.float({ min: -500, max: 500, noNaN: true }),
        fc.float({ min: -500, max: 500, noNaN: true }),
        (components, dx, dy) => {
          const ids = components.map((c) => c.id);
          const groupId = 'group-1';

          // Group first, then capture relative positions
          const grouped = groupComponents(components, ids, groupId);
          const relsBefore = relativePositions(grouped, ids);

          // Move the group
          const moved = moveGroup(grouped, groupId, dx, dy);
          const relsAfter = relativePositions(moved, ids);

          for (const id of ids) {
            const before = relsBefore.get(id)!;
            const after = relsAfter.get(id)!;
            expect(approxEqual(before.dx, after.dx)).toBe(true);
            expect(approxEqual(before.dy, after.dy)).toBe(true);
          }
        },
      ),
      propertyTestParams(),
    );
  });
});
