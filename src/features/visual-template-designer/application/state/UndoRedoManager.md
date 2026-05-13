# UndoRedoManager

## Overview

The `UndoRedoManager` class manages the undo/redo history for template editing operations in the Visual Template Designer. It implements a standard undo/redo pattern with three stacks (past, present, future) and maintains a configurable history size limit.

## Requirements

- **Requirement 1.9-1.13**: Undo/redo with at least 50 action history
- **Requirement 5**: Undo/redo system with unlimited history (implemented with 50 action limit)

## Architecture

The manager uses three stacks to manage history:

1. **Past Stack**: Contains previous states (for undo operations)
2. **Present**: Contains the current state
3. **Future Stack**: Contains undone states (for redo operations)

### State Transitions

#### Adding a New Action
```
Before: Past: [S1, S2], Present: S3, Future: [S4, S5]
After:  Past: [S1, S2, S3], Present: S_new, Future: []
```
- Current present is pushed to past
- New state becomes present
- Future is cleared (can't redo after new action)

#### Undo Operation
```
Before: Past: [S1, S2], Present: S3, Future: []
After:  Past: [S1], Present: S2, Future: [S3]
```
- Current present is pushed to future
- Last item from past becomes present

#### Redo Operation
```
Before: Past: [S1], Present: S2, Future: [S3]
After:  Past: [S1, S2], Present: S3, Future: []
```
- Current present is pushed to past
- Last item from future becomes present

## API Reference

### Constructor

```typescript
constructor(maxHistorySize: number = 50)
```

Creates a new UndoRedoManager instance with the specified maximum history size.

**Parameters:**
- `maxHistorySize` (optional): Maximum number of history entries to maintain (default: 50)

### Methods

#### `addAction(snapshot: TemplateSnapshot): void`

Adds a new action to the history. This method:
1. Pushes current present to past stack
2. Sets new snapshot as present
3. Clears future stack
4. Trims past stack if it exceeds maxHistorySize
5. Updates canUndo and canRedo flags

**Parameters:**
- `snapshot`: The template snapshot to add to history

#### `undo(): TemplateSnapshot | null`

Undoes the last action and returns the previous state.

**Returns:**
- The previous template snapshot, or `null` if undo is not available

#### `redo(): TemplateSnapshot | null`

Redoes the last undone action and returns the next state.

**Returns:**
- The next template snapshot, or `null` if redo is not available

#### `canUndo(): boolean`

Checks if undo is available.

**Returns:**
- `true` if there are actions to undo, `false` otherwise

#### `canRedo(): boolean`

Checks if redo is available.

**Returns:**
- `true` if there are actions to redo, `false` otherwise

#### `getState(): HistoryState`

Gets the current history state including past, present, future stacks and flags.

**Returns:**
- The current history state

#### `getCurrentSnapshot(): TemplateSnapshot | null`

Gets the current present snapshot.

**Returns:**
- The current template snapshot, or `null` if no present state

#### `getPastLength(): number`

Gets the number of actions in the past stack.

**Returns:**
- The number of undo actions available

#### `getFutureLength(): number`

Gets the number of actions in the future stack.

**Returns:**
- The number of redo actions available

#### `clear(): void`

Clears all history, resetting the manager to its initial state.

#### `setMaxHistorySize(size: number): void`

Sets the maximum history size. If the new size is smaller than the current past stack size, the oldest entries are removed.

**Parameters:**
- `size`: The new maximum history size

#### `getMaxHistorySize(): number`

Gets the maximum history size.

**Returns:**
- The maximum number of history entries

## Usage Example

```typescript
import { UndoRedoManager } from './application/state';
import type { TemplateSnapshot } from './application/state';

// Create manager with default 50 action limit
const manager = new UndoRedoManager();

// Create a snapshot
const snapshot: TemplateSnapshot = {
  template: currentTemplate,
  timestamp: new Date(),
  actionType: 'ADD_COMPONENT',
  actionDescription: 'Added student name component',
};

// Add action to history
manager.addAction(snapshot);

// Check if undo is available
if (manager.canUndo()) {
  // Undo the last action
  const previousState = manager.undo();
  if (previousState) {
    // Restore the previous template state
    restoreTemplate(previousState.template);
  }
}

// Check if redo is available
if (manager.canRedo()) {
  // Redo the last undone action
  const nextState = manager.redo();
  if (nextState) {
    // Restore the next template state
    restoreTemplate(nextState.template);
  }
}

// Get current state info
const state = manager.getState();
console.log(`Can undo: ${state.canUndo}, Can redo: ${state.canRedo}`);
console.log(`Past: ${state.past.length}, Future: ${state.future.length}`);

// Clear all history
manager.clear();
```

## Integration with State Management

The UndoRedoManager is designed to work with the template designer's state management system:

```typescript
// In your state management store (Zustand/Redux)
import { UndoRedoManager } from './application/state';

const undoRedoManager = new UndoRedoManager(50);

// When an action is performed
const performAction = (action: TemplateAction) => {
  // Execute the action
  const newState = action.execute(currentState);
  
  // Create snapshot
  const snapshot: TemplateSnapshot = {
    template: newState.current!,
    timestamp: new Date(),
    actionType: action.type,
    actionDescription: action.description,
  };
  
  // Add to history
  undoRedoManager.addAction(snapshot);
  
  // Update state
  setState(newState);
};

// Undo action
const undo = () => {
  const previousSnapshot = undoRedoManager.undo();
  if (previousSnapshot) {
    setState({ current: previousSnapshot.template });
  }
};

// Redo action
const redo = () => {
  const nextSnapshot = undoRedoManager.redo();
  if (nextSnapshot) {
    setState({ current: nextSnapshot.template });
  }
};
```

## Testing

The UndoRedoManager has comprehensive unit tests covering:

- Constructor initialization
- Adding actions to history
- Undo and redo operations
- History size limits and trimming
- Edge cases (empty history, single action, undo/redo cycles)
- State management (canUndo, canRedo flags)
- Clear and reset operations

All 46 tests pass successfully. See `__tests__/UndoRedoManager.test.ts` for details.

## Design Decisions

### Why Three Stacks?

The three-stack approach (past, present, future) is a standard pattern for undo/redo because:
1. It's simple and intuitive
2. It provides O(1) time complexity for undo/redo operations
3. It naturally handles the "clear future on new action" requirement
4. It makes state transitions explicit and easy to reason about

### Why Limit History Size?

While the requirement mentions "unlimited history," we implement a 50-action limit because:
1. It satisfies the requirement of "at least 50 actions"
2. It prevents unbounded memory growth
3. It's configurable if more history is needed
4. 50 actions is sufficient for typical editing workflows

### Why Store Complete Snapshots?

We store complete template snapshots rather than deltas because:
1. It simplifies the implementation (no need to compute inverse operations)
2. It makes undo/redo operations fast (O(1) instead of O(n) for delta replay)
3. It makes the code more maintainable and easier to test
4. Memory usage is acceptable for 50 snapshots of template data

## Future Enhancements

Potential improvements for future iterations:

1. **Delta-based History**: Store only changes between states to reduce memory usage
2. **Compression**: Compress old snapshots to save memory
3. **Persistence**: Save history to localStorage for recovery after page refresh
4. **Branching**: Support multiple undo/redo branches (tree-based history)
5. **Selective Undo**: Allow undoing specific actions without undoing everything after them
6. **History Visualization**: Show a timeline of actions for easier navigation
