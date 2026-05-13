/**
 * Property-Based Test: Template JSON Round-Trip Preservation
 * 
 * Feature: visual-template-designer
 * Property 1: Template JSON round-trip preservation
 * Validates: Requirements 8.11, 9.5
 * 
 * Property Definition:
 * For any valid Template object, serializing to Template JSON then deserializing
 * back to a Template object SHALL produce an equivalent Template with the same
 * structure, components, and properties.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import type {
  Template,
  TemplatePage,
  TemplateComponent,
  LayoutProperties,
  Position,
  Size,
  FontProperties,
  ColorProperties,
  BorderProperties,
  SpacingProperties,
  DataBinding,
  ResultsTableStyle,
  TemplateCategory,
  PageSize,
  PageOrientation,
  ComponentType,
  Unit,
  TextAlignment,
  ImageFit,
  FontWeight,
  FontStyle,
  BorderStyle,
} from '../../domain/types';

// ============================================================================
// Arbitraries (Generators) for Domain Types
// ============================================================================

/**
 * Generate valid template categories
 */
const arbTemplateCategory = (): fc.Arbitrary<TemplateCategory> =>
  fc.constantFrom<TemplateCategory>(
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
const arbPageSize = (): fc.Arbitrary<PageSize> =>
  fc.constantFrom<PageSize>('A4', 'LETTER', 'LEGAL', 'CUSTOM');

/**
 * Generate valid page orientations
 */
const arbPageOrientation = (): fc.Arbitrary<PageOrientation> =>
  fc.constantFrom<PageOrientation>('portrait', 'landscape');

/**
 * Generate valid component types
 */
const arbComponentType = (): fc.Arbitrary<ComponentType> =>
  fc.constantFrom<ComponentType>(
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
const arbUnit = (): fc.Arbitrary<Unit> =>
  fc.constantFrom<Unit>('px', 'mm', 'in');

/**
 * Generate valid text alignments
 */
const arbTextAlignment = (): fc.Arbitrary<TextAlignment> =>
  fc.constantFrom<TextAlignment>('left', 'center', 'right', 'justify');

/**
 * Generate valid image fit modes
 */
const arbImageFit = (): fc.Arbitrary<ImageFit> =>
  fc.constantFrom<ImageFit>('contain', 'cover', 'fill', 'scale-down');

/**
 * Generate valid font weights
 */
const arbFontWeight = (): fc.Arbitrary<FontWeight> =>
  fc.constantFrom<FontWeight>('normal', 'bold');

/**
 * Generate valid font styles
 */
const arbFontStyle = (): fc.Arbitrary<FontStyle> =>
  fc.constantFrom<FontStyle>('normal', 'italic');

/**
 * Generate valid border styles
 */
const arbBorderStyle = (): fc.Arbitrary<BorderStyle> =>
  fc.constantFrom<BorderStyle>('solid', 'dashed', 'dotted');

/**
 * Generate valid hex color strings
 */
const arbHexColor = (): fc.Arbitrary<string> =>
  fc
    .integer({ min: 0, max: 0xffffff })
    .map((num) => `#${num.toString(16).padStart(6, '0').toUpperCase()}`);

/**
 * Generate valid RGB color strings
 */
const arbRgbColor = (): fc.Arbitrary<string> =>
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
const arbColor = (): fc.Arbitrary<string> =>
  fc.oneof(arbHexColor(), arbRgbColor());

/**
 * Generate valid Position objects
 */
const arbPosition = (): fc.Arbitrary<Position> =>
  fc.record({
    x: fc.double({ min: 0, max: 10000, noNaN: true }),
    y: fc.double({ min: 0, max: 10000, noNaN: true }),
    unit: arbUnit(),
  });

/**
 * Generate valid Size objects
 */
const arbSize = (): fc.Arbitrary<Size> =>
  fc.record({
    width: fc.double({ min: 1, max: 10000, noNaN: true }),
    height: fc.double({ min: 1, max: 10000, noNaN: true }),
    unit: arbUnit(),
    aspectRatioLocked: fc.option(fc.boolean(), { nil: undefined }),
  });

/**
 * Generate valid FontProperties objects
 * Font size constrained to 6-72pt as per requirements
 */
const arbFontProperties = (): fc.Arbitrary<FontProperties> =>
  fc.record({
    family: fc.constantFrom('Arial', 'Times New Roman', 'Helvetica', 'Courier'),
    size: fc.integer({ min: 6, max: 72 }),
    weight: arbFontWeight(),
    style: arbFontStyle(),
  });

/**
 * Generate valid ColorProperties objects
 */
const arbColorProperties = (): fc.Arbitrary<ColorProperties> =>
  fc.record({
    text: fc.option(arbColor(), { nil: undefined }),
    background: fc.option(arbColor(), { nil: undefined }),
  });

/**
 * Generate valid BorderProperties objects
 * Border width constrained to 0-20px as per requirements
 */
const arbBorderProperties = (): fc.Arbitrary<BorderProperties> =>
  fc.record({
    width: fc.integer({ min: 0, max: 20 }),
    color: arbColor(),
    style: arbBorderStyle(),
  });

/**
 * Generate valid SpacingProperties objects
 * Padding and margin constrained to 0-50px as per requirements
 */
const arbSpacingProperties = (): fc.Arbitrary<SpacingProperties> =>
  fc.record({
    padding: fc.integer({ min: 0, max: 50 }),
    margin: fc.integer({ min: 0, max: 50 }),
  });

/**
 * Generate valid LayoutProperties objects
 */
const arbLayoutProperties = (): fc.Arbitrary<LayoutProperties> =>
  fc.record({
    position: arbPosition(),
    size: arbSize(),
    rotation: fc.double({ min: 0, max: 360, noNaN: true }),
    font: fc.option(arbFontProperties(), { nil: undefined }),
    color: fc.option(arbColorProperties(), { nil: undefined }),
    border: fc.option(arbBorderProperties(), { nil: undefined }),
    spacing: fc.option(arbSpacingProperties(), { nil: undefined }),
    alignment: fc.option(arbTextAlignment(), { nil: undefined }),
    imagefit: fc.option(arbImageFit(), { nil: undefined }),
  });

/**
 * Generate valid DataBinding objects
 */
const arbDataBinding = (): fc.Arbitrary<DataBinding> =>
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
 * Generate valid ResultsTableStyle objects
 */
const arbResultsTableStyle = (): fc.Arbitrary<ResultsTableStyle> =>
  fc.record({
    borderWidth: fc.integer({ min: 0, max: 20 }),
    borderColor: arbColor(),
    headerBackgroundColor: arbColor(),
    headerTextColor: arbColor(),
    rowBackgroundColor: arbColor(),
    alternatingRowBackgroundColor: arbColor(),
    cellPadding: fc.integer({ min: 0, max: 50 }),
    fontSize: fc.integer({ min: 6, max: 72 }),
  });

/**
 * Generate valid TemplateComponent objects
 */
const arbTemplateComponent = (): fc.Arbitrary<TemplateComponent> =>
  fc
    .record({
      id: fc.uuid(),
      type: arbComponentType(),
      layout: arbLayoutProperties(),
      zIndex: fc.integer({ min: 0, max: 1000 }),
      groupId: fc.option(fc.uuid(), { nil: undefined }),
    })
    .chain((base) => {
      // Add dataBinding for dynamic components (not static components)
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

      if (staticComponents.includes(base.type)) {
        return fc.constant(base);
      }

      return fc
        .option(arbDataBinding(), { nil: undefined })
        .map((dataBinding) => ({
          ...base,
          dataBinding,
        }));
    });

/**
 * Generate valid TemplatePage objects
 */
const arbTemplatePage = (): fc.Arbitrary<TemplatePage> =>
  fc.record({
    id: fc.uuid(),
    pageNumber: fc.integer({ min: 1, max: 100 }),
    width: fc.double({ min: 100, max: 2000, noNaN: true }),
    height: fc.double({ min: 100, max: 2000, noNaN: true }),
    elements: fc.array(arbTemplateComponent(), { minLength: 0, maxLength: 20 }),
  });

/**
 * Generate valid Template objects
 */
const arbTemplate = (): fc.Arbitrary<Template> =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }).map((s) => {
      const clean = s.replace(/[^\w ]/g, 'x').trim();
      return clean || 'Template';
    }),
    category: arbTemplateCategory(),
    pageSize: arbPageSize(),
    pageOrientation: arbPageOrientation(),
    pages: fc.array(arbTemplatePage(), { minLength: 1, maxLength: 10 }),
    createdAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map((ts) => new Date(ts)),
    updatedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map((ts) => new Date(ts)),
    createdBy: fc.uuid(),
    version: fc.integer({ min: 1, max: 1000 }),
  });

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Serialize a Template to JSON string
 */
