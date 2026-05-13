/**
 * DuplicateComponentAction - Duplicates an existing component
 * 
 * This action creates a copy of a component with a new ID and slightly offset position.
 * 
 * Requirements:
 * - Requirement 18.7: Duplicate component with Ctrl+D
 */

import type { TemplateAction, TemplateState } from '../types';
import type { TemplateComponent } from '../../../domain/types';
import { v4 as uuidv4 } from 'uuid';

export class DuplicateComponentAction implements TemplateAction {
  type: 'DUPLICATE_COMPONENT' = 'DUPLICATE_COMPONENT';
  description: string;
  timestamp: Date;

  private componentId: string;
  private duplicatedComponent: TemplateComponent | null = null;
  private pageId: string | null = null;

  constructor(componentId: string) {
    this.componentId = componentId;
    this.description = `Duplicate component ${componentId}`;
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

    // Calculate highest z-index on the page
    const maxZIndex = Math.max(...page.elements.map(el => el.zIndex));

    // Create duplicate with new ID, offset position, and highest z-index
    const duplicate: TemplateComponent = {
      ...component,
      id: uuidv4(),
      layout: {
        ...component.layout,
        position: {
          ...component.layout.position,
          x: component.layout.position.x + 10, // Offset by 10 units
          y: component.layout.position.y + 10,
        },
      },
      zIndex: maxZIndex + 1,
    };

    // Store duplicate for undo
    if (this.duplicatedComponent === null) {
      this.duplicatedComponent = duplicate;
      this.pageId = page.id;
    }

    // Add duplicate to page
    const newElements = [...page.elements, duplicate];

    // Create new pages array with updated page
    const newPages = [...state.current.pages];
    newPages[foundPageIndex] = {
      ...page,
      elements: newElements,
    };

    // Return new state with updated template and select the duplicate
    return {
      ...state,
      current: {
        ...state.current,
        pages: newPages,
        updatedAt: new Date(),
      },
      selectedComponentId: duplicate.id,
      isDirty: true,
    };
  }

  undo(state: TemplateState): TemplateState {
    if (!state.current || !this.duplicatedComponent || !this.pageId) {
      throw new Error('Cannot undo: no duplicated component data stored');
    }

    // Find the page
    const pageIndex = state.current.pages.findIndex(p => p.id === this.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page ${this.pageId} not found`);
    }

    const page = state.current.pages[pageIndex];

    // Remove the duplicate
    const newElements = page.elements.filter(
      el => el.id !== this.duplicatedComponent!.id
    );

    // Create new pages array with updated page
    const newPages = [...state.current.pages];
    newPages[pageIndex] = {
      ...page,
      elements: newElements,
    };

    // Clear selection if duplicate was selected
    const newSelectedComponentId = state.selectedComponentId === this.duplicatedComponent.id
      ? null
      : state.selectedComponentId;

    // Return new state with updated template
    return {
      ...state,
      current: {
        ...state.current,
        pages: newPages,
        updatedAt: new Date(),
      },
      selectedComponentId: newSelectedComponentId,
      isDirty: true,
    };
  }
}
