/**
 * Property-Based Test: Component Creation from Library
 *
 * Feature: visual-template-designer
 * Property 10: Component creation from library
 *
 * Property Definition:
 * For every ComponentType, creating a component instance from the library produces
 * a valid TemplateComponent with the correct type and non-zero (positive) size.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import { COMPONENT_METADATA } from '../../domain/models/componentMetadata';
import { createComponentFromLibrary } from '../../domain/models/componentFactory';
import type { ComponentType } from '../../domain/types/enums';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates a random ComponentType from the set of all known types.
 * Derived at runtime from COMPONENT_METADATA so the test stays in sync with
 * any future additions to the metadata table.
 */
const arbComponentType = (): fc.Arbitrary<ComponentType> =>
  fc.constantFrom(...(Object.keys(COMPONENT_METADATA) as ComponentType[]));

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Property 10: Component creation from library', () => {
  /**
   * Core property: creating a component from any known type produces a
   * TemplateComponent whose `type` field matches the requested type.
   */
  it('should produce a TemplateComponent with the correct type', () => {
    fc.assert(
      fc.property(arbComponentType(), (componentType) => {
        const component = createComponentFromLibrary(componentType);
        expect(component.type).toBe(componentType);
      }),
      propertyTestParams()
    );
  });

  /**
   * Core property: the resulting component always has a positive (> 0) width.
   */
  it('should produce a component with positive width', () => {
    fc.assert(
      fc.property(arbComponentType(), (componentType) => {
        const component = createComponentFromLibrary(componentType);
        expect(component.layout.size.width).toBeGreaterThan(0);
      }),
      propertyTestParams()
    );
  });

  /**
   * Core property: the resulting component always has a positive (> 0) height.
   */
  it('should produce a component with positive height', () => {
    fc.assert(
      fc.property(arbComponentType(), (componentType) => {
        const component = createComponentFromLibrary(componentType);
        expect(component.layout.size.height).toBeGreaterThan(0);
      }),
      propertyTestParams()
    );
  });

  /**
   * Each call must produce a component with a unique, non-empty id.
   */
  it('should produce a component with a non-empty id', () => {
    fc.assert(
      fc.property(arbComponentType(), (componentType) => {
        const component = createComponentFromLibrary(componentType);
        expect(component.id).toBeTruthy();
        expect(typeof component.id).toBe('string');
        expect(component.id.length).toBeGreaterThan(0);
      }),
      propertyTestParams()
    );
  });

  /**
   * Two consecutive calls for the same type must produce different ids
   * (uniqueness guarantee).
   */
  it('should produce unique ids for each created component', () => {
    fc.assert(
      fc.property(arbComponentType(), (componentType) => {
        const a = createComponentFromLibrary(componentType);
        const b = createComponentFromLibrary(componentType);
        expect(a.id).not.toBe(b.id);
      }),
      propertyTestParams()
    );
  });

  /**
   * The resulting component must have a valid position with finite x and y.
   */
  it('should produce a component with a valid position', () => {
    fc.assert(
      fc.property(arbComponentType(), (componentType) => {
        const component = createComponentFromLibrary(componentType);
        expect(Number.isFinite(component.layout.position.x)).toBe(true);
        expect(Number.isFinite(component.layout.position.y)).toBe(true);
      }),
      propertyTestParams()
    );
  });

  /**
   * The zIndex must be a finite number.
   */
  it('should produce a component with a finite zIndex', () => {
    fc.assert(
      fc.property(arbComponentType(), (componentType) => {
        const component = createComponentFromLibrary(componentType);
        expect(Number.isFinite(component.zIndex)).toBe(true);
      }),
      propertyTestParams()
    );
  });

  /**
   * The rotation must be a finite number in the range [0, 360].
   */
  it('should produce a component with a rotation between 0 and 360', () => {
    fc.assert(
      fc.property(arbComponentType(), (componentType) => {
        const component = createComponentFromLibrary(componentType);
        expect(component.layout.rotation).toBeGreaterThanOrEqual(0);
        expect(component.layout.rotation).toBeLessThanOrEqual(360);
      }),
      propertyTestParams()
    );
  });
});
