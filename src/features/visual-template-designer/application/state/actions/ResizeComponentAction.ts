/**
 * ResizeComponentAction - Resizes a component
 * 
 * This action updates the size of a component on the canvas.
 * 
 * Requirements:
 * - Requirement 1.3: Resize component with handles
 */

import type { TemplateAction, TemplateState } from '../types';
import type { Size } from '../../../domain/types';

export class ResizeComponentAction implements TemplateAction {
  type: 'RESIZE_COMPONENT' = 'RESIZE_COMPONENT';
  description: string;
  timestamp: Date;

  private componentId: string;
  private newSize: Size;
  private previousSize: Size | null = null;

  constructor(componentId: string, newSize: Size) {
    this.componentId = componentId;
    this.newSize = newSize;
    this.description = `Resize component ${componentId}`;
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

    // Store previous size for undo
    if (this.previousSize === null) {
      this.previousSize = { ...component.layout.size };
    }

    // Create updated component with new size
    const updatedComponent = {
      ...component,
      layout: {
        ...component.layout,
        size: this.newSize,
      },
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
    if (!state.current || !this.previousSize) {
      throw new Error('Cannot undo: no previous size stored');
    }

    // Find the component
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

    // Restore previous size
    const restoredComponent = {
      ...component,
      layout: {
        ...component.layout,
        size: this.previousSize,
      },
    };

    // Create new elements array with restored component
    const newElements = [...page.elements];
    newElements[foundComponentIndex] = restoredComponent;

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
}
