/**
 * Visual Template Designer - useSnapToGrid Hook
 *
 * Provides snap-to-grid functionality for positioning components.
 * Exports a snapPosition function that rounds coordinates to the nearest
 * grid multiple.
 */

import { useCallback } from 'react';

/** Valid grid sizes in pixels */
export type GridSize = 5 | 10 | 20 | 25 | 50;

export interface SnapPosition {
  x: number;
  y: number;
}

/**
 * Snap a single value to the nearest multiple of gridSize.
 * Exported for direct use in property tests.
 */
export function snapValue(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export interface UseSnapToGridOptions {
  /** Grid cell size in pixels */
  gridSize: GridSize;
  /** Whether snapping is enabled */
  enabled: boolean;
}

export interface UseSnapToGridReturn {
  snapPosition: (x: number, y: number) => SnapPosition;
}

/**
 * Hook that provides a snapPosition function.
 * When enabled is false, snapPosition returns the original coordinates unchanged.
 */
export function useSnapToGrid({ gridSize, enabled }: UseSnapToGridOptions): UseSnapToGridReturn {
  const snapPosition = useCallback(
    (x: number, y: number): SnapPosition => {
      if (!enabled) {
        return { x, y };
      }
      return {
        x: snapValue(x, gridSize),
        y: snapValue(y, gridSize),
      };
    },
    [gridSize, enabled]
  );

  return { snapPosition };
}
