/**
 * Visual Template Designer - Root Layout Component
 *
 * Three-column layout:
 *   [ComponentLibrary] | [VisualCanvas] | [PropertiesPanel]
 * Bottom: [PageNavigation]
 *
 * Enters "full-screen" mode on mount: hides the admin sidebar via CSS
 * injection so the canvas gets the maximum available space.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { VisualCanvas } from './VisualCanvas';
import { ComponentLibrary } from './ComponentLibrary';
import { PropertiesPanel } from './PropertiesPanel';
import { PageNavigation } from './PageNavigation';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';
import { TemplateDesignerErrorBoundary } from './TemplateDesignerErrorBoundary';
import { GridSettings } from './GridSettings';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useTemplateStore } from '../../application/state/store';
import type { Template } from '../../domain/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TemplateDesignerProps {
  template: Template;
  onSave?: (template: Template) => void;
  onClose?: () => void;
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Full-screen helper — hides the admin sidebar while designer is open
// ---------------------------------------------------------------------------

function useDesignerFullScreen() {
  useEffect(() => {
    const STYLE_ID = 'designer-fullscreen-css';
    document.body.classList.add('designer-fullscreen');

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        body.designer-fullscreen .pw-sidebar           { display: none !important; }
        body.designer-fullscreen .pw-hamburger         { display: none !important; }
        body.designer-fullscreen .pw-main              { margin-left: 0 !important; width: 100% !important; overflow: hidden !important; }
        body.designer-fullscreen .pw-layout            { overflow: hidden !important; }
      `;
      document.head.appendChild(style);
    }

    return () => {
      document.body.classList.remove('designer-fullscreen');
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TemplateDesigner({ template, onSave, onClose }: TemplateDesignerProps) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [libOpen, setLibOpen] = useState(true);
  const [propsOpen, setPropsOpen] = useState(true);

  // Grid / snap / ruler state
  const [gridEnabled, setGridEnabled] = useState(true);
  const [gridSize, setGridSize] = useState<5 | 10 | 20 | 25 | 50>(10);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [rulersVisible, setRulersVisible] = useState(false);
  const [unit, setUnit] = useState<'px' | 'mm' | 'in'>('px');

  const undo = useTemplateStore((s) => s.undo);
  const redo = useTemplateStore((s) => s.redo);
  const loadTemplate = useTemplateStore((s) => s.loadTemplate);
  const current = useTemplateStore((s) => s.current);
  const addPage = useTemplateStore((s) => s.addPage);
  const removePage = useTemplateStore((s) => s.removePage);
  const reorderPages = useTemplateStore((s) => s.reorderPages);
  const setCurrentPage = useTemplateStore((s) => s.setCurrentPage);
  const currentPageId = useTemplateStore((s) => s.currentPageId);

  // Hide the admin sidebar while the designer is open
  useDesignerFullScreen();

  // Initialise store with the incoming template on first render
  React.useEffect(() => {
    loadTemplate(template);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  const handleSave = useCallback(() => {
    if (current && onSave) onSave(current);
  }, [current, onSave]);

  useKeyboardShortcuts();

  const pages = current?.pages ?? [];

  return (
    <TemplateDesignerErrorBoundary>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100%',
          backgroundColor: '#f1f5f9',
          overflow: 'hidden',
          fontFamily: 'system-ui, sans-serif',
          position: 'fixed',
          inset: 0,
          zIndex: 500,
        }}
      >
        {/* ── Top toolbar ─────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            height: 44,
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            flexShrink: 0,
            gap: 8,
          }}
        >
          {/* Left: undo / redo / panel toggles / title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <ToolbarBtn onClick={() => undo()} title="Undo (Ctrl+Z)">↩</ToolbarBtn>
            <ToolbarBtn onClick={() => redo()} title="Redo (Ctrl+Y)">↪</ToolbarBtn>

            <div style={{ width: 1, height: 20, background: '#334155', margin: '0 2px' }} />

            {/* Toggle component library */}
            <ToolbarBtn
              onClick={() => setLibOpen((v) => !v)}
              title={libOpen ? 'Hide components panel' : 'Show components panel'}
              active={libOpen}
            >
              ◧
            </ToolbarBtn>

            {/* Toggle properties panel */}
            <ToolbarBtn
              onClick={() => setPropsOpen((v) => !v)}
              title={propsOpen ? 'Hide properties panel' : 'Show properties panel'}
              active={propsOpen}
            >
              ◨
            </ToolbarBtn>

            <div style={{ width: 1, height: 20, background: '#334155', margin: '0 2px' }} />

            <span
              style={{
                fontWeight: 600,
                color: '#f8fafc',
                fontSize: 13,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 240,
              }}
            >
              {current?.name ?? template.name}
            </span>
          </div>

          {/* Right: grid settings / save / shortcuts / close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <GridSettings
              gridEnabled={gridEnabled}
              gridSize={gridSize}
              snapEnabled={snapEnabled}
              rulersVisible={rulersVisible}
              unit={unit}
              onToggleGrid={() => setGridEnabled((v) => !v)}
              onSetGridSize={setGridSize}
              onToggleSnap={() => setSnapEnabled((v) => !v)}
              onToggleRulers={() => setRulersVisible((v) => !v)}
              onSetUnit={setUnit}
            />

            {onSave && (
              <button
                onClick={handleSave}
                style={{
                  padding: '4px 14px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            )}

            <ToolbarBtn onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts (?)">?</ToolbarBtn>

            {onClose && (
              <ToolbarBtn onClick={onClose} title="Close designer"><X style={{ width: 14, height: 14 }} /></ToolbarBtn>
            )}
          </div>
        </div>

        {/* ── Three-column main area ───────────────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* Left: Component Library */}
          {libOpen && (
            <aside
              style={{
                width: 220,
                flexShrink: 0,
                background: '#fff',
                color: '#1e293b',
                borderRight: '1px solid #e2e8f0',
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              <ComponentLibrary templateCategory={current?.category ?? 'REPORT_CARD'} />
            </aside>
          )}

          {/* Centre: Canvas */}
          <main style={{ flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative' }}>
            <VisualCanvas
              gridEnabled={gridEnabled}
              gridSize={gridSize}
              snapEnabled={snapEnabled}
              rulersVisible={rulersVisible}
            />
          </main>

          {/* Right: Properties Panel */}
          {propsOpen && (
            <aside
              style={{
                width: 256,
                flexShrink: 0,
                background: '#fff',
                color: '#1e293b',
                borderLeft: '1px solid #e2e8f0',
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              <PropertiesPanel />
            </aside>
          )}
        </div>

        {/* ── Bottom: Page Navigation ──────────────────────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            background: '#1e293b',
            borderTop: '1px solid #334155',
          }}
        >
          <PageNavigation
            pages={pages}
            currentPageId={currentPageId}
            onSelectPage={(id) => setCurrentPage?.(id)}
            onAddPage={() => addPage?.()}
            onRemovePage={(id) => removePage?.(id)}
            onReorderPages={(ids) => reorderPages?.(ids)}
          />
        </div>

        {/* Modals */}
        <KeyboardShortcutsPanel
          isOpen={shortcutsOpen}
          onClose={() => setShortcutsOpen(false)}
        />
      </div>
    </TemplateDesignerErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Small toolbar button
// ---------------------------------------------------------------------------

function ToolbarBtn({
  onClick,
  title,
  children,
  active,
}: {
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: '3px 7px',
        background: active ? '#334155' : 'transparent',
        color: active ? '#f8fafc' : '#94a3b8',
        border: '1px solid',
        borderColor: active ? '#475569' : 'transparent',
        borderRadius: 5,
        fontSize: 14,
        cursor: 'pointer',
        lineHeight: 1.4,
        transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = '#f8fafc'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
    >
      {children}
    </button>
  );
}

export default TemplateDesigner;
