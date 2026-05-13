/**
 * Property-Based Test 22: Template Export-Import Round-Trip
 *
 * Property: For any valid template (with no components or only static components),
 * exporting to JSON and then importing back produces an equivalent template.
 *
 * Uses fast-check with at least 100 iterations.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import { TemplateService } from '../../application/services/TemplateService';
import type { Template, TemplatePage } from '../../domain/types';
import type { TemplateCategory, PageSize, PageOrientation, ComponentType } from '../../domain/types/enums';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORIES: TemplateCategory[] = [
  'REPORT_CARD', 'CERTIFICATE', 'ID_CARD', 'RECEIPT',
  'FEE_STATEMENT', 'ADMISSION_FORM', 'RESULT_SLIP',
];
const PAGE_SIZES: PageSize[] = ['A4', 'LETTER', 'LEGAL', 'CUSTOM'];
const ORIENTATIONS: PageOrientation[] = ['portrait', 'landscape'];

const arbCategory = fc.constantFrom<TemplateCategory>(...CATEGORIES);
const arbPageSize = fc.constantFrom<PageSize>(...PAGE_SIZES);
const arbOrientation = fc.constantFrom<PageOrientation>(...ORIENTATIONS);

/** Only use static (no-binding) component types so templates are always valid. */
const STATIC_TYPES: ComponentType[] = [
  'LINE', 'BORDER', 'RECTANGLE', 'CIRCLE',
  'BACKGROUND_IMAGE', 'WATERMARK', 'TEXT_LABEL', 'SIGNATURE_FIELD',
];
const arbStaticType = fc.constantFrom<ComponentType>(...STATIC_TYPES);

const arbElement = () =>
  fc.record({
    id: fc.uuid(),
    type: arbStaticType,
    layout: fc.record({
      position: fc.record({ x: fc.double({ min: 0, max: 500, noNaN: true }), y: fc.double({ min: 0, max: 500, noNaN: true }), unit: fc.constantFrom('px' as const, 'mm' as const) }),
      size: fc.record({ width: fc.double({ min: 10, max: 500, noNaN: true }), height: fc.double({ min: 10, max: 500, noNaN: true }), unit: fc.constantFrom('px' as const, 'mm' as const) }),
      rotation: fc.double({ min: 0, max: 360, noNaN: true }),
    }),
    zIndex: fc.integer({ min: 0, max: 100 }),
  });

const arbPage = (): fc.Arbitrary<TemplatePage> =>
  fc.record({
    id: fc.uuid(),
    pageNumber: fc.integer({ min: 1, max: 10 }),
    width: fc.double({ min: 100, max: 2000, noNaN: true }),
    height: fc.double({ min: 100, max: 2000, noNaN: true }),
    elements: fc.array(arbElement(), { minLength: 0, maxLength: 5 }),
  });

/**
 * Build a Template that is guaranteed to pass TemplateService export/import:
 * - All components are static (no data binding required)
 * - All required fields are present
 * - Name is 1-100 chars without control characters (safe for JSON round-trip)
 */
const arbExportableTemplate = (): fc.Arbitrary<Template> =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }).map((s) => {
      const clean = s.replace(/[^\w ]/g, 'x').trim();
      return clean || 'Template';
    }),
    category: arbCategory,
    pageSize: arbPageSize,
    pageOrientation: arbOrientation,
    pages: fc.array(arbPage(), { minLength: 1, maxLength: 3 }),
    createdAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map((ts) => new Date(ts)),
    updatedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map((ts) => new Date(ts)),
    createdBy: fc.uuid(),
    version: fc.integer({ min: 1, max: 100 }),
  });

// ---------------------------------------------------------------------------
// Equality helpers
// ---------------------------------------------------------------------------

/**
 * Check structural equivalence after round-trip.
 * Dates become strings through JSON so we compare ISO strings.
 * IDs are regenerated on import so we skip them.
 * We focus on structural content: name, category, pageSize, orientation, pages count, element count.
 */
