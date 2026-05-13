/**
 * LoadTemplateAction - Loads a template into the editor
 * 
 * This action replaces the current template with a loaded template.
 * 
 * Requirements:
 * - Requirement 13.3: Load existing template for editing
 */

import type { TemplateAction, TemplateState } from '../types';
import type { Template } from '../../../domain/types';

export class LoadTemplateAction implements TemplateAction {
  type: 'LOAD_TEMPLATE' = 'LOAD_TEMPLATE';
  description: string;
  timestamp: Date;

  private template: Template;
  private previousTemplate: Template | null = null;

  constructor(template: Template) {
    this.template = template;
    this.description = `Load template ${template.name}`;
    this.timestamp = new Date();
  }

  execute(state: TemplateState): TemplateState {
    // Store previous template for undo
    if (this.previousTemplate === null) {
      this.previousTemplate = state.current;
    }

    // Load new template
    return {
      ...state,
      current: this.template,
      selectedComponentId: null,
      selectedComponentIds: [],
      clipboard: null,
      isDirty: false,
      currentPageId: this.template.pages[0]?.id || null,
    };
  }

  undo(state: TemplateState): TemplateState {
    // Restore previous template
    return {
      ...state,
      current: this.previousTemplate,
      selectedComponentId: null,
      selectedComponentIds: [],
      clipboard: null,
      isDirty: false,
      currentPageId: this.previousTemplate?.pages[0]?.id || null,
    };
  }
}
