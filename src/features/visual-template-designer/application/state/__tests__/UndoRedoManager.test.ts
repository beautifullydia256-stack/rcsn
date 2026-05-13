/**
 * Unit tests for UndoRedoManager
 * 
 * These tests verify the undo/redo functionality including:
 * - Adding actions to history
 * - Undo and redo operations
 * - History size limits
 * - Edge cases and boundary conditions
 * 
 * Requirements tested:
 * - Requirement 1.9-1.13: Undo/redo with at least 50 action history
 */

import { UndoRedoManager } from '../UndoRedoManager';
import type { TemplateSnapshot } from '../types';
import type { Template } from '../../../domain/types';

/**
 * Helper function to create a mock template snapshot
 */
function createMockSnapshot(
  actionType: string = 'ADD_COMPONENT',
  description: string = 'Test action'
): TemplateSnapshot {
  const mockTemplate: Template = {
    id: 'test-template-id',
    name: 'Test Template',
    category: 'REPORT_CARD',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test-user',
    version: 1,
  };

  return {
    template: mockTemplate,
    timestamp: new Date(),
    actionType: actionType as any,
    actionDescription: description,
  };
}

describe('UndoRedoManager', () => {
  describe('Constructor', () => {
    it('should create manager with default max history size of 50', () => {
      const manager = new UndoRedoManager();
      expect(manager.getMaxHistorySize()).toBe(50);
    });

    it('should create manager with custom max history size', () => {
      const manager = new UndoRedoManager(100);
      expect(manager.getMaxHistorySize()).toBe(100);
    });

    it('should initialize with empty history', () => {
      const manager = new UndoRedoManager();
      expect(manager.getPastLength()).toBe(0);
      expect(manager.getFutureLength()).toBe(0);
      expect(manager.getCurrentSnapshot()).toBeNull();
    });

    it('should initialize with canUndo and canRedo as false', () => {
      const manager = new UndoRedoManager();
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe('addAction', () => {
    it('should add first action as present state', () => {
      const manager = new UndoRedoManager();
      const snapshot = createMockSnapshot();

      manager.addAction(snapshot);

      expect(manager.getCurrentSnapshot()).toBe(snapshot);
      expect(manager.getPastLength()).toBe(0);
      expect(manager.getFutureLength()).toBe(0);
    });

    it('should move present to past when adding second action', () => {
      const manager = new UndoRedoManager();
      const snapshot1 = createMockSnapshot('ADD_COMPONENT', 'Action 1');
      const snapshot2 = createMockSnapshot('UPDATE_COMPONENT', 'Action 2');

      manager.addAction(snapshot1);
      manager.addAction(snapshot2);

      expect(manager.getCurrentSnapshot()).toBe(snapshot2);
      expect(manager.getPastLength()).toBe(1);
      expect(manager.getFutureLength()).toBe(0);
    });

    it('should clear future stack when adding new action', () => {
      const manager = new UndoRedoManager();
      const snapshot1 = createMockSnapshot('ADD_COMPONENT', 'Action 1');
      const snapshot2 = createMockSnapshot('UPDATE_COMPONENT', 'Action 2');
      const snapshot3 = createMockSnapshot('DELETE_COMPONENT', 'Action 3');

      manager.addAction(snapshot1);
      manager.addAction(snapshot2);
      manager.undo(); // Move to past, create future
      expect(manager.getFutureLength()).toBe(1);

      manager.addAction(snapshot3); // Should clear future

      expect(manager.getFutureLength()).toBe(0);
      expect(manager.getCurrentSnapshot()).toBe(snapshot3);
    });

    it('should update canUndo flag after adding action', () => {
      const manager = new UndoRedoManager();
      const snapshot1 = createMockSnapshot();
      const snapshot2 = createMockSnapshot();

      expect(manager.canUndo()).toBe(false);

      manager.addAction(snapshot1);
      expect(manager.canUndo()).toBe(false); // No past yet

      manager.addAction(snapshot2);
      expect(manager.canUndo()).toBe(true); // Now we have past
    });

    it('should maintain history size limit', () => {
      const manager = new UndoRedoManager(3); // Small limit for testing

      // Add 5 actions (exceeds limit)
      for (let i = 0; i < 5; i++) {
        manager.addAction(createMockSnapshot('ADD_COMPONENT', `Action ${i}`));
      }

      // Should only keep last 3 in past (plus 1 present)
      expect(manager.getPastLength()).toBe(3);
    });

    it('should keep most recent actions when trimming history', () => {
      const manager = new UndoRedoManager(2);

      const snapshot1 = createMockSnapshot('ADD_COMPONENT', 'Action 1');
      const snapshot2 = createMockSnapshot('UPDATE_COMPONENT', 'Action 2');
      const snapshot3 = createMockSnapshot('DELETE_COMPONENT', 'Action 3');
      const snapshot4 = createMockSnapshot('MOVE_COMPONENT', 'Action 4');

      manager.addAction(snapshot1);
      manager.addAction(snapshot2);
      manager.addAction(snapshot3);
      manager.addAction(snapshot4);

      // Should keep snapshot2 and snapshot3 in past, snapshot4 as present
      expect(manager.getPastLength()).toBe(2);
      expect(manager.getCurrentSnapshot()).toBe(snapshot4);

      // Undo should give us snapshot3
      const undone = manager.undo();
      expect(undone).toBe(snapshot3);
    });
  });

  describe('undo', () => {
    it('should return null when no history available', () => {
      const manager = new UndoRedoManager();
      expect(manager.undo()).toBeNull();
    });

    it('should return null when only one action in history', () => {
      const manager = new UndoRedoManager();
      manager.addAction(createMockSnapshot());
      expect(manager.undo()).toBeNull();
    });

    it('should revert to previous state', () => {
      const manager = new UndoRedoManager();
      const snapshot1 = createMockSnapshot('ADD_COMPONENT', 'Action 1');
      const snapshot2 = createMockSnapshot('UPDATE_COMPONENT', 'Action 2');

      manager.addAction(snapshot1);
      manager.addAction(snapshot2);

      const undone = manager.undo();

      expect(undone).toBe(snapshot1);
      expect(manager.getCurrentSnapshot()).toBe(snapshot1);
    });

    it('should move present to future stack', () => {
      const manager = new UndoRedoManager();
      const snapshot1 = createMockSnapshot('ADD_COMPONENT', 'Action 1');
      const snapshot2 = createMockSnapshot('UPDATE_COMPONENT', 'Action 2');

      manager.addAction(snapshot1);
      manager.addAction(snapshot2);

      expect(manager.getFutureLength()).toBe(0);

      manager.undo();

      expect(manager.getFutureLength()).toBe(1);
    });

    it('should update canUndo and canRedo flags', () => {
      const manager = new UndoRedoManager();
      const snapshot1 = createMockSnapshot('ADD_COMPONENT', 'Action 1');
      const snapshot2 = createMockSnapshot('UPDATE_COMPONENT', 'Action 2');

      manager.addAction(snapshot1);
      manager.addAction(snapshot2);

      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);

      manager.undo();

      expect(manager.canUndo()).toBe(false); // No more past
      expect(manager.canRedo()).toBe(true); // Now we have future
    });

    it('should handle multiple undo operations', () => {
      const manager = new UndoRedoManager();
      const snapshot1 = createMockSnapshot('ADD_COMPONENT', 'Action 1');
      const snapshot2 = createMockSnapshot('UPDATE_COMPONENT', 'Action 2');
      const snapshot3 = createMockSnapshot('DELETE_COMPONENT', 'Action 3');

      manager.addAction(snapshot1);
      manager.addAction(snapshot2);
      manager.addAction(snapshot3);

      manager.undo(); // Back to snapshot2
      expect(manager.getCurrentSnapshot()).toBe(snapshot2);

      manager.undo(); // Back to snapshot1
      expect(manager.getCurrentSnapshot()).toBe(snapshot1);

      expect(manager.canUndo()).toBe(false);
      expect(manager.getFutureLength()).toBe(2);
    });
  });

  describe('redo', () => {
    it('should return null when no future available', () => {
      const manager = new UndoRedoManager();
      expect(manager.redo()).toBeNull();
    });

    it('should return null when no undo has been performed', () => {
      const manager = new UndoRedoManager();
      manager.addAction(createMockSnapshot());
      expect(manager.redo()).toBeNull();
    });

    it('should restore undone state', () => {
      const manager = new UndoRedoManager();
      const snapshot1 = createMockSnapshot('ADD_COMPONENT', 'Action 1');
      const snapshot2 = createMockSnapshot('UPDATE_COMPONENT', 'Action 2');

      manager.addAction(snapshot1);
      manager.addAction(snapshot2);
      manager.undo();

      const redone = manager.redo();

      expect(redone).toBe(snapshot2);
      expect(manager.getCurrentSnapshot()).toBe(snapshot2);
    });

    it('should move present to past stack', () => {
      const manager = new UndoRedoManager();
      const snapshot1 = createMockSnapshot('ADD_COMPONENT', 'Action 1');
      const snapshot2 = createMockSnapshot('UPDATE_COMPONENT', 'Action 2');

      manager.addAction(snapshot1);
      manager.addAction(snapshot2);

      expect(manager.getPastLength()).toBe(1);

      manager.undo();
      expect(manager.getPastLength()).toBe(0);

      manager.redo();
      expect(manager.getPastLength()).toBe(1);
    });

    it('should update canUndo and canRedo flags', () => {
      const manager = new UndoRedoManager();
      const snapshot1 = createMockSnapshot('ADD_COMPONENT', 'Action 1');
      const snapshot2 = createMockSnapshot('UPDATE_COMPONENT', 'Action 2');

      manager.addAction(snapshot1);
      manager.addAction(snapshot2);
      manager.undo();

      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(true);

      manager.redo();

      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);
    });

    it('should handle multiple redo operations', () => {
      const manager = new UndoRedoManager();
      const snapshot1 = createMockSnapshot('ADD_COMPONENT', 'Action 1');
      const snapshot2 = createMockSnapshot('UPDATE_COMPONENT', 'Action 2');
      const snapshot3 = createMockSnapshot('DELETE_COMPONENT', 'Action 3');

      manager.addAction(snapshot1);
      manager.addAction(snapshot2);
      manager.addAction(snapshot3);

      manager.undo(); // Back to snapshot2
      manager.undo(); // Back to snapshot1

      manager.redo(); // Forward to snapshot2
      expect(manager.getCurrentSnapshot()).toBe(snapshot2);

      manager.redo(); // Forward to snapshot3
      expect(manager.getCurrentSnapshot()).toBe(snapshot3);

      expect(manager.canRedo()).toBe(false);
      expect(manager.getPastLength()).toBe(2);
    });
  });

  describe('canUndo', () => {
    it('should return false for empty history', () => {
      const manager = new UndoRedoManager();
      expect(manager.canUndo()).toBe(false);
    });

    it('should return false with only present state', () => {
      const manager = new UndoRedoManager();
      manager.addAction(createMockSnapshot());
      expect(manager.canUndo()).toBe(false);
    });

    it('should return true when past stack has items', () => {
      const manager = new UndoRedoManager();
      manager.addAction(createMockSnapshot());
      manager.addAction(createMockSnapshot());
      expect(manager.canUndo()).toBe(true);
    });
  });

  describe('canRedo', () => {
    it('should return false for empty history', () => {
      const manager = new UndoRedoManager();
      expect(manager.canRedo()).toBe(false);
    });

    it('should return false when no undo performed', () => {
      const manager = new UndoRedoManager();
      manager.addAction(createMockSnapshot());
      expect(manager.canRedo()).toBe(false);
    });

    it('should return true after undo', () => {
      const manager = new UndoRedoManager();
      manager.addAction(createMockSnapshot());
      manager.addAction(createMockSnapshot());
      manager.undo();
      expect(manager.canRedo()).toBe(true);
    });

    it('should return false after new action clears future', () => {
      const manager = new UndoRedoManager();
      manager.addAction(createMockSnapshot());
      manager.addAction(createMockSnapshot());
      manager.undo();
      expect(manager.canRedo()).toBe(true);

      manager.addAction(createMockSnapshot());
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe('getState', () => {
    it('should return current history state', () => {
      const manager = new UndoRedoManager(25);
      const state = manager.getState();

      expect(state.past).toEqual([]);
      expect(state.present).toBeNull();
      expect(state.future).toEqual([]);
      expect(state.maxHistorySize).toBe(25);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
    });

    it('should reflect current state after operations', () => {
      const manager = new UndoRedoManager();
      manager.addAction(createMockSnapshot());
      manager.addAction(createMockSnapshot());
      manager.undo();

      const state = manager.getState();

      expect(state.past.length).toBe(0);
      expect(state.present).not.toBeNull();
      expect(state.future.length).toBe(1);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(true);
    });
  });

  describe('getCurrentSnapshot', () => {
    it('should return null for empty history', () => {
      const manager = new UndoRedoManager();
      expect(manager.getCurrentSnapshot()).toBeNull();
    });

    it('should return current present snapshot', () => {
      const manager = new UndoRedoManager();
      const snapshot = createMockSnapshot();
      manager.addAction(snapshot);
      expect(manager.getCurrentSnapshot()).toBe(snapshot);
    });
  });

  describe('clear', () => {
    it('should clear all history', () => {
      const manager = new UndoRedoManager();
      manager.addAction(createMockSnapshot());
      manager.addAction(createMockSnapshot());
      manager.addAction(createMockSnapshot());

      manager.clear();

      expect(manager.getPastLength()).toBe(0);
      expect(manager.getFutureLength()).toBe(0);
      expect(manager.getCurrentSnapshot()).toBeNull();
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(false);
    });

    it('should clear history with undo/redo states', () => {
      const manager = new UndoRedoManager();
      manager.addAction(createMockSnapshot());
      manager.addAction(createMockSnapshot());
      manager.undo();

      expect(manager.getFutureLength()).toBe(1);

      manager.clear();

      expect(manager.getPastLength()).toBe(0);
      expect(manager.getFutureLength()).toBe(0);
      expect(manager.getCurrentSnapshot()).toBeNull();
    });
  });

  describe('setMaxHistorySize', () => {
    it('should update max history size', () => {
      const manager = new UndoRedoManager(50);
      manager.setMaxHistorySize(100);
      expect(manager.getMaxHistorySize()).toBe(100);
    });

    it('should trim past stack when reducing size', () => {
      const manager = new UndoRedoManager(10);

      // Add 6 actions (5 in past, 1 present)
      for (let i = 0; i < 6; i++) {
        manager.addAction(createMockSnapshot('ADD_COMPONENT', `Action ${i}`));
      }

      expect(manager.getPastLength()).toBe(5);

      // Reduce size to 3
      manager.setMaxHistorySize(3);

      expect(manager.getPastLength()).toBe(3);
      expect(manager.getMaxHistorySize()).toBe(3);
    });

    it('should keep most recent actions when trimming', () => {
      const manager = new UndoRedoManager(5);

      const snapshots = [];
      for (let i = 0; i < 6; i++) {
        const snapshot = createMockSnapshot('ADD_COMPONENT', `Action ${i}`);
        snapshots.push(snapshot);
        manager.addAction(snapshot);
      }

      manager.setMaxHistorySize(2);

      // Should keep snapshots[3] and snapshots[4] in past, snapshots[5] as present
      manager.undo(); // Should get snapshots[4]
      expect(manager.getCurrentSnapshot()).toBe(snapshots[4]);

      manager.undo(); // Should get snapshots[3]
      expect(manager.getCurrentSnapshot()).toBe(snapshots[3]);

      // No more undo available
      expect(manager.canUndo()).toBe(false);
    });
  });

  describe('getPastLength', () => {
    it('should return 0 for empty history', () => {
      const manager = new UndoRedoManager();
      expect(manager.getPastLength()).toBe(0);
    });

    it('should return correct past stack length', () => {
      const manager = new UndoRedoManager();
      manager.addAction(createMockSnapshot());
      expect(manager.getPastLength()).toBe(0);

      manager.addAction(createMockSnapshot());
      expect(manager.getPastLength()).toBe(1);

      manager.addAction(createMockSnapshot());
      expect(manager.getPastLength()).toBe(2);
    });
  });

  describe('getFutureLength', () => {
    it('should return 0 for empty history', () => {
      const manager = new UndoRedoManager();
      expect(manager.getFutureLength()).toBe(0);
    });

    it('should return correct future stack length', () => {
      const manager = new UndoRedoManager();
      manager.addAction(createMockSnapshot());
      manager.addAction(createMockSnapshot());
      manager.addAction(createMockSnapshot());

      expect(manager.getFutureLength()).toBe(0);

      manager.undo();
      expect(manager.getFutureLength()).toBe(1);

      manager.undo();
      expect(manager.getFutureLength()).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle undo/redo cycle correctly', () => {
      const manager = new UndoRedoManager();
      const snapshot1 = createMockSnapshot('ADD_COMPONENT', 'Action 1');
      const snapshot2 = createMockSnapshot('UPDATE_COMPONENT', 'Action 2');

      manager.addAction(snapshot1);
      manager.addAction(snapshot2);

      // Undo and redo multiple times
      manager.undo();
      manager.redo();
      manager.undo();
      manager.redo();

      expect(manager.getCurrentSnapshot()).toBe(snapshot2);
      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);
    });

    it('should handle history size of 1', () => {
      const manager = new UndoRedoManager(1);
      const snapshot1 = createMockSnapshot('ADD_COMPONENT', 'Action 1');
      const snapshot2 = createMockSnapshot('UPDATE_COMPONENT', 'Action 2');
      const snapshot3 = createMockSnapshot('DELETE_COMPONENT', 'Action 3');

      manager.addAction(snapshot1);
      manager.addAction(snapshot2);
      manager.addAction(snapshot3);

      // Should only keep snapshot2 in past, snapshot3 as present
      expect(manager.getPastLength()).toBe(1);
      expect(manager.getCurrentSnapshot()).toBe(snapshot3);

      manager.undo();
      expect(manager.getCurrentSnapshot()).toBe(snapshot2);
      expect(manager.canUndo()).toBe(false);
    });

    it('should handle history size of 0', () => {
      const manager = new UndoRedoManager(0);
      const snapshot1 = createMockSnapshot('ADD_COMPONENT', 'Action 1');
      const snapshot2 = createMockSnapshot('UPDATE_COMPONENT', 'Action 2');

      manager.addAction(snapshot1);
      manager.addAction(snapshot2);

      // Should not keep any past
      expect(manager.getPastLength()).toBe(0);
      expect(manager.getCurrentSnapshot()).toBe(snapshot2);
      expect(manager.canUndo()).toBe(false);
    });

    it('should maintain exactly 50 actions in history', () => {
      const manager = new UndoRedoManager(50);

      // Add 52 actions
      for (let i = 0; i < 52; i++) {
        manager.addAction(createMockSnapshot('ADD_COMPONENT', `Action ${i}`));
      }

      // Should have 50 in past + 1 present = 51 total states
      expect(manager.getPastLength()).toBe(50);
    });
  });
});
