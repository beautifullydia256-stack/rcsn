/**
 * Visual Template Designer - Global State Management Store (Zustand)
 * 
 * This file implements the global state management for the template designer using Zustand.
 * It integrates the UndoRedoManager and action classes to provide a complete state management
 * solution with undo/redo functionality.
 * 
 * Requirements:
 * - Requirement 1.11: Undo history of at least 50 actions
 * - Requirement 1.12: Redo history of at least 50 actions
 * - Requirement 1.13: Undo/redo system integration
 * - Requirement 13.2: Save template with unique name
 * - Requirement 13.3: Load existing template for editing
 * - Requirement 18.3: Copy component with Ctrl+C
 * - Requirement 18.4: Paste component with Ctrl+V
 * 
 * Architecture:
 * - Uses Zustand for lightweight, performant state management
 * - Integrates UndoRedoManager for undo/redo functionality
 * - All mutating actions go through the UndoRedoManager
 * - Provides actions for template lifecycle, component operations, and clipboard
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Template, TemplateComponent } from '../../domain/types';
import type { TemplateState, TemplateSnapshot, ActionType } from './types';
import { UndoRedoManager } from './UndoRedoManager';
import {
  AddComponentAction,
  UpdateComponentAction,
  DeleteComponentAction,
  MoveComponentAction,
  ResizeComponentAction,
  RotateComponentAction,
  DuplicateComponentAction,
  BringToFrontAction,
  SendToBackAction,
  BringForwardAction,
  SendBackwardAction,
  GroupComponentsAction,
  UngroupComponentsAction,
  AlignComponentsAction,
  DistributeComponentsAction,
  AddPageAction,
  RemovePageAction,
  ReorderPagesAction,
  DuplicatePageAction,
  LoadTemplateAction,
  SaveTemplateAction,
  UpdateTemplateMetadataAction,
  CopyComponentAction,
  PasteComponentAction,
  CutComponentAction,
} from './actions';

/**
 * Extended template state with store actions.
 * Combines template state with all available actions.
 */
interface TemplateStore extends TemplateState {
  // UndoRedoManager instance
  undoRedoManager: UndoRedoManager;

  // Template lifecycle actions
  loadTemplate: (template: Template) => void;
  saveTemplate: () => Promise<void>;
  createTemplate: (category: string, name: string) => void;
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
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/**
 * Initial template state.
 */
const initialState: TemplateState = {
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
 * Create the template designer store.
 * 
 * This store manages all template state and provides actions for manipulation.
 * All mutating actions are executed through the UndoRedoManager to enable undo/redo.
 */
export const useTemplateStore = create<TemplateStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...initialState,

      // UndoRedoManager instance (50 action history)
      undoRedoManager: new UndoRedoManager(50),

      // ========================================
      // Template Lifecycle Actions
      // ========================================

      /**
       * Load a template into the store.
       * This replaces the current template and clears history.
       */
      loadTemplate: (template: Template) => {
        const action = new LoadTemplateAction(template);
        const state = get();
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'LOAD_TEMPLATE',
          actionDescription: 'Load template',
        };

        // Add to undo/redo manager
        state.undoRedoManager.addAction(snapshot);

        set(newState);
      },

      /**
       * Save the current template.
       * This would typically call an API to persist the template.
       */
      saveTemplate: async () => {
        const state = get();
        if (!state.current) {
          throw new Error('No template to save');
        }

        // TODO: Implement actual save logic (API call)
        // For now, just mark as not dirty
        set({ isDirty: false });
      },

      /**
       * Create a new template with the specified category and name.
       */
      createTemplate: (category: string, name: string) => {
        // TODO: Implement template creation logic
        // This would create a new Template object with default values
        console.log('Create template:', category, name);
      },

      /**
       * Close the current template.
       * This clears the state and history.
       */
      closeTemplate: () => {
        const state = get();
        state.undoRedoManager.clear();
        set(initialState);
      },

      // ========================================
      // Component Operations
      // ========================================

