/**
 * Property-Based Test: Layout Property Range Validation
 * 
 * Feature: visual-template-designer
 * Property 13: Layout property range validation
 * Validates: Requirements 5.5, 5.6, 5.10, 5.13, 5.14
 * 
 * Property Definition:
 * For any layout property with a defined valid range (font size 6-72pt, border width 0-20px,
 * padding 0-50px, margin 0-50px), attempting to set a value outside that range SHALL be rejected,
 * and attempting to set a value within that range SHALL be accepted.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import {
  FontPropertiesSchema,
  BorderPropertiesSchema,
  SpacingPropertiesSchema,
} from '../../domain/schemas';

// ============================================================================
// Arbitraries (Generators) for Range Testing
// ============================================================================

/**
 * Generate valid font sizes within the allowed range (6-72pt)
 */
const arbValidFontSize = (): fc.Arbitrary<number> =>
  fc.integer({ min: 6, max: 72 });

/**
 * Generate invalid font sizes below the minimum (< 6pt)
 */
const arbInvalidFontSizeBelowMin = (): fc.Arbitrary<number> =>
  fc.integer({ min: -1000, max: 5 });

/**
 * Generate invalid font sizes above the maximum (> 72pt)
 */
const arbInvalidFontSizeAboveMax = (): fc.Arbitrary<number> =>
  fc.integer({ min: 73, max: 1000 });

/**
 * Generate valid border widths within the allowed range (0-20px)
 */
const arbValidBorderWidth = (): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: 20 });

/**
 * Generate invalid border widths below the minimum (< 0px)
 */
const arbInvalidBorderWidthBelowMin = (): fc.Arbitrary<number> =>
  fc.integer({ min: -1000, max: -1 });

/**
 * Generate invalid border widths above the maximum (> 20px)
 */
const arbInvalidBorderWidthAboveMax = (): fc.Arbitrary<number> =>
  fc.integer({ min: 21, max: 1000 });

/**
 * Generate valid padding values within the allowed range (0-50px)
 */
const arbValidPadding = (): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: 50 });

/**
 * Generate invalid padding values below the minimum (< 0px)
 */
const arbInvalidPaddingBelowMin = (): fc.Arbitrary<number> =>
  fc.integer({ min: -1000, max: -1 });

/**
 * Generate invalid padding values above the maximum (> 50px)
 */
const arbInvalidPaddingAboveMax = (): fc.Arbitrary<number> =>
  fc.integer({ min: 51, max: 1000 });

/**
 * Generate valid margin values within the allowed range (0-50px)
 */
const arbValidMargin = (): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: 50 });

/**
 * Generate invalid margin values below the minimum (< 0px)
 */
const arbInvalidMarginBelowMin = (): fc.Arbitrary<number> =>
  fc.integer({ min: -1000, max: -1 });

/**
 * Generate invalid margin values above the maximum (> 50px)
 */
const arbInvalidMarginAboveMax = (): fc.Arbitrary<number> =>
  fc.integer({ min: 51, max: 1000 });

/**
 * Generate valid hex color strings
 */
