/**
 * Visual Template Designer - AlignmentGuides
 *
 * Renders vertical and horizontal alignment guide lines on the canvas.
 * Lines are absolutely positioned thin blue (1px) lines.
 */

import React from 'react';
import type { GuideLine } from '../hooks/useAlignmentGuides';

interface AlignmentGuidesProps {
  guides: GuideLine[];
  canvasWidth: number;
  canvasHeight: number;
}

export function AlignmentGuides({ guides, canvasWidth, canvasHeight }: AlignmentGuidesProps) {
  if (guides.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: canvasWidth,
        height: canvasHeight,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'visible',
      }}
      width={canvasWidth}
      height={canvasHeight}
    >
      {guides.map((guide, index) => {
        if (guide.type === 'vertical') {
          return (
            <line
              key={`v-${guide.position}-${index}`}
              x1={guide.position}
              y1={0}
              x2={guide.position}
              y2={canvasHeight}
              stroke="#3b82f6"
              strokeWidth={1}
            />
          );
        }
        return (
          <line
            key={`h-${guide.position}-${index}`}
            x1={0}
            y1={guide.position}
            x2={canvasWidth}
            y2={guide.position}
            stroke="#3b82f6"
            strokeWidth={1}
          />
        );
      })}
    </svg>
  );
}
