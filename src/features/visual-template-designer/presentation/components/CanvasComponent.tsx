/**
 * Visual Template Designer - CanvasComponent
 *
 * Renders a single TemplateComponent on the canvas with:
 * - Absolute positioning driven by layout properties
 * - Selection state with resize handles and rotation handle
 * - Mouse-drag to move, resize, and rotate (zoom-corrected)
 * - Real school data + realistic sample student/academic data so the editor
 *   sees an accurate preview of the final printed document
 */

import React, { useRef, useCallback } from 'react';
import type { TemplateComponent, ResultsTableStyle, TableColumn, TableColumnDataKey } from '../../domain/types';
import { DEFAULT_TABLE_COLUMNS } from '../../domain/types';
import { normalizeRotation } from '../../domain/utils/rotation';
import type { DesignerPreviewData } from '../hooks/useDesignerPreviewData';

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

// ─── Results table helpers ────────────────────────────────────────────────────

type SubjectRow = DesignerPreviewData['academic']['subjects'][number];

function getCellValue(row: SubjectRow, key: TableColumnDataKey): string {
  switch (key) {
    case 'name':    return row.name;
    case 'score':   return `${row.score}/${row.max}`;
    case 'max':     return String(row.max);
    case 'grade':   return row.grade;
    case 'remarks': return row.remarks;
  }
}

interface ResultsTableContentProps {
  component: TemplateComponent;
  preview: DesignerPreviewData;
  isSelected: boolean;
  zoomFactor: number;
  onUpdate?: (id: string, patch: Partial<TemplateComponent>) => void;
}

