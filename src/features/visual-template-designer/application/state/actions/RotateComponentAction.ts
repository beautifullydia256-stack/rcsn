/**
 * RotateComponentAction - Rotates a component
 * 
 * This action updates the rotation angle of a component.
 * Rotation is normalized to 0-360 degrees.
 * 
 * Requirements:
 * - Requirement 1.5: Rotate component between 0 and 360 degrees
 */

import type { TemplateAction, TemplateState } from '../types';

export class RotateComponentAction implements TemplateAction {
  type: 'ROTATE_COMPONENT' = 'ROTATE_COMPONENT';
  description: string;
  timestamp: Date;

  private componentId: string;
  private newRotation: number;
  private previousRotation: number | null = null;

  constructor(componentId: string, newRotation: number) {
    this.componentId = componentId;
    // Normalize rotation to 0-360 degrees
    this.newRotation = ((newRotation % 360) + 360) % 360;
    this.description = `Rotate component ${componentId} to ${this.newRotation}°`;
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

    // Store previous rotation for undo
    if (this.previousRotation === null) {
      this.previousRotation = component.layout.rotation;
    }

    // Create updated component with new rotation
    const updatedComponent = {
      ...component,
      layout: {
        ...component.layout,
        rotation: this.newRotation,
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
    if (!state.current || this.previousRotation === null) {
      throw new Error('Cannot undo: no previous rotation stored');
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

    // Restore previous rotation
    const restoredComponent = {
      ...component,
      layout: {
        ...component.layout,
        rotation: this.previousRotation,
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
