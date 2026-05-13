/**
 * Visual Template Designer - RulerComponent
 *
 * Renders a horizontal or vertical ruler with tick marks and labels.
 * Uses an inline SVG for crisp rendering at any zoom level.
 */

import React from 'react';

export interface RulerProps {
  orientation: 'horizontal' | 'vertical';
  /** Pixel length of the ruler in screen space */
  length: number;
  /** Current zoom level (25–400, where 100 = 100%) */
  zoom: number;
  unit: 'px' | 'mm' | 'in';
  visible: boolean;
}

/** Thickness of the ruler strip in screen pixels. */
const RULER_THICKNESS = 24;

/** Minor tick interval in canvas pixels (before zoom). */
const MINOR_INTERVAL_PX = 50;

/** Number of minor ticks per major tick. */
const MAJOR_EVERY = 5;

/** Minor tick height as fraction of ruler thickness. */
const MINOR_HEIGHT_FRAC = 0.35;

/** Major tick height as fraction of ruler thickness. */
const MAJOR_HEIGHT_FRAC = 0.65;

const LABEL_FONT_SIZE = 9;
const LABEL_OFFSET = 2;

/**
 * Convert a canvas-pixel value to a display label in the given unit.
 * 1 px = 1 px, 1 mm ≈ 3.7795 px, 1 in = 96 px.
 */
function pxToLabel(px: number, unit: 'px' | 'mm' | 'in'): string {
  switch (unit) {
    case 'mm':
      return (px / 3.7795).toFixed(0);
    case 'in':
      return (px / 96).toFixed(2);
    default:
      return String(px);
  }
}

export function RulerComponent({
  orientation,
  length,
  zoom,
  unit,
  visible,
}: RulerProps) {
  if (!visible) return null;

  const scale = zoom / 100;
  const screenInterval = MINOR_INTERVAL_PX * scale; // screen pixels between minor ticks
  const tickCount = Math.ceil(length / screenInterval) + 1;

  const isHorizontal = orientation === 'horizontal';
  const svgWidth = isHorizontal ? length : RULER_THICKNESS;
  const svgHeight = isHorizontal ? RULER_THICKNESS : length;

  const ticks: React.ReactNode[] = [];

  for (let i = 0; i < tickCount; i++) {
    const screenPos = i * screenInterval;
    const isMajor = i % MAJOR_EVERY === 0;
    const tickLength = RULER_THICKNESS * (isMajor ? MAJOR_HEIGHT_FRAC : MINOR_HEIGHT_FRAC);
    const canvasPx = i * MINOR_INTERVAL_PX;

    if (isHorizontal) {
      ticks.push(
        <line
          key={i}
          x1={screenPos}
          y1={RULER_THICKNESS - tickLength}
          x2={screenPos}
          y2={RULER_THICKNESS}
          stroke="#9ca3af"
          strokeWidth={1}
        />,
      );
      if (isMajor && screenPos > 0) {
        ticks.push(
          <text
            key={`label-${i}`}
            x={screenPos + LABEL_OFFSET}
            y={RULER_THICKNESS - tickLength - LABEL_OFFSET}
            fontSize={LABEL_FONT_SIZE}
            fill="#6b7280"
            fontFamily="system-ui, sans-serif"
            dominantBaseline="auto"
          >
            {pxToLabel(canvasPx, unit)}
          </text>,
        );
      }
    } else {
      ticks.push(
        <line
          key={i}
          x1={RULER_THICKNESS - tickLength}
          y1={screenPos}
          x2={RULER_THICKNESS}
          y2={screenPos}
          stroke="#9ca3af"
          strokeWidth={1}
        />,
      );
      if (isMajor && screenPos > 0) {
        ticks.push(
          <text
            key={`label-${i}`}
            x={RULER_THICKNESS - tickLength - LABEL_OFFSET}
            y={screenPos + LABEL_OFFSET}
            fontSize={LABEL_FONT_SIZE}
            fill="#6b7280"
            fontFamily="system-ui, sans-serif"
            textAnchor="end"
            dominantBaseline="hanging"
          >
            {pxToLabel(canvasPx, unit)}
          </text>,
        );
      }
    }
  }

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      style={{
        display: 'block',
        background: '#f3f4f6',
        flexShrink: 0,
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      {/* Background */}
      <rect width={svgWidth} height={svgHeight} fill="#f3f4f6" />
      {/* Ticks and labels */}
      {ticks}
      {/* Bottom / right border line */}
      {isHorizontal ? (
        <line x1={0} y1={RULER_THICKNESS - 1} x2={svgWidth} y2={RULER_THICKNESS - 1} stroke="#d1d5db" strokeWidth={1} />
      ) : (
        <line x1={RULER_THICKNESS - 1} y1={0} x2={RULER_THICKNESS - 1} y2={svgHeight} stroke="#d1d5db" strokeWidth={1} />
      )}
    </svg>
  );
}
