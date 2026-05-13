/**
 * Visual Template Designer - Store Unit Tests
 * 
 * Comprehensive unit tests for the Zustand store and all actions.
 * Tests cover template lifecycle, component operations, clipboard, and undo/redo.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTemplateStore } from '../store';
import type { Template, TemplateComponent } from '../../../domain/types';

// Helper function to create a test template
function createTestTemplate(): Template {
  return {
    id: 'test-template-1',
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
  };
}

// Helper function to create a test component
function createTestComponent(id: string = 'component-1'): TemplateComponent {
  return {
    id,
    type: 'STUDENT_NAME',
    layout: {
      position: { x: 10, y: 10, unit: 'px' },
      size: { width: 100, height: 50, unit: 'px' },
      rotation: 0,
    },
    zIndex: 1,
  };
}

describe('Template Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useTemplateStore.getState();
    store.closeTemplate();
  });

  describe('Template Lifecycle', () => {
    it('should load a template', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();

      store.loadTemplate(template);

      const state = useTemplateStore.getState();
      expect(state.current).toEqual(template);
      expect(state.isDirty).toBe(false);
    });

    it('should close a template', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();

      store.loadTemplate(template);
      store.closeTemplate();

      expect(useTemplateStore.getState().current).toBeNull();
      expect(useTemplateStore.getState().isDirty).toBe(false);
    });

    it('should mark template as dirty after modification', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);

      expect(useTemplateStore.getState().isDirty).toBe(true);
    });
  });

  describe('Component Operations', () => {
    it('should add a component to the template', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);

      const state = useTemplateStore.getState();
      expect(state.current?.pages[0].elements).toHaveLength(1);
      expect(state.current?.pages[0].elements[0].id).toBe(component.id);
    });

    it('should assign highest z-index to new component', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component1 = createTestComponent('comp-1');
      const component2 = createTestComponent('comp-2');

      store.loadTemplate(template);
      store.addComponent(component1);
      store.addComponent(component2);

      const state = useTemplateStore.getState();
      const elements = state.current?.pages[0].elements || [];
      expect(elements[1].zIndex).toBeGreaterThan(elements[0].zIndex);
    });

    it('should update a component', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      store.updateComponent(component.id, {
        layout: {
          ...component.layout,
          position: { x: 50, y: 50, unit: 'px' },
        },
      });

      const state = useTemplateStore.getState();
      const updatedComponent = state.current?.pages[0].elements[0];
      expect(updatedComponent?.layout.position.x).toBe(50);
      expect(updatedComponent?.layout.position.y).toBe(50);
    });

    it('should delete a component', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      store.deleteComponent(component.id);

      const state = useTemplateStore.getState();
      expect(state.current?.pages[0].elements).toHaveLength(0);
    });

    it('should clear selection when deleting selected component', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      store.selectComponent(component.id);
      store.deleteComponent(component.id);

      const state = useTemplateStore.getState();
      expect(state.selectedComponentId).toBeNull();
    });

    it('should duplicate a component', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      store.duplicateComponent(component.id);

      const state = useTemplateStore.getState();
      expect(state.current?.pages[0].elements).toHaveLength(2);
    });
  });

  describe('Component Manipulation', () => {
    it('should move a component', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      store.moveComponent(component.id, 100, 200);

      const state = useTemplateStore.getState();
      const movedComponent = state.current?.pages[0].elements[0];
      expect(movedComponent?.layout.position.x).toBe(100);
      expect(movedComponent?.layout.position.y).toBe(200);
    });

    it('should resize a component', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      store.resizeComponent(component.id, 200, 150);

      const state = useTemplateStore.getState();
      const resizedComponent = state.current?.pages[0].elements[0];
      expect(resizedComponent?.layout.size.width).toBe(200);
      expect(resizedComponent?.layout.size.height).toBe(150);
    });

    it('should rotate a component', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      store.rotateComponent(component.id, 45);

      const state = useTemplateStore.getState();
      const rotatedComponent = state.current?.pages[0].elements[0];
      expect(rotatedComponent?.layout.rotation).toBe(45);
    });
  });

  describe('Layer Management', () => {
    it('should bring component to front', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component1 = createTestComponent('comp-1');
      const component2 = createTestComponent('comp-2');

      store.loadTemplate(template);
      store.addComponent(component1);
      store.addComponent(component2);
      store.bringToFront(component1.id);

      const state = useTemplateStore.getState();
      const elements = state.current?.pages[0].elements || [];
      const comp1 = elements.find(el => el.id === component1.id);
      const comp2 = elements.find(el => el.id === component2.id);
      expect(comp1?.zIndex).toBeGreaterThan(comp2?.zIndex || 0);
    });

    it('should send component to back', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component1 = createTestComponent('comp-1');
      const component2 = createTestComponent('comp-2');

      store.loadTemplate(template);
      store.addComponent(component1);
      store.addComponent(component2);
      store.sendToBack(component2.id);

      const state = useTemplateStore.getState();
      const elements = state.current?.pages[0].elements || [];
      const comp1 = elements.find(el => el.id === component1.id);
      const comp2 = elements.find(el => el.id === component2.id);
      expect(comp2?.zIndex).toBeLessThan(comp1?.zIndex || 0);
    });

    it('should bring component forward', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component1 = createTestComponent('comp-1');
      const component2 = createTestComponent('comp-2');

      store.loadTemplate(template);
      store.addComponent(component1);
      store.addComponent(component2);
      
      const initialState = useTemplateStore.getState();
      const initialElements = initialState.current?.pages[0].elements || [];
      const initialComp1 = initialElements.find(el => el.id === component1.id);
      const initialZIndex = initialComp1?.zIndex || 0;

      store.bringForward(component1.id);

      const state = useTemplateStore.getState();
      const elements = state.current?.pages[0].elements || [];
      const comp1 = elements.find(el => el.id === component1.id);
      expect(comp1?.zIndex).toBeGreaterThan(initialZIndex);
    });

    it('should send component backward', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component1 = createTestComponent('comp-1');
      const component2 = createTestComponent('comp-2');

      store.loadTemplate(template);
      store.addComponent(component1);
      store.addComponent(component2);
      
      const initialState = useTemplateStore.getState();
      const initialElements = initialState.current?.pages[0].elements || [];
      const initialComp2 = initialElements.find(el => el.id === component2.id);
      const initialZIndex = initialComp2?.zIndex || 0;

      store.sendBackward(component2.id);

      const state = useTemplateStore.getState();
      const elements = state.current?.pages[0].elements || [];
      const comp2 = elements.find(el => el.id === component2.id);
      expect(comp2?.zIndex).toBeLessThan(initialZIndex);
    });
  });

  describe('Selection', () => {
    it('should select a component', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      store.selectComponent(component.id);

      const state = useTemplateStore.getState();
      expect(state.selectedComponentId).toBe(component.id);
      expect(state.selectedComponentIds).toEqual([component.id]);
    });

    it('should select multiple components', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component1 = createTestComponent('comp-1');
      const component2 = createTestComponent('comp-2');

      store.loadTemplate(template);
      store.addComponent(component1);
      store.addComponent(component2);
      store.selectMultipleComponents([component1.id, component2.id]);

      const state = useTemplateStore.getState();
      expect(state.selectedComponentIds).toEqual([component1.id, component2.id]);
    });

    it('should clear selection', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      store.selectComponent(component.id);
      store.clearSelection();

      const state = useTemplateStore.getState();
      expect(state.selectedComponentId).toBeNull();
      expect(state.selectedComponentIds).toEqual([]);
    });
  });

  describe('Clipboard', () => {
    it('should copy a component to clipboard', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      store.selectComponent(component.id);
      store.copyComponent();

      const state = useTemplateStore.getState();
      expect(state.clipboard).not.toBeNull();
      expect(state.clipboard?.id).toBe(component.id);
    });

    it('should cut a component to clipboard', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      store.selectComponent(component.id);
      store.cutComponent();

      const state = useTemplateStore.getState();
      expect(state.clipboard).not.toBeNull();
      expect(state.current?.pages[0].elements).toHaveLength(0);
    });

    it('should paste a component from clipboard', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      store.selectComponent(component.id);
      store.copyComponent();
      store.pasteComponent();

      const state = useTemplateStore.getState();
      expect(state.current?.pages[0].elements).toHaveLength(2);
    });

    it('should not paste if clipboard is empty', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();

      store.loadTemplate(template);
      store.pasteComponent();

      const state = useTemplateStore.getState();
      expect(state.current?.pages[0].elements).toHaveLength(0);
    });
  });

  describe('Page Management', () => {
    it('should add a page', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();

      store.loadTemplate(template);
      store.addPage();

      const state = useTemplateStore.getState();
      expect(state.current?.pages).toHaveLength(2);
    });

    it('should remove a page', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();

      store.loadTemplate(template);
      store.addPage();
      const pageId = useTemplateStore.getState().current?.pages[1].id;
      
      if (pageId) {
        store.removePage(pageId);
      }

      const state = useTemplateStore.getState();
      expect(state.current?.pages).toHaveLength(1);
    });

    it('should set current page', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();

      store.loadTemplate(template);
      store.setCurrentPage('page-1');

      const state = useTemplateStore.getState();
      expect(state.currentPageId).toBe('page-1');
    });
  });

  describe('Undo/Redo', () => {
    it('should undo component addition', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      
      expect(useTemplateStore.getState().current?.pages[0].elements).toHaveLength(1);
      
      store.undo();

      const state = useTemplateStore.getState();
      expect(state.current?.pages[0].elements).toHaveLength(0);
    });

    it('should redo component addition', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      store.undo();
      store.redo();

      const state = useTemplateStore.getState();
      expect(state.current?.pages[0].elements).toHaveLength(1);
    });

    it('should report canUndo correctly', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      expect(store.canUndo()).toBe(false); // loadTemplate is the first action, no history yet

      store.addComponent(component);
      expect(store.canUndo()).toBe(true); // now we can undo to the loaded state

      store.undo();
      expect(store.canUndo()).toBe(false); // back to initial state, no more history

      store.redo();
      expect(store.canUndo()).toBe(true); // after redo, can undo again
    });

    it('should report canRedo correctly', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      expect(store.canRedo()).toBe(false);

      store.addComponent(component);
      expect(store.canRedo()).toBe(false);

      store.undo();
      expect(store.canRedo()).toBe(true);
    });

    it('should clear redo history on new action', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component1 = createTestComponent('comp-1');
      const component2 = createTestComponent('comp-2');

      store.loadTemplate(template);
      store.addComponent(component1);
      store.undo();
      
      expect(store.canRedo()).toBe(true);
      
      store.addComponent(component2);
      
      expect(store.canRedo()).toBe(false);
    });

    it('should maintain history limit of 50 actions', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();

      store.loadTemplate(template);

      // Add 60 components (exceeds 50 limit)
      for (let i = 0; i < 60; i++) {
        store.addComponent(createTestComponent(`comp-${i}`));
      }

      const historyState = store.undoRedoManager.getState();
      expect(historyState.past.length).toBeLessThanOrEqual(50);
    });

    it('should clear history', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      store.addComponent(component);
      store.clearHistory();

      expect(store.canUndo()).toBe(false);
      expect(store.canRedo()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when adding component without template', () => {
      const store = useTemplateStore.getState();
      const component = createTestComponent();

      expect(() => store.addComponent(component)).toThrow('No template loaded');
    });

    it('should throw error when updating component without template', () => {
      const store = useTemplateStore.getState();

      expect(() => store.updateComponent('comp-1', {})).toThrow('No template loaded');
    });

    it('should throw error when deleting component without template', () => {
      const store = useTemplateStore.getState();

      expect(() => store.deleteComponent('comp-1')).toThrow('No template loaded');
    });

    it('should throw error when adding component to non-existent page', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);

      expect(() => store.addComponent(component, 'non-existent-page')).toThrow('Page non-existent-page not found');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex workflow with multiple operations', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component1 = createTestComponent('comp-1');
      const component2 = createTestComponent('comp-2');

      // Load template
      store.loadTemplate(template);
      expect(useTemplateStore.getState().current).not.toBeNull();

      // Add components
      store.addComponent(component1);
      store.addComponent(component2);
      expect(useTemplateStore.getState().current?.pages[0].elements).toHaveLength(2);

      // Select and move component
      store.selectComponent(component1.id);
      store.moveComponent(component1.id, 50, 50);
      
      const movedComp = useTemplateStore.getState().current?.pages[0].elements.find(
        el => el.id === component1.id
      );
      expect(movedComp?.layout.position.x).toBe(50);

      // Copy and paste
      store.copyComponent();
      store.pasteComponent();
      expect(useTemplateStore.getState().current?.pages[0].elements).toHaveLength(3);

      // Undo paste
      store.undo();
      expect(useTemplateStore.getState().current?.pages[0].elements).toHaveLength(2);

      // Redo paste
      store.redo();
      expect(useTemplateStore.getState().current?.pages[0].elements).toHaveLength(3);

      // Delete component
      store.deleteComponent(component2.id);
      expect(useTemplateStore.getState().current?.pages[0].elements).toHaveLength(2);

      // Verify isDirty flag
      expect(useTemplateStore.getState().isDirty).toBe(true);
    });

    it('should maintain state consistency across multiple undo/redo operations', () => {
      const store = useTemplateStore.getState();
      const template = createTestTemplate();
      const component = createTestComponent();

      store.loadTemplate(template);
      
      // Perform multiple operations
      store.addComponent(component);
      store.moveComponent(component.id, 100, 100);
      store.resizeComponent(component.id, 200, 200);
      store.rotateComponent(component.id, 45);

      // Undo all operations
      store.undo(); // undo rotate
      store.undo(); // undo resize
      store.undo(); // undo move
      store.undo(); // undo add

      // Should be back to initial state (empty page)
      expect(useTemplateStore.getState().current?.pages[0].elements).toHaveLength(0);

      // Redo all operations
      store.redo(); // redo add
      store.redo(); // redo move
      store.redo(); // redo resize
      store.redo(); // redo rotate

      // Should have component with all modifications
      const finalComp = useTemplateStore.getState().current?.pages[0].elements[0];
      expect(finalComp?.layout.position.x).toBe(100);
      expect(finalComp?.layout.size.width).toBe(200);
      expect(finalComp?.layout.rotation).toBe(45);
    });
  });
});
