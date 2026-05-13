/**
 * DuplicatePageAction - Duplicates an existing page
 * 
 * This action creates a copy of a page with all its components.
 * 
 * Requirements:
 * - Requirement 12: Multi-page support
 */

import type { TemplateAction, TemplateState } from '../types';
import type { TemplatePage } from '../../../domain/types';
import { v4 as uuidv4 } from 'uuid';

export class DuplicatePageAction implements TemplateAction {
  type: 'DUPLICATE_PAGE' = 'DUPLICATE_PAGE';
  description: string;
  timestamp: Date;

  private pageId: string;
  private duplicatedPage: TemplatePage | null = null;

  constructor(pageId: string) {
    this.pageId = pageId;
    this.description = `Duplicate page ${pageId}`;
    this.timestamp = new Date();
  }

  execute(state: TemplateState): TemplateState {
    if (!state.current) {
      throw new Error('No template loaded');
    }

    // Find the page to duplicate
    const pageIndex = state.current.pages.findIndex(p => p.id === this.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page ${this.pageId} not found`);
    }

    const originalPage = state.current.pages[pageIndex];

    // Create duplicate page with new IDs for page and all components
    const duplicatePage: TemplatePage = {
      id: uuidv4(),
      pageNumber: originalPage.pageNumber + 1,
      width: originalPage.width,
      height: originalPage.height,
      elements: originalPage.elements.map(el => ({
        ...el,
        id: uuidv4(),
      })),
    };

    // Store duplicate for undo
    if (this.duplicatedPage === null) {
      this.duplicatedPage = duplicatePage;
    }

    // Insert duplicate after original page
    const newPages = [
      ...state.current.pages.slice(0, pageIndex + 1),
      duplicatePage,
      ...state.current.pages.slice(pageIndex + 1),
    ];

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
      currentPageId: duplicatePage.id,
      isDirty: true,
    };
  }

  undo(state: TemplateState): TemplateState {
    if (!state.current || !this.duplicatedPage) {
      throw new Error('Cannot undo: no duplicated page data stored');
    }

    // Remove the duplicate page
    const newPages = state.current.pages.filter(
      p => p.id !== this.duplicatedPage!.id
    );

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
      currentPageId: this.pageId,
      isDirty: true,
    };
  }
}
