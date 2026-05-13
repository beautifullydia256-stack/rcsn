/**
 * Unit Tests: ValidationEngine
 *
 * Covers:
 * - INVALID_COMPONENT_TYPE error
 * - MISSING_DATA_BINDING error for dynamic components
 * - LAYOUT_OUT_OF_RANGE error
 * - CATEGORY_INCOMPATIBLE error
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ValidationEngine,
  ERROR_CODES,
} from '../../application/validation/ValidationEngine';
import type { TemplateComponent, LayoutProperties } from '../../domain/types';
import type { TemplateCategory, ComponentType } from '../../domain/types/enums';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLayout(overrides: Partial<LayoutProperties> = {}): LayoutProperties {
  return {
    position: { x: 0, y: 0, unit: 'px' },
    size: { width: 100, height: 50, unit: 'px' },
    rotation: 0,
    ...overrides,
  };
}

function makeComponent(
  type: ComponentType,
  overrides: Partial<TemplateComponent> = {},
): TemplateComponent {
  return {
    id: 'test-id-1',
    type,
    layout: makeLayout(),
    zIndex: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ValidationEngine', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    engine = new ValidationEngine();
  });

  // -------------------------------------------------------------------------
  // validateComponent – INVALID_COMPONENT_TYPE
  // -------------------------------------------------------------------------

  describe('validateComponent – INVALID_COMPONENT_TYPE', () => {
    it('returns INVALID_COMPONENT_TYPE error when component type is not a known type', () => {
      const component = makeComponent('UNKNOWN_TYPE' as ComponentType);
      const result = engine.validateComponent(component, 'REPORT_CARD');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === ERROR_CODES.INVALID_COMPONENT_TYPE)).toBe(true);
    });

    it('returns no INVALID_COMPONENT_TYPE error for a valid component type', () => {
      const component = makeComponent('TEXT_LABEL');
      const result = engine.validateComponent(component, 'REPORT_CARD');

      const typeErrors = result.errors.filter((e) => e.code === ERROR_CODES.INVALID_COMPONENT_TYPE);
      expect(typeErrors).toHaveLength(0);
    });

    it('includes the invalid type name in the error message', () => {
      const component = makeComponent('FAKE_COMPONENT' as ComponentType);
      const result = engine.validateComponent(component, 'REPORT_CARD');

      const typeError = result.errors.find((e) => e.code === ERROR_CODES.INVALID_COMPONENT_TYPE);
      expect(typeError?.message).toContain('FAKE_COMPONENT');
    });
  });

  // -------------------------------------------------------------------------
  // validateComponent – MISSING_DATA_BINDING
  // -------------------------------------------------------------------------

  describe('validateComponent – MISSING_DATA_BINDING', () => {
    it('returns MISSING_DATA_BINDING when a dynamic component has no dataBinding', () => {
      // STUDENT_NAME is a dynamic component (requires data binding)
      const component = makeComponent('STUDENT_NAME');
      // dataBinding is intentionally absent
      const result = engine.validateComponent(component, 'REPORT_CARD');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === ERROR_CODES.MISSING_DATA_BINDING)).toBe(true);
    });

    it('does NOT return MISSING_DATA_BINDING for static components without dataBinding', () => {
      // TEXT_LABEL is static – does not need data binding
      const component = makeComponent('TEXT_LABEL');
      const result = engine.validateComponent(component, 'REPORT_CARD');

      const bindingErrors = result.errors.filter(
        (e) => e.code === ERROR_CODES.MISSING_DATA_BINDING,
      );
      expect(bindingErrors).toHaveLength(0);
    });

    it('is valid when a dynamic component has a correct dataBinding', () => {
      const component = makeComponent('STUDENT_NAME', {
        dataBinding: { field: 'student.full_name' },
      });
      const result = engine.validateComponent(component, 'REPORT_CARD');

      const bindingErrors = result.errors.filter(
        (e) =>
          e.code === ERROR_CODES.MISSING_DATA_BINDING ||
          e.code === ERROR_CODES.INVALID_DATA_BINDING,
      );
      expect(bindingErrors).toHaveLength(0);
    });

    it('returns MISSING_DATA_BINDING for all dynamic component families', () => {
      const dynamicTypes: ComponentType[] = [
        'SCHOOL_LOGO',
        'SCHOOL_NAME',
        'STUDENT_NAME',
        'RESULTS_TABLE',
        'FEES_BALANCE',
      ];

      dynamicTypes.forEach((type) => {
        const component = makeComponent(type);
        const result = engine.validateComponent(component, 'REPORT_CARD');
        expect(
          result.errors.some((e) => e.code === ERROR_CODES.MISSING_DATA_BINDING),
          `Expected MISSING_DATA_BINDING for ${type}`,
        ).toBe(true);
      });
    });
  });

  // -------------------------------------------------------------------------
  // validateLayoutProperties – LAYOUT_OUT_OF_RANGE
  // -------------------------------------------------------------------------

  describe('validateLayoutProperties – LAYOUT_OUT_OF_RANGE', () => {
    it('returns LAYOUT_OUT_OF_RANGE when font size is below 6', () => {
      const layout = makeLayout({ font: { family: 'Arial', size: 4, weight: 'normal', style: 'normal' } });
      const result = engine.validateLayoutProperties(layout);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === ERROR_CODES.LAYOUT_OUT_OF_RANGE)).toBe(true);
    });

    it('returns LAYOUT_OUT_OF_RANGE when font size is above 72', () => {
      const layout = makeLayout({ font: { family: 'Arial', size: 80, weight: 'normal', style: 'normal' } });
      const result = engine.validateLayoutProperties(layout);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === ERROR_CODES.LAYOUT_OUT_OF_RANGE)).toBe(true);
    });

    it('accepts font size at the boundary values (6 and 72)', () => {
      const layout6 = makeLayout({ font: { family: 'Arial', size: 6, weight: 'normal', style: 'normal' } });
      expect(engine.validateLayoutProperties(layout6).valid).toBe(true);

      const layout72 = makeLayout({ font: { family: 'Arial', size: 72, weight: 'normal', style: 'normal' } });
      expect(engine.validateLayoutProperties(layout72).valid).toBe(true);
    });

    it('returns LAYOUT_OUT_OF_RANGE when border width exceeds 20', () => {
      const layout = makeLayout({ border: { width: 25, color: '#000000', style: 'solid' } });
      const result = engine.validateLayoutProperties(layout);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === ERROR_CODES.LAYOUT_OUT_OF_RANGE)).toBe(true);
    });

    it('returns LAYOUT_OUT_OF_RANGE when border width is negative', () => {
      const layout = makeLayout({ border: { width: -1, color: '#000000', style: 'solid' } });
      const result = engine.validateLayoutProperties(layout);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === ERROR_CODES.LAYOUT_OUT_OF_RANGE)).toBe(true);
    });

    it('returns LAYOUT_OUT_OF_RANGE when padding exceeds 50', () => {
      const layout = makeLayout({ spacing: { padding: 60, margin: 0 } });
      const result = engine.validateLayoutProperties(layout);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === ERROR_CODES.LAYOUT_OUT_OF_RANGE)).toBe(true);
    });

    it('returns LAYOUT_OUT_OF_RANGE when margin exceeds 50', () => {
      const layout = makeLayout({ spacing: { padding: 0, margin: 55 } });
      const result = engine.validateLayoutProperties(layout);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === ERROR_CODES.LAYOUT_OUT_OF_RANGE)).toBe(true);
    });

    it('returns LAYOUT_OUT_OF_RANGE when rotation exceeds 360', () => {
      const layout = makeLayout({ rotation: 400 });
      const result = engine.validateLayoutProperties(layout);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === ERROR_CODES.LAYOUT_OUT_OF_RANGE)).toBe(true);
    });

    it('returns LAYOUT_OUT_OF_RANGE when rotation is negative', () => {
      const layout = makeLayout({ rotation: -10 });
      const result = engine.validateLayoutProperties(layout);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === ERROR_CODES.LAYOUT_OUT_OF_RANGE)).toBe(true);
    });

    it('accepts valid layout properties without errors', () => {
      const layout = makeLayout({
        font: { family: 'Arial', size: 12, weight: 'normal', style: 'normal' },
        border: { width: 1, color: '#000000', style: 'solid' },
        spacing: { padding: 10, margin: 5 },
        rotation: 45,
      });
      const result = engine.validateLayoutProperties(layout);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // validateCategoryCompatibility – CATEGORY_INCOMPATIBLE
  // -------------------------------------------------------------------------

  describe('validateCategoryCompatibility – CATEGORY_INCOMPATIBLE', () => {
    it('returns CATEGORY_INCOMPATIBLE when RESULTS_TABLE is used in ID_CARD', () => {
      const component = makeComponent('RESULTS_TABLE');
      const result = engine.validateCategoryCompatibility(component, 'ID_CARD');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === ERROR_CODES.CATEGORY_INCOMPATIBLE)).toBe(true);
    });

    it('returns CATEGORY_INCOMPATIBLE when FEES_BALANCE is used in CERTIFICATE', () => {
      const component = makeComponent('FEES_BALANCE');
      const result = engine.validateCategoryCompatibility(component, 'CERTIFICATE');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === ERROR_CODES.CATEGORY_INCOMPATIBLE)).toBe(true);
    });

    it('does NOT return CATEGORY_INCOMPATIBLE when RESULTS_TABLE is used in REPORT_CARD', () => {
      const component = makeComponent('RESULTS_TABLE');
      const result = engine.validateCategoryCompatibility(component, 'REPORT_CARD');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('does NOT return CATEGORY_INCOMPATIBLE for static components in any category', () => {
      const categories: TemplateCategory[] = [
        'REPORT_CARD', 'CERTIFICATE', 'ID_CARD', 'RECEIPT',
        'FEE_STATEMENT', 'ADMISSION_FORM', 'RESULT_SLIP',
      ];
      categories.forEach((category) => {
        const component = makeComponent('TEXT_LABEL');
        const result = engine.validateCategoryCompatibility(component, category);
        expect(result.valid, `TEXT_LABEL should be valid in ${category}`).toBe(true);
      });
    });

    it('includes the component type and category in the error message', () => {
      const component = makeComponent('RESULTS_TABLE');
      const result = engine.validateCategoryCompatibility(component, 'ID_CARD');

      const err = result.errors.find((e) => e.code === ERROR_CODES.CATEGORY_INCOMPATIBLE);
      expect(err?.message).toContain('RESULTS_TABLE');
      expect(err?.message).toContain('ID_CARD');
    });
  });

  // -------------------------------------------------------------------------
  // validateTemplate – integration
  // -------------------------------------------------------------------------

  describe('validateTemplate – integration', () => {
    it('returns valid for a template with no components', () => {
      const template = {
        id: 'tpl-1',
        name: 'Test Template',
        category: 'REPORT_CARD' as TemplateCategory,
        pageSize: 'A4' as const,
        pageOrientation: 'portrait' as const,
        pages: [{ id: 'p1', pageNumber: 1, width: 595, height: 842, elements: [] }],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        version: 1,
      };
      const result = engine.validateTemplate(template);
      expect(result.valid).toBe(true);
    });

    it('aggregates errors from multiple components', () => {
      const template = {
        id: 'tpl-2',
        name: 'Multi-error Template',
        category: 'REPORT_CARD' as TemplateCategory,
        pageSize: 'A4' as const,
        pageOrientation: 'portrait' as const,
        pages: [
          {
            id: 'p1',
            pageNumber: 1,
            width: 595,
            height: 842,
            elements: [
              // Dynamic without binding
              makeComponent('STUDENT_NAME'),
              // Category incompatible
              makeComponent('FEES_BALANCE'),
            ],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        version: 1,
      };
      const result = engine.validateTemplate(template);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('returns invalid when template is missing required fields', () => {
      // @ts-expect-error intentionally malformed
      const result = engine.validateTemplate({});
      expect(result.valid).toBe(false);
    });
  });
});
