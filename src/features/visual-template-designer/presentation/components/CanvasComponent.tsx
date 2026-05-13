/**
 * Visual Template Designer - CanvasComponent
 *
 * Renders a single TemplateComponent on the canvas with:
 * - Absolute positioning driven by layout properties
 * - Selection state with resize handles and rotation handle
 * - Mouse-drag to move, resize, and rotate
 * - Type-based placeholder content rendering
 */

import React, { useRef, useCallback } from 'react';
import type { TemplateComponent } from '../../domain/types';
import { normalizeRotation } from '../../domain/utils/rotation';

// ─── Handle constants ────────────────────────────────────────────────────────

const HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 20;

type ResizeDirection =
  | 'nw' | 'n' | 'ne'
  | 'w'  |       'e'
  | 'sw' | 's' | 'se';

interface ResizeHandle {
  dir: ResizeDirection;
  style: React.CSSProperties;
  cursor: string;
}

function buildResizeHandles(): ResizeHandle[] {
  const half = HANDLE_SIZE / 2;

  const positions: Array<{ dir: ResizeDirection; top: string; left: string; cursor: string }> = [
    { dir: 'nw', top: `${-half}px`, left: `${-half}px`,  cursor: 'nw-resize' },
    { dir: 'n',  top: `${-half}px`, left: `calc(50% - ${half}px)`, cursor: 'n-resize'  },
    { dir: 'ne', top: `${-half}px`, left: `calc(100% - ${half}px)`, cursor: 'ne-resize' },
    { dir: 'w',  top: `calc(50% - ${half}px)`, left: `${-half}px`, cursor: 'w-resize'  },
    { dir: 'e',  top: `calc(50% - ${half}px)`, left: `calc(100% - ${half}px)`, cursor: 'e-resize'  },
    { dir: 'sw', top: `calc(100% - ${half}px)`, left: `${-half}px`, cursor: 'sw-resize' },
    { dir: 's',  top: `calc(100% - ${half}px)`, left: `calc(50% - ${half}px)`, cursor: 's-resize'  },
    { dir: 'se', top: `calc(100% - ${half}px)`, left: `calc(100% - ${half}px)`, cursor: 'se-resize' },
  ];

  return positions.map(({ dir, top, left, cursor }) => ({
    dir,
    cursor,
    style: {
      position: 'absolute' as const,
      top,
      left,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      backgroundColor: '#fff',
      border: '1.5px solid #3b82f6',
      borderRadius: 1,
      cursor,
      zIndex: 10001,
    },
  }));
}

const RESIZE_HANDLES = buildResizeHandles();

// ─── Component content renderers ─────────────────────────────────────────────

