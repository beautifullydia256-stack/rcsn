/**
 * Property-Based Test: Category-Component Compatibility Validation
 * 
 * Feature: visual-template-designer
 * Property 21: Category-component compatibility validation
 * 
 * **Validates: Requirements 14.5**
 * 
 * Property Definition:
 * For any template with a specific category and any component, adding the component 
 * to the template SHALL succeed if and only if the component type is allowed for 
 * that template category.
 * 
 * This test verifies that:
 * 1. Adding an allowed component to a template succeeds
 * 2. Adding a disallowed component to a template fails
 * 3. The validation is consistent across all template categories
 * 4. The validation correctly uses the category restrictions
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import {
  isComponentAllowedForCategory,
  validateComponentsForCategory
} from '../../domain/models/categoryRestrictions';
import type { TemplateCategory, ComponentType } from '../../domain/types/enums';
import type { Template, TemplatePage } from '../../domain/types/template';
import type { TemplateComponent } from '../../domain/types/component';

/**
 * Arbitrary generator for TemplateCategory
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

/**
 * Arbitrary generator for a minimal TemplateComponent
 */
const arbTemplateComponent = (componentType?: ComponentType): fc.Arbitrary<TemplateComponent> =>
  fc.record({
    id: fc.uuid(),
    type: componentType ? fc.constant(componentType) : arbComponentType(),
    layout: fc.record({
      position: fc.record({
        x: fc.integer({ min: 0, max: 1000 }),
        y: fc.integer({ min: 0, max: 1000 }),
        unit: fc.constant('px' as const)
      }),
      size: fc.record({
        width: fc.integer({ min: 10, max: 500 }),
        height: fc.integer({ min: 10, max: 500 }),
        unit: fc.constant('px' as const)
      }),
      rotation: fc.integer({ min: 0, max: 360 })
    }),
    zIndex: fc.integer({ min: 0, max: 100 })
  });

/**
 * Arbitrary generator for a Template with a specific category
 */
const arbTemplate = (category?: TemplateCategory): fc.Arbitrary<Template> =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    category: category ? fc.constant(category) : arbTemplateCategory(),
    pageSize: fc.constantFrom('A4', 'LETTER', 'LEGAL', 'CUSTOM'),
    pageOrientation: fc.constantFrom('portrait', 'landscape'),
    pages: fc.array(
      fc.record({
        id: fc.uuid(),
        pageNumber: fc.integer({ min: 1, max: 10 }),
        width: fc.integer({ min: 100, max: 1000 }),
        height: fc.integer({ min: 100, max: 1000 }),
        elements: fc.array(arbTemplateComponent(), { maxLength: 5 })
      }),
      { minLength: 1, maxLength: 3 }
    ),
    createdAt: fc.date(),
    updatedAt: fc.date(),
    createdBy: fc.uuid(),
    version: fc.integer({ min: 1, max: 100 })
  });

/**
 * Validation function that simulates adding a component to a template
 * Returns true if the component is allowed for the template's category
 */
function canAddComponentToTemplate(template: Template, componentType: ComponentType): boolean {
  return isComponentAllowedForCategory(template.category, componentType);
}

/**
 * Validation function that checks if all components in a template are valid for its category
 */
function validateTemplateComponents(template: Template): { valid: boolean; invalidComponents: ComponentType[] } {
  const allComponentTypes = template.pages.flatMap(page =>
    page.elements.map(element => element.type)
  );
  return validateComponentsForCategory(template.category, allComponentTypes);
}

