/**
 * MoveComponentAction - Moves a component to a new position
 * 
 * This action updates the position of a component on the canvas.
 * 
 * Requirements:
 * - Requirement 1.4: Move component by dragging
 * - Requirement 18.8: Move component with arrow keys
 */

import type { TemplateAction, TemplateState } from '../types';
import type { Position } from '../../../domain/types';

export class MoveComponentAction implements TemplateAction {
  type: 'MOVE_COMPONENT' = 'MOVE_COMPONENT';
  description: string;
  timestamp: Date;

  private componentId: string;
  private newPosition: Position;
  private previousPosition: Position | null = null;

  constructor(componentId: string, newPosition: Position) {
    this.componentId = componentId;
    this.newPosition = newPosition;
    this.description = `Move component ${componentId}`;
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

    // Store previous position for undo
    if (this.previousPosition === null) {
      this.previousPosition = { ...component.layout.position };
    }

    // Create updated component with new position
    const updatedComponent = {
      ...component,
      layout: {
        ...component.layout,
        position: this.newPosition,
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
    if (!state.current || !this.previousPosition) {
      throw new Error('Cannot undo: no previous position stored');
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

    // Restore previous position
    const restoredComponent = {
      ...component,
      layout: {
        ...component.layout,
        position: this.previousPosition,
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
