/**
 * Visual Template Designer - State Types Unit Tests
 * 
 * Comprehensive unit tests for state management types and interfaces.
 * Tests validate type safety, initial states, and state structure.
 */

import { describe, it, expect } from 'vitest';
import type {
  TemplateState,
  EditorState,
  HistoryState,
  TemplateSnapshot,
  TemplateAction,
  ActionType,
  DesignerState,
} from '../types';
import {
  initialTemplateState,
  initialEditorState,
  initialHistoryState,
  initialDesignerState,
} from '../types';
import type { Template, TemplateComponent } from '../../../domain/types';

describe('State Types', () => {
  describe('TemplateState', () => {
    it('should have correct initial state structure', () => {
      expect(initialTemplateState).toEqual({
        current: null,
        history: [],
        historyIndex: -1,
        selectedComponentId: null,
        selectedComponentIds: [],
        clipboard: null,
        isDirty: false,
        currentPageId: null,
      });
    });

    it('should allow null current template', () => {
      const state: TemplateState = {
        ...initialTemplateState,
        current: null,
      };
      expect(state.current).toBeNull();
    });

    it('should allow valid template as current', () => {
      const mockTemplate: Template = {
        id: 'test-1',
        name: 'Test Template',
        category: 'REPORT_CARD',
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        version: 1,
      };

      const state: TemplateState = {
        ...initialTemplateState,
        current: mockTemplate,
      };
      expect(state.current).toEqual(mockTemplate);
    });

    it('should maintain history as array of snapshots', () => {
      const state: TemplateState = {
        ...initialTemplateState,
        history: [],
      };
      expect(Array.isArray(state.history)).toBe(true);
    });

    it('should track selected component ID', () => {
      const state: TemplateState = {
        ...initialTemplateState,
        selectedComponentId: 'component-1',
      };
      expect(state.selectedComponentId).toBe('component-1');
    });

    it('should track multiple selected component IDs', () => {
      const state: TemplateState = {
        ...initialTemplateState,
        selectedComponentIds: ['comp-1', 'comp-2', 'comp-3'],
      };
      expect(state.selectedComponentIds).toHaveLength(3);
    });

    it('should track clipboard component', () => {
      const mockComponent: TemplateComponent = {
        id: 'comp-1',
        type: 'TEXT_LABEL',
        layout: {
          position: { x: 0, y: 0, unit: 'px' },
          size: { width: 100, height: 50, unit: 'px' },
          rotation: 0,
        },
        zIndex: 1,
      };

      const state: TemplateState = {
        ...initialTemplateState,
        clipboard: mockComponent,
      };
      expect(state.clipboard).toEqual(mockComponent);
    });

    it('should track dirty flag', () => {
      const state: TemplateState = {
        ...initialTemplateState,
        isDirty: true,
      };
      expect(state.isDirty).toBe(true);
    });

    it('should track current page ID', () => {
      const state: TemplateState = {
        ...initialTemplateState,
        currentPageId: 'page-1',
      };
      expect(state.currentPageId).toBe('page-1');
    });
  });

  describe('EditorState', () => {
    it('should have correct initial state structure', () => {
      expect(initialEditorState).toEqual({
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
      });
    });

    it('should allow zoom values between 25 and 400', () => {
      const state: EditorState = {
        ...initialEditorState,
        zoom: 25,
      };
      expect(state.zoom).toBe(25);

      const state2: EditorState = {
        ...initialEditorState,
        zoom: 400,
      };
      expect(state2.zoom).toBe(400);
    });

    it('should track pan coordinates', () => {
      const state: EditorState = {
        ...initialEditorState,
        panX: 100,
        panY: 200,
      };
      expect(state.panX).toBe(100);
      expect(state.panY).toBe(200);
    });

    it('should track grid settings', () => {
      const state: EditorState = {
        ...initialEditorState,
        gridEnabled: false,
        gridSpacing: 20,
        snapToGrid: false,
      };
      expect(state.gridEnabled).toBe(false);
      expect(state.gridSpacing).toBe(20);
      expect(state.snapToGrid).toBe(false);
    });

    it('should track ruler visibility', () => {
      const state: EditorState = {
        ...initialEditorState,
        rulersVisible: false,
      };
      expect(state.rulersVisible).toBe(false);
    });

    it('should track alignment guides', () => {
      const state: EditorState = {
        ...initialEditorState,
        alignmentGuidesEnabled: false,
      };
      expect(state.alignmentGuidesEnabled).toBe(false);
    });

    it('should support different units', () => {
      const state1: EditorState = {
        ...initialEditorState,
        unit: 'px',
      };
      expect(state1.unit).toBe('px');

      const state2: EditorState = {
        ...initialEditorState,
        unit: 'mm',
      };
      expect(state2.unit).toBe('mm');

      const state3: EditorState = {
        ...initialEditorState,
        unit: 'in',
      };
      expect(state3.unit).toBe('in');
    });

    it('should track preview mode', () => {
      const state: EditorState = {
        ...initialEditorState,
        previewMode: true,
      };
      expect(state.previewMode).toBe(true);
    });

    it('should track panel visibility', () => {
      const state: EditorState = {
        ...initialEditorState,
        propertiesPanelVisible: false,
        componentLibraryVisible: false,
      };
      expect(state.propertiesPanelVisible).toBe(false);
      expect(state.componentLibraryVisible).toBe(false);
    });
  });

  describe('HistoryState', () => {
    it('should have correct initial state structure', () => {
      expect(initialHistoryState).toEqual({
        past: [],
        present: null,
        future: [],
        maxHistorySize: 50,
        canUndo: false,
        canRedo: false,
      });
    });

    it('should maintain past history stack', () => {
      const state: HistoryState = {
        ...initialHistoryState,
        past: [],
      };
      expect(Array.isArray(state.past)).toBe(true);
    });

    it('should maintain future history stack', () => {
      const state: HistoryState = {
        ...initialHistoryState,
        future: [],
      };
      expect(Array.isArray(state.future)).toBe(true);
    });

    it('should have max history size of at least 50', () => {
      expect(initialHistoryState.maxHistorySize).toBeGreaterThanOrEqual(50);
    });

    it('should track undo availability', () => {
      const state: HistoryState = {
        ...initialHistoryState,
        canUndo: true,
      };
      expect(state.canUndo).toBe(true);
    });

    it('should track redo availability', () => {
      const state: HistoryState = {
        ...initialHistoryState,
        canRedo: true,
      };
      expect(state.canRedo).toBe(true);
    });
  });

  describe('TemplateSnapshot', () => {
    it('should capture template state with metadata', () => {
      const mockTemplate: Template = {
        id: 'test-1',
        name: 'Test Template',
        category: 'REPORT_CARD',
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        version: 1,
      };

      const snapshot: TemplateSnapshot = {
        template: mockTemplate,
        timestamp: new Date(),
        actionType: 'ADD_COMPONENT',
        actionDescription: 'Added text label component',
      };

      expect(snapshot.template).toEqual(mockTemplate);
      expect(snapshot.actionType).toBe('ADD_COMPONENT');
      expect(snapshot.actionDescription).toBe('Added text label component');
      expect(snapshot.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('ActionType', () => {
    it('should include component operation types', () => {
      const componentActions: ActionType[] = [
        'ADD_COMPONENT',
        'UPDATE_COMPONENT',
        'DELETE_COMPONENT',
        'MOVE_COMPONENT',
        'RESIZE_COMPONENT',
        'ROTATE_COMPONENT',
        'DUPLICATE_COMPONENT',
      ];

      componentActions.forEach(action => {
        expect(typeof action).toBe('string');
      });
    });

    it('should include multi-component operation types', () => {
      const multiComponentActions: ActionType[] = [
        'GROUP_COMPONENTS',
        'UNGROUP_COMPONENTS',
        'ALIGN_COMPONENTS',
        'DISTRIBUTE_COMPONENTS',
      ];

      multiComponentActions.forEach(action => {
        expect(typeof action).toBe('string');
      });
    });

    it('should include layer operation types', () => {
      const layerActions: ActionType[] = [
        'BRING_TO_FRONT',
        'SEND_TO_BACK',
        'BRING_FORWARD',
        'SEND_BACKWARD',
      ];

      layerActions.forEach(action => {
        expect(typeof action).toBe('string');
      });
    });

    it('should include page operation types', () => {
      const pageActions: ActionType[] = [
        'ADD_PAGE',
        'REMOVE_PAGE',
        'REORDER_PAGES',
        'DUPLICATE_PAGE',
      ];

      pageActions.forEach(action => {
        expect(typeof action).toBe('string');
      });
    });

    it('should include template operation types', () => {
      const templateActions: ActionType[] = [
        'LOAD_TEMPLATE',
        'SAVE_TEMPLATE',
        'UPDATE_TEMPLATE_METADATA',
      ];

      templateActions.forEach(action => {
        expect(typeof action).toBe('string');
      });
    });

    it('should include clipboard operation types', () => {
      const clipboardActions: ActionType[] = [
        'COPY_COMPONENT',
        'PASTE_COMPONENT',
        'CUT_COMPONENT',
      ];

      clipboardActions.forEach(action => {
        expect(typeof action).toBe('string');
      });
    });
  });

  describe('TemplateAction', () => {
    it('should have required properties', () => {
      const mockAction: TemplateAction = {
        type: 'ADD_COMPONENT',
        description: 'Add component to canvas',
        timestamp: new Date(),
        execute: (state: TemplateState) => state,
        undo: (state: TemplateState) => state,
      };

      expect(mockAction.type).toBe('ADD_COMPONENT');
      expect(mockAction.description).toBe('Add component to canvas');
      expect(mockAction.timestamp).toBeInstanceOf(Date);
      expect(typeof mockAction.execute).toBe('function');
      expect(typeof mockAction.undo).toBe('function');
    });

    it('should have execute function that transforms state', () => {
      const mockAction: TemplateAction = {
        type: 'ADD_COMPONENT',
        description: 'Add component',
        timestamp: new Date(),
        execute: (state: TemplateState) => ({
          ...state,
          isDirty: true,
        }),
        undo: (state: TemplateState) => state,
      };

      const result = mockAction.execute(initialTemplateState);
      expect(result.isDirty).toBe(true);
    });

    it('should have undo function that reverts state', () => {
      const mockAction: TemplateAction = {
        type: 'ADD_COMPONENT',
        description: 'Add component',
        timestamp: new Date(),
        execute: (state: TemplateState) => ({
          ...state,
          isDirty: true,
        }),
        undo: (state: TemplateState) => ({
          ...state,
          isDirty: false,
        }),
      };

      const executedState = mockAction.execute(initialTemplateState);
      const revertedState = mockAction.undo(executedState);
      expect(revertedState.isDirty).toBe(false);
    });
  });

  describe('DesignerState', () => {
    it('should combine all state types', () => {
      expect(initialDesignerState).toHaveProperty('template');
      expect(initialDesignerState).toHaveProperty('editor');
      expect(initialDesignerState).toHaveProperty('history');
    });

    it('should have correct nested structure', () => {
      expect(initialDesignerState.template).toEqual(initialTemplateState);
      expect(initialDesignerState.editor).toEqual(initialEditorState);
      expect(initialDesignerState.history).toEqual(initialHistoryState);
    });

    it('should allow independent state updates', () => {
      const state: DesignerState = {
        ...initialDesignerState,
        editor: {
          ...initialEditorState,
          zoom: 200,
        },
      };

      expect(state.editor.zoom).toBe(200);
      expect(state.template).toEqual(initialTemplateState);
      expect(state.history).toEqual(initialHistoryState);
    });
  });

  describe('State Immutability', () => {
    it('should not mutate initial template state', () => {
      const originalState = { ...initialTemplateState };
      const newState: TemplateState = {
        ...initialTemplateState,
        isDirty: true,
      };

      expect(initialTemplateState).toEqual(originalState);
      expect(newState.isDirty).toBe(true);
    });

    it('should not mutate initial editor state', () => {
      const originalState = { ...initialEditorState };
      const newState: EditorState = {
        ...initialEditorState,
        zoom: 200,
      };

      expect(initialEditorState).toEqual(originalState);
      expect(newState.zoom).toBe(200);
    });

    it('should not mutate initial history state', () => {
      const originalState = { ...initialHistoryState };
      const newState: HistoryState = {
        ...initialHistoryState,
        canUndo: true,
      };

      expect(initialHistoryState).toEqual(originalState);
      expect(newState.canUndo).toBe(true);
    });
  });

  describe('State Type Safety', () => {
    it('should enforce template state types', () => {
      const state: TemplateState = initialTemplateState;
      
      // These should compile without errors
      expect(state.current).toBeDefined();
      expect(state.history).toBeDefined();
      expect(state.historyIndex).toBeDefined();
      expect(state.selectedComponentId).toBeDefined();
      expect(state.selectedComponentIds).toBeDefined();
      expect(state.clipboard).toBeDefined();
      expect(state.isDirty).toBeDefined();
      expect(state.currentPageId).toBeDefined();
    });

    it('should enforce editor state types', () => {
      const state: EditorState = initialEditorState;
      
      // These should compile without errors
      expect(state.zoom).toBeDefined();
      expect(state.panX).toBeDefined();
      expect(state.panY).toBeDefined();
      expect(state.gridEnabled).toBeDefined();
      expect(state.gridSpacing).toBeDefined();
      expect(state.snapToGrid).toBeDefined();
      expect(state.rulersVisible).toBeDefined();
      expect(state.alignmentGuidesEnabled).toBeDefined();
      expect(state.unit).toBeDefined();
      expect(state.previewMode).toBeDefined();
      expect(state.propertiesPanelVisible).toBeDefined();
      expect(state.componentLibraryVisible).toBeDefined();
    });

    it('should enforce history state types', () => {
      const state: HistoryState = initialHistoryState;
      
      // These should compile without errors
      expect(state.past).toBeDefined();
      expect(state.present).toBeDefined();
      expect(state.future).toBeDefined();
      expect(state.maxHistorySize).toBeDefined();
      expect(state.canUndo).toBeDefined();
      expect(state.canRedo).toBeDefined();
    });
  });
});
