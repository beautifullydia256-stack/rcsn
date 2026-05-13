/**
 * Visual Template Designer - State Management Index
 * 
 * Central export point for all state management types and utilities.
 * Import state types from this file to access template designer state interfaces.
 * 
 * @example
 * ```typescript
 * import type { TemplateState, EditorState, TemplateActions } from './application/state';
 * import { useTemplateStore } from './application/state';
 * ```
 */

export type {
  TemplateSnapshot,
  TemplateState,
  EditorState,
  HistoryState,
  ActionType,
  TemplateAction,
  TemplateActions,
  EditorActions,
  DesignerState,
} from './types';

export {
  initialTemplateState,
  initialEditorState,
  initialHistoryState,
  initialDesignerState,
} from './types';

export { UndoRedoManager } from './UndoRedoManager';

export { useTemplateStore } from './store';

export * from './actions';
