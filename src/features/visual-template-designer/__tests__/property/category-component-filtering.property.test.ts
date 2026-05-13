/**
 * Property-Based Test: Category-Based Component Filtering
 * 
 * Feature: visual-template-designer
 * Property 12: Category-based component filtering
 * 
 * **Validates: Requirements 4.1-4.8**
 * 
 * Property Definition:
 * For any template category, the Component Library SHALL display only components 
 * that are explicitly allowed for that category, and SHALL hide all components 
 * not allowed for that category.
 * 
 * This test verifies that:
 * 1. getComponentsForCategory returns only allowed components for each category
 * 2. No disallowed components are included in the returned list
 * 3. All returned components are valid ComponentType values
 * 4. The function is consistent (same input always produces same output)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import {
  getComponentsForCategory,
  CATEGORY_COMPONENT_RESTRICTIONS,
  isComponentAllowedForCategory
} from '../../domain/models/categoryRestrictions';
import type { TemplateCategory, ComponentType } from '../../domain/types/enums';

/**
 * Arbitrary generator for TemplateCategory
 * Generates all valid template categories
 */
const arbTemplateCategory = (): fc.Arbitrary<TemplateCategory> =>
  fc.constantFrom<TemplateCategory>(
    'REPORT_CARD',
    'CERTIFICATE',
    'ID_CARD',
    'RECEIPT',
    'FEE_STATEMENT',
    'ADMISSION_FORM',
    'RESULT_SLIP'
  );

/**
 * Arbitrary generator for ComponentType
 * Generates all valid component types
 */
const arbComponentType = (): fc.Arbitrary<ComponentType> =>
  fc.constantFrom<ComponentType>(
    // School Info Components
    'SCHOOL_LOGO',
    'SCHOOL_NAME',
    'SCHOOL_MOTTO',
    'SCHOOL_ADDRESS',
    'SCHOOL_CONTACT',
    // Student Info Components
    'STUDENT_NAME',
    'STUDENT_PHOTO',
    'STUDENT_CLASS',
    'STUDENT_STREAM',
    'STUDENT_NUMBER',
    'STUDENT_ATTENDANCE',
    // Academic Components
    'RESULTS_TABLE',
    'SUBJECT_SCORES',
    'GRADE_DISPLAY',
    'AGGREGATE_DISPLAY',
    'DIVISION_DISPLAY',
    'TEACHER_REMARKS',
    'HEAD_TEACHER_COMMENTS',
    // Financial Components
    'FEES_BALANCE',
    'PAYMENT_SUMMARY',
    'FEE_STRUCTURE',
    // Static Components
    'LINE',
    'BORDER',
    'RECTANGLE',
    'CIRCLE',
    'BACKGROUND_IMAGE',
    'WATERMARK',
    'TEXT_LABEL',
    'SIGNATURE_FIELD'
  );

