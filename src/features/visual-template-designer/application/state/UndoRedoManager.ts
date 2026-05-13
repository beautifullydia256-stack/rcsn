/**
 * Visual Template Designer - Undo/Redo Manager
 * 
 * This class manages the undo/redo history for template editing operations.
 * It maintains a history of template snapshots with a configurable maximum size
 * and provides methods for undo, redo, and history management.
 * 
 * Requirements:
 * - Requirement 1.9-1.13: Undo/redo with at least 50 action history
 * - Requirement 5: Undo/redo system with unlimited history (implemented with 50 action limit)
 * 
 * Design:
 * - Maintains three stacks: past (for undo), present (current state), future (for redo)
 * - Limits history to 50 actions (configurable)
 * - Clears future stack when new action is added
 * - Provides canUndo() and canRedo() methods
 */

import type { HistoryState, TemplateSnapshot } from './types';

/**
 * UndoRedoManager class for managing template editing history.
 * 
 * This class implements a standard undo/redo pattern with three stacks:
 * - past: contains previous states (for undo)
 * - present: contains current state
 * - future: contains undone states (for redo)
 * 
 * When a new action is added:
 * 1. Current present is pushed to past
 * 2. New state becomes present
 * 3. Future is cleared
 * 
 * When undo is called:
 * 1. Current present is pushed to future
 * 2. Last item from past becomes present
 * 
 * When redo is called:
 * 1. Current present is pushed to past
 * 2. Last item from future becomes present
 */
export class UndoRedoManager {
  private state: HistoryState;

  /**
   * Creates a new UndoRedoManager instance.
   * 
   * @param maxHistorySize - Maximum number of history entries to maintain (default: 50)
   */
  constructor(maxHistorySize: number = 50) {
    this.state = {
      past: [],
      present: null,
      future: [],
      maxHistorySize,
      canUndo: false,
      canRedo: false,
    };
  }

  /**
   * Adds a new action to the history.
   * 
   * This method:
   * 1. Pushes current present to past stack
   * 2. Sets new snapshot as present
   * 3. Clears future stack (can't redo after new action)
   * 4. Trims past stack if it exceeds maxHistorySize
   * 5. Updates canUndo and canRedo flags
   * 
   * @param snapshot - The template snapshot to add to history
   */
  addAction(snapshot: TemplateSnapshot): void {
    // If there's a current present state, push it to past
    if (this.state.present !== null) {
      this.state.past.push(this.state.present);
    }

    // Set new snapshot as present
    this.state.present = snapshot;

    // Clear future stack (can't redo after new action)
    this.state.future = [];

    // Trim past stack if it exceeds maxHistorySize
    if (this.state.past.length > this.state.maxHistorySize) {
      // Remove oldest entries to maintain size limit
      this.state.past = this.state.past.slice(
        this.state.past.length - this.state.maxHistorySize
      );
    }

    // Update flags
    this.updateFlags();
  }

  /**
   * Undoes the last action.
   * 
   * This method:
   * 1. Pushes current present to future stack
   * 2. Pops last item from past and makes it present
   * 3. Updates canUndo and canRedo flags
   * 
   * @returns The previous template snapshot, or null if undo is not available
   */
  undo(): TemplateSnapshot | null {
    if (!this.canUndo()) {
      return null;
    }

    // Push current present to future
    if (this.state.present !== null) {
      this.state.future.push(this.state.present);
    }

    // Pop last item from past and make it present
    const previousState = this.state.past.pop();
    this.state.present = previousState || null;

    // Update flags
    this.updateFlags();

    return this.state.present;
  }

  /**
   * Redoes the last undone action.
   * 
   * This method:
   * 1. Pushes current present to past stack
   * 2. Pops last item from future and makes it present
   * 3. Updates canUndo and canRedo flags
   * 
   * @returns The next template snapshot, or null if redo is not available
   */
  redo(): TemplateSnapshot | null {
    if (!this.canRedo()) {
      return null;
    }

    // Push current present to past
    if (this.state.present !== null) {
      this.state.past.push(this.state.present);
    }

    // Pop last item from future and make it present
    const nextState = this.state.future.pop();
    this.state.present = nextState || null;

    // Update flags
    this.updateFlags();

    return this.state.present;
  }

  /**
   * Checks if undo is available.
   * 
   * @returns True if there are actions to undo, false otherwise
   */
  canUndo(): boolean {
    return this.state.past.length > 0;
  }

  /**
   * Checks if redo is available.
   * 
   * @returns True if there are actions to redo, false otherwise
   */
  canRedo(): boolean {
    return this.state.future.length > 0;
  }

  /**
   * Gets the current history state.
   * 
   * @returns The current history state
   */
  getState(): HistoryState {
    return {
      ...this.state,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    };
  }

  /**
   * Gets the current present snapshot.
   * 
   * @returns The current template snapshot, or null if no present state
   */
  getCurrentSnapshot(): TemplateSnapshot | null {
    return this.state.present;
  }

  /**
   * Gets the number of actions in the past stack.
   * 
   * @returns The number of undo actions available
   */
  getPastLength(): number {
    return this.state.past.length;
  }

  /**
   * Gets the number of actions in the future stack.
   * 
   * @returns The number of redo actions available
   */
  getFutureLength(): number {
    return this.state.future.length;
  }

  /**
   * Clears all history.
   * 
   * This method resets the manager to its initial state,
   * clearing past, present, and future stacks.
   */
  clear(): void {
    this.state.past = [];
    this.state.present = null;
    this.state.future = [];
    this.updateFlags();
  }

  /**
   * Sets the maximum history size.
   * 
   * If the new size is smaller than the current past stack size,
   * the oldest entries are removed to fit the new limit.
   * 
   * @param size - The new maximum history size
   */
  setMaxHistorySize(size: number): void {
    this.state.maxHistorySize = size;

    // Trim past stack if it exceeds new size
    if (this.state.past.length > size) {
      this.state.past = this.state.past.slice(
        this.state.past.length - size
      );
    }

    this.updateFlags();
  }

  /**
   * Gets the maximum history size.
   * 
   * @returns The maximum number of history entries
   */
  getMaxHistorySize(): number {
    return this.state.maxHistorySize;
  }

  /**
   * Updates the canUndo and canRedo flags based on current state.
   * 
   * This is a private helper method called after any state change.
   */
  private updateFlags(): void {
    this.state.canUndo = this.canUndo();
    this.state.canRedo = this.canRedo();
  }
}