      /**
       * Add a component to the template.
       */
      addComponent: (component: TemplateComponent, pageId?: string) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        // Use first page if no pageId specified
        const targetPageId = pageId || state.current.pages[0]?.id;
        if (!targetPageId) {
          throw new Error('No pages in template');
        }

        const action = new AddComponentAction(component, targetPageId);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'ADD_COMPONENT',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Update a component's properties.
       */
      updateComponent: (componentId: string, updates: Partial<TemplateComponent>) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new UpdateComponentAction(componentId, updates);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'UPDATE_COMPONENT',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Delete a component from the template.
       */
      deleteComponent: (componentId: string) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new DeleteComponentAction(componentId);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'DELETE_COMPONENT',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Duplicate a component.
       */
      duplicateComponent: (componentId: string) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new DuplicateComponentAction(componentId);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'DUPLICATE_COMPONENT',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      // ========================================
      // Component Manipulation
      // ========================================

      /**
       * Move a component to a new position.
       */
      moveComponent: (componentId: string, x: number, y: number) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new MoveComponentAction(componentId, { x, y, unit: 'px' });
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'MOVE_COMPONENT',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Resize a component.
       */
      resizeComponent: (componentId: string, width: number, height: number) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new ResizeComponentAction(componentId, { width, height, unit: 'px' });
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'RESIZE_COMPONENT',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Rotate a component.
       */
      rotateComponent: (componentId: string, rotation: number) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new RotateComponentAction(componentId, rotation);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'ROTATE_COMPONENT',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      // ========================================
      // Layer Management
      // ========================================

      /**
       * Bring a component to the front (highest z-index).
       */
      bringToFront: (componentId: string) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new BringToFrontAction(componentId);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'BRING_TO_FRONT',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Send a component to the back (lowest z-index).
       */
      sendToBack: (componentId: string) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new SendToBackAction(componentId);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'SEND_TO_BACK',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Bring a component forward one layer.
       */
      bringForward: (componentId: string) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new BringForwardAction(componentId);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'BRING_FORWARD',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Send a component backward one layer.
       */
      sendBackward: (componentId: string) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new SendBackwardAction(componentId);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'SEND_BACKWARD',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      // ========================================
      // Selection
      // ========================================

      /**
       * Select a component by ID.
       */
      selectComponent: (componentId: string | null) => {
        set({
          selectedComponentId: componentId,
          selectedComponentIds: componentId ? [componentId] : [],
        });
      },

      /**
       * Select multiple components.
       */
      selectMultipleComponents: (componentIds: string[]) => {
        set({
          selectedComponentId: componentIds[0] || null,
          selectedComponentIds: componentIds,
        });
      },

      /**
       * Clear component selection.
       */
      clearSelection: () => {
        set({
          selectedComponentId: null,
          selectedComponentIds: [],
        });
      },

      // ========================================
      // Clipboard
      // ========================================

      /**
       * Copy the selected component to clipboard.
       */
      copyComponent: () => {
        const state = get();
        if (!state.current || !state.selectedComponentId) {
          return;
        }

        const action = new CopyComponentAction(state.selectedComponentId);
        const newState = action.execute(state);
        set(newState);
      },

