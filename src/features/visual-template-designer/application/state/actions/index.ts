/**
 * Visual Template Designer - Action Classes Index
 * 
 * Central export point for all action classes.
 * Each action implements the TemplateAction interface with execute() and undo() methods.
 * 
 * Actions are organized into logical groups:
 * - Component operations: Add, update, delete, move, resize, rotate, duplicate
 * - Multi-component operations: Group, ungroup, align, distribute
 * - Layer operations: Bring to front, send to back, bring forward, send backward
 * - Page operations: Add, remove, reorder, duplicate
 * - Template operations: Load, save, update metadata
 * - Clipboard operations: Copy, paste, cut
 */

// Component operations
export { AddComponentAction } from './AddComponentAction';
export { UpdateComponentAction } from './UpdateComponentAction';
export { DeleteComponentAction } from './DeleteComponentAction';
export { MoveComponentAction } from './MoveComponentAction';
export { ResizeComponentAction } from './ResizeComponentAction';
export { RotateComponentAction } from './RotateComponentAction';
export { DuplicateComponentAction } from './DuplicateComponentAction';

// Multi-component operations
export { GroupComponentsAction } from './GroupComponentsAction';
export { UngroupComponentsAction } from './UngroupComponentsAction';
export { AlignComponentsAction } from './AlignComponentsAction';
export { DistributeComponentsAction } from './DistributeComponentsAction';

// Layer operations
export { BringToFrontAction } from './BringToFrontAction';
export { SendToBackAction } from './SendToBackAction';
export { BringForwardAction } from './BringForwardAction';
export { SendBackwardAction } from './SendBackwardAction';

// Page operations
export { AddPageAction } from './AddPageAction';
export { RemovePageAction } from './RemovePageAction';
export { ReorderPagesAction } from './ReorderPagesAction';
export { DuplicatePageAction } from './DuplicatePageAction';

// Template operations
export { LoadTemplateAction } from './LoadTemplateAction';
export { SaveTemplateAction } from './SaveTemplateAction';
export { UpdateTemplateMetadataAction } from './UpdateTemplateMetadataAction';

// Clipboard operations
export { CopyComponentAction } from './CopyComponentAction';
export { PasteComponentAction } from './PasteComponentAction';
export { CutComponentAction } from './CutComponentAction';
