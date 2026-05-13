/**
 * Visual Template Designer - VisualCanvas
 *
 * The central editing canvas. Renders the page at the correct zoom level,
 * shows rulers, grid, alignment guides, and all components.
 *
 * Drop target for components dragged from the component library.
 * Data format expected from the library drag source:
 *   { type: 'component-library-item', componentType: ComponentType }
 */

import React, { useRef, useCallback, useState } from 'react';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useEffect } from 'react';
import type { ComponentType, TemplateComponent } from '../../domain/types';
import { useTemplateStore } from '../../application/state/store';
import { useZoom } from '../hooks/useZoom';
import { useSnapToGrid, type GridSize } from '../hooks/useSnapToGrid';
import { useAlignmentGuides } from '../hooks/useAlignmentGuides';
import { GridOverlay } from './GridOverlay';
import { AlignmentGuides } from './AlignmentGuides';
import { CanvasComponent } from './CanvasComponent';

// ─── Ruler constants ───────────────────────────────────────────────────────────

const RULER_SIZE = 24; // px
const RULER_TICK_INTERVAL = 50; // px

// ─── Default component dimensions per type ─────────────────────────────────────

function defaultSize(type: ComponentType): { width: number; height: number } {
  switch (type) {
    case 'RESULTS_TABLE': return { width: 500, height: 200 };
    case 'SCHOOL_LOGO':
    case 'STUDENT_PHOTO': return { width: 80, height: 80 };
    case 'BACKGROUND_IMAGE': return { width: 794, height: 1123 };
    case 'LINE': return { width: 200, height: 4 };
    case 'CIRCLE': return { width: 60, height: 60 };
    case 'RECTANGLE':
    case 'BORDER': return { width: 200, height: 100 };
    case 'SIGNATURE_FIELD': return { width: 150, height: 40 };
    default: return { width: 200, height: 40 };
  }
}

function createDefaultComponent(
  componentType: ComponentType,
  x: number,
  y: number,
  existingComponents: TemplateComponent[]
): TemplateComponent {
  const maxZ = existingComponents.reduce((m, c) => Math.max(m, c.zIndex), 0);
  const { width, height } = defaultSize(componentType);

  return {
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: componentType,
    zIndex: maxZ + 1,
    layout: {
      position: { x, y, unit: 'px' },
      size: { width, height, unit: 'px' },
      rotation: 0,
    },
  };
}

// ─── Ruler components ──────────────────────────────────────────────────────────

interface RulerProps {
  length: number;
  orientation: 'horizontal' | 'vertical';
  zoom: number;
}

