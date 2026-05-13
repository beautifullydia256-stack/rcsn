/**
 * GroupComponentsAction - Groups multiple components together
 * 
 * This action creates a group from selected components.
 * Grouped components can be moved and manipulated as a single unit.
 * 
 * Requirements:
 * - Requirement 21.2: Create group from selected components
 */

import type { TemplateAction, TemplateState } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class GroupComponentsAction implements TemplateAction {
  type: 'GROUP_COMPONENTS' = 'GROUP_COMPONENTS';
  description: string;
  timestamp: Date;

  private componentIds: string[];
  private groupId: string;
  private pageId: string | null = null;

  constructor(componentIds: string[]) {
    if (componentIds.length < 2) {
      throw new Error('At least 2 components required to create a group');
    }
    this.componentIds = componentIds;
    this.groupId = uuidv4();
    this.description = `Group ${componentIds.length} components`;
    this.timestamp = new Date();
  }

  execute(state: TemplateState): TemplateState {
    if (!state.current) {
      throw new Error('No template loaded');
    }

    // Find the page containing the components
    let foundPageIndex = -1;

    for (let i = 0; i < state.current.pages.length; i++) {
      const hasAllComponents = this.componentIds.every(id =>
        state.current!.pages[i].elements.some(el => el.id === id)
      );
      if (hasAllComponents) {
        foundPageIndex = i;
        break;
      }
    }

    if (foundPageIndex === -1) {
      throw new Error('Components not found on same page');
    }

    const page = state.current.pages[foundPageIndex];

    // Store page ID for undo
    if (this.pageId === null) {
      this.pageId = page.id;
    }

    // Update components with group ID
    const newElements = page.elements.map(el => {
      if (this.componentIds.includes(el.id)) {
        return {
          ...el,
          groupId: this.groupId,
        };
      }
      return el;
    });

    // Create new pages array with updated page
    const newPages = [...state.current.pages];
    newPages[foundPageIndex] = {
      ...page,
      elements: newElements,
    };

    // Return new state with updated template
    return {
      ...state,
      current: {
        ...state.current,
        pages: newPages,
        updatedAt: new Date(),
      },
      isDirty: true,
    };
  }

  undo(state: TemplateState): TemplateState {
    if (!state.current || !this.pageId) {
      throw new Error('Cannot undo: no page ID stored');
    }

    // Find the page
    const pageIndex = state.current.pages.findIndex(p => p.id === this.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page ${this.pageId} not found`);
    }

    const page = state.current.pages[pageIndex];

    // Remove group ID from components
    const newElements = page.elements.map(el => {
      if (el.groupId === this.groupId) {
        const { groupId, ...rest } = el;
        return rest;
      }
      return el;
    });

    // Create new pages array with updated page
    const newPages = [...state.current.pages];
    newPages[pageIndex] = {
      ...page,
      elements: newElements,
    };

    // Return new state with updated template
    return {
      ...state,
      current: {
        ...state.current,
        pages: newPages,
        updatedAt: new Date(),
      },
      isDirty: true,
    };
  }
}
