/**
 * Property-Based Test: Undo-Redo Inverse Operations
 * 
 * Feature: visual-template-designer
 * Property 6: Undo-redo inverse operations
 * Validates: Requirements 1.11, 1.12, 1.13
 * 
 * Property Definition:
 * 
 * Property 6: For any template state and any reversible action, executing the
 * action followed by undo SHALL restore the original template state, and
 * executing undo followed by redo SHALL restore the state after the action.
 * 
 * This test validates that the UndoRedoManager correctly implements inverse
 * operations, ensuring that:
 * 1. undo(action(state)) === state (undo reverses action)
 * 2. redo(undo(action(state))) === action(state) (redo reverses undo)
 * 3. History stack integrity is maintained
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import { UndoRedoManager } from '../../application/state/UndoRedoManager';
import type { TemplateSnapshot } from '../../application/state/types';
import type { Template } from '../../domain/types';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate valid template categories
 */
const arbTemplateCategory = () =>
  fc.constantFrom(
    'REPORT_CARD',
    'CERTIFICATE',
    'ID_CARD',
    'RECEIPT',
    'FEE_STATEMENT',
    'ADMISSION_FORM',
    'RESULT_SLIP'
  );

/**
 * Generate valid page sizes
 */
const arbPageSize = () =>
  fc.constantFrom('A4', 'LETTER', 'LEGAL', 'CUSTOM');

/**
 * Generate valid page orientations
 */
const arbPageOrientation = () =>
  fc.constantFrom('portrait', 'landscape');

/**
 * Generate valid action types
 */
const arbActionType = () =>
  fc.constantFrom(
    'ADD_COMPONENT',
    'UPDATE_COMPONENT',
    'DELETE_COMPONENT',
    'MOVE_COMPONENT',
    'RESIZE_COMPONENT',
    'ROTATE_COMPONENT',
    'DUPLICATE_COMPONENT',
    'GROUP_COMPONENTS',
    'UNGROUP_COMPONENTS',
    'ALIGN_COMPONENTS',
    'DISTRIBUTE_COMPONENTS',
    'BRING_TO_FRONT',
    'SEND_TO_BACK',
    'BRING_FORWARD',
    'SEND_BACKWARD',
    'ADD_PAGE',
    'REMOVE_PAGE',
    'REORDER_PAGES',
    'DUPLICATE_PAGE'
  );

/**
 * Generate a minimal valid Template object
 */
const arbTemplate = (): fc.Arbitrary<Template> =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    category: arbTemplateCategory(),
    pageSize: arbPageSize(),
    pageOrientation: arbPageOrientation(),
    pages: fc.array(
      fc.record({
        id: fc.uuid(),
        pageNumber: fc.integer({ min: 1, max: 100 }),
        width: fc.double({ min: 100, max: 2000, noNaN: true }),
        height: fc.double({ min: 100, max: 2000, noNaN: true }),
        elements: fc.array(fc.record({}), { maxLength: 5 }), // Simplified elements
      }),
      { minLength: 1, maxLength: 5 }
    ),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
    createdBy: fc.uuid(),
    version: fc.integer({ min: 1, max: 1000 }),
  });

/**
 * Generate a valid TemplateSnapshot
 */
const arbTemplateSnapshot = (): fc.Arbitrary<TemplateSnapshot> =>
  fc.record({
    template: arbTemplate(),
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
    actionType: arbActionType(),
    actionDescription: fc.string({ minLength: 5, maxLength: 100 }),
  });

/**
 * Generate a sequence of template snapshots (representing a series of actions)
 */
const arbSnapshotSequence = () =>
  fc.array(arbTemplateSnapshot(), { minLength: 1, maxLength: 10 });

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Deep equality check for Template objects
 * Compares all fields including nested structures
 */
