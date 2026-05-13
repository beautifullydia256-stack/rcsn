/**
 * Property 18: Page Addition Preservation
 *
 * For any template with n pages, adding a page results in n+1 pages and
 * all original page content is preserved (same ids, same elements).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import { addPageToTemplate } from '../../domain/models/pageManagement';
import type { Template, TemplatePage, TemplateComponent } from '../../domain/types';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const componentArb: fc.Arbitrary<TemplateComponent> = fc.record({
  id: fc.uuid(),
  type: fc.constant('TEXT_LABEL' as const),
  layout: fc.record({
    position: fc.record({
      x: fc.float({ min: 0, max: 800, noNaN: true }),
      y: fc.float({ min: 0, max: 1100, noNaN: true }),
      unit: fc.constant('px' as const),
    }),
    size: fc.record({
      width: fc.float({ min: 10, max: 300, noNaN: true }),
      height: fc.float({ min: 10, max: 300, noNaN: true }),
      unit: fc.constant('px' as const),
    }),
    rotation: fc.constant(0),
  }),
  zIndex: fc.integer({ min: 0, max: 100 }),
});

const pageArb: fc.Arbitrary<TemplatePage> = fc.record({
  id: fc.uuid(),
  pageNumber: fc.integer({ min: 1, max: 20 }),
  width: fc.constant(794),
  height: fc.constant(1123),
  elements: fc.array(componentArb, { minLength: 0, maxLength: 5 }),
});

const templateArb: fc.Arbitrary<Template> = fc
  .array(pageArb, { minLength: 1, maxLength: 10 })
  .map((pages) =>
    pages.map((p, i) => ({ ...p, pageNumber: i + 1 }))
  )
  .map(
    (pages): Template => ({
      id: 'test-template',
      name: 'Test Template',
      category: 'REPORT_CARD',
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pages,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      createdBy: 'user-1',
      version: 1,
    }),
  );

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Property 18 – Page Addition Preservation', () => {
  it('adding a page increases the page count by exactly 1', () => {
    fc.assert(
      fc.property(templateArb, (template) => {
        const n = template.pages.length;
        const result = addPageToTemplate(template);
        expect(result.pages.length).toBe(n + 1);
      }),
      propertyTestParams(),
    );
  });

  it('all original pages are present and their elements are intact after adding a page', () => {
    fc.assert(
      fc.property(templateArb, (template) => {
        const result = addPageToTemplate(template);

        // Every original page must still exist with the same elements
        for (const originalPage of template.pages) {
          const resultPage = result.pages.find((p) => p.id === originalPage.id);
          expect(resultPage).toBeDefined();
          expect(resultPage?.elements).toEqual(originalPage.elements);
        }
      }),
      propertyTestParams(),
    );
  });

  it('the new page is appended at the end with no elements', () => {
    fc.assert(
      fc.property(templateArb, (template) => {
        const result = addPageToTemplate(template);
        const newPage = result.pages[result.pages.length - 1];

        // The new page's id must not appear in the original
        const originalIds = new Set(template.pages.map((p) => p.id));
        expect(originalIds.has(newPage.id)).toBe(false);

        // The new page starts empty
        expect(newPage.elements).toHaveLength(0);
      }),
      propertyTestParams(),
    );
  });

  it('original template is not mutated', () => {
    fc.assert(
      fc.property(templateArb, (template) => {
        const originalPageCount = template.pages.length;
        addPageToTemplate(template);
        expect(template.pages.length).toBe(originalPageCount);
      }),
      propertyTestParams(),
    );
  });
});
