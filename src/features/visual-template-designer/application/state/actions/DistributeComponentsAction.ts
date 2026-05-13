/**
 * DistributeComponentsAction - Distributes components evenly
 * 
 * This action spaces selected components evenly along horizontal or vertical axis.
 * 
 * Requirements:
 * - Requirement 23.8-23.9: Distribute horizontally and vertically
 */

import type { TemplateAction, TemplateState } from '../types';
import type { TemplateComponent, Position } from '../../../domain/types';

export type DistributionType = 'horizontal' | 'vertical';

export class DistributeComponentsAction implements TemplateAction {
  type: 'DISTRIBUTE_COMPONENTS' = 'DISTRIBUTE_COMPONENTS';
  description: string;
  timestamp: Date;

  private componentIds: string[];
  private distributionType: DistributionType;
  private previousPositions: Map<string, Position> = new Map();
  private pageId: string | null = null;

  constructor(componentIds: string[], distributionType: DistributionType) {
    if (componentIds.length < 3) {
      throw new Error('At least 3 components required for distribution');
    }
    this.componentIds = componentIds;
    this.distributionType = distributionType;
    this.description = `Distribute ${componentIds.length} components ${distributionType}`;
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

    // Get components to distribute
    const componentsToDistribute = page.elements.filter(el =>
      this.componentIds.includes(el.id)
    );

    // Sort components by position
    const sortedComponents = this.sortComponents(
      componentsToDistribute,
      this.distributionType
    );

    // Calculate new positions
    const newPositions = this.calculateDistribution(
      sortedComponents,
      this.distributionType
    );

    // Update component positions
    const newElements = page.elements.map(el => {
      const newPosition = newPositions.get(el.id);
      if (newPosition) {
        return {
          ...el,
          layout: {
            ...el.layout,
            position: newPosition,
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

  private sortComponents(
    components: TemplateComponent[],
    distributionType: DistributionType
  ): TemplateComponent[] {
    return [...components].sort((a, b) => {
      if (distributionType === 'horizontal') {
        return a.layout.position.x - b.layout.position.x;
      } else {
        return a.layout.position.y - b.layout.position.y;
      }
    });
  }

  private calculateDistribution(
    sortedComponents: TemplateComponent[],
    distributionType: DistributionType
  ): Map<string, Position> {
    const newPositions = new Map<string, Position>();

    if (sortedComponents.length < 3) {
      return newPositions;
    }

    const first = sortedComponents[0];
    const last = sortedComponents[sortedComponents.length - 1];

    if (distributionType === 'horizontal') {
      // Calculate total space between first and last component
      const startX = first.layout.position.x;
      const endX = last.layout.position.x;
      const totalSpace = endX - startX;

      // Calculate spacing between components
      const spacing = totalSpace / (sortedComponents.length - 1);

      // Distribute components
      sortedComponents.forEach((component, index) => {
        const newX = startX + spacing * index;
        newPositions.set(component.id, {
          ...component.layout.position,
          x: newX,
        });
      });
    } else {
      // Calculate total space between first and last component
      const startY = first.layout.position.y;
      const endY = last.layout.position.y;
      const totalSpace = endY - startY;

      // Calculate spacing between components
      const spacing = totalSpace / (sortedComponents.length - 1);

      // Distribute components
      sortedComponents.forEach((component, index) => {
        const newY = startY + spacing * index;
        newPositions.set(component.id, {
          ...component.layout.position,
          y: newY,
        });
      });
    }

    return newPositions;
  }
}
