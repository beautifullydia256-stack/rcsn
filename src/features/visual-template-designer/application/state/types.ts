/**
 * Visual Template Designer - State Management Types
 * 
 * This file defines the state management interfaces for the template designer.
 * It includes template state, editor state, history state, and action types
 * for managing the undo/redo system and template editing operations.
 * 
 * Requirements:
 * - Requirement 1: Visual Canvas Editor (undo/redo with 50 action history)
 * - Requirement 5: Undo/redo system with unlimited history
 * - Requirement 6: Multi-page template support
 */

import type { Template, TemplateComponent } from '../../domain/types';

/**
 * Snapshot of template state for undo/redo history.
 * Captures the complete template state at a point in time.
 */
export interface TemplateSnapshot {
  template: Template;
  timestamp: Date;
  actionType: ActionType;
  actionDescription: string;
}

/**
 * Main template state interface.
 * Manages the current template, selection, clipboard, and edit history.
 */
export interface TemplateState {
  /** Current template being edited (null if no template loaded) */
  current: Template | null;
  
  /** History of template snapshots for undo functionality */
  history: TemplateSnapshot[];
  
  /** Current position in history (for undo/redo navigation) */
  historyIndex: number;
  
  /** ID of currently selected component (null if no selection) */
  selectedComponentId: string | null;
  
  /** IDs of multiple selected components (for multi-select operations) */
  selectedComponentIds: string[];
  
  /** Component in clipboard (for copy/paste operations) */
  clipboard: TemplateComponent | null;
  
  /** Flag indicating if template has unsaved changes */
  isDirty: boolean;
  
  /** Current page being edited (for multi-page templates) */
  currentPageId: string | null;
}

/**
 * Editor UI state interface.
 * Manages UI-specific state like zoom, pan, grid settings.
 */
export interface EditorState {
  /** Current zoom level (25-400 percent) */
  zoom: number;
  
  /** Canvas pan offset X coordinate */
  panX: number;
  
  /** Canvas pan offset Y coordinate */
  panY: number;
  
  /** Whether grid lines are visible */
  gridEnabled: boolean;
  
  /** Grid spacing in pixels (5, 10, 20, 25, 50) */
  gridSpacing: number;
  
  /** Whether snap-to-grid is enabled */
  snapToGrid: boolean;
  
  /** Whether rulers are visible */
  rulersVisible: boolean;
  
  /** Whether alignment guides are enabled */
  alignmentGuidesEnabled: boolean;
  
  /** Current unit of measurement (px, mm, in) */
  unit: 'px' | 'mm' | 'in';
  
  /** Whether in preview mode (vs edit mode) */
  previewMode: boolean;
  
  /** Whether properties panel is visible */
  propertiesPanelVisible: boolean;
  
  /** Whether component library panel is visible */
  componentLibraryVisible: boolean;
}

/**
 * History state interface for undo/redo operations.
 * Manages the undo/redo stacks and provides history navigation.
 */
export interface HistoryState {
  /** Stack of past states (for undo) */
  past: TemplateSnapshot[];
  
  /** Current state */
  present: TemplateSnapshot | null;
  
  /** Stack of future states (for redo) */
  future: TemplateSnapshot[];
  
  /** Maximum number of history entries to maintain */
  maxHistorySize: number;
  
  /** Whether undo is available */
  canUndo: boolean;
  
  /** Whether redo is available */
  canRedo: boolean;
}

/**
 * Action types for template state mutations.
 * Each action type represents a specific operation that can be undone/redone.
 */
export type ActionType =
  // Component operations
  | 'ADD_COMPONENT'
  | 'UPDATE_COMPONENT'
  | 'DELETE_COMPONENT'
  | 'MOVE_COMPONENT'
  | 'RESIZE_COMPONENT'
  | 'ROTATE_COMPONENT'
  | 'DUPLICATE_COMPONENT'
  
  // Multi-component operations
  | 'GROUP_COMPONENTS'
  | 'UNGROUP_COMPONENTS'
  | 'ALIGN_COMPONENTS'
  | 'DISTRIBUTE_COMPONENTS'
  
  // Layer operations
  | 'BRING_TO_FRONT'
  | 'SEND_TO_BACK'
  | 'BRING_FORWARD'
  | 'SEND_BACKWARD'
  
  // Page operations
  | 'ADD_PAGE'
  | 'REMOVE_PAGE'
  | 'REORDER_PAGES'
  | 'DUPLICATE_PAGE'
  
  // Template operations
  | 'LOAD_TEMPLATE'
  | 'SAVE_TEMPLATE'
  | 'UPDATE_TEMPLATE_METADATA'
  
  // Clipboard operations
  | 'COPY_COMPONENT'
  | 'PASTE_COMPONENT'
  | 'CUT_COMPONENT';

/**
 * Base action interface for template operations.
 * All actions implement execute and undo methods for undo/redo functionality.
 */
