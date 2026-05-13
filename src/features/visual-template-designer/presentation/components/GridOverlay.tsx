/**
 * Visual Template Designer - GridOverlay
 *
 * Renders a dot/line grid on the canvas using an SVG pattern for efficiency.
 * Absolutely positioned to cover the whole canvas area.
 */

import React from 'react';

interface GridOverlayProps {
  gridSize: number;
  visible: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

export function GridOverlay({ gridSize, visible, canvasWidth, canvasHeight }: GridOverlayProps) {
  if (!visible) return null;

  const patternId = `grid-pattern-${gridSize}`;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: canvasWidth,
        height: canvasHeight,
        pointerEvents: 'none',
        zIndex: 0,
      }}
      width={canvasWidth}
      height={canvasHeight}
    >
      <defs>
        <pattern
          id={patternId}
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          {/* Vertical line */}
          <line
            x1={gridSize}
            y1={0}
            x2={gridSize}
            y2={gridSize}
            stroke="#d1d5db"
            strokeWidth={0.5}
          />
          {/* Horizontal line */}
          <line
            x1={0}
            y1={gridSize}
            x2={gridSize}
            y2={gridSize}
            stroke="#d1d5db"
            strokeWidth={0.5}
          />
        </pattern>
      </defs>
      <rect width={canvasWidth} height={canvasHeight} fill={`url(#${patternId})`} />
    </svg>
  );
}
