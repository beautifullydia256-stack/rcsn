/**
 * CutComponentAction - Cuts a component (copy + delete)
 * 
 * This action copies a component to clipboard and removes it from the template.
 * 
 * Requirements:
 * - Requirement 18: Keyboard shortcuts
 */

import type { TemplateAction, TemplateState } from '../types';
import type { TemplateComponent } from '../../../domain/types';

export class CutComponentAction implements TemplateAction {
  type: 'CUT_COMPONENT' = 'CUT_COMPONENT';
  description: string;
  timestamp: Date;

  private componentId: string;
  private cutComponent: TemplateComponent | null = null;
  private pageId: string | null = null;
  private componentIndex: number = -1;
  private previousClipboard: TemplateComponent | null = null;

  constructor(componentId: string) {
    this.componentId = componentId;
    this.description = `Cut component ${componentId}`;
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

    // Store component data and previous clipboard for undo
    if (this.cutComponent === null) {
      this.cutComponent = component;
      this.pageId = page.id;
      this.componentIndex = foundComponentIndex;
      this.previousClipboard = state.clipboard;
    }

    // Remove component from page
    const newElements = page.elements.filter(el => el.id !== this.componentId);

    // Create new pages array with updated page
    const newPages = [...state.current.pages];
    newPages[foundPageIndex] = {
      ...page,
      elements: newElements,
    };

    // Clear selection if cut component was selected
    const newSelectedComponentId = state.selectedComponentId === this.componentId
      ? null
      : state.selectedComponentId;

    const newSelectedComponentIds = state.selectedComponentIds.filter(
      id => id !== this.componentId
    );

    // Return new state with updated template and component in clipboard
    return {
      ...state,
      current: {
        ...state.current,
        pages: newPages,
        updatedAt: new Date(),
      },
      selectedComponentId: newSelectedComponentId,
      selectedComponentIds: newSelectedComponentIds,
      clipboard: { ...component },
      isDirty: true,
    };
  }

  undo(state: TemplateState): TemplateState {
    if (!state.current || !this.cutComponent || !this.pageId) {
      throw new Error('Cannot undo: no cut component data stored');
    }

    // Find the page
    const pageIndex = state.current.pages.findIndex(p => p.id === this.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page ${this.pageId} not found`);
    }

    const page = state.current.pages[pageIndex];

    // Restore component at original index
    const newElements = [...page.elements];
    newElements.splice(this.componentIndex, 0, this.cutComponent);

    // Create new pages array with updated page
    const newPages = [...state.current.pages];
    newPages[pageIndex] = {
      ...page,
      elements: newElements,
    };

    // Return new state with updated template and restored clipboard
    return {
      ...state,
      current: {
        ...state.current,
        pages: newPages,
        updatedAt: new Date(),
      },
      clipboard: this.previousClipboard,
      isDirty: true,
    };
  }
}