function renderContent(component: TemplateComponent): React.ReactNode {
  const { type } = component;
  const baseStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    color: '#6b7280',
    overflow: 'hidden',
    userSelect: 'none',
  };

  switch (type) {
    // Image-like components
    case 'SCHOOL_LOGO':
    case 'STUDENT_PHOTO':
    case 'BACKGROUND_IMAGE':
      return (
        <div style={{ ...baseStyle, backgroundColor: '#f3f4f6', flexDirection: 'column', gap: 4 }}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5}>
            <rect x={3} y={3} width={18} height={18} rx={2} />
            <circle cx={8.5} cy={8.5} r={1.5} />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span style={{ fontSize: 10 }}>{type.replace(/_/g, ' ')}</span>
        </div>
      );

    // Results table
    case 'RESULTS_TABLE':
      return (
        <div style={{ ...baseStyle, flexDirection: 'column', alignItems: 'stretch', padding: 4 }}>
          {[0, 1, 2, 3].map((row) => (
            <div
              key={row}
              style={{
                display: 'flex',
                flex: 1,
                borderBottom: row < 3 ? '1px solid #d1d5db' : 'none',
              }}
            >
              {[0, 1, 2, 3].map((col) => (
                <div
                  key={col}
                  style={{
                    flex: 1,
                    borderRight: col < 3 ? '1px solid #d1d5db' : 'none',
                    backgroundColor: row === 0 ? '#e5e7eb' : '#fff',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      );

    // Line
    case 'LINE':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', height: 2, backgroundColor: '#374151' }} />
        </div>
      );

    // Shapes
    case 'RECTANGLE':
    case 'BORDER':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            border: '2px solid #374151',
            boxSizing: 'border-box',
          }}
        />
      );

    case 'CIRCLE':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            border: '2px solid #374151',
            borderRadius: '50%',
            boxSizing: 'border-box',
          }}
        />
      );

    case 'WATERMARK':
      return (
        <div
          style={{
            ...baseStyle,
            fontSize: 18,
            color: 'rgba(107,114,128,0.3)',
            fontWeight: 'bold',
            letterSpacing: 2,
          }}
        >
          WATERMARK
        </div>
      );

    case 'SIGNATURE_FIELD':
      return (
        <div style={{ ...baseStyle, flexDirection: 'column', justifyContent: 'flex-end', gap: 2, paddingBottom: 4 }}>
          <div style={{ width: '80%', height: 1, backgroundColor: '#374151' }} />
          <span style={{ fontSize: 9 }}>Signature</span>
        </div>
      );

    // All text/label components — show their type as placeholder
    default:
      return (
        <div style={{ ...baseStyle, padding: '2px 4px', textAlign: 'center' }}>
          {type.replace(/_/g, ' ')}
        </div>
      );
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasComponentProps {
  component: TemplateComponent;
  isSelected: boolean;
  isPreview: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, dx: number, dy: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  onRotate: (id: string, angle: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CanvasComponent({
  component,
  isSelected,
  isPreview,
  onSelect,
  onMove,
  onResize,
  onRotate,
}: CanvasComponentProps) {
  const { layout, zIndex } = component;
  const rotation = normalizeRotation(layout.rotation);

  // Refs for drag tracking
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; compX: number; compY: number; compW: number; compH: number } | null>(null);
  const resizeDirRef = useRef<ResizeDirection | null>(null);
  const rotationRef = useRef<{ centerX: number; centerY: number; startAngle: number; initialRotation: number } | null>(null);

  // ── Move drag ────────────────────────────────────────────────────────────

  const handleBodyMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isPreview) return;
      e.stopPropagation();
      onSelect(component.id);

      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        compX: layout.position.x,
        compY: layout.position.y,
        compW: layout.size.width,
        compH: layout.size.height,
      };
      resizeDirRef.current = null;

      const onMouseMove = (me: MouseEvent) => {
        if (!dragStartRef.current) return;
        const dx = me.clientX - dragStartRef.current.mouseX;
        const dy = me.clientY - dragStartRef.current.mouseY;
        onMove(component.id, dragStartRef.current.compX + dx, dragStartRef.current.compY + dy);
      };

      const onMouseUp = () => {
        dragStartRef.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [isPreview, onSelect, onMove, component.id, layout]
  );

  // ── Resize drag ──────────────────────────────────────────────────────────

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, dir: ResizeDirection) => {
      e.stopPropagation();
      e.preventDefault();

      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        compX: layout.position.x,
        compY: layout.position.y,
        compW: layout.size.width,
        compH: layout.size.height,
      };
      resizeDirRef.current = dir;

      const onMouseMove = (me: MouseEvent) => {
        if (!dragStartRef.current) return;
        const dx = me.clientX - dragStartRef.current.mouseX;
        const dy = me.clientY - dragStartRef.current.mouseY;
        const { compW, compH } = dragStartRef.current;
        const d = resizeDirRef.current;

        let newW = compW;
        let newH = compH;

        if (d === 'e' || d === 'ne' || d === 'se') newW = Math.max(10, compW + dx);
        if (d === 'w' || d === 'nw' || d === 'sw') newW = Math.max(10, compW - dx);
        if (d === 's' || d === 'se' || d === 'sw') newH = Math.max(10, compH + dy);
        if (d === 'n' || d === 'ne' || d === 'nw') newH = Math.max(10, compH - dy);

        onResize(component.id, newW, newH);
      };

      const onMouseUp = () => {
        dragStartRef.current = null;
        resizeDirRef.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [onResize, component.id, layout]
  );

  // ── Rotation drag ────────────────────────────────────────────────────────

  const handleRotationMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      // Center of the component in page coordinates
      const rect = (e.currentTarget.closest('[data-canvas-component]') as HTMLElement)?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

      rotationRef.current = {
        centerX,
        centerY,
        startAngle,
        initialRotation: rotation,
      };

      const onMouseMove = (me: MouseEvent) => {
        if (!rotationRef.current) return;
        const { centerX: cx, centerY: cy, startAngle: sa, initialRotation: ir } = rotationRef.current;
        const currentAngle = Math.atan2(me.clientY - cy, me.clientX - cx) * (180 / Math.PI);
        const delta = currentAngle - sa;
        onRotate(component.id, ir + delta);
      };

      const onMouseUp = () => {
        rotationRef.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [onRotate, component.id, rotation]
  );

  // ── Render ───────────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: layout.position.x,
    top: layout.position.y,
    width: layout.size.width,
    height: layout.size.height,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center',
    zIndex,
    boxSizing: 'border-box',
    outline: isSelected ? '2px solid #3b82f6' : undefined,
    cursor: isPreview ? 'default' : 'move',
    userSelect: 'none',
  };

  return (
    <div
      style={containerStyle}
      data-canvas-component
      data-component-id={component.id}
      onMouseDown={handleBodyMouseDown}
    >
      {/* Component content */}
      {renderContent(component)}

      {/* Selection handles */}
      {isSelected && !isPreview && (
        <>
          {/* Rotation handle */}
          <div
            style={{
              position: 'absolute',
              top: -(ROTATION_HANDLE_OFFSET + HANDLE_SIZE),
              left: `calc(50% - ${HANDLE_SIZE / 2}px)`,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
              cursor: 'crosshair',
              zIndex: 10002,
            }}
            onMouseDown={handleRotationMouseDown}
          />
          {/* Rotation stem */}
          <div
            style={{
              position: 'absolute',
              top: -ROTATION_HANDLE_OFFSET,
              left: 'calc(50% - 0.5px)',
              width: 1,
              height: ROTATION_HANDLE_OFFSET,
              backgroundColor: '#3b82f6',
              zIndex: 10001,
              pointerEvents: 'none',
            }}
          />

          {/* Resize handles */}
          {RESIZE_HANDLES.map((handle) => (
            <div
              key={handle.dir}
              style={handle.style}
              onMouseDown={(e) => handleResizeMouseDown(e, handle.dir)}
            />
          ))}
        </>
      )}
    </div>
  );
}
