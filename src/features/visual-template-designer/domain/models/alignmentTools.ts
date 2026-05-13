/**
 * Visual Template Designer - Alignment & Distribution Tools
 *
 * Pure functions for aligning and distributing components.
 * All functions return a new components array — no mutation.
 * Only components whose ids appear in `componentIds` are repositioned;
 * all other components pass through unchanged.
 */

import type { TemplateComponent } from '../types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns only the components whose id is in the provided set. */
function selected(
  components: TemplateComponent[],
  ids: Set<string>,
): TemplateComponent[] {
  return components.filter((c) => ids.has(c.id));
}

/** Merges position updates back into the full component list. */
function applyPositions(
  components: TemplateComponent[],
  updates: Map<string, { x: number; y: number }>,
): TemplateComponent[] {
  return components.map((c) => {
    const pos = updates.get(c.id);
    if (!pos) return c;
    return {
      ...c,
      layout: {
        ...c.layout,
        position: {
          ...c.layout.position,
          x: pos.x,
          y: pos.y,
        },
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Alignment functions
// ---------------------------------------------------------------------------

/**
 * Moves all selected components so their left edge equals the
 * leftmost left edge among the selection.
 */
export function alignLeft(
  components: TemplateComponent[],
  componentIds: string[],
): TemplateComponent[] {
  const ids = new Set(componentIds);
  const sel = selected(components, ids);
  if (sel.length === 0) return components;

  const targetX = Math.min(...sel.map((c) => c.layout.position.x));
  const updates = new Map(sel.map((c) => [c.id, { x: targetX, y: c.layout.position.y }]));
  return applyPositions(components, updates);
}

/**
 * Moves all selected components so their horizontal center equals
 * the average horizontal center of the selection.
 */
export function alignCenter(
  components: TemplateComponent[],
  componentIds: string[],
): TemplateComponent[] {
  const ids = new Set(componentIds);
  const sel = selected(components, ids);
  if (sel.length === 0) return components;

  const avgCenterX =
    sel.reduce((sum, c) => sum + c.layout.position.x + c.layout.size.width / 2, 0) / sel.length;

  const updates = new Map(
    sel.map((c) => [
      c.id,
      { x: avgCenterX - c.layout.size.width / 2, y: c.layout.position.y },
    ]),
  );
  return applyPositions(components, updates);
}

/**
 * Moves all selected components so their right edge equals the
 * rightmost right edge among the selection.
 */
export function alignRight(
  components: TemplateComponent[],
  componentIds: string[],
): TemplateComponent[] {
  const ids = new Set(componentIds);
  const sel = selected(components, ids);
  if (sel.length === 0) return components;

  const targetRight = Math.max(...sel.map((c) => c.layout.position.x + c.layout.size.width));
  const updates = new Map(
    sel.map((c) => [
      c.id,
      { x: targetRight - c.layout.size.width, y: c.layout.position.y },
    ]),
  );
  return applyPositions(components, updates);
}

/**
 * Moves all selected components so their top edge equals the
 * topmost top edge among the selection.
 */
export function alignTop(
  components: TemplateComponent[],
  componentIds: string[],
): TemplateComponent[] {
  const ids = new Set(componentIds);
  const sel = selected(components, ids);
  if (sel.length === 0) return components;

  const targetY = Math.min(...sel.map((c) => c.layout.position.y));
  const updates = new Map(sel.map((c) => [c.id, { x: c.layout.position.x, y: targetY }]));
  return applyPositions(components, updates);
}

/**
 * Moves all selected components so their vertical center equals
 * the average vertical center of the selection.
 */
export function alignMiddle(
  components: TemplateComponent[],
  componentIds: string[],
): TemplateComponent[] {
  const ids = new Set(componentIds);
  const sel = selected(components, ids);
  if (sel.length === 0) return components;

  const avgCenterY =
    sel.reduce((sum, c) => sum + c.layout.position.y + c.layout.size.height / 2, 0) / sel.length;

  const updates = new Map(
    sel.map((c) => [
      c.id,
      { x: c.layout.position.x, y: avgCenterY - c.layout.size.height / 2 },
    ]),
  );
  return applyPositions(components, updates);
}

/**
 * Moves all selected components so their bottom edge equals the
 * bottommost bottom edge among the selection.
 */
export function alignBottom(
  components: TemplateComponent[],
  componentIds: string[],
): TemplateComponent[] {
  const ids = new Set(componentIds);
  const sel = selected(components, ids);
  if (sel.length === 0) return components;

  const targetBottom = Math.max(...sel.map((c) => c.layout.position.y + c.layout.size.height));
  const updates = new Map(
    sel.map((c) => [
      c.id,
      { x: c.layout.position.x, y: targetBottom - c.layout.size.height },
    ]),
  );
  return applyPositions(components, updates);
}

// ---------------------------------------------------------------------------
// Distribution functions
// ---------------------------------------------------------------------------

/**
 * Distributes selected components evenly along the X axis.
 * The leftmost and rightmost components stay in place; all others are
 * repositioned so the gaps between consecutive left edges are equal.
 * Requires at least 3 components (no-op for 0-2).
 */
export function distributeHorizontally(
  components: TemplateComponent[],
  componentIds: string[],
): TemplateComponent[] {
  const ids = new Set(componentIds);
  const sel = selected(components, ids);
  if (sel.length < 3) return components;

  // Sort by left edge
  const sorted = [...sel].sort((a, b) => a.layout.position.x - b.layout.position.x);

  const leftmost = sorted[0].layout.position.x;
  const rightmost = sorted[sorted.length - 1].layout.position.x + sorted[sorted.length - 1].layout.size.width;

  // Total span available for all components
  const totalWidth = sorted.reduce((sum, c) => sum + c.layout.size.width, 0);
  const totalGap = rightmost - leftmost - totalWidth;
  const gap = totalGap / (sorted.length - 1);

  const updates = new Map<string, { x: number; y: number }>();
  let cursor = leftmost;
  for (const c of sorted) {
    updates.set(c.id, { x: cursor, y: c.layout.position.y });
    cursor += c.layout.size.width + gap;
  }

  return applyPositions(components, updates);
}

/**
 * Distributes selected components evenly along the Y axis.
 * The topmost and bottommost components stay in place; all others are
 * repositioned so the gaps between consecutive top edges are equal.
 * Requires at least 3 components (no-op for 0-2).
 */
export function distributeVertically(
  components: TemplateComponent[],
  componentIds: string[],
): TemplateComponent[] {
  const ids = new Set(componentIds);
  const sel = selected(components, ids);
  if (sel.length < 3) return components;

  // Sort by top edge
  const sorted = [...sel].sort((a, b) => a.layout.position.y - b.layout.position.y);

  const topmost = sorted[0].layout.position.y;
  const bottommost = sorted[sorted.length - 1].layout.position.y + sorted[sorted.length - 1].layout.size.height;

  const totalHeight = sorted.reduce((sum, c) => sum + c.layout.size.height, 0);
  const totalGap = bottommost - topmost - totalHeight;
  const gap = totalGap / (sorted.length - 1);

  const updates = new Map<string, { x: number; y: number }>();
  let cursor = topmost;
  for (const c of sorted) {
    updates.set(c.id, { x: c.layout.position.x, y: cursor });
    cursor += c.layout.size.height + gap;
  }

  return applyPositions(components, updates);
}
