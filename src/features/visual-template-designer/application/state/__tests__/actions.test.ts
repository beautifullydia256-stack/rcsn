/**
 * Visual Template Designer - Action Classes Unit Tests
 * 
 * Comprehensive unit tests for all template action classes.
 * Tests verify execute() and undo() methods for each action type.
 * 
 * Requirements:
 * - Task 5.4: Implement action classes for all template operations
 * - Requirement 1.2: Add components to canvas
 * - Requirement 1.4: Move components
 * - Requirement 1.5: Rotate components
 * - Requirement 5.16: Apply layout properties
 * - Requirement 21.2: Group components
 * - Requirement 21.5: Ungroup components
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AddComponentAction,
  UpdateComponentAction,
  DeleteComponentAction,
  MoveComponentAction,
  ResizeComponentAction,
  RotateComponentAction,
  GroupComponentsAction,
  UngroupComponentsAction,
} from '../actions';
import type { TemplateState } from '../types';
import type { Template, TemplateComponent, TemplatePage } from '../../../domain/types';

// Test fixtures
const createMockTemplate = (): Template => ({
  id: 'template-1',
  name: 'Test Template',
  category: 'REPORT_CARD',
  pageSize: 'A4',
  pageOrientation: 'portrait',
  pages: [
    {
      id: 'page-1',
      pageNumber: 1,
      width: 210,
      height: 297,
      elements: [],
    },
  ],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: 'user-1',
  version: 1,
});

const createMockComponent = (id: string = 'component-1'): TemplateComponent => ({
  id,
  type: 'STUDENT_NAME',
  layout: {
    position: { x: 100, y: 100, unit: 'px' },
    size: { width: 200, height: 50, unit: 'px' },
    rotation: 0,
  },
  zIndex: 1,
});

const createMockState = (template: Template | null = null): TemplateState => ({
  current: template,
  history: [],
  historyIndex: -1,
  selectedComponentId: null,
  selectedComponentIds: [],
  clipboard: null,
  isDirty: false,
  currentPageId: template?.pages[0]?.id || null,
});

describe('AddComponentAction', () => {
  let initialState: TemplateState;
  let component: TemplateComponent;
  let pageId: string;

  beforeEach(() => {
    const template = createMockTemplate();
    initialState = createMockState(template);
    component = createMockComponent();
    pageId = template.pages[0].id;
  });

  it('should add component to page', () => {
    const action = new AddComponentAction(component, pageId);
    const newState = action.execute(initialState);

    expect(newState.current?.pages[0].elements).toHaveLength(1);
    expect(newState.current?.pages[0].elements[0].id).toBe(component.id);
    expect(newState.isDirty).toBe(true);
  });

  it('should assign highest z-index to new component', () => {
    // Add first component with z-index 5
    const existingComponent = createMockComponent('existing-1');
    existingComponent.zIndex = 5;
    initialState.current!.pages[0].elements = [existingComponent];

    const action = new AddComponentAction(component, pageId);
    const newState = action.execute(initialState);

    const addedComponent = newState.current?.pages[0].elements.find(
      el => el.id === component.id
    );
    expect(addedComponent?.zIndex).toBe(6);
  });

  it('should undo component addition', () => {
    const action = new AddComponentAction(component, pageId);
    const stateAfterAdd = action.execute(initialState);
    const stateAfterUndo = action.undo(stateAfterAdd);

    expect(stateAfterUndo.current?.pages[0].elements).toHaveLength(0);
  });

  it('should throw error when no template loaded', () => {
    const emptyState = createMockState(null);
    const action = new AddComponentAction(component, pageId);

    expect(() => action.execute(emptyState)).toThrow('No template loaded');
  });

  it('should throw error when page not found', () => {
    const action = new AddComponentAction(component, 'invalid-page-id');

    expect(() => action.execute(initialState)).toThrow('Page invalid-page-id not found');
  });
});

describe('UpdateComponentAction', () => {
  let initialState: TemplateState;
  let component: TemplateComponent;

  beforeEach(() => {
    const template = createMockTemplate();
    component = createMockComponent();
    template.pages[0].elements = [component];
    initialState = createMockState(template);
  });

  it('should update component properties', () => {
    const updates = {
      layout: {
        ...component.layout,
        position: { x: 200, y: 200, unit: 'px' as const },
      },
    };
    const action = new UpdateComponentAction(component.id, updates);
    const newState = action.execute(initialState);

    const updatedComponent = newState.current?.pages[0].elements[0];
    expect(updatedComponent?.layout.position.x).toBe(200);
    expect(updatedComponent?.layout.position.y).toBe(200);
    expect(newState.isDirty).toBe(true);
  });

  it('should store previous values for undo', () => {
    const updates = { zIndex: 10 };
    const action = new UpdateComponentAction(component.id, updates);
    const stateAfterUpdate = action.execute(initialState);
    const stateAfterUndo = action.undo(stateAfterUpdate);

    const restoredComponent = stateAfterUndo.current?.pages[0].elements[0];
    expect(restoredComponent?.zIndex).toBe(1); // Original value
  });

  it('should undo component update', () => {
    const originalPosition = { ...component.layout.position };
    const updates = {
      layout: {
        ...component.layout,
        position: { x: 300, y: 300, unit: 'px' as const },
      },
    };
    const action = new UpdateComponentAction(component.id, updates);
    const stateAfterUpdate = action.execute(initialState);
    const stateAfterUndo = action.undo(stateAfterUpdate);

    const restoredComponent = stateAfterUndo.current?.pages[0].elements[0];
    expect(restoredComponent?.layout.position.x).toBe(originalPosition.x);
    expect(restoredComponent?.layout.position.y).toBe(originalPosition.y);
  });

  it('should throw error when component not found', () => {
    const action = new UpdateComponentAction('invalid-id', { zIndex: 10 });

    expect(() => action.execute(initialState)).toThrow('Component invalid-id not found');
  });
});

describe('DeleteComponentAction', () => {
  let initialState: TemplateState;
  let component: TemplateComponent;

  beforeEach(() => {
    const template = createMockTemplate();
    component = createMockComponent();
    template.pages[0].elements = [component];
    initialState = createMockState(template);
  });

  it('should delete component from page', () => {
    const action = new DeleteComponentAction(component.id);
    const newState = action.execute(initialState);

    expect(newState.current?.pages[0].elements).toHaveLength(0);
    expect(newState.isDirty).toBe(true);
  });

  it('should clear selection when deleting selected component', () => {
    initialState.selectedComponentId = component.id;
    const action = new DeleteComponentAction(component.id);
    const newState = action.execute(initialState);

    expect(newState.selectedComponentId).toBeNull();
  });

  it('should remove from multi-selection when deleting', () => {
    initialState.selectedComponentIds = [component.id, 'other-id'];
    const action = new DeleteComponentAction(component.id);
    const newState = action.execute(initialState);

    expect(newState.selectedComponentIds).toEqual(['other-id']);
  });

  it('should undo component deletion', () => {
    const action = new DeleteComponentAction(component.id);
    const stateAfterDelete = action.execute(initialState);
    const stateAfterUndo = action.undo(stateAfterDelete);

    expect(stateAfterUndo.current?.pages[0].elements).toHaveLength(1);
    expect(stateAfterUndo.current?.pages[0].elements[0].id).toBe(component.id);
  });

  it('should restore component at original index', () => {
    const component2 = createMockComponent('component-2');
    const component3 = createMockComponent('component-3');
    initialState.current!.pages[0].elements = [component, component2, component3];

    const action = new DeleteComponentAction(component2.id);
    const stateAfterDelete = action.execute(initialState);
    const stateAfterUndo = action.undo(stateAfterDelete);

    const elements = stateAfterUndo.current?.pages[0].elements;
    expect(elements?.[1].id).toBe(component2.id);
  });
});

describe('MoveComponentAction', () => {
  let initialState: TemplateState;
  let component: TemplateComponent;

  beforeEach(() => {
    const template = createMockTemplate();
    component = createMockComponent();
    template.pages[0].elements = [component];
    initialState = createMockState(template);
  });

  it('should move component to new position', () => {
    const newPosition = { x: 300, y: 400, unit: 'px' as const };
    const action = new MoveComponentAction(component.id, newPosition);
    const newState = action.execute(initialState);

    const movedComponent = newState.current?.pages[0].elements[0];
    expect(movedComponent?.layout.position.x).toBe(300);
    expect(movedComponent?.layout.position.y).toBe(400);
    expect(newState.isDirty).toBe(true);
  });

  it('should undo component move', () => {
    const originalPosition = { ...component.layout.position };
    const newPosition = { x: 300, y: 400, unit: 'px' as const };
    const action = new MoveComponentAction(component.id, newPosition);
    const stateAfterMove = action.execute(initialState);
    const stateAfterUndo = action.undo(stateAfterMove);

    const restoredComponent = stateAfterUndo.current?.pages[0].elements[0];
    expect(restoredComponent?.layout.position.x).toBe(originalPosition.x);
    expect(restoredComponent?.layout.position.y).toBe(originalPosition.y);
  });

  it('should preserve other layout properties when moving', () => {
    const newPosition = { x: 300, y: 400, unit: 'px' as const };
    const action = new MoveComponentAction(component.id, newPosition);
    const newState = action.execute(initialState);

    const movedComponent = newState.current?.pages[0].elements[0];
    expect(movedComponent?.layout.size).toEqual(component.layout.size);
    expect(movedComponent?.layout.rotation).toBe(component.layout.rotation);
  });
});

describe('ResizeComponentAction', () => {
  let initialState: TemplateState;
  let component: TemplateComponent;

  beforeEach(() => {
    const template = createMockTemplate();
    component = createMockComponent();
    template.pages[0].elements = [component];
    initialState = createMockState(template);
  });

  it('should resize component', () => {
    const newSize = { width: 300, height: 100, unit: 'px' as const };
    const action = new ResizeComponentAction(component.id, newSize);
    const newState = action.execute(initialState);

    const resizedComponent = newState.current?.pages[0].elements[0];
    expect(resizedComponent?.layout.size.width).toBe(300);
    expect(resizedComponent?.layout.size.height).toBe(100);
    expect(newState.isDirty).toBe(true);
  });

  it('should undo component resize', () => {
    const originalSize = { ...component.layout.size };
    const newSize = { width: 300, height: 100, unit: 'px' as const };
    const action = new ResizeComponentAction(component.id, newSize);
    const stateAfterResize = action.execute(initialState);
    const stateAfterUndo = action.undo(stateAfterResize);

    const restoredComponent = stateAfterUndo.current?.pages[0].elements[0];
    expect(restoredComponent?.layout.size.width).toBe(originalSize.width);
    expect(restoredComponent?.layout.size.height).toBe(originalSize.height);
  });

  it('should preserve aspect ratio lock setting', () => {
    component.layout.size.aspectRatioLocked = true;
    const newSize = { width: 300, height: 100, unit: 'px' as const, aspectRatioLocked: true };
    const action = new ResizeComponentAction(component.id, newSize);
    const newState = action.execute(initialState);

    const resizedComponent = newState.current?.pages[0].elements[0];
    expect(resizedComponent?.layout.size.aspectRatioLocked).toBe(true);
  });
});

describe('RotateComponentAction', () => {
  let initialState: TemplateState;
  let component: TemplateComponent;

  beforeEach(() => {
    const template = createMockTemplate();
    component = createMockComponent();
    template.pages[0].elements = [component];
    initialState = createMockState(template);
  });

  it('should rotate component', () => {
    const action = new RotateComponentAction(component.id, 45);
    const newState = action.execute(initialState);

    const rotatedComponent = newState.current?.pages[0].elements[0];
    expect(rotatedComponent?.layout.rotation).toBe(45);
    expect(newState.isDirty).toBe(true);
  });

  it('should normalize rotation to 0-360 range', () => {
    const action = new RotateComponentAction(component.id, 450);
    const newState = action.execute(initialState);

    const rotatedComponent = newState.current?.pages[0].elements[0];
    expect(rotatedComponent?.layout.rotation).toBe(90);
  });

  it('should normalize negative rotation', () => {
    const action = new RotateComponentAction(component.id, -45);
    const newState = action.execute(initialState);

    const rotatedComponent = newState.current?.pages[0].elements[0];
    expect(rotatedComponent?.layout.rotation).toBe(315);
  });

  it('should handle 360 degree rotation', () => {
    const action = new RotateComponentAction(component.id, 360);
    const newState = action.execute(initialState);

    const rotatedComponent = newState.current?.pages[0].elements[0];
    expect(rotatedComponent?.layout.rotation).toBe(0);
  });

  it('should undo component rotation', () => {
    const originalRotation = component.layout.rotation;
    const action = new RotateComponentAction(component.id, 90);
    const stateAfterRotate = action.execute(initialState);
    const stateAfterUndo = action.undo(stateAfterRotate);

    const restoredComponent = stateAfterUndo.current?.pages[0].elements[0];
    expect(restoredComponent?.layout.rotation).toBe(originalRotation);
  });
});

describe('GroupComponentsAction', () => {
  let initialState: TemplateState;
  let component1: TemplateComponent;
  let component2: TemplateComponent;

  beforeEach(() => {
    const template = createMockTemplate();
    component1 = createMockComponent('component-1');
    component2 = createMockComponent('component-2');
    template.pages[0].elements = [component1, component2];
    initialState = createMockState(template);
  });

  it('should group multiple components', () => {
    const action = new GroupComponentsAction([component1.id, component2.id]);
    const newState = action.execute(initialState);

    const elements = newState.current?.pages[0].elements;
    expect(elements?.[0].groupId).toBeDefined();
    expect(elements?.[1].groupId).toBeDefined();
    expect(elements?.[0].groupId).toBe(elements?.[1].groupId);
    expect(newState.isDirty).toBe(true);
  });

  it('should throw error when less than 2 components provided', () => {
    expect(() => new GroupComponentsAction([component1.id])).toThrow(
      'At least 2 components required to create a group'
    );
  });

  it('should undo component grouping', () => {
    const action = new GroupComponentsAction([component1.id, component2.id]);
    const stateAfterGroup = action.execute(initialState);
    const stateAfterUndo = action.undo(stateAfterGroup);

    const elements = stateAfterUndo.current?.pages[0].elements;
    expect(elements?.[0].groupId).toBeUndefined();
    expect(elements?.[1].groupId).toBeUndefined();
  });

  it('should throw error when components not on same page', () => {
    // Add second page
    initialState.current!.pages.push({
      id: 'page-2',
      pageNumber: 2,
      width: 210,
      height: 297,
      elements: [component2],
    });
    // Remove component2 from first page
    initialState.current!.pages[0].elements = [component1];

    const action = new GroupComponentsAction([component1.id, component2.id]);
    expect(() => action.execute(initialState)).toThrow('Components not found on same page');
  });
});

describe('UngroupComponentsAction', () => {
  let initialState: TemplateState;
  let component1: TemplateComponent;
  let component2: TemplateComponent;
  let groupId: string;

  beforeEach(() => {
    const template = createMockTemplate();
    component1 = createMockComponent('component-1');
    component2 = createMockComponent('component-2');
    groupId = 'group-1';
    component1.groupId = groupId;
    component2.groupId = groupId;
    template.pages[0].elements = [component1, component2];
    initialState = createMockState(template);
  });

  it('should ungroup components', () => {
    const action = new UngroupComponentsAction(groupId);
    const newState = action.execute(initialState);

    const elements = newState.current?.pages[0].elements;
    expect(elements?.[0].groupId).toBeUndefined();
    expect(elements?.[1].groupId).toBeUndefined();
    expect(newState.isDirty).toBe(true);
  });

  it('should undo component ungrouping', () => {
    const action = new UngroupComponentsAction(groupId);
    const stateAfterUngroup = action.execute(initialState);
    const stateAfterUndo = action.undo(stateAfterUngroup);

    const elements = stateAfterUndo.current?.pages[0].elements;
    expect(elements?.[0].groupId).toBe(groupId);
    expect(elements?.[1].groupId).toBe(groupId);
  });

  it('should throw error when group not found', () => {
    const action = new UngroupComponentsAction('invalid-group-id');
    expect(() => action.execute(initialState)).toThrow('Group invalid-group-id not found');
  });

  it('should only ungroup components in specified group', () => {
    const component3 = createMockComponent('component-3');
    component3.groupId = 'group-2';
    initialState.current!.pages[0].elements.push(component3);

    const action = new UngroupComponentsAction(groupId);
    const newState = action.execute(initialState);

    const elements = newState.current?.pages[0].elements;
    expect(elements?.[2].groupId).toBe('group-2'); // Should remain grouped
  });
});

describe('Action Immutability', () => {
  it('should not mutate original state in AddComponentAction', () => {
    const template = createMockTemplate();
    const initialState = createMockState(template);
    const originalElementsLength = initialState.current!.pages[0].elements.length;
    const component = createMockComponent();

    const action = new AddComponentAction(component, template.pages[0].id);
    action.execute(initialState);

    expect(initialState.current!.pages[0].elements.length).toBe(originalElementsLength);
  });

  it('should not mutate original state in MoveComponentAction', () => {
    const template = createMockTemplate();
    const component = createMockComponent();
    template.pages[0].elements = [component];
    const initialState = createMockState(template);
    const originalX = initialState.current!.pages[0].elements[0].layout.position.x;

    const action = new MoveComponentAction(component.id, { x: 500, y: 500, unit: 'px' });
    action.execute(initialState);

    expect(initialState.current!.pages[0].elements[0].layout.position.x).toBe(originalX);
  });

  it('should not mutate original state in DeleteComponentAction', () => {
    const template = createMockTemplate();
    const component = createMockComponent();
    template.pages[0].elements = [component];
    const initialState = createMockState(template);

    const action = new DeleteComponentAction(component.id);
    action.execute(initialState);

    expect(initialState.current!.pages[0].elements.length).toBe(1);
  });
});
