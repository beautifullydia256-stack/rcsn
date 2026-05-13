/**
 * Example unit test demonstrating Jest/Vitest setup
 * 
 * This file serves as a template for writing unit tests
 * for the visual-template-designer feature.
 */

import { describe, it, expect } from 'vitest';

describe('Example Unit Tests', () => {
  it('should demonstrate basic test setup', () => {
    expect(true).toBe(true);
  });

  it('should demonstrate object equality', () => {
    const obj1 = { name: 'Template', version: 1 };
    const obj2 = { name: 'Template', version: 1 };
    expect(obj1).toEqual(obj2);
  });

  it('should demonstrate array operations', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });
});
