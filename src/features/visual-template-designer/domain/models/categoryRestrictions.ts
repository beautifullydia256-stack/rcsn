/**
 * Visual Template Designer - Category Restrictions
 * 
 * This file defines which component types are allowed for each template category.
 * These restrictions ensure that templates only contain relevant data for their purpose.
 * 
 * Based on Requirements 4.1-4.8:
 * - Report Card: School Info, Student Info, Academic, Static
 * - Certificate: School Info, Student Info, Text Label, Signature Field, Static
 * - ID Card: School Logo, Student Name, Student Photo, Student Class, Student Number, Static
 * - Receipt: School Info, Student Name, Payment Summary, Static
 * - Fee Statement: School Info, Student Info, Financial, Static
 * - Admission Form: School Info, Student Info, Static
 * - Result Slip: School Info, Student Info, Academic, Static
 */

import type { ComponentType, TemplateCategory } from '../types/enums';

/**
 * Mapping of template categories to allowed component types.
 * This enforces business rules about which components can be used in each template type.
 */
export const CATEGORY_COMPONENT_RESTRICTIONS: Record<TemplateCategory, ComponentType[]> = {
  /**
   * Report Card templates can include:
   * - School information (logo, name, motto, address, contact)
   * - Student information (name, photo, class, stream, number, attendance)
   * - Academic components (results table, scores, grades, remarks)
   * - Static design elements
   * 
   * Validates: Requirement 4.1
   */
  REPORT_CARD: [
    // School Info
    'SCHOOL_LOGO',
    'SCHOOL_NAME',
    'SCHOOL_MOTTO',
    'SCHOOL_ADDRESS',
    'SCHOOL_CONTACT',
    // Student Info
    'STUDENT_NAME',
    'STUDENT_PHOTO',
    'STUDENT_CLASS',
    'STUDENT_STREAM',
    'STUDENT_NUMBER',
    'STUDENT_ATTENDANCE',
    // Academic
    'RESULTS_TABLE',
    'SUBJECT_SCORES',
    'GRADE_DISPLAY',
    'AGGREGATE_DISPLAY',
    'DIVISION_DISPLAY',
    'TEACHER_REMARKS',
    'HEAD_TEACHER_COMMENTS',
    // Static
    'LINE',
    'BORDER',
    'RECTANGLE',
    'CIRCLE',
    'BACKGROUND_IMAGE',
    'WATERMARK',
    'TEXT_LABEL',
    'SIGNATURE_FIELD'
  ],

  /**
   * Certificate templates can include:
   * - School information (logo, name, motto, address, contact)
   * - Student information (name, photo, class, stream, number, attendance)
   * - Text labels for certificate content
   * - Signature fields for authorization
   * - Static design elements
   * 
   * Note: Certificates typically don't include academic scores or financial data
   * 
   * Validates: Requirement 4.2
   */
  CERTIFICATE: [
    // School Info
    'SCHOOL_LOGO',
    'SCHOOL_NAME',
    'SCHOOL_MOTTO',
    'SCHOOL_ADDRESS',
    'SCHOOL_CONTACT',
    // Student Info
    'STUDENT_NAME',
    'STUDENT_PHOTO',
    'STUDENT_CLASS',
    'STUDENT_STREAM',
    'STUDENT_NUMBER',
    'STUDENT_ATTENDANCE',
    // Static (with emphasis on text labels and signatures)
    'LINE',
    'BORDER',
    'RECTANGLE',
    'CIRCLE',
    'BACKGROUND_IMAGE',
    'WATERMARK',
    'TEXT_LABEL',
    'SIGNATURE_FIELD'
  ],

  /**
   * ID Card templates can include:
   * - School logo only (not full school info)
   * - Limited student information (name, photo, class, number)
   * - Static design elements
   * 
   * Note: ID cards are compact and only show essential identification information
   * 
   * Validates: Requirement 4.3
   */
  ID_CARD: [
    // School Info (limited)
    'SCHOOL_LOGO',
    // Student Info (limited)
    'STUDENT_NAME',
    'STUDENT_PHOTO',
    'STUDENT_CLASS',
    'STUDENT_NUMBER',
    // Static
    'LINE',
    'BORDER',
    'RECTANGLE',
    'CIRCLE',
    'BACKGROUND_IMAGE',
    'WATERMARK',
    'TEXT_LABEL',
    'SIGNATURE_FIELD'
  ],

  /**
   * Receipt templates can include:
   * - School information (logo, name, motto, address, contact)
   * - Student name only (not full student info)
   * - Payment summary
   * - Static design elements
   * 
   * Note: Receipts focus on financial transactions, not academic or personal details
   * 
   * Validates: Requirement 4.4
   */
  RECEIPT: [
    // School Info
    'SCHOOL_LOGO',
    'SCHOOL_NAME',
    'SCHOOL_MOTTO',
    'SCHOOL_ADDRESS',
    'SCHOOL_CONTACT',
    // Student Info (limited)
    'STUDENT_NAME',
    // Financial
    'PAYMENT_SUMMARY',
    // Static
    'LINE',
    'BORDER',
    'RECTANGLE',
    'CIRCLE',
    'BACKGROUND_IMAGE',
    'WATERMARK',
    'TEXT_LABEL',
    'SIGNATURE_FIELD'
  ],

  /**
   * Fee Statement templates can include:
   * - School information (logo, name, motto, address, contact)
   * - Student information (name, photo, class, stream, number, attendance)
   * - Financial components (fees balance, payment summary, fee structure)
   * - Static design elements
   * 
   * Validates: Requirement 4.5
   */
  FEE_STATEMENT: [
    // School Info
    'SCHOOL_LOGO',
    'SCHOOL_NAME',
    'SCHOOL_MOTTO',
    'SCHOOL_ADDRESS',
    'SCHOOL_CONTACT',
    // Student Info
    'STUDENT_NAME',
    'STUDENT_PHOTO',
    'STUDENT_CLASS',
    'STUDENT_STREAM',
    'STUDENT_NUMBER',
    'STUDENT_ATTENDANCE',
    // Financial
    'FEES_BALANCE',
    'PAYMENT_SUMMARY',
    'FEE_STRUCTURE',
    // Static
    'LINE',
    'BORDER',
    'RECTANGLE',
    'CIRCLE',
    'BACKGROUND_IMAGE',
    'WATERMARK',
    'TEXT_LABEL',
    'SIGNATURE_FIELD'
  ],

  /**
   * Admission Form templates can include:
   * - School information (logo, name, motto, address, contact)
   * - Student information (name, photo, class, stream, number, attendance)
   * - Static design elements
   * 
   * Note: Admission forms don't include academic results or financial data
   * 
   * Validates: Requirement 4.6
   */
  ADMISSION_FORM: [
    // School Info
    'SCHOOL_LOGO',
    'SCHOOL_NAME',
    'SCHOOL_MOTTO',
    'SCHOOL_ADDRESS',
    'SCHOOL_CONTACT',
    // Student Info
    'STUDENT_NAME',
    'STUDENT_PHOTO',
    'STUDENT_CLASS',
    'STUDENT_STREAM',
    'STUDENT_NUMBER',
    'STUDENT_ATTENDANCE',
    // Static
    'LINE',
    'BORDER',
    'RECTANGLE',
    'CIRCLE',
    'BACKGROUND_IMAGE',
    'WATERMARK',
    'TEXT_LABEL',
    'SIGNATURE_FIELD'
  ],

  /**
   * Result Slip templates can include:
   * - School information (logo, name, motto, address, contact)
   * - Student information (name, photo, class, stream, number, attendance)
   * - Academic components (results table, scores, grades, remarks)
   * - Static design elements
   * 
   * Note: Result slips are similar to report cards but may be more compact
   * 
   * Validates: Requirement 4.7
   */
  RESULT_SLIP: [
    // School Info
    'SCHOOL_LOGO',
    'SCHOOL_NAME',
    'SCHOOL_MOTTO',
    'SCHOOL_ADDRESS',
    'SCHOOL_CONTACT',
    // Student Info
    'STUDENT_NAME',
    'STUDENT_PHOTO',
    'STUDENT_CLASS',
    'STUDENT_STREAM',
    'STUDENT_NUMBER',
    'STUDENT_ATTENDANCE',
    // Academic
    'RESULTS_TABLE',
    'SUBJECT_SCORES',
    'GRADE_DISPLAY',
    'AGGREGATE_DISPLAY',
    'DIVISION_DISPLAY',
    'TEACHER_REMARKS',
    'HEAD_TEACHER_COMMENTS',
    // Static
    'LINE',
    'BORDER',
    'RECTANGLE',
    'CIRCLE',
    'BACKGROUND_IMAGE',
    'WATERMARK',
    'TEXT_LABEL',
    'SIGNATURE_FIELD'
  ]
};