const arbHexColor = (): fc.Arbitrary<string> =>
  fc
    .integer({ min: 0, max: 0xffffff })
    .map((num) => `#${num.toString(16).padStart(6, '0').toUpperCase()}`);

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 13: Layout Property Range Validation', () => {
  /**
   * Feature: visual-template-designer, Property 13: Layout property range validation
   * Validates: Requirements 5.5, 5.6, 5.10, 5.13, 5.14
   * 
   * Property: For any layout property with a defined valid range, attempting to set
   * a value outside that range SHALL be rejected, and attempting to set a value
   * within that range SHALL be accepted.
   */

  // ============================================================================
  // Font Size Range Validation (6-72pt)
  // ============================================================================

  describe('Font Size Range (6-72pt)', () => {
    it('should accept all valid font sizes within range (6-72pt)', () => {
      fc.assert(
        fc.property(
          arbValidFontSize(),
          fc.constantFrom('Arial', 'Times New Roman', 'Helvetica', 'Courier'),
          fc.constantFrom('normal', 'bold'),
          fc.constantFrom('normal', 'italic'),
          (size, family, weight, style) => {
            const result = FontPropertiesSchema.safeParse({
              family,
              size,
              weight,
              style,
            });

            // All valid font sizes should be accepted
            expect(result.success).toBe(true);
            if (result.success) {
              expect(result.data.size).toBe(size);
            }
          }
        ),
        propertyTestParams()
      );
    });

    it('should reject all font sizes below minimum (< 6pt)', () => {
      fc.assert(
        fc.property(
          arbInvalidFontSizeBelowMin(),
          fc.constantFrom('Arial', 'Times New Roman', 'Helvetica', 'Courier'),
          fc.constantFrom('normal', 'bold'),
          fc.constantFrom('normal', 'italic'),
          (size, family, weight, style) => {
            const result = FontPropertiesSchema.safeParse({
              family,
              size,
              weight,
              style,
            });

            // All font sizes below 6pt should be rejected
            expect(result.success).toBe(false);
            if (!result.success) {
              // Verify error message mentions the minimum constraint
              const errorMessage = result.error.issues[0]?.message || '';
              expect(errorMessage.toLowerCase()).toContain('6');
            }
          }
        ),
        propertyTestParams()
      );
    });

    it('should reject all font sizes above maximum (> 72pt)', () => {
      fc.assert(
        fc.property(
          arbInvalidFontSizeAboveMax(),
          fc.constantFrom('Arial', 'Times New Roman', 'Helvetica', 'Courier'),
          fc.constantFrom('normal', 'bold'),
          fc.constantFrom('normal', 'italic'),
          (size, family, weight, style) => {
            const result = FontPropertiesSchema.safeParse({
              family,
              size,
              weight,
              style,
            });

            // All font sizes above 72pt should be rejected
            expect(result.success).toBe(false);
            if (!result.success) {
              // Verify error message mentions the maximum constraint
              const errorMessage = result.error.issues[0]?.message || '';
              expect(errorMessage.toLowerCase()).toContain('72');
            }
          }
        ),
        propertyTestParams()
      );
    });

    it('should accept boundary values (6pt and 72pt)', () => {
      // Test minimum boundary (6pt)
      const minResult = FontPropertiesSchema.safeParse({
        family: 'Arial',
        size: 6,
        weight: 'normal',
        style: 'normal',
      });
      expect(minResult.success).toBe(true);

      // Test maximum boundary (72pt)
      const maxResult = FontPropertiesSchema.safeParse({
        family: 'Arial',
        size: 72,
        weight: 'normal',
        style: 'normal',
      });
      expect(maxResult.success).toBe(true);
    });
  });

  // ============================================================================
  // Border Width Range Validation (0-20px)
  // ============================================================================

  describe('Border Width Range (0-20px)', () => {
    it('should accept all valid border widths within range (0-20px)', () => {
      fc.assert(
        fc.property(
          arbValidBorderWidth(),
          arbHexColor(),
          fc.constantFrom('solid', 'dashed', 'dotted'),
          (width, color, style) => {
            const result = BorderPropertiesSchema.safeParse({
              width,
              color,
              style,
            });

            // All valid border widths should be accepted
            expect(result.success).toBe(true);
            if (result.success) {
              expect(result.data.width).toBe(width);
            }
          }
        ),
        propertyTestParams()
      );
    });

    it('should reject all border widths below minimum (< 0px)', () => {
      fc.assert(
        fc.property(
          arbInvalidBorderWidthBelowMin(),
          arbHexColor(),
          fc.constantFrom('solid', 'dashed', 'dotted'),
          (width, color, style) => {
            const result = BorderPropertiesSchema.safeParse({
              width,
              color,
              style,
            });

            // All border widths below 0px should be rejected
            expect(result.success).toBe(false);
            if (!result.success) {
              // Verify error message mentions the minimum constraint
              const errorMessage = result.error.issues[0]?.message || '';
              expect(errorMessage.toLowerCase()).toContain('0');
            }
          }
        ),
        propertyTestParams()
      );
    });

    it('should reject all border widths above maximum (> 20px)', () => {
      fc.assert(
        fc.property(
          arbInvalidBorderWidthAboveMax(),
          arbHexColor(),
          fc.constantFrom('solid', 'dashed', 'dotted'),
          (width, color, style) => {
            const result = BorderPropertiesSchema.safeParse({
              width,
              color,
              style,
            });

            // All border widths above 20px should be rejected
            expect(result.success).toBe(false);
            if (!result.success) {
              // Verify error message mentions the maximum constraint
              const errorMessage = result.error.issues[0]?.message || '';
              expect(errorMessage.toLowerCase()).toContain('20');
            }
          }
        ),
        propertyTestParams()
      );
    });

    it('should accept boundary values (0px and 20px)', () => {
      // Test minimum boundary (0px)
      const minResult = BorderPropertiesSchema.safeParse({
        width: 0,
        color: '#000000',
        style: 'solid',
      });
      expect(minResult.success).toBe(true);

      // Test maximum boundary (20px)
      const maxResult = BorderPropertiesSchema.safeParse({
        width: 20,
        color: '#000000',
        style: 'solid',
      });
      expect(maxResult.success).toBe(true);
    });
  });

  // ============================================================================
  // Padding Range Validation (0-50px)
  // ============================================================================

  describe('Padding Range (0-50px)', () => {
    it('should accept all valid padding values within range (0-50px)', () => {
      fc.assert(
        fc.property(
          arbValidPadding(),
          arbValidMargin(),
          (padding, margin) => {
            const result = SpacingPropertiesSchema.safeParse({
              padding,
              margin,
            });

            // All valid padding values should be accepted
            expect(result.success).toBe(true);
            if (result.success) {
              expect(result.data.padding).toBe(padding);
            }
          }
        ),
        propertyTestParams()
      );
    });

    it('should reject all padding values below minimum (< 0px)', () => {
      fc.assert(
        fc.property(
          arbInvalidPaddingBelowMin(),
          arbValidMargin(),
          (padding, margin) => {
            const result = SpacingPropertiesSchema.safeParse({
              padding,
              margin,
            });

            // All padding values below 0px should be rejected
            expect(result.success).toBe(false);
            if (!result.success) {
              // Verify error message mentions padding and minimum constraint
              const errorMessage = result.error.issues[0]?.message || '';
              expect(errorMessage.toLowerCase()).toContain('padding');
              expect(errorMessage.toLowerCase()).toContain('0');
            }
          }
        ),
        propertyTestParams()
      );
    });

    it('should reject all padding values above maximum (> 50px)', () => {
      fc.assert(
        fc.property(
          arbInvalidPaddingAboveMax(),
          arbValidMargin(),
          (padding, margin) => {
            const result = SpacingPropertiesSchema.safeParse({
              padding,
              margin,
            });

            // All padding values above 50px should be rejected
            expect(result.success).toBe(false);
            if (!result.success) {
              // Verify error message mentions padding and maximum constraint
              const errorMessage = result.error.issues[0]?.message || '';
              expect(errorMessage.toLowerCase()).toContain('padding');
              expect(errorMessage.toLowerCase()).toContain('50');
            }
          }
        ),
        propertyTestParams()
      );
    });

    it('should accept boundary values (0px and 50px)', () => {
      // Test minimum boundary (0px)
      const minResult = SpacingPropertiesSchema.safeParse({
        padding: 0,
        margin: 10,
      });
      expect(minResult.success).toBe(true);

      // Test maximum boundary (50px)
      const maxResult = SpacingPropertiesSchema.safeParse({
        padding: 50,
        margin: 10,
      });
      expect(maxResult.success).toBe(true);
    });
  });

  // ============================================================================
  // Margin Range Validation (0-50px)
  // ============================================================================

  describe('Margin Range (0-50px)', () => {
    it('should accept all valid margin values within range (0-50px)', () => {
      fc.assert(
        fc.property(
          arbValidPadding(),
          arbValidMargin(),
          (padding, margin) => {
            const result = SpacingPropertiesSchema.safeParse({
              padding,
              margin,
            });

            // All valid margin values should be accepted
            expect(result.success).toBe(true);
            if (result.success) {
              expect(result.data.margin).toBe(margin);
            }
          }
        ),
        propertyTestParams()
      );
    });

    it('should reject all margin values below minimum (< 0px)', () => {
      fc.assert(
        fc.property(
          arbValidPadding(),
          arbInvalidMarginBelowMin(),
          (padding, margin) => {
            const result = SpacingPropertiesSchema.safeParse({
              padding,
              margin,
            });

            // All margin values below 0px should be rejected
            expect(result.success).toBe(false);
            if (!result.success) {
              // Verify error message mentions margin and minimum constraint
              const errorMessage = result.error.issues[0]?.message || '';
              expect(errorMessage.toLowerCase()).toContain('margin');
              expect(errorMessage.toLowerCase()).toContain('0');
            }
          }
        ),
        propertyTestParams()
      );
    });

    it('should reject all margin values above maximum (> 50px)', () => {
      fc.assert(
        fc.property(
          arbValidPadding(),
          arbInvalidMarginAboveMax(),
          (padding, margin) => {
            const result = SpacingPropertiesSchema.safeParse({
              padding,
              margin,
            });

            // All margin values above 50px should be rejected
            expect(result.success).toBe(false);
            if (!result.success) {
              // Verify error message mentions margin and maximum constraint
              const errorMessage = result.error.issues[0]?.message || '';
              expect(errorMessage.toLowerCase()).toContain('margin');
              expect(errorMessage.toLowerCase()).toContain('50');
            }
          }
        ),
        propertyTestParams()
      );
    });

    it('should accept boundary values (0px and 50px)', () => {
      // Test minimum boundary (0px)
      const minResult = SpacingPropertiesSchema.safeParse({
        padding: 10,
        margin: 0,
      });
      expect(minResult.success).toBe(true);

      // Test maximum boundary (50px)
      const maxResult = SpacingPropertiesSchema.safeParse({
        padding: 10,
        margin: 50,
      });
      expect(maxResult.success).toBe(true);
    });
  });

  // ============================================================================
  // Combined Range Validation
  // ============================================================================

  describe('Combined Range Validation', () => {
    it('should accept all properties when all values are within valid ranges', () => {
      fc.assert(
        fc.property(
          arbValidFontSize(),
          arbValidBorderWidth(),
          arbValidPadding(),
          arbValidMargin(),
          (fontSize, borderWidth, padding, margin) => {
            // Test font properties
            const fontResult = FontPropertiesSchema.safeParse({
              family: 'Arial',
              size: fontSize,
              weight: 'normal',
              style: 'normal',
            });
            expect(fontResult.success).toBe(true);

            // Test border properties
            const borderResult = BorderPropertiesSchema.safeParse({
              width: borderWidth,
              color: '#000000',
              style: 'solid',
            });
            expect(borderResult.success).toBe(true);

            // Test spacing properties
            const spacingResult = SpacingPropertiesSchema.safeParse({
              padding,
              margin,
            });
            expect(spacingResult.success).toBe(true);
          }
        ),
        propertyTestParams()
      );
    });

    it('should reject when any property value is outside valid range', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            arbInvalidFontSizeBelowMin(),
            arbInvalidFontSizeAboveMax()
          ),
          fc.oneof(
            arbInvalidBorderWidthBelowMin(),
            arbInvalidBorderWidthAboveMax()
          ),
          fc.oneof(
            arbInvalidPaddingBelowMin(),
            arbInvalidPaddingAboveMax()
          ),
          fc.oneof(
            arbInvalidMarginBelowMin(),
            arbInvalidMarginAboveMax()
          ),
          (fontSize, borderWidth, padding, margin) => {
            // At least one of these should fail
            const fontResult = FontPropertiesSchema.safeParse({
              family: 'Arial',
              size: fontSize,
              weight: 'normal',
              style: 'normal',
            });

            const borderResult = BorderPropertiesSchema.safeParse({
              width: borderWidth,
              color: '#000000',
              style: 'solid',
            });

            const spacingResult = SpacingPropertiesSchema.safeParse({
              padding,
              margin,
            });

            // At least one validation should fail
            const allPassed = fontResult.success && borderResult.success && spacingResult.success;
            expect(allPassed).toBe(false);
          }
        ),
        propertyTestParams()
      );
    });
  });
});
