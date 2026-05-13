/**
 * AlignComponentsAction - Aligns multiple components
 * 
 * This action aligns selected components along a specified edge or center.
 * 
 * Requirements:
 * - Requirement 23.2-23.7: Align left, center, right, top, middle, bottom
 */

import type { TemplateAction, TemplateState } from '../types';
import type { TemplateComponent, Position } from '../../../domain/types';

export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export class AlignComponentsAction implements TemplateAction {
  type: 'ALIGN_COMPONENTS' = 'ALIGN_COMPONENTS';
  description: string;
  timestamp: Date;

  private componentIds: string[];
  private alignmentType: AlignmentType;
  private previousPositions: Map<string, Position> = new Map();
  private pageId: string | null = null;

  constructor(componentIds: string[], alignmentType: AlignmentType) {
    if (componentIds.length < 2) {
      throw new Error('At least 2 components required for alignment');
    }
    this.componentIds = componentIds;
    this.alignmentType = alignmentType;
    this.description = `Align ${componentIds.length} components ${alignmentType}`;
    this.timestamp = new Date();
  }

  execute(state: TemplateState): TemplateState {
    if (!state.current) {
      throw new Error('No template loaded');
    }

    // Find the page containing the components
    let foundPageIndex = -1;

    for (let i = 0; i < state.current.pages.length; i++) {
      const hasAllComponents = this.componentIds.every(id =>
        state.current!.pages[i].elements.some(el => el.id === id)
      );
      if (hasAllComponents) {
        foundPageIndex = i;
        break;
      }
    }

    if (foundPageIndex === -1) {
      throw new Error('Components not found on same page');
    }

    const page = state.current.pages[foundPageIndex];

    // Store page ID and previous positions for undo
    if (this.pageId === null) {
      this.pageId = page.id;
      page.elements.forEach(el => {
        if (this.componentIds.includes(el.id)) {
          this.previousPositions.set(el.id, { ...el.layout.position });
        }
      });
    }

    // Get components to align
    const componentsToAlign = page.elements.filter(el =>
      this.componentIds.includes(el.id)
    );

    // Calculate alignment coordinate
    const alignmentCoordinate = this.calculateAlignmentCoordinate(
      componentsToAlign,
      this.alignmentType
    );

    // Update component positions
    const newElements = page.elements.map(el => {
      if (this.componentIds.includes(el.id)) {
        return {
          ...el,
          layout: {
            ...el.layout,
            position: this.applyAlignment(
              el,
              this.alignmentType,
              alignmentCoordinate
            ),
          },
        };
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
    if (!state.current || !this.pageId || this.previousPositions.size === 0) {
      throw new Error('Cannot undo: no previous positions stored');
    }

    // Find the page
    const pageIndex = state.current.pages.findIndex(p => p.id === this.pageId);
    if (pageIndex === -1) {
      throw new Error(`Page ${this.pageId} not found`);
    }

    const page = state.current.pages[pageIndex];

    // Restore previous positions
    const newElements = page.elements.map(el => {
      const previousPosition = this.previousPositions.get(el.id);
      if (previousPosition) {
        return {
          ...el,
          layout: {
            ...el.layout,
            position: previousPosition,
          },
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

  private calculateAlignmentCoordinate(
    components: TemplateComponent[],
    alignmentType: AlignmentType
  ): number {
    switch (alignmentType) {
      case 'left':
        return Math.min(...components.map(c => c.layout.position.x));
      case 'right':
        return Math.max(...components.map(c =>
          c.layout.position.x + c.layout.size.width
        ));
      case 'center': {
        const leftmost = Math.min(...components.map(c => c.layout.position.x));
        const rightmost = Math.max(...components.map(c =>
          c.layout.position.x + c.layout.size.width
        ));
        return (leftmost + rightmost) / 2;
      }
      case 'top':
        return Math.min(...components.map(c => c.layout.position.y));
      case 'bottom':
        return Math.max(...components.map(c =>
          c.layout.position.y + c.layout.size.height
        ));
      case 'middle': {
        const topmost = Math.min(...components.map(c => c.layout.position.y));
        const bottommost = Math.max(...components.map(c =>
          c.layout.position.y + c.layout.size.height
        ));
        return (topmost + bottommost) / 2;
      }
    }
  }

  private applyAlignment(
    component: TemplateComponent,
    alignmentType: AlignmentType,
    coordinate: number
  ): Position {
    const position = { ...component.layout.position };

    switch (alignmentType) {
      case 'left':
        position.x = coordinate;
        break;
      case 'right':
        position.x = coordinate - component.layout.size.width;
        break;
      case 'center':
        position.x = coordinate - component.layout.size.width / 2;
        break;
      case 'top':
        position.y = coordinate;
        break;
      case 'bottom':
        position.y = coordinate - component.layout.size.height;
        break;
      case 'middle':
        position.y = coordinate - component.layout.size.height / 2;
        break;
    }

    return position;
  }
}
