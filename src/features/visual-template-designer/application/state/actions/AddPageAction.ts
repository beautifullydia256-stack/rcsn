/**
 * AddPageAction - Adds a new page to the template
 * 
 * This action creates a new blank page in the template.
 * 
 * Requirements:
 * - Requirement 12.1: Add pages to template
 */

import type { TemplateAction, TemplateState } from '../types';
import type { TemplatePage } from '../../../domain/types';
import { v4 as uuidv4 } from 'uuid';

export class AddPageAction implements TemplateAction {
  type: 'ADD_PAGE' = 'ADD_PAGE';
  description: string;
  timestamp: Date;

  private newPage: TemplatePage | null = null;

  constructor() {
    this.description = 'Add new page';
    this.timestamp = new Date();
  }

  execute(state: TemplateState): TemplateState {
    if (!state.current) {
      throw new Error('No template loaded');
    }

    // Create new page
    const pageNumber = state.current.pages.length + 1;
    const firstPage = state.current.pages[0];

    const page: TemplatePage = {
      id: uuidv4(),
      pageNumber,
      width: firstPage.width,
      height: firstPage.height,
      elements: [],
    };

    // Store new page for undo
    if (this.newPage === null) {
      this.newPage = page;
    }

    // Add page to template
    const newPages = [...state.current.pages, page];

    // Return new state with updated template
    return {
      ...state,
      current: {
        ...state.current,
        pages: newPages,
        updatedAt: new Date(),
      },
      currentPageId: page.id,
      isDirty: true,
    };
  }

  undo(state: TemplateState): TemplateState {
    if (!state.current || !this.newPage) {
      throw new Error('Cannot undo: no new page data stored');
    }

    // Remove the new page
    const newPages = state.current.pages.filter(p => p.id !== this.newPage!.id);

    // Return new state with updated template
    return {
      ...state,
      current: {
        ...state.current,
        pages: newPages,
        updatedAt: new Date(),
      },
      currentPageId: newPages.length > 0 ? newPages[0].id : null,
      isDirty: true,
    };
  }
}
