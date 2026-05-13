/**
 * Visual Template Designer - Page Management
 *
 * Pure functions for multi-page template operations.
 * All functions return new objects — no mutation.
 */

import type { Template, TemplatePage } from '../types';

/**
 * Creates a blank new page with sequential numbering based on existing pages.
 * The caller is responsible for providing a unique id when needed; this helper
 * generates one via crypto.randomUUID (available in modern Node / browsers).
 */
export function createNewPage(pageNumber?: number, width = 794, height = 1123): TemplatePage {
  return {
    id: crypto.randomUUID(),
    pageNumber: pageNumber ?? 1,
    width,
    height,
    elements: [],
  };
}

/**
 * Adds a blank page to the end of the template's page list.
 * The new page inherits the same dimensions as the last existing page.
 * Returns a new Template — the original is not mutated.
 */
export function addPageToTemplate(template: Template): Template {
  const lastPage = template.pages[template.pages.length - 1];
  const newPage = createNewPage(
    template.pages.length + 1,
    lastPage?.width ?? 794,
    lastPage?.height ?? 1123,
  );

  return {
    ...template,
    pages: [...template.pages, newPage],
    updatedAt: new Date(),
  };
}

/**
 * Removes the page identified by `pageId` from the template.
 * Throws if the template has only one page (must keep at least one).
 * Re-numbers remaining pages to stay 1-indexed and contiguous.
 */
export function removePageFromTemplate(template: Template, pageId: string): Template {
  if (template.pages.length <= 1) {
    throw new Error('Cannot remove the last remaining page from a template.');
  }

  const remaining = template.pages.filter((p) => p.id !== pageId);

  if (remaining.length === template.pages.length) {
    throw new Error(`Page with id "${pageId}" not found in template.`);
  }

  // Re-number pages to keep them contiguous from 1
  const renumbered = remaining.map((page, index) => ({
    ...page,
    pageNumber: index + 1,
  }));

  return {
    ...template,
    pages: renumbered,
    updatedAt: new Date(),
  };
}

/**
 * Reorders pages according to the supplied `pageIds` array.
 * Every id in the template must appear exactly once in `pageIds`.
 * Renumbers pages to match their new position (1-indexed).
 */
export function reorderTemplatePages(template: Template, pageIds: string[]): Template {
  if (pageIds.length !== template.pages.length) {
    throw new Error('pageIds length must match the number of pages in the template.');
  }

  const pageMap = new Map(template.pages.map((p) => [p.id, p]));

  const reordered = pageIds.map((id, index) => {
    const page = pageMap.get(id);
    if (!page) {
      throw new Error(`Page with id "${id}" not found in template.`);
    }
    return { ...page, pageNumber: index + 1 };
  });

  return {
    ...template,
    pages: reordered,
    updatedAt: new Date(),
  };
}
