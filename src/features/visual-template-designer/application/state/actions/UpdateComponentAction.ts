/**
 * UpdateComponentAction - Updates properties of an existing component
 * 
 * This action updates one or more properties of a component.
 * It stores the previous values to enable undo.
 * 
 * Requirements:
 * - Requirement 5.16: Layout property application
 */

import type { TemplateAction, TemplateState } from '../types';
import type { TemplateComponent } from '../../../domain/types';

export class UpdateComponentAction implements TemplateAction {
  type: 'UPDATE_COMPONENT' = 'UPDATE_COMPONENT';
  description: string;
  timestamp: Date;

  private componentId: string;
  private updates: Partial<TemplateComponent>;
  private previousValues: Partial<TemplateComponent> | null = null;
  private pageId: string | null = null;

  constructor(componentId: string, updates: Partial<TemplateComponent>) {
    this.componentId = componentId;
    this.updates = updates;
    this.description = `Update component ${componentId}`;
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

    // Store previous values for undo (only for keys being updated)
    if (this.previousValues === null) {
      this.previousValues = {};
      this.pageId = page.id;
      
      Object.keys(this.updates).forEach(key => {
        this.previousValues![key as keyof TemplateComponent] = 
          component[key as keyof TemplateComponent] as any;
      });
    }

    // Create updated component
    const updatedComponent: TemplateComponent = {
      ...component,
      ...this.updates,
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
    if (!state.current || !this.previousValues) {
      throw new Error('Cannot undo: no previous values stored');
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

    // Restore previous values
    const restoredComponent: TemplateComponent = {
      ...component,
      ...this.previousValues,
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
