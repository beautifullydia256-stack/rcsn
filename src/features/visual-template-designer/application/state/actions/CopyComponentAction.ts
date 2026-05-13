/**
 * CopyComponentAction - Copies a component to clipboard
 * 
 * This action stores a component in the clipboard for pasting.
 * 
 * Requirements:
 * - Requirement 18.3: Copy component with Ctrl+C
 */

import type { TemplateAction, TemplateState } from '../types';
import type { TemplateComponent } from '../../../domain/types';

export class CopyComponentAction implements TemplateAction {
  type: 'COPY_COMPONENT' = 'COPY_COMPONENT';
  description: string;
  timestamp: Date;

  private componentId: string;
  private previousClipboard: TemplateComponent | null = null;

  constructor(componentId: string) {
    this.componentId = componentId;
    this.description = `Copy component ${componentId}`;
    this.timestamp = new Date();
  }

  execute(state: TemplateState): TemplateState {
    if (!state.current) {
      throw new Error('No template loaded');
    }

    // Find the component across all pages
    let foundComponent: TemplateComponent | null = null;

    for (const page of state.current.pages) {
      const component = page.elements.find(el => el.id === this.componentId);
      if (component) {
        foundComponent = component;
        break;
      }
    }

    if (!foundComponent) {
      throw new Error(`Component ${this.componentId} not found`);
    }

    // Store previous clipboard for undo
    if (this.previousClipboard === null) {
      this.previousClipboard = state.clipboard;
    }

    // Copy component to clipboard
    return {
      ...state,
      clipboard: { ...foundComponent },
    };
  }

  undo(state: TemplateState): TemplateState {
    // Restore previous clipboard
    return {
      ...state,
      clipboard: this.previousClipboard,
    };
  }
}