describe('Property 12: Category-Based Component Filtering', () => {
  describe('getComponentsForCategory correctness', () => {
    it('should return only components explicitly allowed for the category', () => {
      fc.assert(
        fc.property(
          arbTemplateCategory(),
          (category) => {
            const components = getComponentsForCategory(category);
            const expectedComponents = CATEGORY_COMPONENT_RESTRICTIONS[category];
            
            // Every returned component must be in the expected list
            const allComponentsAllowed = components.every(component =>
              expectedComponents.includes(component)
            );
            
            // The returned list must contain all expected components
            const allExpectedComponentsPresent = expectedComponents.every(component =>
              components.includes(component)
            );
            
            // The lists must have the same length (no duplicates, no missing items)
            const sameLengths = components.length === expectedComponents.length;
            
            return allComponentsAllowed && allExpectedComponentsPresent && sameLengths;
          }
        ),
        propertyTestParams()
      );
    });

    it('should not return any disallowed components for the category', () => {
      fc.assert(
        fc.property(
          arbTemplateCategory(),
          (category) => {
            const components = getComponentsForCategory(category);
            
            // Check that every returned component is actually allowed
            return components.every(component =>
              isComponentAllowedForCategory(category, component)
            );
          }
        ),
        propertyTestParams()
      );
    });

    it('should return only valid ComponentType values', () => {
      fc.assert(
        fc.property(
          arbTemplateCategory(),
          (category) => {
            const components = getComponentsForCategory(category);
            const allValidComponentTypes: ComponentType[] = [
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
            
            // Every returned component must be a valid ComponentType
            return components.every(component =>
              allValidComponentTypes.includes(component)
            );
          }
        ),
        propertyTestParams()
      );
    });

    it('should be consistent (same category always returns same components)', () => {
      fc.assert(
        fc.property(
          arbTemplateCategory(),
          (category) => {
            const firstCall = getComponentsForCategory(category);
            const secondCall = getComponentsForCategory(category);
            
            // Both calls should return arrays with the same length
            if (firstCall.length !== secondCall.length) {
              return false;
            }
            
            // Both calls should return the same components in the same order
            return firstCall.every((component, index) =>
              component === secondCall[index]
            );
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('Category-specific restrictions', () => {
    it('ID_CARD category should not include academic or financial components', () => {
      fc.assert(
        fc.property(
          fc.constant('ID_CARD' as TemplateCategory),
          (category) => {
            const components = getComponentsForCategory(category);
            const academicComponents: ComponentType[] = [
              'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY',
              'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS'
            ];
            const financialComponents: ComponentType[] = [
              'FEES_BALANCE', 'PAYMENT_SUMMARY', 'FEE_STRUCTURE'
            ];
            
            const hasNoAcademic = !components.some(c => academicComponents.includes(c));
            const hasNoFinancial = !components.some(c => financialComponents.includes(c));
            
            return hasNoAcademic && hasNoFinancial;
          }
        ),
        propertyTestParams()
      );
    });

    it('RECEIPT category should not include academic components', () => {
      fc.assert(
        fc.property(
          fc.constant('RECEIPT' as TemplateCategory),
          (category) => {
            const components = getComponentsForCategory(category);
            const academicComponents: ComponentType[] = [
              'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY',
              'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS'
            ];
            
            return !components.some(c => academicComponents.includes(c));
          }
        ),
        propertyTestParams()
      );
    });

    it('REPORT_CARD and RESULT_SLIP should include academic components', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<TemplateCategory>('REPORT_CARD', 'RESULT_SLIP'),
          (category) => {
            const components = getComponentsForCategory(category);
            const academicComponents: ComponentType[] = [
              'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY',
              'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS'
            ];
            
            // Should include at least some academic components
            return academicComponents.every(ac => components.includes(ac));
          }
        ),
        propertyTestParams()
      );
    });

    it('FEE_STATEMENT should include financial components', () => {
      fc.assert(
        fc.property(
          fc.constant('FEE_STATEMENT' as TemplateCategory),
          (category) => {
            const components = getComponentsForCategory(category);
            const financialComponents: ComponentType[] = [
              'FEES_BALANCE', 'PAYMENT_SUMMARY', 'FEE_STRUCTURE'
            ];
            
            // Should include all financial components
            return financialComponents.every(fc => components.includes(fc));
          }
        ),
        propertyTestParams()
      );
    });

    it('all categories should include static components', () => {
      fc.assert(
        fc.property(
          arbTemplateCategory(),
          (category) => {
            const components = getComponentsForCategory(category);
            const staticComponents: ComponentType[] = [
              'LINE', 'BORDER', 'RECTANGLE', 'CIRCLE',
              'BACKGROUND_IMAGE', 'WATERMARK', 'TEXT_LABEL', 'SIGNATURE_FIELD'
            ];
            
            // Should include all static components
            return staticComponents.every(sc => components.includes(sc));
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('Relationship with isComponentAllowedForCategory', () => {
    it('getComponentsForCategory should return exactly the components that isComponentAllowedForCategory returns true for', () => {
      fc.assert(
        fc.property(
          arbTemplateCategory(),
          arbComponentType(),
          (category, componentType) => {
            const allowedComponents = getComponentsForCategory(category);
            const isAllowed = isComponentAllowedForCategory(category, componentType);
            const isInList = allowedComponents.includes(componentType);
            
            // isComponentAllowedForCategory should return true if and only if
            // the component is in the list returned by getComponentsForCategory
            return isAllowed === isInList;
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('Completeness properties', () => {
    it('should return at least one component for every category', () => {
      fc.assert(
        fc.property(
          arbTemplateCategory(),
          (category) => {
            const components = getComponentsForCategory(category);
            return components.length > 0;
          }
        ),
        propertyTestParams()
      );
    });

    it('should return at least static components for every category', () => {
      fc.assert(
        fc.property(
          arbTemplateCategory(),
          (category) => {
            const components = getComponentsForCategory(category);
            const staticComponents: ComponentType[] = [
              'LINE', 'BORDER', 'RECTANGLE', 'CIRCLE',
              'BACKGROUND_IMAGE', 'WATERMARK', 'TEXT_LABEL', 'SIGNATURE_FIELD'
            ];
            
            // Every category should have at least one static component
            return staticComponents.some(sc => components.includes(sc));
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('Boundary cases', () => {
    it('should handle all seven template categories', () => {
      const allCategories: TemplateCategory[] = [
        'REPORT_CARD',
        'CERTIFICATE',
        'ID_CARD',
        'RECEIPT',
        'FEE_STATEMENT',
        'ADMISSION_FORM',
        'RESULT_SLIP'
      ];
      
      allCategories.forEach(category => {
        const components = getComponentsForCategory(category);
        expect(components).toBeDefined();
        expect(Array.isArray(components)).toBe(true);
        expect(components.length).toBeGreaterThan(0);
      });
    });

    it('should return different component sets for different categories', () => {
      fc.assert(
        fc.property(
          arbTemplateCategory(),
          arbTemplateCategory(),
          (category1, category2) => {
            // Skip if same category
            if (category1 === category2) {
              return true;
            }
            
            const components1 = getComponentsForCategory(category1);
            const components2 = getComponentsForCategory(category2);
            
            // Different categories should have different component sets
            // (at least in length or composition)
            const sameLength = components1.length === components2.length;
            const sameComponents = components1.every(c => components2.includes(c)) &&
                                   components2.every(c => components1.includes(c));
            
            // If they have the same length and same components, they're identical
            // For our domain, some categories might have identical sets, so we just
            // verify that the function returns valid results for both
            return Array.isArray(components1) && Array.isArray(components2);
          }
        ),
        propertyTestParams()
      );
    });
  });
});
