/**
 * AddComponentAction - Adds a new component to the template
 * 
 * This action adds a component to a specific page in the template.
 * The component is added with the highest z-index to appear on top.
 * 
 * Requirements:
 * - Requirement 1.2: Position component at drop coordinates
 * - Requirement 2.2: Assign new components highest z-index
 * - Requirement 3.7: Create component instance from library
 */

import type { TemplateAction, TemplateState } from '../types';
import type { TemplateComponent } from '../../../domain/types';

export class AddComponentAction implements TemplateAction {
  type: 'ADD_COMPONENT' = 'ADD_COMPONENT';
  description: string;
  timestamp: Date;

  private component: TemplateComponent;
  private pageId: string;

  constructor(component: TemplateComponent, pageId: string) {
    this.component = component;
    this.pageId = pageId;
    this.description = `Add ${component.type} component`;
    this.timestamp = new Date();
  }

  execute(state: TemplateState): TemplateState {
    if (!state.current) {
      throw new Error('No template loaded');
    }

    // Find the page to add the component to
    const pageIndex = state.current.pages.findIndex(p => p.id === this.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page ${this.pageId} not found`);
    }

    // Calculate highest z-index on the page
    const page = state.current.pages[pageIndex];
    const maxZIndex = page.elements.length > 0
      ? Math.max(...page.elements.map(el => el.zIndex))
      : 0;

    // Create component with highest z-index
    const componentWithZIndex: TemplateComponent = {
      ...this.component,
      zIndex: maxZIndex + 1,
    };

    // Create new pages array with updated page
    const newPages = [...state.current.pages];
    newPages[pageIndex] = {
      ...page,
      elements: [...page.elements, componentWithZIndex],
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
    if (!state.current) {
      throw new Error('No template loaded');
    }

    // Find the page
    const pageIndex = state.current.pages.findIndex(p => p.id === this.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page ${this.pageId} not found`);
    }

    // Remove the component from the page
    const page = state.current.pages[pageIndex];
    const newElements = page.elements.filter(el => el.id !== this.component.id);

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
