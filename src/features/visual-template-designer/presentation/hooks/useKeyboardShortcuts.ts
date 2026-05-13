/**
 * Visual Template Designer - Keyboard Shortcuts Hook
 *
 * Attaches global keyboard event listeners to document and dispatches
 * template designer actions from the Zustand store.
 *
 * Shortcuts:
 *   Ctrl/Cmd + Z         → undo
 *   Ctrl/Cmd + Y         → redo
 *   Ctrl/Cmd + C         → copyComponent
 *   Ctrl/Cmd + V         → pasteComponent
 *   Delete / Backspace   → deleteComponent (selected)
 *   Ctrl/Cmd + S         → saveTemplate (prevents default browser save)
 *   Ctrl/Cmd + D         → duplicateComponent (prevents default)
 *   ArrowLeft/Right/Up/Down           → moveComponent by 1px
 *   Shift + ArrowLeft/Right/Up/Down   → moveComponent by 10px
 *
 * Requirements:
 * - 18.1: Ctrl+Z undo
 * - 18.2: Ctrl+Y redo
 * - 18.3: Ctrl+C copy
 * - 18.4: Ctrl+V paste
 * - 18.5: Delete/Backspace delete selected
 * - 18.6: Ctrl+S save
 * - 18.7: Ctrl+D duplicate
 * - 18.8: Arrow keys move
 */

import { useEffect } from 'react';
import { useTemplateStore } from '../../application/state/store';

export function useKeyboardShortcuts(): void {
  const {
    undo,
    redo,
    copyComponent,
    pasteComponent,
    deleteComponent,
    saveTemplate,
    duplicateComponent,
    moveComponent,
    selectedComponentId,
    current,
  } = useTemplateStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const ctrl = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key;

      // Ignore shortcuts when focus is inside an input/textarea/select/contenteditable
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        if (target.isContentEditable) return;
      }

      // ----------------------------------------------------------------
      // Ctrl/Cmd combinations
      // ----------------------------------------------------------------
      if (ctrl) {
        switch (key.toLowerCase()) {
          case 'z': {
            e.preventDefault();
            undo();
            break;
          }
          case 'y': {
            e.preventDefault();
            redo();
            break;
          }
          case 'c': {
            // Only hijack when there is something selected
            if (selectedComponentId) {
              e.preventDefault();
              copyComponent();
            }
            break;
          }
          case 'v': {
            if (current) {
              e.preventDefault();
              pasteComponent();
            }
            break;
          }
          case 's': {
            e.preventDefault();
            saveTemplate().catch(() => { /* ignore */ });
            break;
          }
          case 'd': {
            if (selectedComponentId) {
              e.preventDefault();
              duplicateComponent(selectedComponentId);
            }
            break;
          }
        }
        return; // handled or intentionally ignored
      }

      // ----------------------------------------------------------------
      // Delete / Backspace → delete selected component
      // ----------------------------------------------------------------
      if (key === 'Delete' || key === 'Backspace') {
        if (selectedComponentId) {
          e.preventDefault();
          deleteComponent(selectedComponentId);
        }
        return;
      }

      // ----------------------------------------------------------------
      // Arrow keys → move selected component
      // ----------------------------------------------------------------
      if (!selectedComponentId || !current) return;

      const step = e.shiftKey ? 10 : 1;

      // Find the component to get its current position
      let currentX = 0;
      let currentY = 0;
      for (const page of current.pages) {
        const comp = page.elements.find((el) => el.id === selectedComponentId);
        if (comp) {
          currentX = comp.layout.position.x;
          currentY = comp.layout.position.y;
          break;
        }
      }

      switch (key) {
        case 'ArrowLeft': {
          e.preventDefault();
          moveComponent(selectedComponentId, currentX - step, currentY);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          moveComponent(selectedComponentId, currentX + step, currentY);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          moveComponent(selectedComponentId, currentX, currentY - step);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          moveComponent(selectedComponentId, currentX, currentY + step);
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    undo,
    redo,
    copyComponent,
    pasteComponent,
    deleteComponent,
    saveTemplate,
    duplicateComponent,
    moveComponent,
    selectedComponentId,
    current,
  ]);
}