/**
 * Check if a component type is allowed for a specific template category.
 * 
 * @param category - The template category
 * @param componentType - The component type to check
 * @returns true if the component is allowed, false otherwise
 * 
 * @example
 * isComponentAllowedForCategory('ID_CARD', 'STUDENT_NAME') // true
 * isComponentAllowedForCategory('ID_CARD', 'RESULTS_TABLE') // false
 */
export function isComponentAllowedForCategory(
  category: TemplateCategory,
  componentType: ComponentType
): boolean {
  const allowedComponents = CATEGORY_COMPONENT_RESTRICTIONS[category];
  return allowedComponents.includes(componentType);
}

/**
 * Get all component types allowed for a specific template category.
 * 
 * @param category - The template category
 * @returns Array of allowed component types
 * 
 * @example
 * getComponentsForCategory('ID_CARD')
 * // Returns: ['SCHOOL_LOGO', 'STUDENT_NAME', 'STUDENT_PHOTO', ...]
 */
export function getComponentsForCategory(category: TemplateCategory): ComponentType[] {
  return CATEGORY_COMPONENT_RESTRICTIONS[category];
}

/**
 * Get all template categories that allow a specific component type.
 * 
 * @param componentType - The component type
 * @returns Array of template categories that allow this component
 * 
 * @example
 * getCategoriesForComponent('RESULTS_TABLE')
 * // Returns: ['REPORT_CARD', 'RESULT_SLIP']
 */
export function getCategoriesForComponent(componentType: ComponentType): TemplateCategory[] {
  const categories: TemplateCategory[] = [];
  
  for (const [category, allowedComponents] of Object.entries(CATEGORY_COMPONENT_RESTRICTIONS)) {
    if (allowedComponents.includes(componentType)) {
      categories.push(category as TemplateCategory);
    }
  }
  
  return categories;
}

/**
 * Validate that all components in a list are allowed for a specific category.
 * 
 * @param category - The template category
 * @param componentTypes - Array of component types to validate
 * @returns Object with validation result and any invalid components
 * 
 * @example
 * validateComponentsForCategory('ID_CARD', ['STUDENT_NAME', 'RESULTS_TABLE'])
 * // Returns: { valid: false, invalidComponents: ['RESULTS_TABLE'] }
 */
export function validateComponentsForCategory(
  category: TemplateCategory,
  componentTypes: ComponentType[]
): { valid: boolean; invalidComponents: ComponentType[] } {
  const allowedComponents = CATEGORY_COMPONENT_RESTRICTIONS[category];
  const invalidComponents = componentTypes.filter(
    type => !allowedComponents.includes(type)
  );
  
  return {
    valid: invalidComponents.length === 0,
    invalidComponents
  };
}
