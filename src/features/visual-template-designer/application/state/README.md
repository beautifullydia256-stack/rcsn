# Template Designer State Management

This directory contains the state management interfaces and types for the Visual Template Designer. The state management system is designed to support undo/redo functionality, multi-page templates, and comprehensive editor UI state.

## Overview

The state management system is organized into three main state interfaces:

1. **TemplateState** - Manages the current template, selection, clipboard, and edit history
2. **EditorState** - Manages UI-specific state like zoom, pan, grid settings
3. **HistoryState** - Manages undo/redo stacks and history navigation

These are combined into a single **DesignerState** interface that represents the complete application state.

## Architecture

### State Structure

```
DesignerState
├── template: TemplateState
│   ├── current: Template | null
│   ├── history: TemplateSnapshot[]
│   ├── historyIndex: number
│   ├── selectedComponentId: string | null
│   ├── selectedComponentIds: string[]
│   ├── clipboard: TemplateComponent | null
│   ├── isDirty: boolean
│   └── currentPageId: string | null
├── editor: EditorState
│   ├── zoom: number (25-400)
│   ├── panX: number
│   ├── panY: number
│   ├── gridEnabled: boolean
│   ├── gridSpacing: number (5, 10, 20, 25, 50)
│   ├── snapToGrid: boolean
│   ├── rulersVisible: boolean
│   ├── alignmentGuidesEnabled: boolean
│   ├── unit: 'px' | 'mm' | 'in'
│   ├── previewMode: boolean
│   ├── propertiesPanelVisible: boolean
│   └── componentLibraryVisible: boolean
└── history: HistoryState
    ├── past: TemplateSnapshot[]
    ├── present: TemplateSnapshot | null
    ├── future: TemplateSnapshot[]
    ├── maxHistorySize: number (50)
    ├── canUndo: boolean
    └── canRedo: boolean
```

## State Interfaces

### TemplateState

Manages the core template editing state:

- **current**: The template currently being edited (null if no template loaded)
- **history**: Array of template snapshots for undo/redo
- **historyIndex**: Current position in history (-1 if no history)
- **selectedComponentId**: ID of the currently selected component
- **selectedComponentIds**: IDs of multiple selected components (for multi-select)
- **clipboard**: Component in clipboard (for copy/paste)
- **isDirty**: Flag indicating unsaved changes
- **currentPageId**: ID of the currently active page (for multi-page templates)

### EditorState

Manages UI-specific editor state:

- **zoom**: Current zoom level (25-400 percent)
- **panX/panY**: Canvas pan offset coordinates
- **gridEnabled**: Whether grid lines are visible
- **gridSpacing**: Grid spacing in pixels (5, 10, 20, 25, 50)
- **snapToGrid**: Whether snap-to-grid is enabled
- **rulersVisible**: Whether rulers are visible
- **alignmentGuidesEnabled**: Whether alignment guides are enabled
- **unit**: Current unit of measurement (px, mm, in)
- **previewMode**: Whether in preview mode (vs edit mode)
- **propertiesPanelVisible**: Whether properties panel is visible
- **componentLibraryVisible**: Whether component library is visible

### HistoryState

Manages undo/redo functionality:

- **past**: Stack of past states (for undo)
- **present**: Current state snapshot
- **future**: Stack of future states (for redo)
- **maxHistorySize**: Maximum number of history entries (50)
- **canUndo**: Whether undo is available
- **canRedo**: Whether redo is available

## Action System

### ActionType

The system defines 24 action types organized into categories:

**Component Operations:**
- ADD_COMPONENT
- UPDATE_COMPONENT
- DELETE_COMPONENT
- MOVE_COMPONENT
- RESIZE_COMPONENT
- ROTATE_COMPONENT
- DUPLICATE_COMPONENT

**Multi-Component Operations:**
- GROUP_COMPONENTS
- UNGROUP_COMPONENTS
- ALIGN_COMPONENTS
- DISTRIBUTE_COMPONENTS

**Layer Operations:**
- BRING_TO_FRONT
- SEND_TO_BACK
- BRING_FORWARD
- SEND_BACKWARD

**Page Operations:**
- ADD_PAGE
- REMOVE_PAGE
- REORDER_PAGES
- DUPLICATE_PAGE

**Template Operations:**
- LOAD_TEMPLATE
- SAVE_TEMPLATE
- UPDATE_TEMPLATE_METADATA

**Clipboard Operations:**
- COPY_COMPONENT
- PASTE_COMPONENT
- CUT_COMPONENT

### TemplateAction Interface

Each action implements the `TemplateAction` interface:

```typescript
interface TemplateAction {
  type: ActionType;
  description: string;
  timestamp: Date;
  execute: (state: TemplateState) => TemplateState;
  undo: (state: TemplateState) => TemplateState;
}
```

Actions are designed to be:
- **Immutable**: Execute and undo return new state objects
- **Reversible**: Every action can be undone
- **Composable**: Actions can be combined for complex operations

## Action Interfaces