function templatesAreEqual(t1: Template, t2: Template): boolean {
  // Compare primitive fields
  if (
    t1.id !== t2.id ||
    t1.name !== t2.name ||
    t1.category !== t2.category ||
    t1.pageSize !== t2.pageSize ||
    t1.pageOrientation !== t2.pageOrientation ||
    t1.createdBy !== t2.createdBy ||
    t1.version !== t2.version
  ) {
    return false;
  }

  // Compare dates (handle NaN dates)
  const t1CreatedTime = t1.createdAt.getTime();
  const t2CreatedTime = t2.createdAt.getTime();
  const t1UpdatedTime = t1.updatedAt.getTime();
  const t2UpdatedTime = t2.updatedAt.getTime();

  // If both are NaN, consider them equal; otherwise compare normally
  if (
    !(Number.isNaN(t1CreatedTime) && Number.isNaN(t2CreatedTime)) &&
    t1CreatedTime !== t2CreatedTime
  ) {
    return false;
  }

  if (
    !(Number.isNaN(t1UpdatedTime) && Number.isNaN(t2UpdatedTime)) &&
    t1UpdatedTime !== t2UpdatedTime
  ) {
    return false;
  }

  // Compare pages array length
  if (t1.pages.length !== t2.pages.length) {
    return false;
  }

  // Compare each page
  for (let i = 0; i < t1.pages.length; i++) {
    const p1 = t1.pages[i];
    const p2 = t2.pages[i];

    if (
      p1.id !== p2.id ||
      p1.pageNumber !== p2.pageNumber ||
      Math.abs(p1.width - p2.width) > 1e-10 ||
      Math.abs(p1.height - p2.height) > 1e-10 ||
      p1.elements.length !== p2.elements.length
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Deep equality check for TemplateSnapshot objects
 */
function snapshotsAreEqual(s1: TemplateSnapshot, s2: TemplateSnapshot): boolean {
  // Compare timestamps (handle NaN)
  const s1Time = s1.timestamp.getTime();
  const s2Time = s2.timestamp.getTime();
  const timestampsEqual =
    (Number.isNaN(s1Time) && Number.isNaN(s2Time)) || s1Time === s2Time;

  return (
    templatesAreEqual(s1.template, s2.template) &&
    timestampsEqual &&
    s1.actionType === s2.actionType &&
    s1.actionDescription === s2.actionDescription
  );
}

/**
 * Create a deep clone of a template snapshot
 */
function cloneSnapshot(snapshot: TemplateSnapshot): TemplateSnapshot {
  return JSON.parse(JSON.stringify(snapshot, (key, value) => {
    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }), (key, value) => {
    // Restore Date objects
    if (key === 'timestamp' || key === 'createdAt' || key === 'updatedAt') {
      return new Date(value);
    }
    return value;
  });
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 6: Undo-Redo Inverse Operations', () => {
  /**
   * Feature: visual-template-designer, Property 6: Undo-redo inverse operations
   * Validates: Requirements 1.11, 1.12
   * 
   * Property: For any template state and any action, executing the action
   * followed by undo SHALL restore the original template state.
   * 
   * Mathematically: undo(action(state)) === state
   */
  it('should restore original state after action followed by undo', () => {
    fc.assert(
      fc.property(arbTemplateSnapshot(), (initialSnapshot) => {
        // Create a new UndoRedoManager
        const manager = new UndoRedoManager();

        // Add initial snapshot
        manager.addAction(initialSnapshot);
        const stateAfterInitial = manager.getCurrentSnapshot();

        // Verify initial state is set
        expect(stateAfterInitial).not.toBeNull();
        if (!stateAfterInitial) return;

        // Generate a new action (different snapshot)
        const newSnapshot = cloneSnapshot(initialSnapshot);
        newSnapshot.template.version += 1; // Modify to create a different state
        newSnapshot.actionType = 'UPDATE_COMPONENT';
        newSnapshot.actionDescription = 'Test action';
        newSnapshot.timestamp = new Date();

        // Execute action
        manager.addAction(newSnapshot);
        const stateAfterAction = manager.getCurrentSnapshot();

        // Verify action was applied
        expect(stateAfterAction).not.toBeNull();
        if (!stateAfterAction) return;
        expect(stateAfterAction.template.version).toBe(initialSnapshot.template.version + 1);

        // Undo the action
        const stateAfterUndo = manager.undo();

        // Verify undo restored original state
        expect(stateAfterUndo).not.toBeNull();
        if (!stateAfterUndo) return;
        expect(snapshotsAreEqual(stateAfterUndo, initialSnapshot)).toBe(true);
      }),
      propertyTestParams()
    );
  });

  /**
   * Feature: visual-template-designer, Property 6: Undo-redo inverse operations
   * Validates: Requirements 1.12, 1.13
   * 
   * Property: For any template state and any action, executing undo followed
   * by redo SHALL restore the state after the action.
   * 
   * Mathematically: redo(undo(action(state))) === action(state)
   */
  it('should restore action state after undo followed by redo', () => {
    fc.assert(
      fc.property(arbTemplateSnapshot(), (initialSnapshot) => {
        // Create a new UndoRedoManager
        const manager = new UndoRedoManager();

        // Add initial snapshot
        manager.addAction(initialSnapshot);

        // Generate a new action
        const newSnapshot = cloneSnapshot(initialSnapshot);
        newSnapshot.template.version += 1;
        newSnapshot.actionType = 'UPDATE_COMPONENT';
        newSnapshot.actionDescription = 'Test action';
        newSnapshot.timestamp = new Date();

        // Execute action
        manager.addAction(newSnapshot);
        const stateAfterAction = manager.getCurrentSnapshot();

        // Verify action was applied
        expect(stateAfterAction).not.toBeNull();
        if (!stateAfterAction) return;

        // Undo the action
        manager.undo();

        // Redo the action
        const stateAfterRedo = manager.redo();

        // Verify redo restored the action state
        expect(stateAfterRedo).not.toBeNull();
        if (!stateAfterRedo) return;
        expect(snapshotsAreEqual(stateAfterRedo, newSnapshot)).toBe(true);
      }),
      propertyTestParams()
    );
  });

  /**
   * Feature: visual-template-designer, Property 6: Undo-redo inverse operations
   * Validates: Requirements 1.11, 1.12, 1.13
   * 
   * Property: Multiple undo operations should traverse history backwards,
   * and multiple redo operations should traverse history forwards.
   */
  it('should correctly traverse history with multiple undo/redo operations', () => {
    fc.assert(
      fc.property(arbSnapshotSequence(), (snapshots) => {
        // Need at least 2 snapshots to test undo/redo
        if (snapshots.length < 2) return;

        // Create a new UndoRedoManager
        const manager = new UndoRedoManager();

        // Add all snapshots
        snapshots.forEach((snapshot) => {
          manager.addAction(snapshot);
        });

        // Verify we're at the last snapshot
        const finalState = manager.getCurrentSnapshot();
        expect(finalState).not.toBeNull();
        if (!finalState) return;
        expect(snapshotsAreEqual(finalState, snapshots[snapshots.length - 1])).toBe(true);

        // Undo all actions (back to first snapshot)
        for (let i = snapshots.length - 1; i > 0; i--) {
          const undoneState = manager.undo();
          expect(undoneState).not.toBeNull();
          if (!undoneState) return;
          expect(snapshotsAreEqual(undoneState, snapshots[i - 1])).toBe(true);
        }

        // Verify we're at the first snapshot
        const firstState = manager.getCurrentSnapshot();
        expect(firstState).not.toBeNull();
        if (!firstState) return;
        expect(snapshotsAreEqual(firstState, snapshots[0])).toBe(true);

        // Redo all actions (back to last snapshot)
        for (let i = 1; i < snapshots.length; i++) {
          const redoneState = manager.redo();
          expect(redoneState).not.toBeNull();
          if (!redoneState) return;
          expect(snapshotsAreEqual(redoneState, snapshots[i])).toBe(true);
        }

        // Verify we're back at the last snapshot
        const restoredFinalState = manager.getCurrentSnapshot();
        expect(restoredFinalState).not.toBeNull();
        if (!restoredFinalState) return;
        expect(snapshotsAreEqual(restoredFinalState, snapshots[snapshots.length - 1])).toBe(true);
      }),
      propertyTestParams()
    );
  });

  /**
   * Feature: visual-template-designer, Property 6: Undo-redo inverse operations
   * Validates: Requirements 1.9, 1.10, 1.11
   * 
   * Property: History stack integrity - past and future stacks should maintain
   * correct sizes after undo/redo operations.
   */
  it('should maintain correct history stack sizes', () => {
    fc.assert(
      fc.property(arbSnapshotSequence(), (snapshots) => {
        // Need at least 2 snapshots to test undo/redo
        if (snapshots.length < 2) return;

        // Create a new UndoRedoManager
        const manager = new UndoRedoManager();

        // Add all snapshots
        snapshots.forEach((snapshot) => {
          manager.addAction(snapshot);
        });

        // Verify initial state: past has (n-1) items, future is empty
        expect(manager.getPastLength()).toBe(snapshots.length - 1);
        expect(manager.getFutureLength()).toBe(0);
        expect(manager.canUndo()).toBe(true); // We have at least 2 snapshots
        expect(manager.canRedo()).toBe(false);

        // Undo half the actions (but at least 1)
        const undoCount = Math.max(1, Math.floor(snapshots.length / 2));
        for (let i = 0; i < undoCount; i++) {
          manager.undo();
        }

        // Verify state after undos
        expect(manager.getPastLength()).toBe(snapshots.length - 1 - undoCount);
        expect(manager.getFutureLength()).toBe(undoCount);
        expect(manager.canUndo()).toBe(snapshots.length - 1 - undoCount > 0);
        expect(manager.canRedo()).toBe(true);

        // Redo half of the undone actions (but at least 1)
        const redoCount = Math.max(1, Math.floor(undoCount / 2));
        for (let i = 0; i < redoCount; i++) {
          manager.redo();
        }

        // Verify state after redos
        expect(manager.getPastLength()).toBe(snapshots.length - 1 - undoCount + redoCount);
        expect(manager.getFutureLength()).toBe(undoCount - redoCount);
        expect(manager.canUndo()).toBe(true); // We always have at least 1 in past after redo
        expect(manager.canRedo()).toBe(undoCount - redoCount > 0);
      }),
      propertyTestParams()
    );
  });

  /**
   * Feature: visual-template-designer, Property 6: Undo-redo inverse operations
   * Validates: Requirements 1.11, 1.12, 1.13
   * 
   * Property: Adding a new action after undo should clear the future stack
   * (redo history should be lost).
   */
  it('should clear future stack when adding new action after undo', () => {
    fc.assert(
      fc.property(
        arbSnapshotSequence(),
        arbTemplateSnapshot(),
        (snapshots, newSnapshot) => {
          // Ensure we have at least 2 snapshots to work with
          if (snapshots.length < 2) return;

          // Create a new UndoRedoManager
          const manager = new UndoRedoManager();

          // Add all snapshots
          snapshots.forEach((snapshot) => {
            manager.addAction(snapshot);
          });

          // Undo one action
          manager.undo();

          // Verify future stack is not empty
          expect(manager.getFutureLength()).toBe(1);
          expect(manager.canRedo()).toBe(true);

          // Add a new action
          manager.addAction(newSnapshot);

          // Verify future stack is cleared
          expect(manager.getFutureLength()).toBe(0);
          expect(manager.canRedo()).toBe(false);

          // Verify we can still undo to previous states
          expect(manager.canUndo()).toBe(true);
        }
      ),
      propertyTestParams()
    );
  });

  /**
   * Feature: visual-template-designer, Property 6: Undo-redo inverse operations
   * Validates: Requirements 1.9, 1.10
   * 
   * Property: History should be limited to maxHistorySize (50 by default).
   * Oldest entries should be removed when limit is exceeded.
   */
  it('should maintain history size limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),
        fc.array(arbTemplateSnapshot(), { minLength: 30, maxLength: 100 }),
        (maxSize, snapshots) => {
          // Create manager with custom max size
          const manager = new UndoRedoManager(maxSize);

          // Add all snapshots
          snapshots.forEach((snapshot) => {
            manager.addAction(snapshot);
          });

          // Verify past stack doesn't exceed max size
          expect(manager.getPastLength()).toBeLessThanOrEqual(maxSize);

          // If we added more than maxSize snapshots, verify oldest were removed
          if (snapshots.length > maxSize) {
            expect(manager.getPastLength()).toBe(maxSize);

            // Undo all available actions
            let undoCount = 0;
            while (manager.canUndo()) {
              manager.undo();
              undoCount++;
            }

            // We should be able to undo exactly maxSize times
            expect(undoCount).toBe(maxSize);
          }
        }
      ),
      propertyTestParams()
    );
  });

  /**
   * Feature: visual-template-designer, Property 6: Undo-redo inverse operations
   * Validates: Requirements 1.11, 1.12, 1.13
   * 
   * Property: Undo/redo should be idempotent at boundaries.
   * Calling undo when canUndo is false should return null.
   * Calling redo when canRedo is false should return null.
   */
  it('should handle boundary conditions correctly', () => {
    fc.assert(
      fc.property(arbTemplateSnapshot(), (snapshot) => {
        // Create a new UndoRedoManager
        const manager = new UndoRedoManager();

        // Initially, no undo/redo should be available
        expect(manager.canUndo()).toBe(false);
        expect(manager.canRedo()).toBe(false);
        expect(manager.undo()).toBeNull();
        expect(manager.redo()).toBeNull();

        // Add one snapshot
        manager.addAction(snapshot);

        // Still can't undo (need at least 2 snapshots)
        expect(manager.canUndo()).toBe(false);
        expect(manager.undo()).toBeNull();

        // Add another snapshot
        const snapshot2 = cloneSnapshot(snapshot);
        snapshot2.template.version += 1;
        manager.addAction(snapshot2);

        // Now we can undo
        expect(manager.canUndo()).toBe(true);
        manager.undo();

        // Can't undo anymore (back to first snapshot)
        expect(manager.canUndo()).toBe(false);
        expect(manager.undo()).toBeNull();

        // But we can redo
        expect(manager.canRedo()).toBe(true);
        manager.redo();

        // Can't redo anymore (back to last snapshot)
        expect(manager.canRedo()).toBe(false);
        expect(manager.redo()).toBeNull();
      }),
      propertyTestParams()
    );
  });

  /**
   * Feature: visual-template-designer, Property 6: Undo-redo inverse operations
   * Validates: Requirements 1.11, 1.12, 1.13
   * 
   * Property: Complex undo/redo sequences should maintain consistency.
   * Random sequences of undo/redo operations should always maintain valid state.
   */
  it('should maintain consistency through random undo/redo sequences', () => {
    fc.assert(
      fc.property(
        arbSnapshotSequence(),
        fc.array(fc.boolean(), { minLength: 10, maxLength: 50 }),
        (snapshots, operations) => {
          // Ensure we have enough snapshots
          if (snapshots.length < 3) return;

          // Create a new UndoRedoManager
          const manager = new UndoRedoManager();

          // Add all snapshots
          snapshots.forEach((snapshot) => {
            manager.addAction(snapshot);
          });

          // Perform random undo/redo operations
          // true = undo, false = redo
          operations.forEach((shouldUndo) => {
            if (shouldUndo && manager.canUndo()) {
              manager.undo();
            } else if (!shouldUndo && manager.canRedo()) {
              manager.redo();
            }
          });

          // Verify state is still valid
          const currentState = manager.getCurrentSnapshot();
          expect(currentState).not.toBeNull();

          // Verify history integrity
          const pastLength = manager.getPastLength();
          const futureLength = manager.getFutureLength();
          expect(pastLength).toBeGreaterThanOrEqual(0);
          expect(futureLength).toBeGreaterThanOrEqual(0);
          expect(pastLength + futureLength).toBeLessThanOrEqual(snapshots.length);

          // Verify canUndo/canRedo flags are consistent
          expect(manager.canUndo()).toBe(pastLength > 0);
          expect(manager.canRedo()).toBe(futureLength > 0);
        }
      ),
      propertyTestParams()
    );
  });
});
