/**
 * Visual Template Designer - useAlignmentGuides Hook
 *
 * Detects alignment guides during drag operations.
 * A guide line is emitted when the dragged component's edges align
 * within SNAP_THRESHOLD pixels of any other component's edges.
 */

import { useMemo } from 'react';
import type { TemplateComponent } from '../../domain/types';

/** Pixels within which edges are considered aligned */
const SNAP_THRESHOLD = 5;

export interface GuideLine {
  type: 'vertical' | 'horizontal';
  /** Position along the cross-axis:
   *  - vertical guide: x coordinate
   *  - horizontal guide: y coordinate
   */
  position: number;
}

/**
 * Compute alignment guides between the dragged component and all other components.
 * Pure function — exported so it can be tested independently.
 */
export function computeAlignmentGuides(
  components: TemplateComponent[],
  draggedComponent: TemplateComponent | null
): GuideLine[] {
  if (!draggedComponent) return [];

  const guides: GuideLine[] = [];
  const seen = new Set<string>();

  const dx = draggedComponent.layout.position.x;
  const dy = draggedComponent.layout.position.y;
  const dw = draggedComponent.layout.size.width;
  const dh = draggedComponent.layout.size.height;

  // Edges of the dragged component
  const draggedLeft = dx;
  const draggedRight = dx + dw;
  const draggedCenterX = dx + dw / 2;
  const draggedTop = dy;
  const draggedBottom = dy + dh;
  const draggedCenterY = dy + dh / 2;

  for (const comp of components) {
    if (comp.id === draggedComponent.id) continue;

    const cx = comp.layout.position.x;
    const cy = comp.layout.position.y;
    const cw = comp.layout.size.width;
    const ch = comp.layout.size.height;

    const compLeft = cx;
    const compRight = cx + cw;
    const compCenterX = cx + cw / 2;
    const compTop = cy;
    const compBottom = cy + ch;
    const compCenterY = cy + ch / 2;

    // Check vertical guides (x positions)
    const verticalChecks: Array<[number, number]> = [
      [draggedLeft, compLeft],
      [draggedLeft, compRight],
      [draggedLeft, compCenterX],
      [draggedRight, compLeft],
      [draggedRight, compRight],
      [draggedRight, compCenterX],
      [draggedCenterX, compLeft],
      [draggedCenterX, compRight],
      [draggedCenterX, compCenterX],
    ];

    for (const [a, b] of verticalChecks) {
      if (Math.abs(a - b) <= SNAP_THRESHOLD) {
        const key = `v:${b}`;
        if (!seen.has(key)) {
          seen.add(key);
          guides.push({ type: 'vertical', position: b });
        }
      }
    }

    // Check horizontal guides (y positions)
    const horizontalChecks: Array<[number, number]> = [
      [draggedTop, compTop],
      [draggedTop, compBottom],
      [draggedTop, compCenterY],
      [draggedBottom, compTop],
      [draggedBottom, compBottom],
      [draggedBottom, compCenterY],
      [draggedCenterY, compTop],
      [draggedCenterY, compBottom],
      [draggedCenterY, compCenterY],
    ];

    for (const [a, b] of horizontalChecks) {
      if (Math.abs(a - b) <= SNAP_THRESHOLD) {
        const key = `h:${b}`;
        if (!seen.has(key)) {
          seen.add(key);
          guides.push({ type: 'horizontal', position: b });
        }
      }
    }
  }

  return guides;
}

/**
 * Hook that returns alignment guides for the currently dragged component.
 */
export function useAlignmentGuides(
  components: TemplateComponent[],
  draggedComponent: TemplateComponent | null
): GuideLine[] {
  return useMemo(
    () => computeAlignmentGuides(components, draggedComponent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [components, draggedComponent]
  );
}
