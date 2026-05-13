/**
 * Visual Template Designer - Group Management
 *
 * Pure functions for component grouping operations.
 * All functions return new arrays — no mutation.
 */

import type { TemplateComponent } from '../types';

/**
 * Assigns `groupId` to every component whose id appears in `componentIds`.
 * Components not in `componentIds` are returned unchanged.
 */
export function groupComponents(
  components: TemplateComponent[],
  componentIds: string[],
  groupId: string,
): TemplateComponent[] {
  const idSet = new Set(componentIds);
  return components.map((c) =>
    idSet.has(c.id) ? { ...c, groupId } : c,
  );
}

/**
 * Clears `groupId` from every component that currently belongs to `groupId`.
 * Components in other groups (or ungrouped) are returned unchanged.
 */
export function ungroupComponents(
  components: TemplateComponent[],
  groupId: string,
): TemplateComponent[] {
  return components.map((c) => {
    if (c.groupId !== groupId) return c;
    // Return a new object without the groupId property
    const result: TemplateComponent = { ...c };
    delete result.groupId;
    return result;
  });
}

/**
 * Calculates the axis-aligned bounding box that contains all components
 * belonging to `groupId`.
 * Throws when no components belong to the group.
 */
export function getGroupBounds(
  components: TemplateComponent[],
  groupId: string,
): { x: number; y: number; width: number; height: number } {
  const members = components.filter((c) => c.groupId === groupId);
  if (members.length === 0) {
    throw new Error(`No components found with groupId "${groupId}".`);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const c of members) {
    const x = c.layout.position.x;
    const y = c.layout.position.y;
    const right = x + c.layout.size.width;
    const bottom = y + c.layout.size.height;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Moves every component belonging to `groupId` by `(dx, dy)`.
 * Components not in the group are returned unchanged.
 */
export function moveGroup(
  components: TemplateComponent[],
  groupId: string,
  dx: number,
  dy: number,
): TemplateComponent[] {
  return components.map((c) => {
    if (c.groupId !== groupId) return c;
    return {
      ...c,
      layout: {
        ...c.layout,
        position: {
          ...c.layout.position,
          x: c.layout.position.x + dx,
          y: c.layout.position.y + dy,
        },
      },
    };
  });
}
