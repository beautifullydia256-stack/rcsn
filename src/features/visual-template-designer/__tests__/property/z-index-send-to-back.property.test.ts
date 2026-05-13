/**
 * Property 9: After sendToBack, the target component has the minimum z-index.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import { sendToBack, getMinZIndex, bringToFront, getMaxZIndex } from '../../domain/models/layerManagement';
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

describe('Property 9: sendToBack gives target the minimum z-index', () => {
  it('target component should have the lowest z-index after sendToBack', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const targetIndex = Math.floor(components.length / 2);
        const targetId = components[targetIndex].id;

        const result = sendToBack(components, targetId);
        const minZ = getMinZIndex(result);
        const target = result.find((c) => c.id === targetId)!;

        expect(target.zIndex).toBe(minZ);
      }),
      propertyTestParams()
    );
  });

  it('no other component should have a z-index less than the target after sendToBack', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const targetId = components[0].id;
        const result = sendToBack(components, targetId);
        const targetZ = result.find((c) => c.id === targetId)!.zIndex;

        const others = result.filter((c) => c.id !== targetId);
        const allHigherOrEqual = others.every((c) => c.zIndex >= targetZ);
        expect(allHigherOrEqual).toBe(true);
      }),
      propertyTestParams()
    );
  });

  it('sendToBack should not change the z-index of non-target components', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const targetId = components[0].id;
        const result = sendToBack(components, targetId);

        for (const original of components) {
          if (original.id === targetId) continue;
          const updated = result.find((c) => c.id === original.id)!;
          expect(updated.zIndex).toBe(original.zIndex);
        }
      }),
      propertyTestParams()
    );
  });

  it('sendToBack on a non-existent id should return the original array unchanged', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const result = sendToBack(components, 'does-not-exist');
        expect(result).toEqual(components);
      }),
      propertyTestParams()
    );
  });

  it('sendToBack on the already-backmost component should keep it at the minimum', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        const minZ = getMinZIndex(components);
        const backComp = components.find((c) => c.zIndex === minZ)!;

        const result = sendToBack(components, backComp.id);
        const newMinZ = getMinZIndex(result);
        const target = result.find((c) => c.id === backComp.id)!;
        expect(target.zIndex).toBe(newMinZ);
      }),
      propertyTestParams()
    );
  });

  it('bringToFront after sendToBack should restore a component to the max z-index', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        if (components.length < 2) return; // Need at least 2 to verify non-trivial change
        const targetId = components[0].id;

        const afterBack = sendToBack(components, targetId);
        const afterFront = bringToFront(afterBack, targetId);

        const maxZ = getMaxZIndex(afterFront);
        const target = afterFront.find((c) => c.id === targetId)!;
        expect(target.zIndex).toBe(maxZ);
      }),
      propertyTestParams()
    );
  });
});
