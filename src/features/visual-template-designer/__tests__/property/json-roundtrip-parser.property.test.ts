/**
 * Property-Based Test: Template JSON Round-Trip Consistency with Parser
 * 
 * Feature: visual-template-designer
 * Property 1: Template JSON round-trip preservation
 * Property 17: Template JSON pretty printing consistency
 * Validates: Requirements 8.11, 9.3, 9.4, 9.5
 * 
 * Property Definitions:
 * 
 * Property 1: For any valid Template object, serializing to Template JSON then
 * deserializing back to a Template object SHALL produce an equivalent Template
 * 
 * Property 17: For any valid Template object, the pretty-printed Template JSON
 * SHALL use consistent 2-space indentation and SHALL be parseable back into an
 * equivalent Template object
 * 
 * This test validates that the parseTemplateJSON and prettyPrintTemplateJSON
 * functions from Task 2.5 correctly implement round-trip consistency.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import {
  parseTemplateJSON,
  prettyPrintTemplateJSON,
  type TemplateJSON,
} from '../../domain/schemas';

// ============================================================================
// Arbitraries (Generators) - Reusing from template-roundtrip.property.test.ts
// ============================================================================

/**
 * Generate valid template categories
 */
const arbTemplateCategory = () =>
  fc.constantFrom(
    'REPORT_CARD',
    'CERTIFICATE',
    'ID_CARD',
    'RECEIPT',
    'FEE_STATEMENT',
    'ADMISSION_FORM',
    'RESULT_SLIP'
  );

/**
 * Generate valid page sizes
 */
const arbPageSize = () =>
  fc.constantFrom('A4', 'LETTER', 'LEGAL', 'CUSTOM');

/**
 * Generate valid page orientations
 */
const arbPageOrientation = () =>
  fc.constantFrom('portrait', 'landscape');

/**
 * Generate valid component types
 */
const arbComponentType = () =>
  fc.constantFrom(
    // School Info
    'SCHOOL_LOGO',
    'SCHOOL_NAME',
    'SCHOOL_MOTTO',
    'SCHOOL_ADDRESS',
    'SCHOOL_CONTACT',
    // Student Info
    'STUDENT_NAME',
    'STUDENT_PHOTO',
    'STUDENT_CLASS',
    'STUDENT_STREAM',
    'STUDENT_NUMBER',
    'STUDENT_ATTENDANCE',
    // Academic
    'RESULTS_TABLE',
    'SUBJECT_SCORES',
    'GRADE_DISPLAY',
    'AGGREGATE_DISPLAY',
    'DIVISION_DISPLAY',
    'TEACHER_REMARKS',
    'HEAD_TEACHER_COMMENTS',
    // Financial
    'FEES_BALANCE',
    'PAYMENT_SUMMARY',
    'FEE_STRUCTURE',
    // Static
    'LINE',
    'BORDER',
    'RECTANGLE',
    'CIRCLE',
    'BACKGROUND_IMAGE',
    'WATERMARK',
    'TEXT_LABEL',
    'SIGNATURE_FIELD'
  );

/**
 * Generate valid units
 */
const arbUnit = () =>
  fc.constantFrom('px', 'mm', 'in');

/**
 * Generate valid text alignments
 */
const arbTextAlignment = () =>
  fc.constantFrom('left', 'center', 'right', 'justify');

/**
 * Generate valid image fit modes
 */
const arbImageFit = () =>
  fc.constantFrom('contain', 'cover', 'fill', 'scale-down');

/**
 * Generate valid font weights
 */
const arbFontWeight = () =>
  fc.constantFrom('normal', 'bold');

/**
 * Generate valid font styles
 */
const arbFontStyle = () =>
  fc.constantFrom('normal', 'italic');

/**
 * Generate valid border styles
 */
const arbBorderStyle = () =>
  fc.constantFrom('solid', 'dashed', 'dotted');

/**
 * Generate valid hex color strings
 */
const arbHexColor = () =>
  fc
    .integer({ min: 0, max: 0xffffff })
    .map((num) => `#${num.toString(16).padStart(6, '0').toUpperCase()}`);

/**
 * Generate valid RGB color strings
 */