      /**
       * Cut the selected component to clipboard.
       */
      cutComponent: () => {
        const state = get();
        if (!state.current || !state.selectedComponentId) {
          return;
        }

        const action = new CutComponentAction(state.selectedComponentId);
        const newState = action.execute(state);

        // Create snapshot for history (cut modifies the template)
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'CUT_COMPONENT',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Paste the component from clipboard.
       */
      pasteComponent: () => {
        const state = get();
        if (!state.current || !state.clipboard) {
          return;
        }

        // Use current page or first page
        const pageId = state.currentPageId || state.current.pages[0]?.id;
        if (!pageId) {
          throw new Error('No pages in template');
        }

        const action = new PasteComponentAction(pageId);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'PASTE_COMPONENT',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      // ========================================
      // Grouping
      // ========================================

      /**
       * Group multiple components together.
       */
      groupComponents: (componentIds: string[]) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new GroupComponentsAction(componentIds);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'GROUP_COMPONENTS',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Ungroup components.
       */
      ungroupComponents: (groupId: string) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new UngroupComponentsAction(groupId);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'UNGROUP_COMPONENTS',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      // ========================================
      // Alignment
      // ========================================

      /**
       * Align components to the left.
       */
      alignLeft: (componentIds: string[]) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new AlignComponentsAction(componentIds, 'left');
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'ALIGN_COMPONENTS',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Align components to the center horizontally.
       */
      alignCenter: (componentIds: string[]) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new AlignComponentsAction(componentIds, 'center');
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'ALIGN_COMPONENTS',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Align components to the right.
       */
      alignRight: (componentIds: string[]) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new AlignComponentsAction(componentIds, 'right');
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'ALIGN_COMPONENTS',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Align components to the top.
       */
      alignTop: (componentIds: string[]) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new AlignComponentsAction(componentIds, 'top');
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'ALIGN_COMPONENTS',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Align components to the middle vertically.
       */
      alignMiddle: (componentIds: string[]) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new AlignComponentsAction(componentIds, 'middle');
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'ALIGN_COMPONENTS',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Align components to the bottom.
       */
      alignBottom: (componentIds: string[]) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new AlignComponentsAction(componentIds, 'bottom');
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'ALIGN_COMPONENTS',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      // ========================================
      // Distribution
      // ========================================

      /**
       * Distribute components horizontally.
       */
      distributeHorizontally: (componentIds: string[]) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new DistributeComponentsAction(componentIds, 'horizontal');
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'DISTRIBUTE_COMPONENTS',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Distribute components vertically.
       */
      distributeVertically: (componentIds: string[]) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new DistributeComponentsAction(componentIds, 'vertical');
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'DISTRIBUTE_COMPONENTS',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      // ========================================
      // Page Management
      // ========================================

      /**
       * Add a new page to the template.
       */
      addPage: () => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new AddPageAction();
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'ADD_PAGE',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Remove a page from the template.
       */
      removePage: (pageId: string) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new RemovePageAction(pageId);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'REMOVE_PAGE',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Reorder pages in the template.
       */
      reorderPages: (pageIds: string[]) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new ReorderPagesAction(pageIds);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'REORDER_PAGES',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Duplicate a page.
       */
      duplicatePage: (pageId: string) => {
        const state = get();
        if (!state.current) {
          throw new Error('No template loaded');
        }

        const action = new DuplicatePageAction(pageId);
        const newState = action.execute(state);

        // Create snapshot for history
        const snapshot: TemplateSnapshot = {
          template: newState.current!,
          timestamp: new Date(),
          actionType: 'DUPLICATE_PAGE',
          actionDescription: action.description,
        };

        state.undoRedoManager.addAction(snapshot);
        set(newState);
      },

      /**
       * Set the current page being edited.
       */
      setCurrentPage: (pageId: string) => {
        set({ currentPageId: pageId });
      },

      // ========================================
      // History
      // ========================================

      /**
       * Undo the last action.
       */
      undo: () => {
        const state = get();
        const snapshot = state.undoRedoManager.undo();

        if (snapshot) {
          set({
            current: snapshot.template,
            isDirty: true,
          });
        }
      },

      /**
       * Redo the last undone action.
       */
      redo: () => {
        const state = get();
        const snapshot = state.undoRedoManager.redo();

        if (snapshot) {
          set({
            current: snapshot.template,
            isDirty: true,
          });
        }
      },

      /**
       * Clear the undo/redo history.
       */
      clearHistory: () => {
        const state = get();
        state.undoRedoManager.clear();
      },

      /**
       * Check if undo is available.
       */
      canUndo: () => {
        const state = get();
        return state.undoRedoManager.canUndo();
      },

      /**
       * Check if redo is available.
       */
      canRedo: () => {
        const state = get();
        return state.undoRedoManager.canRedo();
      },
    }),
    {
      name: 'template-designer-store',
    }
  )
);
