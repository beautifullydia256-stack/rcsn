/**
 * UngroupComponentsAction - Ungroups components
 * 
 * This action removes the group ID from all components in a group.
 * 
 * Requirements:
 * - Requirement 21.5: Ungroup components
 */

import type { TemplateAction, TemplateState } from '../types';

export class UngroupComponentsAction implements TemplateAction {
  type: 'UNGROUP_COMPONENTS' = 'UNGROUP_COMPONENTS';
  description: string;
  timestamp: Date;

  private groupId: string;
  private componentIds: string[] = [];
  private pageId: string | null = null;

  constructor(groupId: string) {
    this.groupId = groupId;
    this.description = `Ungroup components in group ${groupId}`;
    this.timestamp = new Date();
  }

  execute(state: TemplateState): TemplateState {
    if (!state.current) {
      throw new Error('No template loaded');
    }

    // Find the page containing the group
    let foundPageIndex = -1;

    for (let i = 0; i < state.current.pages.length; i++) {
      const hasGroup = state.current.pages[i].elements.some(
        el => el.groupId === this.groupId
      );
      if (hasGroup) {
        foundPageIndex = i;
        break;
      }
    }

    if (foundPageIndex === -1) {
      throw new Error(`Group ${this.groupId} not found`);
    }

    const page = state.current.pages[foundPageIndex];

    // Store component IDs and page ID for undo
    if (this.componentIds.length === 0) {
      this.componentIds = page.elements
        .filter(el => el.groupId === this.groupId)
        .map(el => el.id);
      this.pageId = page.id;
    }

    // Remove group ID from components
    const newElements = page.elements.map(el => {
      if (el.groupId === this.groupId) {
        const { groupId, ...rest } = el;
        return rest;
      }
      return el;
    });

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
    if (!state.current || !this.pageId || this.componentIds.length === 0) {
      throw new Error('Cannot undo: no group data stored');
    }

    // Find the page
    const pageIndex = state.current.pages.findIndex(p => p.id === this.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page ${this.pageId} not found`);
    }

    const page = state.current.pages[pageIndex];

    // Restore group ID to components
    const newElements = page.elements.map(el => {
      if (this.componentIds.includes(el.id)) {
        return {
          ...el,
          groupId: this.groupId,
        };
      }
      return el;
    });

    // Create new pages array with updated page
    const newPages = [...state.current.pages];
    newPages[pageIndex] = {
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