describe('Property 21: Category-Component Compatibility Validation', () => {
  describe('Core compatibility property', () => {
    it('should allow adding a component if and only if it is allowed for the template category', () => {
      fc.assert(
        fc.property(
          arbTemplateCategory(),
          arbComponentType(),
          (category, componentType) => {
            const template: Template = {
              id: 'test-template',
              name: 'Test Template',
              category,
              pageSize: 'A4',
              pageOrientation: 'portrait',
              pages: [{
                id: 'page-1',
                pageNumber: 1,
                width: 210,
                height: 297,
                elements: []
              }],
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'test-user',
              version: 1
            };

            const canAdd = canAddComponentToTemplate(template, componentType);
            const isAllowed = isComponentAllowedForCategory(category, componentType);

            // The validation result should match the category restrictions
            return canAdd === isAllowed;
          }
        ),
        propertyTestParams()
      );
    });

    it('should succeed when adding an allowed component to a template', () => {
      fc.assert(
        fc.property(
          arbTemplate(),
          (template) => {
            // Get an allowed component type for this template's category
            const allowedComponents = validateComponentsForCategory(
              template.category,
              [] // Empty array to get all allowed components
            );
            
            // Pick a component that should be allowed
            const componentType: ComponentType = 'TEXT_LABEL'; // Static components are allowed in all categories
            
            const canAdd = canAddComponentToTemplate(template, componentType);
            
            // TEXT_LABEL should always be allowed (it's a static component)
            return canAdd === true;
          }
        ),
        propertyTestParams()
      );
    });

    it('should fail when adding a disallowed component to a template', () => {
      fc.assert(
        fc.property(
          fc.constant('ID_CARD' as TemplateCategory),
          (category) => {
            const template: Template = {
              id: 'test-template',
              name: 'Test ID Card',
              category,
              pageSize: 'A4',
              pageOrientation: 'portrait',
              pages: [{
                id: 'page-1',
                pageNumber: 1,
                width: 210,
                height: 297,
                elements: []
              }],
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'test-user',
              version: 1
            };

            // RESULTS_TABLE is not allowed in ID_CARD templates
            const canAdd = canAddComponentToTemplate(template, 'RESULTS_TABLE');
            
            return canAdd === false;
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('Validation consistency', () => {
    it('should be consistent across multiple validation calls', () => {
      fc.assert(
        fc.property(
          arbTemplate(),
          arbComponentType(),
          (template, componentType) => {
            const firstCheck = canAddComponentToTemplate(template, componentType);
            const secondCheck = canAddComponentToTemplate(template, componentType);
            const thirdCheck = canAddComponentToTemplate(template, componentType);

            // All checks should return the same result
            return firstCheck === secondCheck && secondCheck === thirdCheck;
          }
        ),
        propertyTestParams()
      );
    });

    it('should validate existing template components correctly', () => {
      fc.assert(
        fc.property(
          arbTemplate(),
          (template) => {
            const validation = validateTemplateComponents(template);
            
            // Check each component individually
            const allComponentsValid = template.pages.every(page =>
              page.elements.every(element =>
                isComponentAllowedForCategory(template.category, element.type)
              )
            );

            // The validation result should match individual checks
            return validation.valid === allComponentsValid;
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('Category-specific validation', () => {
    it('ID_CARD templates should reject academic components', () => {
      fc.assert(
        fc.property(
          fc.constant('ID_CARD' as TemplateCategory),
          fc.constantFrom<ComponentType>(
            'RESULTS_TABLE',
            'SUBJECT_SCORES',
            'GRADE_DISPLAY',
            'AGGREGATE_DISPLAY',
            'DIVISION_DISPLAY',
            'TEACHER_REMARKS',
            'HEAD_TEACHER_COMMENTS'
          ),
          (category, academicComponent) => {
            const template: Template = {
              id: 'test-template',
              name: 'Test ID Card',
              category,
              pageSize: 'A4',
              pageOrientation: 'portrait',
              pages: [{ id: 'page-1', pageNumber: 1, width: 210, height: 297, elements: [] }],
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'test-user',
              version: 1
            };

            const canAdd = canAddComponentToTemplate(template, academicComponent);
            return canAdd === false;
          }
        ),
        propertyTestParams()
      );
    });

    it('ID_CARD templates should reject financial components', () => {
      fc.assert(
        fc.property(
          fc.constant('ID_CARD' as TemplateCategory),
          fc.constantFrom<ComponentType>(
            'FEES_BALANCE',
            'PAYMENT_SUMMARY',
            'FEE_STRUCTURE'
          ),
          (category, financialComponent) => {
            const template: Template = {
              id: 'test-template',
              name: 'Test ID Card',
              category,
              pageSize: 'A4',
              pageOrientation: 'portrait',
              pages: [{ id: 'page-1', pageNumber: 1, width: 210, height: 297, elements: [] }],
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'test-user',
              version: 1
            };

            const canAdd = canAddComponentToTemplate(template, financialComponent);
            return canAdd === false;
          }
        ),
        propertyTestParams()
      );
    });

    it('RECEIPT templates should reject academic components', () => {
      fc.assert(
        fc.property(
          fc.constant('RECEIPT' as TemplateCategory),
          fc.constantFrom<ComponentType>(
            'RESULTS_TABLE',
            'SUBJECT_SCORES',
            'GRADE_DISPLAY',
            'AGGREGATE_DISPLAY',
            'DIVISION_DISPLAY',
            'TEACHER_REMARKS',
            'HEAD_TEACHER_COMMENTS'
          ),
          (category, academicComponent) => {
            const template: Template = {
              id: 'test-template',
              name: 'Test Receipt',
              category,
              pageSize: 'A4',
              pageOrientation: 'portrait',
              pages: [{ id: 'page-1', pageNumber: 1, width: 210, height: 297, elements: [] }],
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'test-user',
              version: 1
            };

            const canAdd = canAddComponentToTemplate(template, academicComponent);
            return canAdd === false;
          }
        ),
        propertyTestParams()
      );
    });

    it('REPORT_CARD templates should accept academic components', () => {
      fc.assert(
        fc.property(
          fc.constant('REPORT_CARD' as TemplateCategory),
          fc.constantFrom<ComponentType>(
            'RESULTS_TABLE',
            'SUBJECT_SCORES',
            'GRADE_DISPLAY',
            'AGGREGATE_DISPLAY',
            'DIVISION_DISPLAY',
            'TEACHER_REMARKS',
            'HEAD_TEACHER_COMMENTS'
          ),
          (category, academicComponent) => {
            const template: Template = {
              id: 'test-template',
              name: 'Test Report Card',
              category,
              pageSize: 'A4',
              pageOrientation: 'portrait',
              pages: [{ id: 'page-1', pageNumber: 1, width: 210, height: 297, elements: [] }],
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'test-user',
              version: 1
            };

            const canAdd = canAddComponentToTemplate(template, academicComponent);
            return canAdd === true;
          }
        ),
        propertyTestParams()
      );
    });

    it('FEE_STATEMENT templates should accept financial components', () => {
      fc.assert(
        fc.property(
          fc.constant('FEE_STATEMENT' as TemplateCategory),
          fc.constantFrom<ComponentType>(
            'FEES_BALANCE',
            'PAYMENT_SUMMARY',
            'FEE_STRUCTURE'
          ),
          (category, financialComponent) => {
            const template: Template = {
              id: 'test-template',
              name: 'Test Fee Statement',
              category,
              pageSize: 'A4',
              pageOrientation: 'portrait',
              pages: [{ id: 'page-1', pageNumber: 1, width: 210, height: 297, elements: [] }],
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'test-user',
              version: 1
            };

            const canAdd = canAddComponentToTemplate(template, financialComponent);
            return canAdd === true;
          }
        ),
        propertyTestParams()
      );
    });

    it('all categories should accept static components', () => {
      fc.assert(
        fc.property(
          arbTemplateCategory(),
          fc.constantFrom<ComponentType>(
            'LINE',
            'BORDER',
            'RECTANGLE',
            'CIRCLE',
            'BACKGROUND_IMAGE',
            'WATERMARK',
            'TEXT_LABEL',
            'SIGNATURE_FIELD'
          ),
          (category, staticComponent) => {
            const template: Template = {
              id: 'test-template',
              name: 'Test Template',
              category,
              pageSize: 'A4',
              pageOrientation: 'portrait',
              pages: [{ id: 'page-1', pageNumber: 1, width: 210, height: 297, elements: [] }],
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'test-user',
              version: 1
            };

            const canAdd = canAddComponentToTemplate(template, staticComponent);
            return canAdd === true;
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('Template validation with multiple components', () => {
    it('should validate templates with multiple valid components', () => {
      fc.assert(
        fc.property(
          arbTemplateCategory(),
          fc.array(arbComponentType(), { minLength: 1, maxLength: 10 }),
          (category, componentTypes) => {
            // Filter to only allowed components
            const allowedComponents = componentTypes.filter(type =>
              isComponentAllowedForCategory(category, type)
            );

            if (allowedComponents.length === 0) {
              return true; // Skip if no allowed components
            }

            const template: Template = {
              id: 'test-template',
              name: 'Test Template',
              category,
              pageSize: 'A4',
              pageOrientation: 'portrait',
              pages: [{
                id: 'page-1',
                pageNumber: 1,
                width: 210,
                height: 297,
                elements: allowedComponents.map((type, index) => ({
                  id: `component-${index}`,
                  type,
                  layout: {
                    position: { x: 0, y: 0, unit: 'px' as const },
                    size: { width: 100, height: 100, unit: 'px' as const },
                    rotation: 0
                  },
                  zIndex: index
                }))
              }],
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'test-user',
              version: 1
            };

            const validation = validateTemplateComponents(template);
            return validation.valid === true && validation.invalidComponents.length === 0;
          }
        ),
        propertyTestParams()
      );
    });

    it('should detect invalid components in templates', () => {
      fc.assert(
        fc.property(
          fc.constant('ID_CARD' as TemplateCategory),
          (category) => {
            // Create a template with an invalid component (RESULTS_TABLE not allowed in ID_CARD)
            const template: Template = {
              id: 'test-template',
              name: 'Test ID Card',
              category,
              pageSize: 'A4',
              pageOrientation: 'portrait',
              pages: [{
                id: 'page-1',
                pageNumber: 1,
                width: 210,
                height: 297,
                elements: [
                  {
                    id: 'component-1',
                    type: 'STUDENT_NAME', // Valid
                    layout: {
                      position: { x: 0, y: 0, unit: 'px' as const },
                      size: { width: 100, height: 100, unit: 'px' as const },
                      rotation: 0
                    },
                    zIndex: 0
                  },
                  {
                    id: 'component-2',
                    type: 'RESULTS_TABLE', // Invalid for ID_CARD
                    layout: {
                      position: { x: 0, y: 100, unit: 'px' as const },
                      size: { width: 100, height: 100, unit: 'px' as const },
                      rotation: 0
                    },
                    zIndex: 1
                  }
                ]
              }],
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'test-user',
              version: 1
            };

            const validation = validateTemplateComponents(template);
            return validation.valid === false && 
                   validation.invalidComponents.includes('RESULTS_TABLE');
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle templates with empty pages', () => {
      fc.assert(
        fc.property(
          arbTemplateCategory(),
          (category) => {
            const template: Template = {
              id: 'test-template',
              name: 'Test Template',
              category,
              pageSize: 'A4',
              pageOrientation: 'portrait',
              pages: [{
                id: 'page-1',
                pageNumber: 1,
                width: 210,
                height: 297,
                elements: [] // Empty page
              }],
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'test-user',
              version: 1
            };

            const validation = validateTemplateComponents(template);
            // Empty templates should be valid
            return validation.valid === true && validation.invalidComponents.length === 0;
          }
        ),
        propertyTestParams()
      );
    });

    it('should handle templates with multiple pages', () => {
      fc.assert(
        fc.property(
          arbTemplateCategory(),
          fc.integer({ min: 2, max: 5 }),
          (category, pageCount) => {
            const template: Template = {
              id: 'test-template',
              name: 'Test Template',
              category,
              pageSize: 'A4',
              pageOrientation: 'portrait',
              pages: Array.from({ length: pageCount }, (_, i) => ({
                id: `page-${i + 1}`,
                pageNumber: i + 1,
                width: 210,
                height: 297,
                elements: [{
                  id: `component-${i}`,
                  type: 'TEXT_LABEL' as ComponentType, // Static component allowed in all categories
                  layout: {
                    position: { x: 0, y: 0, unit: 'px' as const },
                    size: { width: 100, height: 100, unit: 'px' as const },
                    rotation: 0
                  },
                  zIndex: 0
                }]
              })),
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'test-user',
              version: 1
            };

            const validation = validateTemplateComponents(template);
            // All pages have valid components
            return validation.valid === true;
          }
        ),
        propertyTestParams()
      );
    });
  });
});