function serializeTemplate(template: Template): string {
  return JSON.stringify(template);
}

/**
 * Deserialize a JSON string to Template
 * Note: Dates are serialized as strings, so we need to convert them back
 */
function deserializeTemplate(json: string): Template {
  const parsed = JSON.parse(json);
  
  // Convert date strings back to Date objects
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
    updatedAt: new Date(parsed.updatedAt),
  };
}

/**
 * Deep equality check for Templates
 * Handles Date objects and floating point comparisons
 */
function templatesAreEqual(t1: Template, t2: Template): boolean {
  // Compare primitive fields
  if (
    t1.id !== t2.id ||
    t1.name !== t2.name ||
    t1.category !== t2.category ||
    t1.pageSize !== t2.pageSize ||
    t1.pageOrientation !== t2.pageOrientation ||
    t1.createdBy !== t2.createdBy ||
    t1.version !== t2.version
  ) {
    return false;
  }

  // Compare dates (convert to ISO strings for comparison)
  if (
    t1.createdAt.toISOString() !== t2.createdAt.toISOString() ||
    t1.updatedAt.toISOString() !== t2.updatedAt.toISOString()
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
 * Deep equality check for TemplatePages
 */
function pagesAreEqual(p1: TemplatePage, p2: TemplatePage): boolean {
  if (
    p1.id !== p2.id ||
    p1.pageNumber !== p2.pageNumber ||
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
 * Deep equality check for TemplateComponents
 */
function componentsAreEqual(
  c1: TemplateComponent,
  c2: TemplateComponent
): boolean {
  if (
    c1.id !== c2.id ||
    c1.type !== c2.type ||
    c1.zIndex !== c2.zIndex ||
    c1.groupId !== c2.groupId
  ) {
    return false;
  }

  // Compare dataBinding
  if (c1.dataBinding !== c2.dataBinding) {
    if (!c1.dataBinding || !c2.dataBinding) {
      return false;
    }
    if (
      c1.dataBinding.field !== c2.dataBinding.field ||
      c1.dataBinding.formatter !== c2.dataBinding.formatter ||
      c1.dataBinding.fallback !== c2.dataBinding.fallback
    ) {
      return false;
    }
  }

  // Compare layout
  return layoutsAreEqual(c1.layout, c2.layout);
}

/**
 * Deep equality check for LayoutProperties
 */
function layoutsAreEqual(l1: LayoutProperties, l2: LayoutProperties): boolean {
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

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 1: Template JSON Round-Trip Preservation', () => {
  /**
   * Feature: visual-template-designer, Property 1: Template JSON round-trip preservation
   * Validates: Requirements 8.11, 9.5
   * 
   * Property: For any valid Template object, serializing to Template JSON then
   * deserializing back to a Template object SHALL produce an equivalent Template
   * with the same structure, components, and properties.
   */
  it('should preserve template structure through JSON serialization round-trip', () => {
    fc.assert(
      fc.property(arbTemplate(), (originalTemplate) => {
        // Serialize template to JSON
        const json = serializeTemplate(originalTemplate);

        // Deserialize JSON back to template
        const deserializedTemplate = deserializeTemplate(json);

        // Verify templates are equivalent
        expect(templatesAreEqual(originalTemplate, deserializedTemplate)).toBe(
          true
        );
      }),
      propertyTestParams()
    );
  });

  /**
   * Additional test: Verify JSON is valid and parseable
   */
  it('should produce valid JSON that can be parsed', () => {
    fc.assert(
      fc.property(arbTemplate(), (template) => {
        const json = serializeTemplate(template);

        // Should not throw when parsing
        expect(() => JSON.parse(json)).not.toThrow();

        // Parsed object should be an object
        const parsed = JSON.parse(json);
        expect(typeof parsed).toBe('object');
        expect(parsed).not.toBeNull();
      }),
      propertyTestParams()
    );
  });

  /**
   * Additional test: Verify all required fields are preserved
   */
  it('should preserve all required template fields', () => {
    fc.assert(
      fc.property(arbTemplate(), (originalTemplate) => {
        const json = serializeTemplate(originalTemplate);
        const deserialized = deserializeTemplate(json);

        // Check all required fields exist
        expect(deserialized).toHaveProperty('id');
        expect(deserialized).toHaveProperty('name');
        expect(deserialized).toHaveProperty('category');
        expect(deserialized).toHaveProperty('pageSize');
        expect(deserialized).toHaveProperty('pageOrientation');
        expect(deserialized).toHaveProperty('pages');
        expect(deserialized).toHaveProperty('createdAt');
        expect(deserialized).toHaveProperty('updatedAt');
        expect(deserialized).toHaveProperty('createdBy');
        expect(deserialized).toHaveProperty('version');

        // Verify pages is an array
        expect(Array.isArray(deserialized.pages)).toBe(true);
        expect(deserialized.pages.length).toBeGreaterThan(0);
      }),
      propertyTestParams()
    );
  });

  /**
   * Additional test: Verify component properties are preserved
   */
  it('should preserve all component properties through round-trip', () => {
    fc.assert(
      fc.property(arbTemplate(), (originalTemplate) => {
        const json = serializeTemplate(originalTemplate);
        const deserialized = deserializeTemplate(json);

        // Check each page
        originalTemplate.pages.forEach((originalPage, pageIndex) => {
          const deserializedPage = deserialized.pages[pageIndex];

          // Check each component
          originalPage.elements.forEach((originalComponent, componentIndex) => {
            const deserializedComponent =
              deserializedPage.elements[componentIndex];

            // Verify component structure
            expect(deserializedComponent.id).toBe(originalComponent.id);
            expect(deserializedComponent.type).toBe(originalComponent.type);
            expect(deserializedComponent.zIndex).toBe(originalComponent.zIndex);

            // Verify layout exists
            expect(deserializedComponent.layout).toBeDefined();
            expect(deserializedComponent.layout.position).toBeDefined();
            expect(deserializedComponent.layout.size).toBeDefined();
          });
        });
      }),
      propertyTestParams()
    );
  });
});
