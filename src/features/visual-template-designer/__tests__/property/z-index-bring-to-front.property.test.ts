/**
 * Property 8: After bringToFront, the target component has the maximum z-index.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import { bringToFront, getMaxZIndex } from '../../domain/models/layerManagement';
import type { TemplateComponent } from '../../domain/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeComponent(id: string, zIndex: number): TemplateComponent {
  return {
    id,
    type: 'TEXT_LABEL',
    zIndex,
    layout: {
      position: { x: 0, y: 0, unit: 'px' },
      size: { width: 100, height: 40, unit: 'px' },
      rotation: 0,
    },
  };
}

/** Arbitrary: array of 1–10 components with distinct z-indices */
const componentsArb = fc
  .uniqueArray(fc.integer({ min: 1, max: 200 }), { minLength: 1, maxLength: 10 })
  .map((zIndices) => zIndices.map((z, i) => makeComponent(`comp-${i}`, z)));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Property 8: bringToFront gives target the maximum z-index', () => {
  it('target component should have the highest z-index after bringToFront', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        // Pick a random component to bring to front
        const targetIndex = Math.floor(components.length / 2);
        const targetId = components[targetIndex].id;

        const result = bringToFront(components, targetId);
        const maxZ = getMaxZIndex(result);
        const target = result.find((c) => c.id === targetId)!;

        expect(target.zIndex).toBe(maxZ);
      }),
      propertyTestParams()
    );
  });

  it('no other component should have a z-index greater than the target after bringToFront', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const targetId = components[0].id;
        const result = bringToFront(components, targetId);
        const targetZ = result.find((c) => c.id === targetId)!.zIndex;

        const others = result.filter((c) => c.id !== targetId);
        const allLowerOrEqual = others.every((c) => c.zIndex <= targetZ);
        expect(allLowerOrEqual).toBe(true);
      }),
      propertyTestParams()
    );
  });

  it('bringToFront should not change the z-index of non-target components', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const targetId = components[0].id;
        const result = bringToFront(components, targetId);

        // All non-target components should keep their original z-index
        for (const original of components) {
          if (original.id === targetId) continue;
          const updated = result.find((c) => c.id === original.id)!;
          expect(updated.zIndex).toBe(original.zIndex);
        }
      }),
      propertyTestParams()
    );
  });

  it('bringToFront on a non-existent id should return the original array unchanged', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const result = bringToFront(components, 'does-not-exist');
        expect(result).toEqual(components);
      }),
      propertyTestParams()
    );
  });

  it('bringToFront on the already-frontmost component should keep the array equivalent', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        // Find the component with the max z-index
        const maxZ = getMaxZIndex(components);
        const frontComp = components.find((c) => c.zIndex === maxZ)!;

        const result = bringToFront(components, frontComp.id);
        // The component should still be at the max (or higher, but still the max)
        const newMaxZ = getMaxZIndex(result);
        const target = result.find((c) => c.id === frontComp.id)!;
        expect(target.zIndex).toBe(newMaxZ);
      }),
      propertyTestParams()
    );
  });
});
