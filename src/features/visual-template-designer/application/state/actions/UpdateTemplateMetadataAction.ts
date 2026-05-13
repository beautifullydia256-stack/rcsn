/**
 * UpdateTemplateMetadataAction - Updates template metadata
 * 
 * This action updates template-level properties like name, category, page size, etc.
 * 
 * Requirements:
 * - Requirement 13: Template management
 */

import type { TemplateAction, TemplateState } from '../types';
import type { Template } from '../../../domain/types';

export class UpdateTemplateMetadataAction implements TemplateAction {
  type: 'UPDATE_TEMPLATE_METADATA' = 'UPDATE_TEMPLATE_METADATA';
  description: string;
  timestamp: Date;

  private updates: Partial<Template>;
  private previousValues: Partial<Template> | null = null;

  constructor(updates: Partial<Template>) {
    this.updates = updates;
    this.description = 'Update template metadata';
    this.timestamp = new Date();
  }

  execute(state: TemplateState): TemplateState {
    if (!state.current) {
      throw new Error('No template loaded');
    }

    // Store previous values for undo (only for keys being updated)
    if (this.previousValues === null) {
      this.previousValues = {};
      Object.keys(this.updates).forEach(key => {
        this.previousValues![key as keyof Template] = 
          state.current![key as keyof Template] as any;
      });
    }

    // Update template metadata
    const updatedTemplate: Template = {
      ...state.current,
      ...this.updates,
      updatedAt: new Date(),
    };

    // Return new state with updated template
    return {
      ...state,
      current: updatedTemplate,
      isDirty: true,
    };
  }

  undo(state: TemplateState): TemplateState {
    if (!state.current || !this.previousValues) {
      throw new Error('Cannot undo: no previous values stored');
    }

    // Restore previous values
    const restoredTemplate: Template = {
      ...state.current,
      ...this.previousValues,
      updatedAt: new Date(),
    };

    // Return new state with restored template
    return {
      ...state,
      current: restoredTemplate,
      isDirty: true,
    };
  }
}