export interface TemplateAction {
  /** Action type identifier */
  type: ActionType;
  
  /** Human-readable description of the action */
  description: string;
  
  /** Timestamp when action was created */
  timestamp: Date;
  
  /**
   * Execute the action, transforming the current state.
   * @param state - Current template state
   * @returns New template state after action execution
   */
  execute: (state: TemplateState) => TemplateState;
  
  /**
   * Undo the action, reverting to previous state.
   * @param state - Current template state
   * @returns Previous template state before action execution
   */
  undo: (state: TemplateState) => TemplateState;
}

/**
 * Template actions interface.
 * Defines all available actions for template manipulation.
 */
export interface TemplateActions {
  // Template lifecycle
  loadTemplate: (templateId: string) => Promise<void>;
  saveTemplate: () => Promise<void>;
  createTemplate: (category: string) => void;
  closeTemplate: () => void;
  
  // Component operations
  addComponent: (component: TemplateComponent, pageId?: string) => void;
  updateComponent: (componentId: string, updates: Partial<TemplateComponent>) => void;
  deleteComponent: (componentId: string) => void;
  duplicateComponent: (componentId: string) => void;
  
  // Component manipulation
  moveComponent: (componentId: string, x: number, y: number) => void;
  resizeComponent: (componentId: string, width: number, height: number) => void;
  rotateComponent: (componentId: string, rotation: number) => void;
  
  // Layer management
  bringToFront: (componentId: string) => void;
  sendToBack: (componentId: string) => void;
  bringForward: (componentId: string) => void;
  sendBackward: (componentId: string) => void;
  
  // Selection
  selectComponent: (componentId: string | null) => void;
  selectMultipleComponents: (componentIds: string[]) => void;
  clearSelection: () => void;
  
  // Clipboard
  copyComponent: () => void;
  cutComponent: () => void;
  pasteComponent: () => void;
  
  // Grouping
  groupComponents: (componentIds: string[]) => void;
  ungroupComponents: (groupId: string) => void;
  
  // Alignment
  alignLeft: (componentIds: string[]) => void;
  alignCenter: (componentIds: string[]) => void;
  alignRight: (componentIds: string[]) => void;
  alignTop: (componentIds: string[]) => void;
  alignMiddle: (componentIds: string[]) => void;
  alignBottom: (componentIds: string[]) => void;
  
  // Distribution
  distributeHorizontally: (componentIds: string[]) => void;
  distributeVertically: (componentIds: string[]) => void;
  
  // Page management
  addPage: () => void;
  removePage: (pageId: string) => void;
  reorderPages: (pageIds: string[]) => void;
  duplicatePage: (pageId: string) => void;
  setCurrentPage: (pageId: string) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

/**
 * Editor actions interface.
 * Defines actions for editor UI state management.
 */
export interface EditorActions {
  // Zoom
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  zoomToActualSize: () => void;
  
  // Pan
  setPan: (x: number, y: number) => void;
  resetPan: () => void;
  
  // Grid
  toggleGrid: () => void;
  setGridSpacing: (spacing: number) => void;
  toggleSnapToGrid: () => void;
  
  // Rulers
  toggleRulers: () => void;
  
  // Alignment guides
  toggleAlignmentGuides: () => void;
  
  // Unit
  setUnit: (unit: 'px' | 'mm' | 'in') => void;
  
  // Mode
  togglePreviewMode: () => void;
  
  // Panels
  togglePropertiesPanel: () => void;
  toggleComponentLibrary: () => void;
}

/**
 * Combined state interface for the entire template designer.
 * Aggregates template state, editor state, and history state.
 */
export interface DesignerState {
  template: TemplateState;
  editor: EditorState;
  history: HistoryState;
}

/**
 * Initial template state.
 * Used when creating a new template or resetting state.
 */
export const initialTemplateState: TemplateState = {
  current: null,
  history: [],
  historyIndex: -1,
  selectedComponentId: null,
  selectedComponentIds: [],
  clipboard: null,
  isDirty: false,
  currentPageId: null,
};

/**
 * Initial editor state.
 * Default UI settings for the editor.
 */
export const initialEditorState: EditorState = {
  zoom: 100,
  panX: 0,
  panY: 0,
  gridEnabled: true,
  gridSpacing: 10,
  snapToGrid: true,
  rulersVisible: true,
  alignmentGuidesEnabled: true,
  unit: 'px',
  previewMode: false,
  propertiesPanelVisible: true,
  componentLibraryVisible: true,
};

/**
 * Initial history state.
 * Empty history with default settings.
 */
export const initialHistoryState: HistoryState = {
  past: [],
  present: null,
  future: [],
  maxHistorySize: 50, // Requirement: maintain at least 50 actions
  canUndo: false,
  canRedo: false,
};

/**
 * Initial designer state.
 * Combines all initial states.
 */
export const initialDesignerState: DesignerState = {
  template: initialTemplateState,
  editor: initialEditorState,
  history: initialHistoryState,
};
