/**
 * ReorderPagesAction - Reorders pages in the template
 * 
 * This action changes the order of pages based on provided page IDs.
 * 
 * Requirements:
 * - Requirement 12.3: Reorder pages in template
 */

import type { TemplateAction, TemplateState } from '../types';

export class ReorderPagesAction implements TemplateAction {
  type: 'REORDER_PAGES' = 'REORDER_PAGES';
  description: string;
  timestamp: Date;

  private newPageOrder: string[];
  private previousPageOrder: string[] = [];

  constructor(newPageOrder: string[]) {
    this.newPageOrder = newPageOrder;
    this.description = 'Reorder pages';
    this.timestamp = new Date();
  }

  execute(state: TemplateState): TemplateState {
    if (!state.current) {
      throw new Error('No template loaded');
    }

    // Validate that all page IDs are present
    if (this.newPageOrder.length !== state.current.pages.length) {
      throw new Error('Page order must include all pages');
    }

    const allPagesPresent = this.newPageOrder.every(id =>
      state.current!.pages.some(p => p.id === id)
    );

    if (!allPagesPresent) {
      throw new Error('Invalid page IDs in new order');
    }

    // Store previous order for undo
    if (this.previousPageOrder.length === 0) {
      this.previousPageOrder = state.current.pages.map(p => p.id);
    }

    // Reorder pages
    const pageMap = new Map(state.current.pages.map(p => [p.id, p]));
    const reorderedPages = this.newPageOrder.map(id => pageMap.get(id)!);

    // Renumber pages
    const renumberedPages = reorderedPages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
    }));

    // Return new state with updated template
    return {
      ...state,
      current: {
        ...state.current,
        pages: renumberedPages,
        updatedAt: new Date(),
      },
      isDirty: true,
    };
  }

  undo(state: TemplateState): TemplateState {
    if (!state.current || this.previousPageOrder.length === 0) {
      throw new Error('Cannot undo: no previous page order stored');
    }

    // Restore previous order
    const pageMap = new Map(state.current.pages.map(p => [p.id, p]));
    const restoredPages = this.previousPageOrder.map(id => pageMap.get(id)!);

    // Renumber pages
    const renumberedPages = restoredPages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
    }));

    // Return new state with updated template
    return {
      ...state,
      current: {
        ...state.current,
        pages: renumberedPages,
        updatedAt: new Date(),
      },
      isDirty: true,
    };
  }
}
