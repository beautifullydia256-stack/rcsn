/**
 * SendToBackAction - Sends a component to the back (lowest z-index)
 * 
 * This action sets the component's z-index lower than all other components on the page.
 * 
 * Requirements:
 * - Requirement 2.4: Send to back moves component to lowest z-index
 */

import type { TemplateAction, TemplateState } from '../types';

export class SendToBackAction implements TemplateAction {
  type: 'SEND_TO_BACK' = 'SEND_TO_BACK';
  description: string;
  timestamp: Date;

  private componentId: string;
  private previousZIndex: number | null = null;
  private pageId: string | null = null;

  constructor(componentId: string) {
    this.componentId = componentId;
    this.description = `Send component ${componentId} to back`;
    this.timestamp = new Date();
  }

  execute(state: TemplateState): TemplateState {
    if (!state.current) {
      throw new Error('No template loaded');
    }

    // Find the component across all pages
    let foundPageIndex = -1;
    let foundComponentIndex = -1;

    for (let i = 0; i < state.current.pages.length; i++) {
      const componentIndex = state.current.pages[i].elements.findIndex(
        el => el.id === this.componentId
      );
      if (componentIndex !== -1) {
        foundPageIndex = i;
        foundComponentIndex = componentIndex;
        break;
      }
    }

    if (foundPageIndex === -1 || foundComponentIndex === -1) {
      throw new Error(`Component ${this.componentId} not found`);
    }

    const page = state.current.pages[foundPageIndex];
    const component = page.elements[foundComponentIndex];

    // Store previous z-index for undo
    if (this.previousZIndex === null) {
      this.previousZIndex = component.zIndex;
      this.pageId = page.id;
    }

    // Calculate lowest z-index on the page
    const minZIndex = Math.min(...page.elements.map(el => el.zIndex));

    // Only update if not already at back
    if (component.zIndex <= minZIndex) {
      return state; // Already at back, no change needed
    }

    // Create updated component with lowest z-index
    const updatedComponent = {
      ...component,
      zIndex: minZIndex - 1,
    };

    // Create new elements array with updated component
    const newElements = [...page.elements];
    newElements[foundComponentIndex] = updatedComponent;

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
    if (!state.current || this.previousZIndex === null || !this.pageId) {
      throw new Error('Cannot undo: no previous z-index stored');
    }

    // Find the page
    const pageIndex = state.current.pages.findIndex(p => p.id === this.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page ${this.pageId} not found`);
    }

    const page = state.current.pages[pageIndex];
    const componentIndex = page.elements.findIndex(el => el.id === this.componentId);

    if (componentIndex === -1) {
      throw new Error(`Component ${this.componentId} not found`);
    }

    const component = page.elements[componentIndex];

    // Restore previous z-index
    const restoredComponent = {
      ...component,
      zIndex: this.previousZIndex,
    };

    // Create new elements array with restored component
    const newElements = [...page.elements];
    newElements[componentIndex] = restoredComponent;

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