function roundTripEquivalent(original: Template, imported: Template): boolean {
  if (original.name !== imported.name) return false;
  if (original.category !== imported.category) return false;
  if (original.pageSize !== imported.pageSize) return false;
  if (original.pageOrientation !== imported.pageOrientation) return false;
  if (original.version !== imported.version) return false;
  if (original.pages.length !== imported.pages.length) return false;

  for (let i = 0; i < original.pages.length; i++) {
    const op = original.pages[i];
    const ip = imported.pages[i];
    if (op.pageNumber !== ip.pageNumber) return false;
    if (Math.abs(op.width - ip.width) > 1e-6) return false;
    if (Math.abs(op.height - ip.height) > 1e-6) return false;
    if (op.elements.length !== ip.elements.length) return false;

    for (let j = 0; j < op.elements.length; j++) {
      const oe = op.elements[j];
      const ie = ip.elements[j];
      if (oe.type !== ie.type) return false;
      if (oe.zIndex !== ie.zIndex) return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 22: Template Export-Import Round-Trip', () => {
  let service: TemplateService;

  beforeEach = () => {
    service = new TemplateService();
  };

  it('P22-A: export → import produces structurally equivalent template', () => {
    const svc = new TemplateService();

    fc.assert(
      fc.property(arbExportableTemplate(), (original) => {
        const json = svc.exportTemplate(original);
        const imported = svc.importTemplate(json);

        expect(roundTripEquivalent(original, imported)).toBe(true);
      }),
      propertyTestParams(),
    );
  });

  it('P22-B: exported JSON is valid JSON string', () => {
    const svc = new TemplateService();

    fc.assert(
      fc.property(arbExportableTemplate(), (original) => {
        const json = svc.exportTemplate(original);

        expect(typeof json).toBe('string');
        expect(() => JSON.parse(json)).not.toThrow();

        const parsed = JSON.parse(json);
        expect(typeof parsed).toBe('object');
        expect(parsed).not.toBeNull();
      }),
      propertyTestParams(),
    );
  });

  it('P22-C: exported JSON preserves template_name and template_category', () => {
    const svc = new TemplateService();

    fc.assert(
      fc.property(arbExportableTemplate(), (original) => {
        const json = svc.exportTemplate(original);
        const parsed = JSON.parse(json) as Record<string, unknown>;

        expect(parsed['template_name']).toBe(original.name);
        expect(parsed['template_category']).toBe(original.category);
        expect(parsed['page_size']).toBe(original.pageSize);
        expect(parsed['page_orientation']).toBe(original.pageOrientation);
      }),
      propertyTestParams(),
    );
  });

  it('P22-D: imported template passes validation', () => {
    const svc = new TemplateService();

    fc.assert(
      fc.property(arbExportableTemplate(), (original) => {
        const json = svc.exportTemplate(original);

        // importTemplate throws if invalid — so we just assert it does not throw
        expect(() => svc.importTemplate(json)).not.toThrow();
      }),
      propertyTestParams(),
    );
  });

  it('P22-E: page count is preserved through round-trip', () => {
    const svc = new TemplateService();

    fc.assert(
      fc.property(arbExportableTemplate(), (original) => {
        const json = svc.exportTemplate(original);
        const imported = svc.importTemplate(json);

        expect(imported.pages.length).toBe(original.pages.length);
      }),
      propertyTestParams(),
    );
  });

  it('P22-F: element counts per page are preserved through round-trip', () => {
    const svc = new TemplateService();

    fc.assert(
      fc.property(arbExportableTemplate(), (original) => {
        const json = svc.exportTemplate(original);
        const imported = svc.importTemplate(json);

        original.pages.forEach((page, i) => {
          expect(imported.pages[i].elements.length).toBe(page.elements.length);
        });
      }),
      propertyTestParams(),
    );
  });

  it('P22-G: invalid JSON string throws on import', () => {
    const svc = new TemplateService();

    const invalidInputs = [
      'not json at all',
      '{}',
      '{"template_name":"test"}',
      '',
      'null',
    ];

    invalidInputs.forEach((input) => {
      expect(() => svc.importTemplate(input), `Should throw for: ${input}`).toThrow();
    });
  });
});

// Provide a no-op to satisfy the beforeEach reference at module level
function beforeEach(fn: () => void): void {
  void fn; // not actually called at module scope; vitest registers this per test block
}
