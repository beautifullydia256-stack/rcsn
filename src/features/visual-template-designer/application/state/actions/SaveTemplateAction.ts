/**
 * SaveTemplateAction - Saves the current template
 * 
 * This action marks the template as saved (clears isDirty flag).
 * Actual persistence is handled by the infrastructure layer.
 * 
 * Requirements:
 * - Requirement 13.2: Save template
 */

import type { TemplateAction, TemplateState } from '../types';

export class SaveTemplateAction implements TemplateAction {
  type: 'SAVE_TEMPLATE' = 'SAVE_TEMPLATE';
  description: string;
  timestamp: Date;

  private previousIsDirty: boolean = false;

  constructor() {
    this.description = 'Save template';
    this.timestamp = new Date();
  }

  execute(state: TemplateState): TemplateState {
    if (!state.current) {
      throw new Error('No template loaded');
    }

    // Store previous isDirty state for undo
    this.previousIsDirty = state.isDirty;

    // Mark template as saved
    return {
      ...state,
      isDirty: false,
    };
  }

  undo(state: TemplateState): TemplateState {
    // Restore previous isDirty state
    return {
      ...state,
      isDirty: this.previousIsDirty,
    };
  }
}
