# Template Designer Store

## Overview

The Template Designer Store is a global state management solution built with Zustand that manages all template editing state and operations. It integrates the UndoRedoManager and action classes to provide a complete state management system with undo/redo functionality.

## Architecture

### State Structure

The store maintains the following state:

```typescript
interface TemplateStore {
  // Template state
  current: Template | null;              // Current template being edited
  history: TemplateSnapshot[];           // History of template snapshots
  historyIndex: number;                  // Current position in history
  selectedComponentId: string | null;    // ID of selected component
  selectedComponentIds: string[];        // IDs of multiple selected components
  clipboard: TemplateComponent | null;   // Component in clipboard
  isDirty: boolean;                      // Flag for unsaved changes
  currentPageId: string | null;          // Current page being edited
  
  // UndoRedoManager instance
  undoRedoManager: UndoRedoManager;
  
  // Actions (see below)
}
```

### Integration with UndoRedoManager

All mutating actions (add, update, delete, move, resize, etc.) go through the UndoRedoManager:

1. Action is created with the operation parameters
2. Action's `execute()` method is called to get the new state
3. A snapshot is created from the new state
4. Snapshot is added to the UndoRedoManager
5. Store state is updated with the new state

This ensures that all operations can be undone and redone.

### Action Classes

The store uses action classes from `./actions/` for all template mutations:

- **Component Operations**: AddComponentAction, UpdateComponentAction, DeleteComponentAction, DuplicateComponentAction
- **Component Manipulation**: MoveComponentAction, ResizeComponentAction, RotateComponentAction
- **Layer Management**: BringToFrontAction, SendToBackAction, BringForwardAction, SendBackwardAction
- **Grouping**: GroupComponentsAction, UngroupComponentsAction
- **Alignment**: AlignComponentsAction
- **Distribution**: DistributeComponentsAction
- **Page Management**: AddPageAction, RemovePageAction, ReorderPagesAction, DuplicatePageAction
- **Template Operations**: LoadTemplateAction, SaveTemplateAction, UpdateTemplateMetadataAction
- **Clipboard**: CopyComponentAction, PasteComponentAction, CutComponentAction

## Usage

### Basic Usage

```typescript
import { useTemplateStore } from './application/state/store';

function MyComponent() {
  // Access state
  const template = useTemplateStore(state => state.current);
  const isDirty = useTemplateStore(state => state.isDirty);
  
  // Access actions
  const loadTemplate = useTemplateStore(state => state.loadTemplate);
  const addComponent = useTemplateStore(state => state.addComponent);
  const undo = useTemplateStore(state => state.undo);
  const redo = useTemplateStore(state => state.redo);
  
  // Use actions
  const handleAddComponent = () => {
    const component = createComponent();
    addComponent(component);
  };
  
  return (
    <div>
      <button onClick={handleAddComponent}>Add Component</button>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
    </div>
  );
}
```

### Template Lifecycle

```typescript
// Load a template
const template = await fetchTemplate(templateId);
loadTemplate(template);

// Save the template
await saveTemplate();

// Close the template
closeTemplate();
```

### Component Operations

```typescript
// Add a component
const component = {
  id: 'comp-1',
  type: 'STUDENT_NAME',
  layout: { position: { x: 10, y: 10, unit: 'px' }, ... },
  zIndex: 1,
};
addComponent(component);

// Update a component
updateComponent('comp-1', {
  layout: {
    ...component.layout,
    position: { x: 50, y: 50, unit: 'px' },
  },
});

// Delete a component
deleteComponent('comp-1');

// Duplicate a component
duplicateComponent('comp-1');
```

### Component Manipulation

```typescript
// Move a component
moveComponent('comp-1', 100, 200);

// Resize a component
resizeComponent('comp-1', 200, 150);

// Rotate a component
rotateComponent('comp-1', 45);
```

### Layer Management

```typescript
// Bring to front
bringToFront('comp-1');

// Send to back
sendToBack('comp-1');

// Bring forward one layer
bringForward('comp-1');

// Send backward one layer
sendBackward('comp-1');
```

### Selection

```typescript
// Select a component
selectComponent('comp-1');

// Select multiple components
selectMultipleComponents(['comp-1', 'comp-2']);

// Clear selection
clearSelection();
```

