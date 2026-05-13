/**
 * Example property-based test demonstrating fast-check setup
 * 
 * This file serves as a template for writing property-based tests
 * for the visual-template-designer feature.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';

describe('Example Property-Based Tests', () => {
  /**
   * Feature: visual-template-designer, Property: Example - Addition Commutativity
   * 
   * This is a simple example demonstrating property-based testing setup.
   * Real property tests will validate template designer correctness properties.
   */
  it('should demonstrate addition is commutative', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        (a, b) => {
          // Property: a + b === b + a for all integers
          expect(a + b).toBe(b + a);
        }
      ),
      propertyTestParams()
    );
  });

  /**
   * Feature: visual-template-designer, Property: Example - Array Reverse Inverse
   * 
   * Demonstrates testing inverse operations (similar to undo/redo testing)
   */
  it('should demonstrate array reverse is its own inverse', () => {
    fc.assert(
      fc.property(
        fc.array(fc.anything()),
        (arr) => {
          // Property: reverse(reverse(arr)) === arr
          const reversed = [...arr].reverse();
          const doubleReversed = [...reversed].reverse();
          expect(doubleReversed).toEqual(arr);
        }
      ),
      propertyTestParams()
    );
  });
});