### TemplateActions

Defines all available template manipulation actions:

**Template Lifecycle:**
- loadTemplate(templateId)
- saveTemplate()
- createTemplate(category)
- closeTemplate()

**Component Operations:**
- addComponent(component, pageId?)
- updateComponent(componentId, updates)
- deleteComponent(componentId)
- duplicateComponent(componentId)

**Component Manipulation:**
- moveComponent(componentId, x, y)
- resizeComponent(componentId, width, height)
- rotateComponent(componentId, rotation)

**Layer Management:**
- bringToFront(componentId)
- sendToBack(componentId)
- bringForward(componentId)
- sendBackward(componentId)

**Selection:**
- selectComponent(componentId)
- selectMultipleComponents(componentIds)
- clearSelection()

**Clipboard:**
- copyComponent()
- cutComponent()
- pasteComponent()

**Grouping:**
- groupComponents(componentIds)
- ungroupComponents(groupId)

**Alignment:**
- alignLeft/Center/Right(componentIds)
- alignTop/Middle/Bottom(componentIds)

**Distribution:**
- distributeHorizontally(componentIds)
- distributeVertically(componentIds)

**Page Management:**
- addPage()
- removePage(pageId)
- reorderPages(pageIds)
- duplicatePage(pageId)
- setCurrentPage(pageId)

**History:**
- undo()
- redo()
- clearHistory()

### EditorActions

Defines all available editor UI actions:

**Zoom:**
- setZoom(zoom)
- zoomIn()
- zoomOut()
- zoomToFit()
- zoomToActualSize()

**Pan:**
- setPan(x, y)
- resetPan()

**Grid:**
- toggleGrid()
- setGridSpacing(spacing)
- toggleSnapToGrid()

**Rulers:**
- toggleRulers()

**Alignment Guides:**
- toggleAlignmentGuides()

**Unit:**
- setUnit(unit)

**Mode:**
- togglePreviewMode()

**Panels:**
- togglePropertiesPanel()
- toggleComponentLibrary()

## Usage Examples

### Creating Initial State

```typescript
import { initialDesignerState } from './application/state';

const state = initialDesignerState;
// state.template.current === null
// state.editor.zoom === 100
// state.history.maxHistorySize === 50
```

### Implementing an Action

```typescript
import type { TemplateAction, TemplateState } from './application/state';

const addComponentAction: TemplateAction = {
  type: 'ADD_COMPONENT',
  description: 'Add text label component',
  timestamp: new Date(),
  execute: (state: TemplateState) => {
    if (!state.current) return state;
    
    const newComponent = {
      id: generateId(),
      type: 'TEXT_LABEL',
      layout: { /* ... */ },
      zIndex: getMaxZIndex(state.current) + 1,
    };
    
    return {
      ...state,
      current: {
        ...state.current,
        pages: state.current.pages.map(page =>
          page.id === state.currentPageId
            ? { ...page, elements: [...page.elements, newComponent] }
            : page
        ),
      },
      isDirty: true,
    };
  },
  undo: (state: TemplateState) => {
    // Revert to previous state
    return previousState;
  },
};
```

### Using State in Components

```typescript
import type { TemplateState, EditorState } from './application/state';

function CanvasComponent({ 
  templateState, 
  editorState 
}: { 
  templateState: TemplateState; 
  editorState: EditorState;
}) {
  const { current, selectedComponentId } = templateState;
  const { zoom, gridEnabled, snapToGrid } = editorState;
  
  // Render canvas with current state
}
```

## Requirements Mapping

This state management system satisfies the following requirements:

- **Requirement 1.9-1.13**: Undo/redo with 50 action history
- **Requirement 5**: Undo/redo system with unlimited history (implemented with 50 limit)
- **Requirement 6**: Multi-page template support (currentPageId tracking)
- **Requirement 1.8**: Zoom levels from 25% to 400%
- **Requirement 1.6**: Snap-to-grid functionality
- **Requirement 22**: Grid and ruler display settings

## Testing

The state types are comprehensively tested with 43 unit tests covering:

- Initial state structure validation
- State property tracking
- Type safety enforcement
- State immutability
- Action interface validation
- Snapshot structure validation

Run tests with:
```bash
npm test -- src/features/visual-template-designer/application/state/__tests__/types.test.ts
```

## Next Steps

The following components will be implemented in subsequent tasks:

1. **UndoRedoManager** (Task 5.2) - Implements the undo/redo logic using these state types
2. **Action Classes** (Task 5.4) - Concrete implementations of TemplateAction for each operation
3. **State Store** (Task 5.5) - Global state management using Zustand or Redux with these interfaces

## Design Principles

1. **Immutability**: All state updates return new objects, never mutate existing state
2. **Type Safety**: Comprehensive TypeScript types prevent runtime errors
3. **Separation of Concerns**: Template state, editor state, and history state are independent
4. **Testability**: Pure functions and clear interfaces enable comprehensive testing
5. **Scalability**: Action system supports adding new operations without modifying core state