const arbRgbColor = () =>
  fc
    .tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 })
    )
    .map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`);

/**
 * Generate valid color strings (hex or RGB)
 */
const arbColor = () =>
  fc.oneof(arbHexColor(), arbRgbColor());

/**
 * Generate valid Position objects for TemplateJSON
 */
const arbPositionJSON = () =>
  fc.record({
    x: fc.double({ min: 0, max: 10000, noNaN: true }),
    y: fc.double({ min: 0, max: 10000, noNaN: true }),
    unit: arbUnit(),
  });

/**
 * Generate valid Size objects for TemplateJSON
 */
const arbSizeJSON = () =>
  fc.record({
    width: fc.double({ min: 1, max: 10000, noNaN: true }),
    height: fc.double({ min: 1, max: 10000, noNaN: true }),
    unit: arbUnit(),
    aspectRatioLocked: fc.option(fc.boolean(), { nil: undefined }),
  });

/**
 * Generate valid FontProperties objects for TemplateJSON
 */
const arbFontPropertiesJSON = () =>
  fc.record({
    family: fc.constantFrom('Arial', 'Times New Roman', 'Helvetica', 'Courier'),
    size: fc.integer({ min: 6, max: 72 }),
    weight: arbFontWeight(),
    style: arbFontStyle(),
  });

/**
 * Generate valid ColorProperties objects for TemplateJSON
 */
const arbColorPropertiesJSON = () =>
  fc.record({
    text: fc.option(arbColor(), { nil: undefined }),
    background: fc.option(arbColor(), { nil: undefined }),
  });

/**
 * Generate valid BorderProperties objects for TemplateJSON
 */
const arbBorderPropertiesJSON = () =>
  fc.record({
    width: fc.integer({ min: 0, max: 20 }),
    color: arbColor(),
    style: arbBorderStyle(),
  });

/**
 * Generate valid SpacingProperties objects for TemplateJSON
 */
const arbSpacingPropertiesJSON = () =>
  fc.record({
    padding: fc.integer({ min: 0, max: 50 }),
    margin: fc.integer({ min: 0, max: 50 }),
  });

/**
 * Generate valid LayoutProperties objects for TemplateJSON
 */
const arbLayoutPropertiesJSON = () =>
  fc.record({
    position: arbPositionJSON(),
    size: arbSizeJSON(),
    rotation: fc.double({ min: 0, max: 360, noNaN: true }),
    font: fc.option(arbFontPropertiesJSON(), { nil: undefined }),
    color: fc.option(arbColorPropertiesJSON(), { nil: undefined }),
    border: fc.option(arbBorderPropertiesJSON(), { nil: undefined }),
    spacing: fc.option(arbSpacingPropertiesJSON(), { nil: undefined }),
    alignment: fc.option(arbTextAlignment(), { nil: undefined }),
    imagefit: fc.option(arbImageFit(), { nil: undefined }),
  });

/**
 * Generate valid DataBinding objects for TemplateJSON
 */
const arbDataBindingJSON = () =>
  fc.record({
    field: fc.constantFrom(
      'student.name',
      'student.class',
      'student.photo',
      'school.name',
      'school.logo',
      'results.aggregate',
      'fees.balance'
    ),
    formatter: fc.option(
      fc.constantFrom('uppercase', 'lowercase', 'currency', 'date'),
      { nil: undefined }
    ),
    fallback: fc.option(fc.string({ minLength: 0, maxLength: 50 }), {
      nil: undefined,
    }),
  });

/**
 * Generate valid ComponentJSON objects
 */
const arbComponentJSON = () =>
  fc
    .record({
      component_type: arbComponentType(),
      layout: arbLayoutPropertiesJSON(),
      z_index: fc.integer({ min: 0, max: 1000 }),
      group_id: fc.option(fc.uuid(), { nil: undefined }),
    })
    .chain((base) => {
      // Add data_binding for dynamic components (not static components)
      const staticComponents = [
        'LINE',
        'BORDER',
        'RECTANGLE',
        'CIRCLE',
        'BACKGROUND_IMAGE',
        'WATERMARK',
        'TEXT_LABEL',
        'SIGNATURE_FIELD',
      ];

      if (staticComponents.includes(base.component_type)) {
        return fc.constant(base);
      }

      return fc
        .option(arbDataBindingJSON(), { nil: undefined })
        .map((data_binding) => ({
          ...base,
          data_binding,
        }));
    });

/**
 * Generate valid PageJSON objects
 */
const arbPageJSON = () =>
  fc.record({
    page_number: fc.integer({ min: 1, max: 100 }),
    width: fc.double({ min: 100, max: 2000, noNaN: true }),
    height: fc.double({ min: 100, max: 2000, noNaN: true }),
    elements: fc.array(arbComponentJSON(), { minLength: 0, maxLength: 20 }),
  });

/**
 * Generate valid TemplateJSON objects
 * Note: Dates are generated as timestamps (milliseconds since epoch) in a reasonable
 * range (1970-2100) to ensure valid ISO datetime strings that pass Zod validation
 */
const arbTemplateJSON = (): fc.Arbitrary<TemplateJSON> =>
  fc.record({
    template_name: fc.string({ minLength: 1, maxLength: 100 }),
    template_category: arbTemplateCategory(),
    page_size: arbPageSize(),
    page_orientation: arbPageOrientation(),
    pages: fc.array(arbPageJSON(), { minLength: 1, maxLength: 10 }),
    version: fc.integer({ min: 1, max: 1000 }),
    // Generate timestamps in milliseconds (1970-2100 range)
    created_at: fc.integer({ min: 0, max: 4102444800000 }).map((ms) => new Date(ms).toISOString()),
    updated_at: fc.integer({ min: 0, max: 4102444800000 }).map((ms) => new Date(ms).toISOString()),
  });

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Deep equality check for TemplateJSON objects
 * Handles floating point comparisons with tolerance
 */
function templateJSONsAreEqual(t1: TemplateJSON, t2: TemplateJSON): boolean {
  // Compare primitive fields
  if (
    t1.template_name !== t2.template_name ||
    t1.template_category !== t2.template_category ||
    t1.page_size !== t2.page_size ||
    t1.page_orientation !== t2.page_orientation ||
    t1.version !== t2.version ||
    t1.created_at !== t2.created_at ||
    t1.updated_at !== t2.updated_at
  ) {
    return false;
  }

  // Compare pages array length
  if (t1.pages.length !== t2.pages.length) {
    return false;
  }

  // Compare each page
  for (let i = 0; i < t1.pages.length; i++) {
    if (!pagesAreEqual(t1.pages[i], t2.pages[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Deep equality check for PageJSON objects
 */
function pagesAreEqual(p1: any, p2: any): boolean {
  if (
    p1.page_number !== p2.page_number ||
    !numbersAreClose(p1.width, p2.width) ||
    !numbersAreClose(p1.height, p2.height) ||
    p1.elements.length !== p2.elements.length
  ) {
    return false;
  }

  // Compare each element
  for (let i = 0; i < p1.elements.length; i++) {
    if (!componentsAreEqual(p1.elements[i], p2.elements[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Deep equality check for ComponentJSON objects
 */
function componentsAreEqual(c1: any, c2: any): boolean {
  if (
    c1.component_type !== c2.component_type ||
    c1.z_index !== c2.z_index ||
    c1.group_id !== c2.group_id
  ) {
    return false;
  }

  // Compare data_binding
  if (c1.data_binding !== c2.data_binding) {
    if (!c1.data_binding || !c2.data_binding) {
      return false;
    }
    if (
      c1.data_binding.field !== c2.data_binding.field ||
      c1.data_binding.formatter !== c2.data_binding.formatter ||
      c1.data_binding.fallback !== c2.data_binding.fallback
    ) {
      return false;
    }
  }

  // Compare layout
  return layoutsAreEqual(c1.layout, c2.layout);
}

/**
 * Deep equality check for LayoutProperties in JSON format
 */
function layoutsAreEqual(l1: any, l2: any): boolean {
  // Compare position
  if (
    !numbersAreClose(l1.position.x, l2.position.x) ||
    !numbersAreClose(l1.position.y, l2.position.y) ||
    l1.position.unit !== l2.position.unit
  ) {
    return false;
  }

  // Compare size
  if (
    !numbersAreClose(l1.size.width, l2.size.width) ||
    !numbersAreClose(l1.size.height, l2.size.height) ||
    l1.size.unit !== l2.size.unit ||
    l1.size.aspectRatioLocked !== l2.size.aspectRatioLocked
  ) {
    return false;
  }

  // Compare rotation
  if (!numbersAreClose(l1.rotation, l2.rotation)) {
    return false;
  }

  // Compare optional properties
  if (l1.alignment !== l2.alignment || l1.imagefit !== l2.imagefit) {
    return false;
  }

  // Compare font
  if (l1.font !== l2.font) {
    if (!l1.font || !l2.font) {
      return false;
    }
    if (
      l1.font.family !== l2.font.family ||
      l1.font.size !== l2.font.size ||
      l1.font.weight !== l2.font.weight ||
      l1.font.style !== l2.font.style
    ) {
      return false;
    }
  }

  // Compare color
  if (l1.color !== l2.color) {
    if (!l1.color || !l2.color) {
      return false;
    }
    if (l1.color.text !== l2.color.text || l1.color.background !== l2.color.background) {
      return false;
    }
  }

  // Compare border
  if (l1.border !== l2.border) {
    if (!l1.border || !l2.border) {
      return false;
    }
    if (
      l1.border.width !== l2.border.width ||
      l1.border.color !== l2.border.color ||
      l1.border.style !== l2.border.style
    ) {
      return false;
    }
  }

  // Compare spacing
  if (l1.spacing !== l2.spacing) {
    if (!l1.spacing || !l2.spacing) {
      return false;
    }
    if (l1.spacing.padding !== l2.spacing.padding || l1.spacing.margin !== l2.spacing.margin) {
      return false;
    }
  }

  return true;
}

/**
 * Compare two numbers with tolerance for floating point precision
 */
function numbersAreClose(a: number, b: number, epsilon = 1e-10): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Verify that a JSON string uses 2-space indentation
 */
function hasConsistent2SpaceIndentation(jsonString: string): boolean {
  const lines = jsonString.split('\n');
  
  for (const line of lines) {
    // Skip empty lines
    if (line.trim() === '') continue;
    
    // Get leading whitespace
    const leadingWhitespace = line.match(/^(\s*)/)?.[1] || '';
    
    // Check if whitespace contains tabs (not allowed)
    if (leadingWhitespace.includes('\t')) {
      return false;
    }
    
    // Check if indentation is a multiple of 2 spaces
    if (leadingWhitespace.length % 2 !== 0) {
      return false;
    }
  }
  
  return true;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 1 & 17: Template JSON Round-Trip with Parser and Pretty Printer', () => {
  /**
   * Feature: visual-template-designer, Property 1: Template JSON round-trip preservation
   * Validates: Requirements 8.11, 9.5
   * 
   * Property: For any valid Template object, serializing to Template JSON then
   * deserializing back to a Template object SHALL produce an equivalent Template
   */
  it('should preserve template structure through prettyPrint → parse round-trip', () => {
    fc.assert(
      fc.property(arbTemplateJSON(), (originalTemplate) => {
        // Step 1: Pretty print the template to JSON string
        const printResult = prettyPrintTemplateJSON(originalTemplate);
        
        // Verify pretty print succeeded
        expect(printResult.success).toBe(true);
        if (!printResult.success) return;
        
        // Step 2: Parse the JSON string back to template
        const parseResult = parseTemplateJSON(printResult.data);
        
        // Verify parse succeeded
        expect(parseResult.success).toBe(true);
        if (!parseResult.success) return;
        
        // Step 3: Verify templates are equivalent
        expect(templateJSONsAreEqual(originalTemplate, parseResult.data)).toBe(true);
      }),
      propertyTestParams()
    );
  });

  /**
   * Feature: visual-template-designer, Property 17: Template JSON pretty printing consistency
   * Validates: Requirements 9.3, 9.4
   * 
   * Property: For any valid Template object, the pretty-printed Template JSON
   * SHALL use consistent 2-space indentation
   */
  it('should use consistent 2-space indentation in pretty-printed output', () => {
    fc.assert(
      fc.property(arbTemplateJSON(), (template) => {
        // Pretty print the template
        const result = prettyPrintTemplateJSON(template);
        
        // Verify pretty print succeeded
        expect(result.success).toBe(true);
        if (!result.success) return;
        
        // Verify 2-space indentation
        expect(hasConsistent2SpaceIndentation(result.data)).toBe(true);
      }),
      propertyTestParams()
    );
  });

  /**
   * Feature: visual-template-designer, Property 17: Template JSON pretty printing consistency
   * Validates: Requirements 9.4, 9.5
   * 
   * Property: The pretty-printed Template JSON SHALL be parseable back into an
   * equivalent Template object
   */
  it('should produce parseable JSON output', () => {
    fc.assert(
      fc.property(arbTemplateJSON(), (template) => {
        // Pretty print the template
        const printResult = prettyPrintTemplateJSON(template);
        
        // Verify pretty print succeeded
        expect(printResult.success).toBe(true);
        if (!printResult.success) return;
        
        // Verify the output is valid JSON
        expect(() => JSON.parse(printResult.data)).not.toThrow();
        
        // Verify it can be parsed by our parser
        const parseResult = parseTemplateJSON(printResult.data);
        expect(parseResult.success).toBe(true);
      }),
      propertyTestParams()
    );
  });

  /**
   * Feature: visual-template-designer, Property 1: Template JSON round-trip preservation
   * Validates: Requirements 8.11, 9.5
   * 
   * Property: Multiple round-trips should produce stable output
   * (prettyPrint → parse → prettyPrint should produce identical JSON)
   */
  it('should produce stable output after multiple round-trips', () => {
    fc.assert(
      fc.property(arbTemplateJSON(), (originalTemplate) => {
        // First round-trip: prettyPrint → parse
        const printResult1 = prettyPrintTemplateJSON(originalTemplate);
        expect(printResult1.success).toBe(true);
        if (!printResult1.success) return;
        
        const parseResult = parseTemplateJSON(printResult1.data);
        expect(parseResult.success).toBe(true);
        if (!parseResult.success) return;
        
        // Second round-trip: prettyPrint again
        const printResult2 = prettyPrintTemplateJSON(parseResult.data);
        expect(printResult2.success).toBe(true);
        if (!printResult2.success) return;
        
        // The two JSON strings should be identical
        expect(printResult1.data).toBe(printResult2.data);
      }),
      propertyTestParams()
    );
  });

  /**
   * Feature: visual-template-designer, Property 1: Template JSON round-trip preservation
   * Validates: Requirements 8.11, 9.5
   * 
   * Property: All required fields should be preserved through round-trip
   */
  it('should preserve all required template fields through round-trip', () => {
    fc.assert(
      fc.property(arbTemplateJSON(), (originalTemplate) => {
        // Pretty print and parse
        const printResult = prettyPrintTemplateJSON(originalTemplate);
        expect(printResult.success).toBe(true);
        if (!printResult.success) return;
        
        const parseResult = parseTemplateJSON(printResult.data);
        expect(parseResult.success).toBe(true);
        if (!parseResult.success) return;
        
        const roundTripped = parseResult.data;
        
        // Verify all required fields are preserved
        expect(roundTripped.template_name).toBe(originalTemplate.template_name);
        expect(roundTripped.template_category).toBe(originalTemplate.template_category);
        expect(roundTripped.page_size).toBe(originalTemplate.page_size);
        expect(roundTripped.page_orientation).toBe(originalTemplate.page_orientation);
        expect(roundTripped.version).toBe(originalTemplate.version);
        expect(roundTripped.created_at).toBe(originalTemplate.created_at);
        expect(roundTripped.updated_at).toBe(originalTemplate.updated_at);
        expect(roundTripped.pages.length).toBe(originalTemplate.pages.length);
      }),
      propertyTestParams()
    );
  });

  /**
   * Feature: visual-template-designer, Property 1: Template JSON round-trip preservation
   * Validates: Requirements 8.11, 9.5
   * 
   * Property: Component properties should be preserved through round-trip
   */
  it('should preserve all component properties through round-trip', () => {
    fc.assert(
      fc.property(arbTemplateJSON(), (originalTemplate) => {
        // Pretty print and parse
        const printResult = prettyPrintTemplateJSON(originalTemplate);
        expect(printResult.success).toBe(true);
        if (!printResult.success) return;
        
        const parseResult = parseTemplateJSON(printResult.data);
        expect(parseResult.success).toBe(true);
        if (!parseResult.success) return;
        
        const roundTripped = parseResult.data;
        
        // Check each page
        originalTemplate.pages.forEach((originalPage, pageIndex) => {
          const roundTrippedPage = roundTripped.pages[pageIndex];
          
          // Verify page properties
          expect(roundTrippedPage.page_number).toBe(originalPage.page_number);
          expect(roundTrippedPage.elements.length).toBe(originalPage.elements.length);
          
          // Check each component
          originalPage.elements.forEach((originalComponent, componentIndex) => {
            const roundTrippedComponent = roundTrippedPage.elements[componentIndex];
            
            // Verify component structure
            expect(roundTrippedComponent.component_type).toBe(originalComponent.component_type);
            expect(roundTrippedComponent.z_index).toBe(originalComponent.z_index);
            expect(roundTrippedComponent.group_id).toBe(originalComponent.group_id);
            
            // Verify layout exists
            expect(roundTrippedComponent.layout).toBeDefined();
            expect(roundTrippedComponent.layout.position).toBeDefined();
            expect(roundTrippedComponent.layout.size).toBeDefined();
          });
        });
      }),
      propertyTestParams()
    );
  });
});

