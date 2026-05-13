/**
 * Visual Template Designer - VisualCanvas
 *
 * The central editing canvas. Renders the page at the correct zoom level,
 * shows rulers, grid, alignment guides, and all components.
 *
 * Drop target for components dragged from the component library.
 * Data format expected from the library drag source:
 *   { type: 'component-library-item', componentType: ComponentType }
 *
 * Zoom implementation: the canvas div keeps its original pixel dimensions
 * (pageWidth × pageHeight) and is CSS-scaled. A sized wrapper div has the
 * post-scale dimensions so the scrollable viewport expands correctly.
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

const RULER_SIZE = 20;
const RULER_TICK_INTERVAL = 50;

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

// ─── Ruler ─────────────────────────────────────────────────────────────────────

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
          <div style={{ position: 'absolute', left: pos, top: isLarge ? 10 : 14, width: 1, height: isLarge ? 10 : 6, backgroundColor: '#94a3b8' }} />
          {isLarge && (
            <span style={{ position: 'absolute', left: pos + 2, top: 1, fontSize: 8, color: '#94a3b8', userSelect: 'none' }}>
              {label}
            </span>
          )}
        </React.Fragment>
      );
    } else {
      ticks.push(
        <React.Fragment key={i}>
          <div style={{ position: 'absolute', top: pos, left: isLarge ? 10 : 14, height: 1, width: isLarge ? 10 : 6, backgroundColor: '#94a3b8' }} />
          {isLarge && (
            <span style={{ position: 'absolute', top: pos + 2, left: 1, fontSize: 8, color: '#94a3b8', userSelect: 'none', writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
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
        backgroundColor: '#1e293b',
        borderBottom: orientation === 'horizontal' ? '1px solid #334155' : undefined,
        borderRight: orientation === 'vertical' ? '1px solid #334155' : undefined,
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

// ─── Zoom controls overlay ─────────────────────────────────────────────────────

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onActual: () => void;
}

function ZoomControls({ zoom, onZoomIn, onZoomOut, onFit, onActual }: ZoomControlsProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: '3px 6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <ZBtn onClick={onZoomOut} title="Zoom out">−</ZBtn>

      <span
        style={{
          fontSize: 11,
          color: '#cbd5e1',
          fontWeight: 600,
          minWidth: 38,
          textAlign: 'center',
          userSelect: 'none',
        }}
      >
        {zoom}%
      </span>

      <ZBtn onClick={onZoomIn} title="Zoom in">+</ZBtn>
      <div style={{ width: 1, height: 14, background: '#334155', margin: '0 3px' }} />
      <ZBtn onClick={onFit} title="Fit page">⊡</ZBtn>
      <ZBtn onClick={onActual} title="Actual size (100%)">1:1</ZBtn>
    </div>
  );
}

function ZBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'transparent',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: 14,
        padding: '1px 5px',
        borderRadius: 4,
        lineHeight: 1.4,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f8fafc'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
    >
      {children}
    </button>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface VisualCanvasProps {
  pageWidth?: number;
  pageHeight?: number;
  gridEnabled?: boolean;
  gridSize?: GridSize;
  snapEnabled?: boolean;
  rulersVisible?: boolean;
}

// ─── VisualCanvas ──────────────────────────────────────────────────────────────

export function VisualCanvas({
  pageWidth = 794,
  pageHeight = 1123,
  gridEnabled = true,
  gridSize = 10,
  snapEnabled = true,
  rulersVisible = true,
}: VisualCanvasProps) {
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

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const { zoom, zoomIn, zoomOut, fitToPage, actualSize } = useZoom({
    initialZoom: 75,
    canvasWidth: pageWidth,
    canvasHeight: pageHeight,
    viewportWidth: 900,
    viewportHeight: 700,
  });

  const { snapPosition } = useSnapToGrid({ gridSize, enabled: snapEnabled });

  // Current page components
  const currentPage = current?.pages.find(
    (p) => p.id === (currentPageId ?? current?.pages[0]?.id)
  );
  const components = currentPage?.elements ?? [];

  const [draggedComponentId, setDraggedComponentId] = useState<string | null>(null);
  const draggedComponent = draggedComponentId
    ? (components.find((c) => c.id === draggedComponentId) ?? null)
    : null;

  const guides = useAlignmentGuides(components, draggedComponent);

  // ── Drop target ────────────────────────────────────────────────────────────
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
      if (e.target === canvasRef.current) clearSelection();
    },
    [clearSelection]
  );

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
    (id: string, w: number, h: number) => resizeComponent(id, w, h),
    [resizeComponent]
  );

  const handleRotate = useCallback(
    (id: string, angle: number) => rotateComponent(id, angle),
    [rotateComponent]
  );

  const sortedComponents = [...components].sort((a, b) => a.zIndex - b.zIndex);

  // Scaled canvas dimensions — used by the wrapper div so the scrollable area
  // expands correctly as zoom increases (CSS transform does not affect layout).
  const scaledW = (pageWidth * zoom) / 100;
  const scaledH = (pageHeight * zoom) / 100;

  const CANVAS_PAD = 60;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#0f172a' }}>

      {/* Top ruler row */}
      {rulersVisible && (
        <div style={{ display: 'flex', flexShrink: 0 }}>
          <div style={{ width: RULER_SIZE, height: RULER_SIZE, flexShrink: 0, backgroundColor: '#0f172a', borderBottom: '1px solid #334155', borderRight: '1px solid #334155' }} />
          <Ruler length={pageWidth} orientation="horizontal" zoom={zoom} />
        </div>
      )}

      {/* Main row */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Left ruler */}
        {rulersVisible && <Ruler length={pageHeight} orientation="vertical" zoom={zoom} />}

        {/* Scrollable viewport */}
        <div
          ref={viewportRef}
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#1e293b',
            position: 'relative',
          }}
        >
          {/* Padded inner area — sized to the scaled canvas so scrollbars appear */}
          <div
            style={{
              padding: CANVAS_PAD,
              width: scaledW + CANVAS_PAD * 2,
              height: scaledH + CANVAS_PAD * 2,
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            {/* Outer wrapper: reserves exactly the post-scale layout space */}
            <div
              style={{
                width: scaledW,
                height: scaledH,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {/* Inner canvas: original dimensions, CSS-scaled from top-left */}
              <div
                ref={canvasRef}
                style={{
                  width: pageWidth,
                  height: pageHeight,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  backgroundColor: '#ffffff',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  overflow: 'hidden',
                }}
                onClick={handleCanvasClick}
              >
                <GridOverlay
                  gridSize={gridSize}
                  visible={gridEnabled}
                  canvasWidth={pageWidth}
                  canvasHeight={pageHeight}
                />

                <AlignmentGuides
                  guides={guides}
                  canvasWidth={pageWidth}
                  canvasHeight={pageHeight}
                />

                {sortedComponents.map((component) => (
                  <CanvasComponent
                    key={component.id}
                    component={component}
                    isSelected={selectedComponentId === component.id}
                    isPreview={false}
                    zoom={zoom}
                    onSelect={handleSelect}
                    onMove={handleMove}
                    onResize={handleResize}
                    onRotate={handleRotate}
                  />
                ))}

                {!current && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      fontSize: 14,
                    }}
                  >
                    No template loaded.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Floating zoom controls */}
          <ZoomControls
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onFit={fitToPage}
            onActual={actualSize}
          />
        </div>
      </div>
    </div>
  );
}
