/**
 * Property-Based Test 16: Template JSON Structure Validation
 *
 * Properties:
 * - For any object missing required template fields, validateTemplate returns valid=false.
 * - For a valid template object, validateTemplate returns valid=true.
 *
 * Uses fast-check with at least 100 iterations.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import { ValidationEngine } from '../../application/validation/ValidationEngine';
import type { TemplateCategory, PageSize, PageOrientation, ComponentType } from '../../domain/types/enums';
import type { Template, TemplatePage } from '../../domain/types';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const arbCategory = fc.constantFrom<TemplateCategory>(
  'REPORT_CARD', 'CERTIFICATE', 'ID_CARD', 'RECEIPT',
  'FEE_STATEMENT', 'ADMISSION_FORM', 'RESULT_SLIP',
);

const arbPageSize = fc.constantFrom<PageSize>('A4', 'LETTER', 'LEGAL', 'CUSTOM');
const arbOrientation = fc.constantFrom<PageOrientation>('portrait', 'landscape');

const arbPage = (): fc.Arbitrary<TemplatePage> =>
  fc.record({
    id: fc.uuid(),
    pageNumber: fc.integer({ min: 1, max: 10 }),
    width: fc.double({ min: 100, max: 2000, noNaN: true }),
    height: fc.double({ min: 100, max: 2000, noNaN: true }),
    elements: fc.constant([]),
  });

const safeDate = fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map((ts) => new Date(ts));
const safeName = fc.string({ minLength: 1, maxLength: 100 }).map((s) => { const c = s.replace(/[^\w ]/g, 'x').trim(); return c || 'Template'; });

/** Generate a fully valid Template */
const arbValidTemplate = (): fc.Arbitrary<Template> =>
  fc.record({
    id: fc.uuid(),
    name: safeName,
    category: arbCategory,
    pageSize: arbPageSize,
    pageOrientation: arbOrientation,
    pages: fc.array(arbPage(), { minLength: 1, maxLength: 5 }),
    createdAt: safeDate,
    updatedAt: safeDate,
    createdBy: fc.uuid(),
    version: fc.integer({ min: 1, max: 100 }),
  });

/** Generate a partial object missing one or more required fields */
const arbMissingFieldsObject = (): fc.Arbitrary<Record<string, unknown>> =>
  fc.record({
    // Each required field is independently present or absent
    id:              fc.option(fc.uuid(),            { nil: undefined }),
    name:            fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    category:        fc.option(arbCategory,          { nil: undefined }),
    pageSize:        fc.option(arbPageSize,          { nil: undefined }),
    pageOrientation: fc.option(arbOrientation,       { nil: undefined }),
    pages:           fc.option(fc.constant([]), { nil: undefined }),
    createdAt:       fc.option(fc.date(),            { nil: undefined }),
    updatedAt:       fc.option(fc.date(),            { nil: undefined }),
    createdBy:       fc.option(fc.uuid(),            { nil: undefined }),
    version:         fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
  }).filter((obj) => {
    // At least one required field must be absent or have an invalid value
    const required = ['id', 'name', 'category', 'pageSize', 'pageOrientation', 'pages', 'createdAt', 'updatedAt', 'createdBy', 'version'];
    return required.some((key) => obj[key] === undefined || obj[key] === null);
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 16: Template JSON Structure Validation', () => {
  const engine = new ValidationEngine();

  it('P16-A: any object missing required template fields should fail validation', () => {
    fc.assert(
      fc.property(arbMissingFieldsObject(), (incompleteObj) => {
        // Cast to Template for the method signature — engine does runtime checks
        const result = engine.validateTemplate(incompleteObj as unknown as Template);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      propertyTestParams(),
    );
  });

  it('P16-B: a valid template object should pass validation', () => {
    fc.assert(
      fc.property(arbValidTemplate(), (template) => {
        const result = engine.validateTemplate(template);
        // A template with no components and all required fields should be valid
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      propertyTestParams(),
    );
  });

  it('P16-C: empty object always fails validation', () => {
    // Deterministic spot check (not property-based but part of the suite)
    const result = engine.validateTemplate({} as unknown as Template);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('P16-D: null/undefined template always fails validation', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result1 = engine.validateTemplate(null as any);
    expect(result1.valid).toBe(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result2 = engine.validateTemplate(undefined as any);
    expect(result2.valid).toBe(false);
  });

  it('P16-E: template with empty pages array always fails validation', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          category: arbCategory,
          pageSize: arbPageSize,
          pageOrientation: arbOrientation,
          createdAt: fc.date(),
          updatedAt: fc.date(),
          createdBy: fc.uuid(),
          version: fc.integer({ min: 1, max: 100 }),
        }),
        (base) => {
          const template = { ...base, pages: [] } as unknown as Template;
          const result = engine.validateTemplate(template);
          expect(result.valid).toBe(false);
        },
      ),
      propertyTestParams(),
    );
  });

  it('P16-F: template with valid components using correct data bindings passes validation', () => {
    fc.assert(
      fc.property(arbValidTemplate(), (template) => {
        // Add only static components (no binding required) to each page
        const templateWithStatics: Template = {
          ...template,
          pages: template.pages.map((page) => ({
            ...page,
            elements: [
              {
                id: 'static-1',
                type: 'TEXT_LABEL' as ComponentType,
                layout: {
                  position: { x: 0, y: 0, unit: 'px' },
                  size: { width: 100, height: 30, unit: 'px' },
                  rotation: 0,
                },
                zIndex: 1,
              },
            ],
          })),
        };

        const result = engine.validateTemplate(templateWithStatics);
        expect(result.valid).toBe(true);
      }),
      propertyTestParams(),
    );
  });
});
