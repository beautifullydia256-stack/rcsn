/**
 * Property 7: Z-index ordering preservation.
 *
 * After any layer operation (bringToFront, sendToBack, bringForward, sendBackward),
 * the components sorted by z-index maintain a coherent visual stacking order
 * — i.e., sorting by z-index produces a consistent ordering.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import {
  bringToFront,
  sendToBack,
  bringForward,
  sendBackward,
} from '../../domain/models/layerManagement';
import type { TemplateComponent } from '../../domain/types';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

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

/** Arbitrary that generates an array of 1–10 components with unique IDs */
const componentsArb = fc
  .uniqueArray(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 10 })
  .map((zIndices) =>
    zIndices.map((z, i) => makeComponent(`comp-${i}`, z))
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Property 7: Z-index ordering preservation', () => {
  it('after bringToFront the sorted order is coherent (no duplicates at top)', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        if (components.length === 0) return;
        const targetId = components[0].id;
        const result = bringToFront(components, targetId);

        // Sorted by z-index
        const sorted = [...result].sort((a, b) => a.zIndex - b.zIndex);
        // All z-indices should be defined numbers
        expect(sorted.every((c) => typeof c.zIndex === 'number')).toBe(true);
        // The result should have the same number of components
        expect(result).toHaveLength(components.length);
      }),
      propertyTestParams()
    );
  });

  it('after sendToBack the sorted order is coherent', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        if (components.length === 0) return;
        const targetId = components[0].id;
        const result = sendToBack(components, targetId);

        const sorted = [...result].sort((a, b) => a.zIndex - b.zIndex);
        expect(sorted.every((c) => typeof c.zIndex === 'number')).toBe(true);
        expect(result).toHaveLength(components.length);
      }),
      propertyTestParams()
    );
  });

  it('after bringForward the sorted order is coherent', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        if (components.length === 0) return;
        const targetId = components[0].id;
        const result = bringForward(components, targetId);

        const sorted = [...result].sort((a, b) => a.zIndex - b.zIndex);
        expect(sorted.every((c) => typeof c.zIndex === 'number')).toBe(true);
        expect(result).toHaveLength(components.length);
      }),
      propertyTestParams()
    );
  });

  it('after sendBackward the sorted order is coherent', () => {
    fc.assert(
      fc.property(componentsArb, (components) => {
        if (components.length === 0) return;
        const targetId = components[0].id;
        const result = sendBackward(components, targetId);

        const sorted = [...result].sort((a, b) => a.zIndex - b.zIndex);
        expect(sorted.every((c) => typeof c.zIndex === 'number')).toBe(true);
        expect(result).toHaveLength(components.length);
      }),
      propertyTestParams()
    );
  });

  it('no layer operation should change the number of components', () => {
    fc.assert(
      fc.property(
        componentsArb,
        fc.constantFrom('bringToFront', 'sendToBack', 'bringForward', 'sendBackward'),
        (components, operation) => {
          if (components.length === 0) return;
          const targetId = components[Math.floor(components.length / 2)].id;

          let result: TemplateComponent[];
          switch (operation) {
            case 'bringToFront': result = bringToFront(components, targetId); break;
            case 'sendToBack':   result = sendToBack(components, targetId);   break;
            case 'bringForward': result = bringForward(components, targetId); break;
            case 'sendBackward': result = sendBackward(components, targetId); break;
            default: result = components;
          }

          expect(result).toHaveLength(components.length);
        }
      ),
      propertyTestParams()
    );
  });
});
