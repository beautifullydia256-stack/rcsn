/**
 * Visual Template Designer - Aspect Ratio Utilities
 *
 * Pure functions for preserving aspect ratios when resizing components.
 */

/**
 * Result of a dimension-preserving calculation.
 */
export interface AspectRatioDimensions {
  width: number;
  height: number;
}

/**
 * Preserve the aspect ratio of a component when one dimension changes.
 *
 * When `lockEnabled` is true the function determines which dimension changed
 * (by comparing the new values against the originals) and adjusts the other
 * dimension proportionally so that:
 *
 *   newWidth / newHeight ≈ originalWidth / originalHeight
 *
 * When `lockEnabled` is false the dimensions are returned unchanged,
 * allowing independent resizing.
 *
 * Edge cases:
 * - If `originalWidth` or `originalHeight` is 0, the lock is effectively
 *   disabled to avoid division-by-zero and the new values are returned as-is.
 * - If both dimensions changed simultaneously, width takes precedence.
 *
 * @param originalWidth  - Width before the resize started
 * @param originalHeight - Height before the resize started
 * @param newWidth       - Proposed new width
 * @param newHeight      - Proposed new height
 * @param lockEnabled    - Whether the aspect ratio lock is active
 * @returns The final {width, height} after applying the lock (if enabled)
 *
 * @example
 * preserveAspectRatio(100, 50, 200, 50, true)
 * // => { width: 200, height: 100 }   (height scaled to match new width)
 *
 * preserveAspectRatio(100, 50, 200, 75, false)
 * // => { width: 200, height: 75 }    (no locking, both values kept)
 */
export function preserveAspectRatio(
  originalWidth: number,
  originalHeight: number,
  newWidth: number,
  newHeight: number,
  lockEnabled: boolean
): AspectRatioDimensions {
  if (!lockEnabled || originalWidth === 0 || originalHeight === 0) {
    return { width: newWidth, height: newHeight };
  }

  const widthChanged = newWidth !== originalWidth;
  const heightChanged = newHeight !== originalHeight;

  // Neither changed — nothing to do.
  if (!widthChanged && !heightChanged) {
    return { width: newWidth, height: newHeight };
  }

  const ratio = originalWidth / originalHeight;

  if (widthChanged) {
    // Width is the driving dimension; adjust height to match.
    return { width: newWidth, height: newWidth / ratio };
  }

  // Height is the driving dimension; adjust width to match.
  return { width: newHeight * ratio, height: newHeight };
}
