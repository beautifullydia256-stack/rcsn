/**
 * Visual Template Designer - Layer Management
 *
 * Pure functions for z-index / layer management on arrays of TemplateComponent.
 * No React, no store — these functions operate on plain component arrays and
 * return new arrays without mutating the originals.
 */

import type { TemplateComponent } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return the maximum z-index across all components.
 * Returns 0 when the array is empty.
 */
export function getMaxZIndex(components: TemplateComponent[]): number {
  if (components.length === 0) return 0;
  return components.reduce((max, c) => Math.max(max, c.zIndex), -Infinity);
}

/**
 * Return the minimum z-index across all components.
 * Returns 0 when the array is empty.
 */
export function getMinZIndex(components: TemplateComponent[]): number {
  if (components.length === 0) return 0;
  return components.reduce((min, c) => Math.min(min, c.zIndex), Infinity);
}

/**
 * Normalize z-indices so they form a continuous sequence starting at 1.
 * The relative order of components is preserved.
 * Components with lower current z-index receive lower normalized z-index.
 */
export function normalizeZIndices(components: TemplateComponent[]): TemplateComponent[] {
  if (components.length === 0) return [];

  // Sort by current z-index to build rank
  const sorted = [...components].sort((a, b) => a.zIndex - b.zIndex);
  const rankMap = new Map<string, number>();
  sorted.forEach((c, i) => rankMap.set(c.id, i + 1));

  return components.map((c) => ({
    ...c,
    zIndex: rankMap.get(c.id) ?? c.zIndex,
  }));
}

// ─── Layer operations ─────────────────────────────────────────────────────────

/**
 * Move the target component to the front (highest z-index).
 * All other components are unaffected.
 */
export function bringToFront(
  components: TemplateComponent[],
  componentId: string
): TemplateComponent[] {
  if (components.length === 0) return components;
  const maxZ = getMaxZIndex(components);
  const target = components.find((c) => c.id === componentId);
  if (!target) return components;

  // If already at the top, no change needed
  if (target.zIndex === maxZ) return components;

  return components.map((c) =>
    c.id === componentId ? { ...c, zIndex: maxZ + 1 } : c
  );
}

/**
 * Move the target component to the back (lowest z-index).
 * All other components are unaffected.
 */
export function sendToBack(
  components: TemplateComponent[],
  componentId: string
): TemplateComponent[] {
  if (components.length === 0) return components;
  const minZ = getMinZIndex(components);
  const target = components.find((c) => c.id === componentId);
  if (!target) return components;

  // If already at the bottom, no change needed
  if (target.zIndex === minZ) return components;

  return components.map((c) =>
    c.id === componentId ? { ...c, zIndex: minZ - 1 } : c
  );
}

/**
 * Move the target component one step forward (swap z-index with the next
 * component above it).
 */
export function bringForward(
  components: TemplateComponent[],
  componentId: string
): TemplateComponent[] {
  if (components.length <= 1) return components;

  const target = components.find((c) => c.id === componentId);
  if (!target) return components;

  // Find the component immediately above the target (smallest z-index > target.zIndex)
  const above = components
    .filter((c) => c.id !== componentId && c.zIndex > target.zIndex)
    .sort((a, b) => a.zIndex - b.zIndex)[0];

  if (!above) return components; // already at the top

  // Swap z-indices
  return components.map((c) => {
    if (c.id === componentId) return { ...c, zIndex: above.zIndex };
    if (c.id === above.id) return { ...c, zIndex: target.zIndex };
    return c;
  });
}

/**
 * Move the target component one step backward (swap z-index with the next
 * component below it).
 */
export function sendBackward(
  components: TemplateComponent[],
  componentId: string
): TemplateComponent[] {
  if (components.length <= 1) return components;

  const target = components.find((c) => c.id === componentId);
  if (!target) return components;

  // Find the component immediately below the target (largest z-index < target.zIndex)
  const below = components
    .filter((c) => c.id !== componentId && c.zIndex < target.zIndex)
    .sort((a, b) => b.zIndex - a.zIndex)[0];

  if (!below) return components; // already at the bottom

  // Swap z-indices
  return components.map((c) => {
    if (c.id === componentId) return { ...c, zIndex: below.zIndex };
    if (c.id === below.id) return { ...c, zIndex: target.zIndex };
    return c;
  });
}
