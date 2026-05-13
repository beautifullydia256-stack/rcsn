/**
 * PasteComponentAction - Pastes a component from clipboard
 * 
 * This action creates a new component from the clipboard with a new ID and offset position.
 * 
 * Requirements:
 * - Requirement 18.4: Paste component with Ctrl+V
 */

import type { TemplateAction, TemplateState } from '../types';
import type { TemplateComponent } from '../../../domain/types';
import { v4 as uuidv4 } from 'uuid';

export class PasteComponentAction implements TemplateAction {
  type: 'PASTE_COMPONENT' = 'PASTE_COMPONENT';
  description: string;
  timestamp: Date;

  private pageId: string;
  private pastedComponent: TemplateComponent | null = null;

  constructor(pageId: string) {
    this.pageId = pageId;
    this.description = 'Paste component';
    this.timestamp = new Date();
  }

  execute(state: TemplateState): TemplateState {
    if (!state.current) {
      throw new Error('No template loaded');
    }

    if (!state.clipboard) {
      throw new Error('Clipboard is empty');
    }

    // Find the target page
    const pageIndex = state.current.pages.findIndex(p => p.id === this.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page ${this.pageId} not found`);
    }

    const page = state.current.pages[pageIndex];

    // Calculate highest z-index on the page
    const maxZIndex = page.elements.length > 0
      ? Math.max(...page.elements.map(el => el.zIndex))
      : 0;

    // Create pasted component with new ID, offset position, and highest z-index
    const pastedComponent: TemplateComponent = {
      ...state.clipboard,
      id: uuidv4(),
      layout: {
        ...state.clipboard.layout,
        position: {
          ...state.clipboard.layout.position,
          x: state.clipboard.layout.position.x + 10, // Offset by 10 units
          y: state.clipboard.layout.position.y + 10,
        },
      },
      zIndex: maxZIndex + 1,
    };

    // Store pasted component for undo
    if (this.pastedComponent === null) {
      this.pastedComponent = pastedComponent;
    }

    // Add pasted component to page
    const newElements = [...page.elements, pastedComponent];

    // Create new pages array with updated page
    const newPages = [...state.current.pages];
    newPages[pageIndex] = {
      ...page,
      elements: newElements,
    };

    // Return new state with updated template and select the pasted component
    return {
      ...state,
      current: {
        ...state.current,
        pages: newPages,
        updatedAt: new Date(),
      },
      selectedComponentId: pastedComponent.id,
      isDirty: true,
    };
  }

  undo(state: TemplateState): TemplateState {
    if (!state.current || !this.pastedComponent) {
      throw new Error('Cannot undo: no pasted component data stored');
    }

    // Find the page
    const pageIndex = state.current.pages.findIndex(p => p.id === this.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page ${this.pageId} not found`);
    }

    const page = state.current.pages[pageIndex];

    // Remove the pasted component
    const newElements = page.elements.filter(
      el => el.id !== this.pastedComponent!.id
    );

    // Create new pages array with updated page
    const newPages = [...state.current.pages];
    newPages[pageIndex] = {
      ...page,
      elements: newElements,
    };

    // Clear selection if pasted component was selected
    const newSelectedComponentId = state.selectedComponentId === this.pastedComponent.id
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
