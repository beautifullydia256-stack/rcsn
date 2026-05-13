/**
 * Visual Template Designer - CanvasComponent
 *
 * Renders a single TemplateComponent on the canvas with:
 * - Absolute positioning driven by layout properties
 * - Selection state with resize handles and rotation handle
 * - Mouse-drag to move, resize, and rotate (zoom-corrected)
 * - Type-based placeholder content that reflects layout.font / layout.color
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
    { dir: 'nw', top: `${-half}px`, left: `${-half}px`,              cursor: 'nw-resize' },
    { dir: 'n',  top: `${-half}px`, left: `calc(50% - ${half}px)`,   cursor: 'n-resize'  },
    { dir: 'ne', top: `${-half}px`, left: `calc(100% - ${half}px)`,  cursor: 'ne-resize' },
    { dir: 'w',  top: `calc(50% - ${half}px)`, left: `${-half}px`,   cursor: 'w-resize'  },
    { dir: 'e',  top: `calc(50% - ${half}px)`, left: `calc(100% - ${half}px)`, cursor: 'e-resize'  },
    { dir: 'sw', top: `calc(100% - ${half}px)`, left: `${-half}px`,  cursor: 'sw-resize' },
    { dir: 's',  top: `calc(100% - ${half}px)`, left: `calc(50% - ${half}px)`, cursor: 's-resize'  },
    { dir: 'se', top: `calc(100% - ${half}px)`, left: `calc(100% - ${half}px)`, cursor: 'se-resize' },
  ];
  return positions.map(({ dir, top, left, cursor }) => ({
    dir, cursor,
    style: {
      position: 'absolute' as const,
      top, left,
      width: HANDLE_SIZE, height: HANDLE_SIZE,
      backgroundColor: '#fff',
      border: '2px solid #3b82f6',
      borderRadius: 2,
      cursor, zIndex: 10001,
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    },
  }));
}

const RESIZE_HANDLES = buildResizeHandles();

// ─── Per-type visual config ──────────────────────────────────────────────────
// Each component type gets a distinctive accent colour so you can tell them
// apart at a glance on the white canvas.

const TYPE_CONFIG: Record<string, { accent: string; bg: string; icon: string }> = {
  SCHOOL_LOGO:           { accent: '#6366f1', bg: '#eef2ff', icon: '🎓' },
  SCHOOL_NAME:           { accent: '#0ea5e9', bg: '#f0f9ff', icon: '🏫' },
  SCHOOL_MOTTO:          { accent: '#0ea5e9', bg: '#f0f9ff', icon: '💬' },
  SCHOOL_ADDRESS:        { accent: '#0ea5e9', bg: '#f0f9ff', icon: '📍' },
  SCHOOL_CONTACT:        { accent: '#0ea5e9', bg: '#f0f9ff', icon: '📞' },
  STUDENT_NAME:          { accent: '#10b981', bg: '#f0fdf4', icon: '👤' },
  STUDENT_PHOTO:         { accent: '#10b981', bg: '#f0fdf4', icon: '🖼' },
  STUDENT_CLASS:         { accent: '#10b981', bg: '#f0fdf4', icon: '📖' },
  STUDENT_STREAM:        { accent: '#10b981', bg: '#f0fdf4', icon: '📖' },
  STUDENT_NUMBER:        { accent: '#10b981', bg: '#f0fdf4', icon: '#️⃣' },
  STUDENT_ATTENDANCE:    { accent: '#10b981', bg: '#f0fdf4', icon: '✅' },
  RESULTS_TABLE:         { accent: '#f59e0b', bg: '#fffbeb', icon: '📊' },
  SUBJECT_SCORES:        { accent: '#f59e0b', bg: '#fffbeb', icon: '📊' },
  GRADE_DISPLAY:         { accent: '#f59e0b', bg: '#fffbeb', icon: '🅰' },
  AGGREGATE_DISPLAY:     { accent: '#f59e0b', bg: '#fffbeb', icon: '∑' },
  DIVISION_DISPLAY:      { accent: '#f59e0b', bg: '#fffbeb', icon: 'Ⅰ' },
  TEACHER_REMARKS:       { accent: '#8b5cf6', bg: '#faf5ff', icon: '💭' },
  HEAD_TEACHER_COMMENTS: { accent: '#8b5cf6', bg: '#faf5ff', icon: '📝' },
  PAYMENT_SUMMARY:       { accent: '#ef4444', bg: '#fff1f2', icon: '💳' },
  FEES_BALANCE:          { accent: '#ef4444', bg: '#fff1f2', icon: '💰' },
  FEE_STRUCTURE:         { accent: '#ef4444', bg: '#fff1f2', icon: '🧾' },
  LINE:                  { accent: '#64748b', bg: 'transparent', icon: '' },
  BORDER:                { accent: '#334155', bg: 'transparent', icon: '' },
  RECTANGLE:             { accent: '#64748b', bg: '#f8fafc', icon: '' },
  CIRCLE:                { accent: '#64748b', bg: '#f8fafc', icon: '' },
  BACKGROUND_IMAGE:      { accent: '#94a3b8', bg: '#f1f5f9', icon: '🖼' },
  WATERMARK:             { accent: '#cbd5e1', bg: 'transparent', icon: '' },
  TEXT_LABEL:            { accent: '#475569', bg: '#f8fafc', icon: 'T' },
  SIGNATURE_FIELD:       { accent: '#64748b', bg: '#f8fafc', icon: '✍' },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? { accent: '#94a3b8', bg: '#f8fafc', icon: '□' };
}

// ─── Content renderer ────────────────────────────────────────────────────────

function renderContent(component: TemplateComponent): React.ReactNode {
  const { type, layout } = component;
  const cfg = getConfig(type);

  // Resolve user-set style properties
  const fontFamily = layout.font?.family ?? 'inherit';
  const fontSize = layout.font?.size ? `${layout.font.size}pt` : '11px';
  const fontWeight = layout.font?.weight ?? 'normal';
  const fontStyle  = layout.font?.style ?? 'normal';
  const textColor  = layout.color?.text ?? '#1e293b';
  const bgColor    = layout.color?.background;
  const alignment  = layout.alignment ?? 'left';

  const textStyle: React.CSSProperties = {
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    color: textColor,
    textAlign: alignment,
  };

  // ── Image placeholders ──────────────────────────────────────────────────
  if (type === 'SCHOOL_LOGO' || type === 'STUDENT_PHOTO') {
    return (
      <div style={{ width: '100%', height: '100%', background: bgColor ?? cfg.bg, border: `2px dashed ${cfg.accent}`, borderRadius: type === 'STUDENT_PHOTO' ? 4 : 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden' }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={cfg.accent} strokeWidth={1.5}>
          <rect x={3} y={3} width={18} height={18} rx={2} />
          <circle cx={8.5} cy={8.5} r={1.5} />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span style={{ fontSize: 9, color: cfg.accent, fontWeight: 600 }}>{type.replace(/_/g, ' ')}</span>
      </div>
    );
  }

  if (type === 'BACKGROUND_IMAGE') {
    return (
      <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(45deg, #f1f5f9 0px, #f1f5f9 10px, #e2e8f0 10px, #e2e8f0 20px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, background: '#fff', padding: '2px 8px', borderRadius: 4 }}>BACKGROUND</span>
      </div>
    );
  }

  // ── Results table ───────────────────────────────────────────────────────
  if (type === 'RESULTS_TABLE') {
    const cols = ['Subject', 'Score', 'Grade', 'Remarks'];
    const rows = ['Mathematics', 'English', 'Physics', 'Chemistry'];
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: bgColor ?? '#fff', ...textStyle }}>
        {/* Header */}
        <div style={{ display: 'flex', background: cfg.bg, borderBottom: `2px solid ${cfg.accent}`, flexShrink: 0 }}>
          {cols.map((c, i) => (
            <div key={i} style={{ flex: i === 0 ? 2 : 1, padding: '3px 5px', fontSize: 9, fontWeight: 700, color: cfg.accent, borderRight: i < cols.length - 1 ? `1px solid ${cfg.accent}33` : 'none', overflow: 'hidden', whiteSpace: 'nowrap' }}>{c}</div>
          ))}
        </div>
        {/* Sample rows */}
        {rows.map((subj, r) => (
          <div key={r} style={{ display: 'flex', flex: 1, borderBottom: '1px solid #e2e8f0', background: r % 2 === 1 ? '#f8fafc' : '#fff' }}>
            <div style={{ flex: 2, padding: '2px 5px', fontSize: 9, color: '#374151', borderRight: '1px solid #e2e8f0', overflow: 'hidden', whiteSpace: 'nowrap' }}>{subj}</div>
            <div style={{ flex: 1, padding: '2px 5px', fontSize: 9, color: '#374151', borderRight: '1px solid #e2e8f0', textAlign: 'center' }}>–</div>
            <div style={{ flex: 1, padding: '2px 5px', fontSize: 9, color: '#374151', borderRight: '1px solid #e2e8f0', textAlign: 'center' }}>–</div>
            <div style={{ flex: 1, padding: '2px 5px', fontSize: 9, color: '#6b7280', textAlign: 'center' }}>–</div>
          </div>
        ))}
      </div>
    );
  }

  // ── Line ────────────────────────────────────────────────────────────────
  if (type === 'LINE') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '100%', height: Math.max(1, layout.size.height), backgroundColor: textColor !== '#1e293b' ? textColor : '#334155' }} />
      </div>
    );
  }

  // ── Border / Rectangle ──────────────────────────────────────────────────
  if (type === 'BORDER' || type === 'RECTANGLE') {
    const bColor = layout.color?.text ?? (type === 'BORDER' ? '#334155' : '#64748b');
    const bBg = bgColor ?? (type === 'RECTANGLE' ? 'transparent' : 'transparent');
    return (
      <div style={{ width: '100%', height: '100%', border: `2px solid ${bColor}`, backgroundColor: bBg, boxSizing: 'border-box' }} />
    );
  }

  // ── Circle ──────────────────────────────────────────────────────────────
  if (type === 'CIRCLE') {
    return (
      <div style={{ width: '100%', height: '100%', border: `2px solid ${layout.color?.text ?? '#64748b'}`, borderRadius: '50%', backgroundColor: bgColor ?? 'transparent', boxSizing: 'border-box' }} />
    );
  }

  // ── Watermark ───────────────────────────────────────────────────────────
  if (type === 'WATERMARK') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'rgba(100,116,139,0.25)', fontWeight: 900, letterSpacing: 4, pointerEvents: 'none', ...textStyle, opacity: 0.3 }}>
        WATERMARK
      </div>
    );
  }

  // ── Signature field ─────────────────────────────────────────────────────
  if (type === 'SIGNATURE_FIELD') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start', padding: '0 8px 4px', boxSizing: 'border-box', background: bgColor ?? 'transparent' }}>
        <div style={{ width: '85%', height: 1, backgroundColor: textColor !== '#1e293b' ? textColor : '#334155' }} />
        <span style={{ color: '#64748b', marginTop: 2, ...textStyle, fontSize: '9px' }}>Signature & Stamp</span>
      </div>
    );
  }

  // ── All text/data components ─────────────────────────────────────────────
  const label = type.replace(/_/g, ' ');
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        boxSizing: 'border-box',
        background: bgColor ?? cfg.bg,
        overflow: 'hidden',
        ...textStyle,
      }}
    >
      {cfg.icon && (
        <span style={{ fontSize: 12, flexShrink: 0, opacity: 0.7 }}>{cfg.icon}</span>
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {label}
      </span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasComponentProps {
  component: TemplateComponent;
  isSelected: boolean;
  isPreview: boolean;
  zoom: number;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  onRotate: (id: string, angle: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CanvasComponent({
  component,
  isSelected,
  isPreview,
  zoom,
  onSelect,
  onMove,
  onResize,
  onRotate,
}: CanvasComponentProps) {
  const { layout, zIndex } = component;
  const rotation = normalizeRotation(layout.rotation);

  // Zoom scale factor — mouse movements are in screen px; canvas coords are larger when zoomed out
  const zoomFactor = zoom / 100;

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
        // Divide screen-pixel delta by zoom factor to get canvas-pixel delta
        const dx = (me.clientX - dragStartRef.current.mouseX) / zoomFactor;
        const dy = (me.clientY - dragStartRef.current.mouseY) / zoomFactor;
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
    [isPreview, onSelect, onMove, component.id, layout, zoomFactor]
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
        const dx = (me.clientX - dragStartRef.current.mouseX) / zoomFactor;
        const dy = (me.clientY - dragStartRef.current.mouseY) / zoomFactor;
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
    [onResize, component.id, layout, zoomFactor]
  );

  // ── Rotation drag ────────────────────────────────────────────────────────

  const handleRotationMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const rect = (e.currentTarget.closest('[data-canvas-component]') as HTMLElement)?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

      rotationRef.current = { centerX, centerY, startAngle, initialRotation: rotation };

      const onMouseMove = (me: MouseEvent) => {
        if (!rotationRef.current) return;
        const { centerX: cx, centerY: cy, startAngle: sa, initialRotation: ir } = rotationRef.current;
        const currentAngle = Math.atan2(me.clientY - cy, me.clientX - cx) * (180 / Math.PI);
        onRotate(component.id, ir + (currentAngle - sa));
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

  const cfg = getConfig(component.type);

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
    outline: isSelected
      ? '2px solid #3b82f6'
      : `1px solid ${cfg.accent}44`,
    outlineOffset: isSelected ? 1 : 0,
    cursor: isPreview ? 'default' : 'move',
    userSelect: 'none',
    borderRadius: 1,
  };

  return (
    <div
      style={containerStyle}
      data-canvas-component
      data-component-id={component.id}
      onMouseDown={handleBodyMouseDown}
    >
      {renderContent(component)}

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
              boxShadow: '0 1px 4px rgba(59,130,246,0.6)',
            }}
            onMouseDown={handleRotationMouseDown}
          />
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
