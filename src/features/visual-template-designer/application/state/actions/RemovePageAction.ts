/**
 * RemovePageAction - Removes a page from the template
 * 
 * This action deletes a page and all its components.
 * 
 * Requirements:
 * - Requirement 12.2: Remove pages from template
 */

import type { TemplateAction, TemplateState } from '../types';
import type { TemplatePage } from '../../../domain/types';

export class RemovePageAction implements TemplateAction {
  type: 'REMOVE_PAGE' = 'REMOVE_PAGE';
  description: string;
  timestamp: Date;

  private pageId: string;
  private removedPage: TemplatePage | null = null;
  private pageIndex: number = -1;

  constructor(pageId: string) {
    this.pageId = pageId;
    this.description = `Remove page ${pageId}`;
    this.timestamp = new Date();
  }

  execute(state: TemplateState): TemplateState {
    if (!state.current) {
      throw new Error('No template loaded');
    }

    if (state.current.pages.length === 1) {
      throw new Error('Cannot remove the last page');
    }

    // Find the page
    const pageIndex = state.current.pages.findIndex(p => p.id === this.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page ${this.pageId} not found`);
    }

    // Store page data for undo
    if (this.removedPage === null) {
      this.removedPage = state.current.pages[pageIndex];
      this.pageIndex = pageIndex;
    }

    // Remove page
    const newPages = state.current.pages.filter(p => p.id !== this.pageId);

    // Renumber remaining pages
    const renumberedPages = newPages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
    }));

    // Determine new current page
    const newCurrentPageId = state.currentPageId === this.pageId
      ? (renumberedPages[0]?.id || null)
      : state.currentPageId;

    // Return new state with updated template
    return {
      ...state,
      current: {
        ...state.current,
        pages: renumberedPages,
        updatedAt: new Date(),
      },
      currentPageId: newCurrentPageId,
      isDirty: true,
    };
  }

  undo(state: TemplateState): TemplateState {
    if (!state.current || !this.removedPage) {
      throw new Error('Cannot undo: no removed page data stored');
    }

    // Restore page at original index
    const newPages = [...state.current.pages];
    newPages.splice(this.pageIndex, 0, this.removedPage);

    // Renumber pages
    const renumberedPages = newPages.map((page, index) => ({
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