function Ruler({ length, orientation, zoom }: RulerProps) {
  const ticks: React.ReactNode[] = [];
  const scaledLength = (length * zoom) / 100;
  const scaledInterval = (RULER_TICK_INTERVAL * zoom) / 100;

  for (let i = 0; i * scaledInterval <= scaledLength; i++) {
    const pos = i * scaledInterval;
    const label = i * RULER_TICK_INTERVAL;
    const isLarge = i % 2 === 0;

    if (orientation === 'horizontal') {
      ticks.push(
        <React.Fragment key={i}>
          <div
            style={{
              position: 'absolute',
              left: pos,
              top: isLarge ? 12 : 16,
              width: 1,
              height: isLarge ? 12 : 8,
              backgroundColor: '#9ca3af',
            }}
          />
          {isLarge && (
            <span
              style={{
                position: 'absolute',
                left: pos + 2,
                top: 2,
                fontSize: 8,
                color: '#6b7280',
                userSelect: 'none',
              }}
            >
              {label}
            </span>
          )}
        </React.Fragment>
      );
    } else {
      ticks.push(
        <React.Fragment key={i}>
          <div
            style={{
              position: 'absolute',
              top: pos,
              left: isLarge ? 12 : 16,
              height: 1,
              width: isLarge ? 12 : 8,
              backgroundColor: '#9ca3af',
            }}
          />
          {isLarge && (
            <span
              style={{
                position: 'absolute',
                top: pos + 2,
                left: 2,
                fontSize: 8,
                color: '#6b7280',
                userSelect: 'none',
                writingMode: 'vertical-lr',
                transform: 'rotate(180deg)',
              }}
            >
              {label}
            </span>
          )}
        </React.Fragment>
      );
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: '#f9fafb',
        borderBottom: orientation === 'horizontal' ? '1px solid #e5e7eb' : undefined,
        borderRight: orientation === 'vertical' ? '1px solid #e5e7eb' : undefined,
        flexShrink: 0,
        overflow: 'hidden',
        ...(orientation === 'horizontal'
          ? { height: RULER_SIZE, width: '100%' }
          : { width: RULER_SIZE, flexGrow: 1 }),
      }}
    >
      {ticks}
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface VisualCanvasProps {
  pageWidth?: number;
  pageHeight?: number;
}

// ─── VisualCanvas ──────────────────────────────────────────────────────────────

export function VisualCanvas({ pageWidth = 794, pageHeight = 1123 }: VisualCanvasProps) {
  // ── Store ──────────────────────────────────────────────────────────────────
  const current = useTemplateStore((s) => s.current);
  const currentPageId = useTemplateStore((s) => s.currentPageId);
  const selectedComponentId = useTemplateStore((s) => s.selectedComponentId);
  const selectComponent = useTemplateStore((s) => s.selectComponent);
  const clearSelection = useTemplateStore((s) => s.clearSelection);
  const moveComponent = useTemplateStore((s) => s.moveComponent);
  const resizeComponent = useTemplateStore((s) => s.resizeComponent);
  const rotateComponent = useTemplateStore((s) => s.rotateComponent);
  const addComponent = useTemplateStore((s) => s.addComponent);

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [gridEnabled, setGridEnabled] = useState(true);
  const [gridSize] = useState<GridSize>(10);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showRulers] = useState(true);

  void setGridEnabled; // referenced through toolbar (future)
  void setSnapEnabled;

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const { zoom } = useZoom({ initialZoom: 100, canvasWidth: pageWidth, canvasHeight: pageHeight });
  const { snapPosition } = useSnapToGrid({ gridSize, enabled: snapEnabled });

  // Current page components
  const currentPage = current?.pages.find(
    (p) => p.id === (currentPageId ?? current?.pages[0]?.id)
  );
  const components = currentPage?.elements ?? [];

  // Dragged component for alignment guides (null when not dragging)
  const [draggedComponentId, setDraggedComponentId] = useState<string | null>(null);
  const draggedComponent = draggedComponentId
    ? (components.find((c) => c.id === draggedComponentId) ?? null)
    : null;

  const guides = useAlignmentGuides(components, draggedComponent);

  // ── Drop target (library drop) ─────────────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      onDrop: ({ self, source }) => {
        const data = source.data as Record<string, unknown>;
        if (data['type'] !== 'component-library-item') return;
        const componentType = data['componentType'] as ComponentType;
        if (!componentType) return;

        // Compute drop position relative to the canvas
        const rect = el.getBoundingClientRect();
        const rawX = ((self as unknown as { clientX?: number })['clientX'] ?? rect.left) - rect.left;
        const rawY = ((self as unknown as { clientY?: number })['clientY'] ?? rect.top) - rect.top;

        // Scale back from zoom
        const unscaledX = (rawX / zoom) * 100;
        const unscaledY = (rawY / zoom) * 100;

        const { x, y } = snapPosition(unscaledX, unscaledY);

        const newComponent = createDefaultComponent(componentType, x, y, components);
        addComponent(newComponent, currentPage?.id);
      },
    });
  }, [addComponent, components, currentPage, snapPosition, zoom]);

  // ── Canvas click (clear selection) ────────────────────────────────────────
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === canvasRef.current) {
        clearSelection();
      }
    },
    [clearSelection]
  );

  // ── Component event handlers ───────────────────────────────────────────────
  const handleSelect = useCallback(
    (id: string) => {
      selectComponent(id);
      setDraggedComponentId(id);
    },
    [selectComponent]
  );

  const handleMove = useCallback(
    (id: string, x: number, y: number) => {
      const snapped = snapPosition(x, y);
      moveComponent(id, snapped.x, snapped.y);
    },
    [moveComponent, snapPosition]
  );

  const handleResize = useCallback(
    (id: string, w: number, h: number) => {
      resizeComponent(id, w, h);
    },
    [resizeComponent]
  );

  const handleRotate = useCallback(
    (id: string, angle: number) => {
      rotateComponent(id, angle);
    },
    [rotateComponent]
  );

  // ── Sorted components ──────────────────────────────────────────────────────
  const sortedComponents = [...components].sort((a, b) => a.zIndex - b.zIndex);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#e5e7eb',
        overflow: 'hidden',
      }}
    >
      {/* Top ruler row */}
      {showRulers && (
        <div style={{ display: 'flex', flexShrink: 0 }}>
          {/* Corner square */}
          <div
            style={{
              width: RULER_SIZE,
              height: RULER_SIZE,
              flexShrink: 0,
              backgroundColor: '#f3f4f6',
              borderBottom: '1px solid #e5e7eb',
              borderRight: '1px solid #e5e7eb',
            }}
          />
          <Ruler length={pageWidth} orientation="horizontal" zoom={zoom} />
        </div>
      )}

      {/* Main row: left ruler + viewport */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left ruler */}
        {showRulers && (
          <Ruler length={pageHeight} orientation="vertical" zoom={zoom} />
        )}

        {/* Scrollable viewport */}
        <div
          ref={viewportRef}
          style={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
            backgroundColor: '#d1d5db',
          }}
        >
          {/* Outer padded area so the canvas sits centered with scroll space */}
          <div
            style={{
              padding: 40,
              display: 'inline-block',
              minWidth: '100%',
              minHeight: '100%',
              boxSizing: 'border-box',
            }}
          >
            {/* Canvas — scaled by zoom */}
            <div
              ref={canvasRef}
              style={{
                width: pageWidth,
                height: pageHeight,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                position: 'relative',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                overflow: 'hidden',
              }}
              onClick={handleCanvasClick}
            >
              {/* Grid */}
              <GridOverlay
                gridSize={gridSize}
                visible={gridEnabled}
                canvasWidth={pageWidth}
                canvasHeight={pageHeight}
              />

              {/* Alignment guides */}
              <AlignmentGuides
                guides={guides}
                canvasWidth={pageWidth}
                canvasHeight={pageHeight}
              />

              {/* Components */}
              {sortedComponents.map((component) => (
                <CanvasComponent
                  key={component.id}
                  component={component}
                  isSelected={selectedComponentId === component.id}
                  isPreview={false}
                  onSelect={handleSelect}
                  onMove={handleMove}
                  onResize={handleResize}
                  onRotate={handleRotate}
                />
              ))}

              {/* Empty state */}
              {!current && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    fontSize: 14,
                  }}
                >
                  No template loaded. Create or load a template to begin editing.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