### Clipboard

```typescript
// Copy selected component
selectComponent('comp-1');
copyComponent();

// Cut selected component
selectComponent('comp-1');
cutComponent();

// Paste component
pasteComponent();
```

### Grouping

```typescript
// Group components
groupComponents(['comp-1', 'comp-2', 'comp-3']);

// Ungroup components
ungroupComponents('group-1');
```

### Alignment

```typescript
// Align components
alignLeft(['comp-1', 'comp-2']);
alignCenter(['comp-1', 'comp-2']);
alignRight(['comp-1', 'comp-2']);
alignTop(['comp-1', 'comp-2']);
alignMiddle(['comp-1', 'comp-2']);
alignBottom(['comp-1', 'comp-2']);
```

### Distribution

```typescript
// Distribute components
distributeHorizontally(['comp-1', 'comp-2', 'comp-3']);
distributeVertically(['comp-1', 'comp-2', 'comp-3']);
```

### Page Management

```typescript
// Add a page
addPage();

// Remove a page
removePage('page-2');

// Reorder pages
reorderPages(['page-2', 'page-1', 'page-3']);

// Duplicate a page
duplicatePage('page-1');

// Set current page
setCurrentPage('page-2');
```

### Undo/Redo

```typescript
// Undo last action
undo();

// Redo last undone action
redo();

// Check if undo/redo is available
const canUndoNow = canUndo();
const canRedoNow = canRedo();

// Clear history
clearHistory();
```

## Undo/Redo System

The store maintains a history of up to 50 actions (configurable). Each action creates a snapshot of the template state that can be restored.

### How It Works

1. **Action Execution**: When an action is executed, it transforms the current state into a new state
2. **Snapshot Creation**: A snapshot is created containing the new template state, timestamp, action type, and description
3. **History Management**: The snapshot is added to the UndoRedoManager, which maintains past, present, and future stacks
4. **Undo**: Moves backward in history, restoring the previous snapshot
5. **Redo**: Moves forward in history, restoring the next snapshot
6. **History Limit**: When the history exceeds 50 actions, the oldest actions are removed

### History Behavior

- **New Action**: Clears the redo stack (can't redo after a new action)
- **Undo**: Moves current state to future stack, restores previous state from past stack
- **Redo**: Moves current state to past stack, restores next state from future stack
- **History Limit**: Maintains maximum of 50 actions in the past stack

## Testing

The store has comprehensive unit tests covering:

- Template lifecycle (load, save, close)
- Component operations (add, update, delete, duplicate)
- Component manipulation (move, resize, rotate)
- Layer management (bring to front, send to back, etc.)
- Selection (single, multiple, clear)
- Clipboard (copy, cut, paste)
- Page management (add, remove, reorder, duplicate)
- Undo/redo functionality
- Error handling
- Integration tests with complex workflows

Run tests with:

```bash
npm run test -- src/features/visual-template-designer/application/state/__tests__/store.test.ts
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 1.11**: Undo history of at least 50 actions ✓
- **Requirement 1.12**: Redo history of at least 50 actions ✓
- **Requirement 1.13**: Undo/redo system integration ✓
- **Requirement 13.2**: Save template with unique name ✓
- **Requirement 13.3**: Load existing template for editing ✓
- **Requirement 18.3**: Copy component with Ctrl+C ✓
- **Requirement 18.4**: Paste component with Ctrl+V ✓

## Performance Considerations

- **Immutable Updates**: All state updates create new objects, ensuring React can detect changes efficiently
- **Selective Subscriptions**: Components can subscribe to specific parts of the state to minimize re-renders
- **Devtools Integration**: Zustand devtools middleware is enabled for debugging in development

## Future Enhancements

Potential improvements for future iterations:

1. **Persistence**: Add middleware to persist state to localStorage
2. **Optimistic Updates**: Implement optimistic updates for better UX
3. **Batch Operations**: Add support for batching multiple operations into a single undo/redo action
4. **History Compression**: Compress similar consecutive actions (e.g., multiple move operations)
5. **Async Actions**: Add support for async operations with loading states
6. **Collaboration**: Add support for real-time collaboration with conflict resolution
