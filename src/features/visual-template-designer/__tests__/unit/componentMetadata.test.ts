/**
 * Unit Tests: Component Metadata
 * 
 * Tests for component metadata definitions and helper functions.
 * Validates that all component types have proper metadata and default properties.
 */

import { describe, it, expect } from 'vitest';
import {
  COMPONENT_METADATA,
  getComponentMetadata,
  getComponentsByCategory,
  getAllComponentCategories,
  type ComponentCategory
} from '../../domain/models/componentMetadata';
import type { ComponentType } from '../../domain/types/enums';

describe('Component Metadata', () => {
  describe('COMPONENT_METADATA', () => {
    it('should have metadata for all component types', () => {
      const expectedComponentTypes: ComponentType[] = [
        // School Info
        'SCHOOL_LOGO', 'SCHOOL_NAME', 'SCHOOL_MOTTO', 'SCHOOL_ADDRESS', 'SCHOOL_CONTACT',
        // Student Info
        'STUDENT_NAME', 'STUDENT_PHOTO', 'STUDENT_CLASS', 'STUDENT_STREAM', 'STUDENT_NUMBER', 'STUDENT_ATTENDANCE',
        // Academic
        'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY', 'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS',
        // Financial
        'FEES_BALANCE', 'PAYMENT_SUMMARY', 'FEE_STRUCTURE',
        // Static
        'LINE', 'BORDER', 'RECTANGLE', 'CIRCLE', 'BACKGROUND_IMAGE', 'WATERMARK', 'TEXT_LABEL', 'SIGNATURE_FIELD'
      ];

      expectedComponentTypes.forEach(type => {
        expect(COMPONENT_METADATA[type]).toBeDefined();
        expect(COMPONENT_METADATA[type].type).toBe(type);
      });
    });

    it('should have valid metadata structure for each component', () => {
      Object.values(COMPONENT_METADATA).forEach(metadata => {
        expect(metadata.type).toBeDefined();
        expect(metadata.displayName).toBeDefined();
        expect(metadata.displayName.length).toBeGreaterThan(0);
        expect(metadata.description).toBeDefined();
        expect(metadata.description.length).toBeGreaterThan(0);
        expect(metadata.icon).toBeDefined();
        expect(metadata.icon.length).toBeGreaterThan(0);
        expect(metadata.category).toBeDefined();
        expect(metadata.defaultProperties).toBeDefined();
      });
    });

    it('should have position and size in default properties', () => {
      Object.values(COMPONENT_METADATA).forEach(metadata => {
        expect(metadata.defaultProperties.position).toBeDefined();
        expect(metadata.defaultProperties.position?.x).toBeGreaterThanOrEqual(0);
        expect(metadata.defaultProperties.position?.y).toBeGreaterThanOrEqual(0);
        expect(metadata.defaultProperties.position?.unit).toBeDefined();
        
        expect(metadata.defaultProperties.size).toBeDefined();
        expect(metadata.defaultProperties.size?.width).toBeGreaterThan(0);
        expect(metadata.defaultProperties.size?.height).toBeGreaterThan(0);
        expect(metadata.defaultProperties.size?.unit).toBeDefined();
      });
    });

    it('should have rotation in default properties', () => {
      Object.values(COMPONENT_METADATA).forEach(metadata => {
        expect(metadata.defaultProperties.rotation).toBeDefined();
        expect(metadata.defaultProperties.rotation).toBeGreaterThanOrEqual(0);
        expect(metadata.defaultProperties.rotation).toBeLessThan(360);
      });
    });

    it('should have data binding field for dynamic components', () => {
      const dynamicComponents: ComponentType[] = [
        'SCHOOL_LOGO', 'SCHOOL_NAME', 'SCHOOL_MOTTO', 'SCHOOL_ADDRESS', 'SCHOOL_CONTACT',
        'STUDENT_NAME', 'STUDENT_PHOTO', 'STUDENT_CLASS', 'STUDENT_STREAM', 'STUDENT_NUMBER', 'STUDENT_ATTENDANCE',
        'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY', 'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS',
        'FEES_BALANCE', 'PAYMENT_SUMMARY', 'FEE_STRUCTURE'
      ];

      dynamicComponents.forEach(type => {
        const metadata = COMPONENT_METADATA[type];
        expect(metadata.dataBindingField).toBeDefined();
        expect(metadata.dataBindingField!.length).toBeGreaterThan(0);
      });
    });

    it('should not have data binding field for static components', () => {
      const staticComponents: ComponentType[] = [
        'LINE', 'BORDER', 'RECTANGLE', 'CIRCLE', 'BACKGROUND_IMAGE', 'WATERMARK', 'TEXT_LABEL', 'SIGNATURE_FIELD'
      ];

      staticComponents.forEach(type => {
        const metadata = COMPONENT_METADATA[type];
        expect(metadata.dataBindingField).toBeUndefined();
      });
    });

    it('should categorize School Info components correctly', () => {
      const schoolInfoComponents: ComponentType[] = [
        'SCHOOL_LOGO', 'SCHOOL_NAME', 'SCHOOL_MOTTO', 'SCHOOL_ADDRESS', 'SCHOOL_CONTACT'
      ];

      schoolInfoComponents.forEach(type => {
        expect(COMPONENT_METADATA[type].category).toBe('School Info');
      });
    });

    it('should categorize Student Info components correctly', () => {
      const studentInfoComponents: ComponentType[] = [
        'STUDENT_NAME', 'STUDENT_PHOTO', 'STUDENT_CLASS', 'STUDENT_STREAM', 'STUDENT_NUMBER', 'STUDENT_ATTENDANCE'
      ];

      studentInfoComponents.forEach(type => {
        expect(COMPONENT_METADATA[type].category).toBe('Student Info');
      });
    });

    it('should categorize Academic components correctly', () => {
      const academicComponents: ComponentType[] = [
        'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY', 'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS'
      ];

      academicComponents.forEach(type => {
        expect(COMPONENT_METADATA[type].category).toBe('Academic');
      });
    });

    it('should categorize Financial components correctly', () => {
      const financialComponents: ComponentType[] = [
        'FEES_BALANCE', 'PAYMENT_SUMMARY', 'FEE_STRUCTURE'
      ];

      financialComponents.forEach(type => {
        expect(COMPONENT_METADATA[type].category).toBe('Financial');
      });
    });

    it('should categorize Static components correctly', () => {
      const staticComponents: ComponentType[] = [
        'LINE', 'BORDER', 'RECTANGLE', 'CIRCLE', 'BACKGROUND_IMAGE', 'WATERMARK', 'TEXT_LABEL', 'SIGNATURE_FIELD'
      ];

      staticComponents.forEach(type => {
        expect(COMPONENT_METADATA[type].category).toBe('Static');
      });
    });
  });

  describe('getComponentMetadata', () => {
    it('should return metadata for a valid component type', () => {
      const metadata = getComponentMetadata('STUDENT_NAME');
      expect(metadata).toBeDefined();
      expect(metadata.type).toBe('STUDENT_NAME');
      expect(metadata.displayName).toBe('Student Name');
      expect(metadata.category).toBe('Student Info');
    });

    it('should return metadata with default properties', () => {
      const metadata = getComponentMetadata('SCHOOL_LOGO');
      expect(metadata.defaultProperties).toBeDefined();
      expect(metadata.defaultProperties.position).toBeDefined();
      expect(metadata.defaultProperties.size).toBeDefined();
    });
  });

  describe('getComponentsByCategory', () => {
    it('should return all School Info components', () => {
      const components = getComponentsByCategory('School Info');
      expect(components).toContain('SCHOOL_LOGO');
      expect(components).toContain('SCHOOL_NAME');
      expect(components).toContain('SCHOOL_MOTTO');
      expect(components).toContain('SCHOOL_ADDRESS');
      expect(components).toContain('SCHOOL_CONTACT');
      expect(components).toHaveLength(5);
    });

    it('should return all Student Info components', () => {
      const components = getComponentsByCategory('Student Info');
      expect(components).toContain('STUDENT_NAME');
      expect(components).toContain('STUDENT_PHOTO');
      expect(components).toContain('STUDENT_CLASS');
      expect(components).toContain('STUDENT_STREAM');
      expect(components).toContain('STUDENT_NUMBER');
      expect(components).toContain('STUDENT_ATTENDANCE');
      expect(components).toHaveLength(6);
    });

    it('should return all Academic components', () => {
      const components = getComponentsByCategory('Academic');
      expect(components).toContain('RESULTS_TABLE');
      expect(components).toContain('SUBJECT_SCORES');
      expect(components).toContain('GRADE_DISPLAY');
      expect(components).toContain('AGGREGATE_DISPLAY');
      expect(components).toContain('DIVISION_DISPLAY');
      expect(components).toContain('TEACHER_REMARKS');
      expect(components).toContain('HEAD_TEACHER_COMMENTS');
      expect(components).toHaveLength(7);
    });

    it('should return all Financial components', () => {
      const components = getComponentsByCategory('Financial');
      expect(components).toContain('FEES_BALANCE');
      expect(components).toContain('PAYMENT_SUMMARY');
      expect(components).toContain('FEE_STRUCTURE');
      expect(components).toHaveLength(3);
    });

    it('should return all Static components', () => {
      const components = getComponentsByCategory('Static');
      expect(components).toContain('LINE');
      expect(components).toContain('BORDER');
      expect(components).toContain('RECTANGLE');
      expect(components).toContain('CIRCLE');
      expect(components).toContain('BACKGROUND_IMAGE');
      expect(components).toContain('WATERMARK');
      expect(components).toContain('TEXT_LABEL');
      expect(components).toContain('SIGNATURE_FIELD');
      expect(components).toHaveLength(8);
    });

    it('should not return components from other categories', () => {
      const schoolComponents = getComponentsByCategory('School Info');
      expect(schoolComponents).not.toContain('STUDENT_NAME');
      expect(schoolComponents).not.toContain('RESULTS_TABLE');
      expect(schoolComponents).not.toContain('FEES_BALANCE');
      expect(schoolComponents).not.toContain('LINE');
    });
  });

  describe('getAllComponentCategories', () => {
    it('should return all component categories', () => {
      const categories = getAllComponentCategories();
      expect(categories).toContain('School Info');
      expect(categories).toContain('Student Info');
      expect(categories).toContain('Academic');
      expect(categories).toContain('Financial');
      expect(categories).toContain('Static');
      expect(categories).toHaveLength(5);
    });

    it('should return categories in the correct order', () => {
      const categories = getAllComponentCategories();
      expect(categories[0]).toBe('School Info');
      expect(categories[1]).toBe('Student Info');
      expect(categories[2]).toBe('Academic');
      expect(categories[3]).toBe('Financial');
      expect(categories[4]).toBe('Static');
    });
  });

  describe('Default Properties Validation', () => {
    it('should have valid font properties for text components', () => {
      const textComponents: ComponentType[] = [
        'SCHOOL_NAME', 'SCHOOL_MOTTO', 'SCHOOL_ADDRESS', 'SCHOOL_CONTACT',
        'STUDENT_NAME', 'STUDENT_CLASS', 'STUDENT_STREAM', 'STUDENT_NUMBER', 'STUDENT_ATTENDANCE',
        'GRADE_DISPLAY', 'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS',
        'FEES_BALANCE', 'TEXT_LABEL', 'WATERMARK'
      ];

      textComponents.forEach(type => {
        const metadata = COMPONENT_METADATA[type];
        expect(metadata.defaultProperties.font).toBeDefined();
        expect(metadata.defaultProperties.font?.family).toBeDefined();
        expect(metadata.defaultProperties.font?.size).toBeGreaterThanOrEqual(6);
        expect(metadata.defaultProperties.font?.size).toBeLessThanOrEqual(72);
        expect(['normal', 'bold']).toContain(metadata.defaultProperties.font?.weight);
        expect(['normal', 'italic']).toContain(metadata.defaultProperties.font?.style);
      });
    });

    it('should have valid image fit for image components', () => {
      const imageComponents: ComponentType[] = [
        'SCHOOL_LOGO', 'STUDENT_PHOTO', 'BACKGROUND_IMAGE'
      ];

      imageComponents.forEach(type => {
        const metadata = COMPONENT_METADATA[type];
        expect(metadata.defaultProperties.imagefit).toBeDefined();
        expect(['contain', 'cover', 'fill', 'scale-down']).toContain(metadata.defaultProperties.imagefit);
      });
    });

    it('should have aspect ratio locked for circular/square components', () => {
      const lockedComponents: ComponentType[] = [
        'SCHOOL_LOGO', 'STUDENT_PHOTO', 'CIRCLE'
      ];

      lockedComponents.forEach(type => {
        const metadata = COMPONENT_METADATA[type];
        expect(metadata.defaultProperties.size?.aspectRatioLocked).toBe(true);
      });
    });

    it('should have valid border properties when defined', () => {
      Object.values(COMPONENT_METADATA).forEach(metadata => {
        if (metadata.defaultProperties.border) {
          expect(metadata.defaultProperties.border.width).toBeGreaterThanOrEqual(0);
          expect(metadata.defaultProperties.border.width).toBeLessThanOrEqual(20);
          expect(metadata.defaultProperties.border.color).toMatch(/^#[0-9A-F]{6}$/i);
          expect(['solid', 'dashed', 'dotted']).toContain(metadata.defaultProperties.border.style);
        }
      });
    });

    it('should have valid color properties when defined', () => {
      Object.values(COMPONENT_METADATA).forEach(metadata => {
        if (metadata.defaultProperties.color?.text) {
          expect(metadata.defaultProperties.color.text).toMatch(/^#[0-9A-F]{6}$/i);
        }
        if (metadata.defaultProperties.color?.background) {
          expect(metadata.defaultProperties.color.background).toMatch(/^#[0-9A-F]{6}$/i);
        }
      });
    });

    it('should have valid alignment for text components', () => {
      Object.values(COMPONENT_METADATA).forEach(metadata => {
        if (metadata.defaultProperties.alignment) {
          expect(['left', 'center', 'right', 'justify']).toContain(metadata.defaultProperties.alignment);
        }
      });
    });
  });
});
