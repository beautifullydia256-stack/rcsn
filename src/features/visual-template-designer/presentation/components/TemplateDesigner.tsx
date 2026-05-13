/**
 * Visual Template Designer - Root Layout Component
 *
 * Three-column layout:
 *   [ComponentLibrary] | [VisualCanvas] | [PropertiesPanel]
 * Bottom: [PageNavigation]
 */

import React, { useCallback, useState } from 'react';
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
// Component
// ---------------------------------------------------------------------------

export function TemplateDesigner({ template, onSave, onClose }: TemplateDesignerProps) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Grid / snap / ruler state (controlled locally, passed down to GridSettings)
  const [gridEnabled, setGridEnabled] = useState(true);
  const [gridSize, setGridSize] = useState<5 | 10 | 20 | 25 | 50>(10);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [rulersVisible, setRulersVisible] = useState(true);
  const [unit, setUnit] = useState<'px' | 'mm' | 'in'>('px');

  const { undo, redo, loadTemplate, current, addPage, removePage, reorderPages, setCurrentPage } =
    useTemplateStore((s) => ({
      undo: s.undo,
      redo: s.redo,
      loadTemplate: s.loadTemplate,
      current: s.current,
      addPage: s.addPage,
      removePage: s.removePage,
      reorderPages: s.reorderPages,
      setCurrentPage: s.setCurrentPage,
    }));

  // Initialise store with the incoming template on first render
  React.useEffect(() => {
    loadTemplate(template);
  }, [template.id]);

  const handleSave = useCallback(() => {
    if (current && onSave) onSave(current);
  }, [current, onSave]);

  // Register keyboard shortcuts (hook reads from store directly)
  useKeyboardShortcuts();

  const currentPageId = useTemplateStore((s) => s.currentPageId);
  const pages = current?.pages ?? [];

  return (
    <TemplateDesignerErrorBoundary>
      <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
        {/* Top toolbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 rounded hover:bg-gray-100"
              onClick={() => undo()}
              title="Undo (Ctrl+Z)"
            >
              ↩
            </button>
            <button
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 rounded hover:bg-gray-100"
              onClick={() => redo()}
              title="Redo (Ctrl+Y)"
            >
              ↪
            </button>
            <span className="font-semibold text-gray-800 text-sm truncate max-w-xs ml-2">
              {current?.name ?? template.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
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
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                onClick={handleSave}
                aria-label="Save template"
              >
                Save
              </button>
            )}
            <button
              className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100"
              onClick={() => setShortcutsOpen(true)}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              ?
            </button>
            {onClose && (
              <button
                className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100"
                onClick={onClose}
                aria-label="Close designer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Three-column main area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: Component Library */}
          <aside className="w-56 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
            <ComponentLibrary templateCategory={current?.category ?? 'REPORT_CARD'} />
          </aside>

          {/* Centre: Canvas */}
          <main className="flex-1 min-w-0 overflow-hidden">
            <VisualCanvas />
          </main>

          {/* Right: Properties Panel */}
          <aside className="w-64 shrink-0 bg-white border-l border-gray-200 overflow-y-auto">
            <PropertiesPanel />
          </aside>
        </div>

        {/* Bottom: Page Navigation */}
        <div className="shrink-0 bg-white border-t border-gray-200">
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

export default TemplateDesigner;