function ResultsTableContent({ component, preview, isSelected, zoomFactor, onUpdate }: ResultsTableContentProps) {
  const cfg = getConfig(component.type);
  const asTable = component as TemplateComponent & { tableStyle?: ResultsTableStyle };
  const ts = asTable.tableStyle;

  const allCols: TableColumn[] = ts?.columns ?? DEFAULT_TABLE_COLUMNS;
  const visibleCols = allCols.filter((c) => c.visible);
  const subjects = preview.academic.subjects.slice(0, ts?.rowCount ?? preview.academic.subjects.length);
  const totalW = visibleCols.reduce((s, c) => s + c.widthPercent, 0) || 100;
  const showHeader = ts?.showHeader !== false;
  const pad = ts?.cellPadding ?? 3;
  const fz = ts?.fontSize ?? 9;
  const borderColor = ts?.borderColor ?? cfg.accent;

  const tableRef = useRef<HTMLDivElement>(null);
  const colResizeRef = useRef<{
    colIdx: number;
    startX: number;
    startWidths: number[];
    tableW: number;
  } | null>(null);

  const handleDividerMouseDown = useCallback(
    (colIdx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!onUpdate || !tableRef.current) return;
      const tableW = tableRef.current.getBoundingClientRect().width / zoomFactor;
      colResizeRef.current = {
        colIdx,
        startX: e.clientX,
        startWidths: visibleCols.map((c) => c.widthPercent),
        tableW,
      };

      const onMouseMove = (me: MouseEvent) => {
        const ref = colResizeRef.current;
        if (!ref) return;
        const dx = (me.clientX - ref.startX) / zoomFactor;
        const dPct = (dx / ref.tableW) * totalW;
        const newW = [...ref.startWidths];
        newW[ref.colIdx]     = Math.max(5, ref.startWidths[ref.colIdx] + dPct);
        newW[ref.colIdx + 1] = Math.max(5, ref.startWidths[ref.colIdx + 1] - dPct);
        // Map back onto the full allCols array (hidden cols are unchanged)
        let vi = 0;
        const newColumns = allCols.map((c) => {
          if (!c.visible) return c;
          return { ...c, widthPercent: newW[vi++] };
        });
        onUpdate(component.id, { tableStyle: { ...ts, columns: newColumns } } as Partial<TemplateComponent>);
      };

      const onMouseUp = () => {
        colResizeRef.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [onUpdate, visibleCols, allCols, component.id, ts, zoomFactor, totalW]
  );

  return (
    <div
      ref={tableRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: ts?.rowBackgroundColor ?? '#fff' }}
    >
      {showHeader && (
        <div
          style={{
            display: 'flex',
            background: ts?.headerBackgroundColor ?? cfg.bg,
            borderBottom: `${ts?.borderWidth ?? 2}px solid ${borderColor}`,
            flexShrink: 0,
          }}
        >
          {visibleCols.map((col, i) => (
            <div
              key={col.id}
              style={{
                width: `${(col.widthPercent / totalW) * 100}%`,
                position: 'relative',
                padding: `${pad}px 5px`,
                fontSize: fz,
                fontWeight: 700,
                color: ts?.headerTextColor ?? cfg.accent,
                borderRight: i < visibleCols.length - 1 ? `1px solid ${borderColor}33` : 'none',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textAlign: col.align,
                boxSizing: 'border-box',
              }}
            >
              {col.label}
              {/* Drag-to-resize handle — only visible when component is selected */}
              {isSelected && onUpdate && i < visibleCols.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    right: -3,
                    top: 0,
                    width: 6,
                    height: '100%',
                    cursor: 'col-resize',
                    zIndex: 20,
                    background: 'rgba(59,130,246,0.35)',
                    borderRadius: 2,
                  }}
                  onMouseDown={(e) => handleDividerMouseDown(i, e)}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {subjects.map((row, r) => (
        <div
          key={r}
          style={{
            display: 'flex',
            flex: 1,
            borderBottom: `1px solid ${borderColor}22`,
            background: r % 2 === 1 ? (ts?.alternatingRowBackgroundColor ?? '#f8fafc') : (ts?.rowBackgroundColor ?? '#fff'),
            minHeight: 0,
          }}
        >
          {visibleCols.map((col, ci) => (
            <div
              key={col.id}
              style={{
                width: `${(col.widthPercent / totalW) * 100}%`,
                padding: `2px ${pad}px`,
                fontSize: fz,
                color: '#374151',
                borderRight: ci < visibleCols.length - 1 ? `1px solid ${borderColor}22` : 'none',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textAlign: col.align,
                boxSizing: 'border-box',
              }}
            >
              {getCellValue(row, col.dataKey)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Content renderer ────────────────────────────────────────────────────────
// Shows real school data + realistic sample student/academic data so the
// editor sees an accurate preview of what the printed document will look like.

function renderContent(component: TemplateComponent, preview: DesignerPreviewData): React.ReactNode {
  const { type, layout } = component;
  const cfg = getConfig(type);

  const fontFamily = layout.font?.family ?? 'inherit';
  const fontSize   = layout.font?.size ? `${layout.font.size}pt` : '11px';
  const fontWeight = layout.font?.weight ?? 'normal';
  const fontStyle  = layout.font?.style  ?? 'normal';
  const textColor  = layout.color?.text  ?? '#1e293b';
  const bgColor    = layout.color?.background;
  const alignment  = layout.alignment ?? 'left';

  const textStyle: React.CSSProperties = { fontFamily, fontSize, fontWeight, fontStyle, color: textColor, textAlign: alignment };

  // Helper — single-line value cell
  const Line = ({ value, bold }: { value: string; bold?: boolean }) => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '3px 8px', background: bgColor ?? cfg.bg, overflow: 'hidden', boxSizing: 'border-box', ...textStyle }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: bold ? 700 : undefined }}>{value}</span>
    </div>
  );

  // ── School Logo ─────────────────────────────────────────────────────────
  if (type === 'SCHOOL_LOGO') {
    if (preview.school.logo_url) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bgColor ?? 'transparent', overflow: 'hidden', borderRadius: 6 }}>
          <img src={preview.school.logo_url} alt="School logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      );
    }
    return (
      <div style={{ width: '100%', height: '100%', background: bgColor ?? cfg.bg, border: `2px dashed ${cfg.accent}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={cfg.accent} strokeWidth={1.5}>
          <rect x={3} y={3} width={18} height={18} rx={2} /><circle cx={8.5} cy={8.5} r={1.5} /><path d="M21 15l-5-5L5 21" />
        </svg>
        <span style={{ fontSize: 9, color: cfg.accent, fontWeight: 600 }}>SCHOOL LOGO</span>
      </div>
    );
  }

  // ── Student Photo ───────────────────────────────────────────────────────
  if (type === 'STUDENT_PHOTO') {
    if (preview.student.photo_url) {
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 4 }}>
          <img src={preview.student.photo_url} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      );
    }
    return (
      <div style={{ width: '100%', height: '100%', background: bgColor ?? '#e2e8f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <svg width="55%" height="55%" viewBox="0 0 24 24" fill="#94a3b8">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
      </div>
    );
  }

  // ── Background image ────────────────────────────────────────────────────
  if (type === 'BACKGROUND_IMAGE') {
    return (
      <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(45deg,#f1f5f9 0,#f1f5f9 10px,#e2e8f0 10px,#e2e8f0 20px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, background: '#fff', padding: '2px 8px', borderRadius: 4 }}>BACKGROUND IMAGE</span>
      </div>
    );
  }

  // ── School info ─────────────────────────────────────────────────────────
  if (type === 'SCHOOL_NAME')    return <Line value={preview.school.name}    bold />;
  if (type === 'SCHOOL_MOTTO')   return <Line value={preview.school.motto}  />;
  if (type === 'SCHOOL_ADDRESS') return <Line value={preview.school.address} />;
  if (type === 'SCHOOL_CONTACT') return <Line value={preview.school.contact} />;

  // ── Student info ────────────────────────────────────────────────────────
  if (type === 'STUDENT_NAME')       return <Line value={preview.student.name}                    bold />;
  if (type === 'STUDENT_CLASS')      return <Line value={preview.student.class}                        />;
  if (type === 'STUDENT_STREAM')     return <Line value={`Stream ${preview.student.stream}`}           />;
  if (type === 'STUDENT_NUMBER')     return <Line value={preview.student.number}                       />;
  if (type === 'STUDENT_ATTENDANCE') return <Line value={`Attendance: ${preview.student.attendance}`}  />;

  // ── Academic results ────────────────────────────────────────────────────
  if (type === 'GRADE_DISPLAY') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bgColor ?? cfg.bg, ...textStyle }}>
        <span style={{ fontWeight: 700, fontSize: '18px', color: textColor !== '#1e293b' ? textColor : cfg.accent }}>D1</span>
      </div>
    );
  }

  if (type === 'AGGREGATE_DISPLAY') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', background: bgColor ?? cfg.bg, boxSizing: 'border-box', ...textStyle }}>
        <span style={{ color: cfg.accent, fontWeight: 600, fontSize: 10 }}>Aggregate:</span>
        <span style={{ fontWeight: 700 }}>{preview.academic.aggregate}</span>
      </div>
    );
  }

  if (type === 'DIVISION_DISPLAY') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '3px 8px', background: bgColor ?? cfg.bg, boxSizing: 'border-box', ...textStyle }}>
        <span style={{ fontWeight: 700 }}>{preview.academic.division}</span>
      </div>
    );
  }

  // ── Remarks ─────────────────────────────────────────────────────────────
  if (type === 'TEACHER_REMARKS') {
    return (
      <div style={{ width: '100%', height: '100%', background: bgColor ?? cfg.bg, padding: '4px 8px', overflow: 'hidden', boxSizing: 'border-box', ...textStyle }}>
        <div style={{ fontSize: 8, color: cfg.accent, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Class Teacher's Remarks</div>
        <div style={{ fontSize: 9, color: textColor !== '#1e293b' ? textColor : '#374151', lineHeight: 1.5 }}>{preview.teacher.remarks}</div>
        <div style={{ fontSize: 8, color: '#64748b', marginTop: 6, fontStyle: 'italic' }}>— {preview.teacher.name}</div>
      </div>
    );
  }

  if (type === 'HEAD_TEACHER_COMMENTS') {
    return (
      <div style={{ width: '100%', height: '100%', background: bgColor ?? cfg.bg, padding: '4px 8px', overflow: 'hidden', boxSizing: 'border-box', ...textStyle }}>
        <div style={{ fontSize: 8, color: cfg.accent, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Head Teacher's Comments</div>
        <div style={{ fontSize: 9, color: textColor !== '#1e293b' ? textColor : '#374151', lineHeight: 1.5 }}>{preview.headTeacher.comments}</div>
        <div style={{ fontSize: 8, color: '#64748b', marginTop: 6, fontStyle: 'italic' }}>— {preview.headTeacher.name}</div>
      </div>
    );
  }

  // ── Payment ─────────────────────────────────────────────────────────────
  if (type === 'PAYMENT_SUMMARY' || type === 'FEE_STRUCTURE') {
    const { totalFees, paid, balance, currency } = preview.payment;
    const fmt = (n: number) => `${currency} ${n.toLocaleString()}`;
    return (
      <div style={{ width: '100%', height: '100%', background: bgColor ?? cfg.bg, padding: '4px 8px', overflow: 'hidden', boxSizing: 'border-box', ...textStyle }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: cfg.accent, marginBottom: 4, textTransform: 'uppercase' as const }}>Payment Summary</div>
        {([['Total Fees', fmt(totalFees)], ['Amount Paid', fmt(paid)], ['Balance Due', fmt(balance)]] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#374151', marginBottom: 2 }}>
            <span>{k}</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'FEES_BALANCE') {
    const { balance, currency } = preview.payment;
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '3px 8px', background: bgColor ?? cfg.bg, boxSizing: 'border-box', ...textStyle }}>
        <span style={{ fontWeight: 700, color: balance > 0 ? '#ef4444' : '#10b981' }}>
          Balance: {currency} {balance.toLocaleString()}
        </span>
      </div>
    );
  }

  // ── Shapes ──────────────────────────────────────────────────────────────
  if (type === 'LINE') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '100%', height: Math.max(1, layout.size.height), backgroundColor: textColor !== '#1e293b' ? textColor : '#334155' }} />
      </div>
    );
  }

  if (type === 'BORDER' || type === 'RECTANGLE') {
    return <div style={{ width: '100%', height: '100%', border: `2px solid ${layout.color?.text ?? (type === 'BORDER' ? '#334155' : '#64748b')}`, backgroundColor: bgColor ?? 'transparent', boxSizing: 'border-box' }} />;
  }

  if (type === 'CIRCLE') {
    return <div style={{ width: '100%', height: '100%', border: `2px solid ${layout.color?.text ?? '#64748b'}`, borderRadius: '50%', backgroundColor: bgColor ?? 'transparent', boxSizing: 'border-box' }} />;
  }

  // ── Watermark ───────────────────────────────────────────────────────────
  if (type === 'WATERMARK') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', overflow: 'hidden' }}>
        <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: 6, color: 'rgba(100,116,139,0.18)', transform: 'rotate(-30deg)', whiteSpace: 'nowrap' }}>
          {preview.school.name.toUpperCase()}
        </span>
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

  // ── Text Label — shows component.content; double-click to edit ─────────
  if (type === 'TEXT_LABEL') {
    const text = component.content ?? 'Label';
    return (
      <div
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '2px 6px', boxSizing: 'border-box', background: bgColor ?? 'transparent', overflow: 'hidden', ...textStyle }}
        title="Double-click to edit text"
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
      </div>
    );
  }

  // ── Generic fallback ────────────────────────────────────────────────────
  const label = (type as string).replace(/_/g, ' ');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', boxSizing: 'border-box', background: bgColor ?? cfg.bg, overflow: 'hidden', ...textStyle }}>
      {cfg.icon && <span style={{ fontSize: 12, flexShrink: 0, opacity: 0.7 }}>{cfg.icon}</span>}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasComponentProps {
  component: TemplateComponent;
  isSelected: boolean;
  isPreview: boolean;
  zoom: number;
  previewData: DesignerPreviewData;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  onRotate: (id: string, angle: number) => void;
  onUpdate?: (id: string, patch: Partial<TemplateComponent>) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CanvasComponent({
  component,
  isSelected,
  isPreview,
  zoom,
  previewData,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onUpdate,
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
      : `1px dashed ${cfg.accent}99`,
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
      {(component.type === 'RESULTS_TABLE' || component.type === 'SUBJECT_SCORES')
        ? <ResultsTableContent
            component={component}
            preview={previewData}
            isSelected={isSelected && !isPreview}
            zoomFactor={zoomFactor}
            onUpdate={onUpdate}
          />
        : renderContent(component, previewData)
      }

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
