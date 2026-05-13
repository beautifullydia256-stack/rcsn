/**
 * Property 19: Page Removal Preservation
 *
 * For a template with n≥2 pages, removing a page results in n-1 pages
 * and the remaining pages are intact (same ids, same elements).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import { removePageFromTemplate } from '../../domain/models/pageManagement';
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

/** Template with at least 2 pages (needed to allow removal). */
const templateWith2PlusPages: fc.Arbitrary<Template> = fc
  .array(pageArb, { minLength: 2, maxLength: 10 })
  .map((pages) => pages.map((p, i) => ({ ...p, pageNumber: i + 1 })))
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

describe('Property 19 – Page Removal Preservation', () => {
  it('removing a page decreases the page count by exactly 1', () => {
    fc.assert(
      fc.property(
        templateWith2PlusPages,
        fc.integer({ min: 0, max: 9 }),
        (template, indexSeed) => {
          const index = indexSeed % template.pages.length;
          const pageId = template.pages[index].id;
          const n = template.pages.length;

          const result = removePageFromTemplate(template, pageId);
          expect(result.pages.length).toBe(n - 1);
        },
      ),
      propertyTestParams(),
    );
  });

  it('the removed page no longer appears in the result', () => {
    fc.assert(
      fc.property(
        templateWith2PlusPages,
        fc.integer({ min: 0, max: 9 }),
        (template, indexSeed) => {
          const index = indexSeed % template.pages.length;
          const pageId = template.pages[index].id;

          const result = removePageFromTemplate(template, pageId);
          const removedStillPresent = result.pages.some((p) => p.id === pageId);
          expect(removedStillPresent).toBe(false);
        },
      ),
      propertyTestParams(),
    );
  });

  it('all remaining pages have their elements intact after removal', () => {
    fc.assert(
      fc.property(
        templateWith2PlusPages,
        fc.integer({ min: 0, max: 9 }),
        (template, indexSeed) => {
          const index = indexSeed % template.pages.length;
          const removedId = template.pages[index].id;

          const result = removePageFromTemplate(template, removedId);

          // Every page that was NOT removed should still be present with same elements
          for (const originalPage of template.pages) {
            if (originalPage.id === removedId) continue;
            const resultPage = result.pages.find((p) => p.id === originalPage.id);
            expect(resultPage).toBeDefined();
            expect(resultPage?.elements).toEqual(originalPage.elements);
          }
        },
      ),
      propertyTestParams(),
    );
  });

  it('remaining pages are renumbered contiguously from 1', () => {
    fc.assert(
      fc.property(
        templateWith2PlusPages,
        fc.integer({ min: 0, max: 9 }),
        (template, indexSeed) => {
          const index = indexSeed % template.pages.length;
          const pageId = template.pages[index].id;

          const result = removePageFromTemplate(template, pageId);

          result.pages.forEach((p, i) => {
            expect(p.pageNumber).toBe(i + 1);
          });
        },
      ),
      propertyTestParams(),
    );
  });

  it('original template is not mutated', () => {
    fc.assert(
      fc.property(
        templateWith2PlusPages,
        fc.integer({ min: 0, max: 9 }),
        (template, indexSeed) => {
          const index = indexSeed % template.pages.length;
          const pageId = template.pages[index].id;
          const originalPageCount = template.pages.length;

          removePageFromTemplate(template, pageId);
          expect(template.pages.length).toBe(originalPageCount);
        },
      ),
      propertyTestParams(),
    );
  });

  it('throws when attempting to remove the last page', () => {
    const singlePageTemplate: Template = {
      id: 'test',
      name: 'Single Page',
      category: 'REPORT_CARD',
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pages: [{ id: 'page-1', pageNumber: 1, width: 794, height: 1123, elements: [] }],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      version: 1,
    };
    expect(() => removePageFromTemplate(singlePageTemplate, 'page-1')).toThrow();
  });
});
