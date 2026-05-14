/**
 * Visual Template Designer - Data Binding Validation
 * 
 * This module provides validation logic for data binding fields to ensure:
 * 1. Bound fields exist in the predefined data source schema
 * 2. Field types are compatible with component requirements
 * 3. No custom SQL queries or unauthorized field names are allowed
 * 
 * Requirements validated:
 * - 4.9: Data binding validation ensures bound fields exist and match expected types
 * - 14.3: Validate all dynamic components have valid data bindings
 * - 14.4: Validate data bindings reference existing database fields
 * - 16.1: Only allow data binding to predefined database fields
 * - 16.2: Prevent custom SQL queries
 * - 16.3: Prevent custom database field names
 * - 16.4: Provide dropdown list of valid data binding options
 * - 16.5: Display only valid data binding options for each component type
 * - 16.6: Reject templates with invalid data binding values
 */

import type { ComponentType } from '../types/enums';

/**
 * Data type for a field in the data source schema.
 */
export type FieldDataType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'url'
  | 'array'
  | 'object';

/**
 * Schema definition for a data field.
 */
export interface DataFieldSchema {
  field: string;
  type: FieldDataType;
  description: string;
}

/**
 * Predefined data source schema.
 * This defines all valid fields that can be bound to components.
 * 
 * Schema is organized by domain:
 * - school: School information fields
 * - student: Student information fields
 */
export const DATA_SOURCE_SCHEMA: Record<string, DataFieldSchema> = {
  // School Info Fields
  'school.logo_url': {
    field: 'school.logo_url',
    type: 'url',
    description: 'URL to the school logo image'
  },
  'school.name': {
    field: 'school.name',
    type: 'string',
    description: 'Official school name'
  },
  'school.motto': {
    field: 'school.motto',
    type: 'string',
    description: 'School motto or tagline'
  },
  'school.address': {
    field: 'school.address',
    type: 'string',
    description: 'School physical address'
  },
  'school.contact': {
    field: 'school.contact',
    type: 'string',
    description: 'School contact information (phone, email)'
  },
  'school.fee_structure': {
    field: 'school.fee_structure',
    type: 'object',
    description: 'Fee structure breakdown'
  },

  // Student Info Fields
  'student.full_name': {
    field: 'student.full_name',
    type: 'string',
    description: 'Student full name'
  },
  'student.photo_url': {
    field: 'student.photo_url',
    type: 'url',
    description: 'URL to student photograph'
  },
  'student.class': {
    field: 'student.class',
    type: 'string',
    description: 'Student class or grade level'
  },
  'student.stream': {
    field: 'student.stream',
    type: 'string',
    description: 'Student stream or section'
  },
  'student.student_number': {
    field: 'student.student_number',
    type: 'string',
    description: 'Student identification number'
  },
  'student.attendance': {
    field: 'student.attendance',
    type: 'string',
    description: 'Student attendance statistics'
  },

  // Academic Fields
  'student.results': {
    field: 'student.results',
    type: 'array',
    description: 'Array of subject results with scores and grades'
  },
  'student.subject_scores': {
    field: 'student.subject_scores',
    type: 'array',
    description: 'Array of individual subject scores'
  },
  'student.grade': {
    field: 'student.grade',
    type: 'string',
    description: 'Overall grade or letter grade'
  },
  'student.aggregate': {
    field: 'student.aggregate',
    type: 'number',
    description: 'Aggregate score or total points'
  },
  'student.division': {
    field: 'student.division',
    type: 'string',
    description: 'Division or performance category'
  },
  'student.teacher_remarks': {
    field: 'student.teacher_remarks',
    type: 'string',
    description: 'Teacher comments and remarks'
  },
  'student.head_teacher_comments': {
    field: 'student.head_teacher_comments',
    type: 'string',
    description: 'Head teacher or principal comments'
  },

  // Financial Fields
  'student.fees_balance': {
    field: 'student.fees_balance',
    type: 'number',
    description: 'Current fees balance or amount due'
  },
  'student.payment_summary': {
    field: 'student.payment_summary',
    type: 'object',
    description: 'Summary of payments made'
  }
};

/**
 * Component type to valid data binding fields mapping.
 * This defines which fields are allowed for each component type.
 * 
 * Requirements:
 * - 16.4: Provide dropdown list of valid data binding options for each component type
 * - 16.5: Display only valid data binding options for each component type
 */
export const COMPONENT_VALID_BINDINGS: Record<ComponentType, string[]> = {
  // School Info Components
  SCHOOL_LOGO: ['school.logo_url'],
  SCHOOL_NAME: ['school.name'],
  SCHOOL_MOTTO: ['school.motto'],
  SCHOOL_ADDRESS: ['school.address'],
  SCHOOL_CONTACT: ['school.contact'],
  SCHOOL_POBOX: ['school.pobox'],

  // Student Info Components
  STUDENT_NAME: ['student.full_name'],
  STUDENT_PHOTO: ['student.photo_url'],
  STUDENT_CLASS: ['student.class'],
  STUDENT_STREAM: ['student.stream'],
  STUDENT_NUMBER: ['student.student_number'],
  STUDENT_ATTENDANCE: ['student.attendance'],
  STUDENT_GENDER: ['student.gender'],
  STUDENT_DOB: ['student.date_of_birth'],
  STUDENT_GUARDIAN: ['student.guardian_name'],
  BOARDING_TYPE: ['student.boarding_type'],

  // Academic Components
  RESULTS_TABLE: ['student.results'],
  SUBJECT_SCORES: ['student.subject_scores'],
  GRADE_DISPLAY: ['student.grade'],
  AGGREGATE_DISPLAY: ['student.aggregate'],
  DIVISION_DISPLAY: ['student.division'],
  CLASS_POSITION: ['academic.class_position'],
  PERCENTAGE_DISPLAY: ['academic.percentage'],
  TEACHER_REMARKS: ['student.teacher_remarks'],
  HEAD_TEACHER_COMMENTS: ['student.head_teacher_comments'],
  TERM_DISPLAY: ['term.term'],
  YEAR_DISPLAY: ['term.year'],
  NEXT_TERM_DATE: ['academic.next_term_begins_date'],

  // Financial Components
  FEES_BALANCE: ['student.fees_balance'],
  PAYMENT_SUMMARY: ['student.payment_summary'],
  FEE_STRUCTURE: ['school.fee_structure'],
  REQUIREMENTS_TABLE: ['student.requirements'],

  // Static Components (no data bindings allowed)
  LINE: [],
  BORDER: [],
  RECTANGLE: [],
  CIRCLE: [],
  BACKGROUND_IMAGE: [],
  WATERMARK: [],
  TEXT_LABEL: [],
  SIGNATURE_FIELD: []
};

/**
 * Expected data types for each component type.
 * Used for type compatibility validation.
 */
export const COMPONENT_EXPECTED_TYPES: Record<ComponentType, FieldDataType[]> = {
  // School Info Components
  SCHOOL_LOGO: ['url'],
  SCHOOL_NAME: ['string'],
  SCHOOL_MOTTO: ['string'],
  SCHOOL_ADDRESS: ['string'],
  SCHOOL_CONTACT: ['string'],
  SCHOOL_POBOX: ['string'],

  // Student Info Components
  STUDENT_NAME: ['string'],
  STUDENT_PHOTO: ['url'],
  STUDENT_CLASS: ['string'],
  STUDENT_STREAM: ['string'],
  STUDENT_NUMBER: ['string'],
  STUDENT_ATTENDANCE: ['string'],
  STUDENT_GENDER: ['string'],
  STUDENT_DOB: ['string'],
  STUDENT_GUARDIAN: ['string'],
  BOARDING_TYPE: ['string'],

  // Academic Components
  RESULTS_TABLE: ['array', 'object'],
  SUBJECT_SCORES: ['array', 'object'],
  GRADE_DISPLAY: ['string'],
  AGGREGATE_DISPLAY: ['number', 'string'],
  DIVISION_DISPLAY: ['string'],
  CLASS_POSITION: ['string'],
  PERCENTAGE_DISPLAY: ['string', 'number'],
  TEACHER_REMARKS: ['string'],
  HEAD_TEACHER_COMMENTS: ['string'],
  TERM_DISPLAY: ['string'],
  YEAR_DISPLAY: ['string'],
  NEXT_TERM_DATE: ['string'],

  // Financial Components
  FEES_BALANCE: ['number', 'string'],
  PAYMENT_SUMMARY: ['object'],
  FEE_STRUCTURE: ['object'],
  REQUIREMENTS_TABLE: ['array', 'object'],

  // Static Components (no type requirements)
  LINE: [],
  BORDER: [],
  RECTANGLE: [],
  CIRCLE: [],
  BACKGROUND_IMAGE: [],
  WATERMARK: [],
  TEXT_LABEL: [],
  SIGNATURE_FIELD: []
};

/**
 * Validation error for data binding issues.
 */
export class DataBindingValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public componentType: ComponentType,
    public code: string
  ) {
    super(message);
    this.name = 'DataBindingValidationError';
  }
}

/**
 * Result of data binding validation.
 */
export interface DataBindingValidationResult {
  valid: boolean;
  errors: DataBindingValidationError[];
}

/**
 * Check if a field exists in the data source schema.
 * 
 * Requirements:
 * - 14.4: Validate data bindings reference existing database fields
 * - 16.1: Only allow data binding to predefined database fields
 */
export function fieldExistsInSchema(field: string): boolean {
  return field in DATA_SOURCE_SCHEMA;
}

/**
 * Check if a field is valid for a specific component type.
 * 
 * Requirements:
 * - 16.5: Display only valid data binding options for each component type
 */
export function isFieldValidForComponent(field: string, componentType: ComponentType): boolean {
  const validBindings = COMPONENT_VALID_BINDINGS[componentType];
  return validBindings.includes(field);
}

/**
 * Check if a field type is compatible with a component type.
 * 
 * Requirements:
 * - 4.9: Data binding validation must match expected types
 */
export function isTypeCompatible(field: string, componentType: ComponentType): boolean {
  const fieldSchema = DATA_SOURCE_SCHEMA[field];
  if (!fieldSchema) {
    return false;
  }

  const expectedTypes = COMPONENT_EXPECTED_TYPES[componentType];
  if (expectedTypes.length === 0) {
    // Static components don't have type requirements
    return true;
  }

  return expectedTypes.includes(fieldSchema.type);
}

/**
 * Detect potential SQL injection patterns in field names.
 * 
 * Requirements:
 * - 16.2: Prevent custom SQL queries
 */
export function containsSQLInjectionPattern(field: string): boolean {
  const sqlPatterns = [
    /\bSELECT\b/i,
    /\bINSERT\b/i,
    /\bUPDATE\b/i,
    /\bDELETE\b/i,
    /\bDROP\b/i,
    /\bCREATE\b/i,
    /\bALTER\b/i,
    /\bEXEC\b/i,
    /\bUNION\b/i,
    /--/,
    /;/,
    /\/\*/,
    /\*\//,
    /\bOR\b\s*\d+\s*=\s*\d+/i,
    /\bAND\b\s*\d+\s*=\s*\d+/i,
    /'.*\bOR\b.*'/i,
    /".*\bOR\b.*"/i
  ];

  return sqlPatterns.some(pattern => pattern.test(field));
}

/**
 * Get valid data binding options for a component type.
 * 
 * Requirements:
 * - 16.4: Provide dropdown list of valid data binding options
 */
export function getValidBindingsForComponent(componentType: ComponentType): DataFieldSchema[] {
  const validFields = COMPONENT_VALID_BINDINGS[componentType];
  return validFields
    .map(field => DATA_SOURCE_SCHEMA[field])
    .filter(schema => schema !== undefined);
}

/**
 * Validate a data binding for a component.
 * 
 * This is the main validation function that checks:
 * 1. Field exists in schema
 * 2. Field is valid for component type
 * 3. Field type is compatible with component
 * 4. No SQL injection patterns
 * 
 * Requirements:
 * - 4.9: Data binding validation ensures bound fields exist and match expected types
 * - 14.3: Validate all dynamic components have valid data bindings
 * - 14.4: Validate data bindings reference existing database fields
 * - 16.1: Only allow data binding to predefined database fields
 * - 16.2: Prevent custom SQL queries
 * - 16.3: Prevent custom database field names
 * - 16.6: Reject templates with invalid data binding values
 */
export function validateDataBinding(
  field: string,
  componentType: ComponentType
): DataBindingValidationResult {
  const errors: DataBindingValidationError[] = [];

  // Check for SQL injection patterns
  if (containsSQLInjectionPattern(field)) {
    errors.push(new DataBindingValidationError(
      `Data binding field "${field}" contains potential SQL injection pattern`,
      field,
      componentType,
      'SQL_INJECTION_PATTERN'
    ));
  }

  // Check if field exists in schema
  if (!fieldExistsInSchema(field)) {
    errors.push(new DataBindingValidationError(
      `Data binding field "${field}" does not exist in the data source schema`,
      field,
      componentType,
      'FIELD_NOT_IN_SCHEMA'
    ));
  }

  // Check if field is valid for this component type
  if (!isFieldValidForComponent(field, componentType)) {
    const validFields = COMPONENT_VALID_BINDINGS[componentType];
    errors.push(new DataBindingValidationError(
      `Data binding field "${field}" is not valid for component type "${componentType}". Valid fields: ${validFields.join(', ')}`,
      field,
      componentType,
      'FIELD_NOT_VALID_FOR_COMPONENT'
    ));
  }

  // Check type compatibility
  if (fieldExistsInSchema(field) && !isTypeCompatible(field, componentType)) {
    const fieldType = DATA_SOURCE_SCHEMA[field].type;
    const expectedTypes = COMPONENT_EXPECTED_TYPES[componentType];
    errors.push(new DataBindingValidationError(
      `Data binding field "${field}" has type "${fieldType}" which is not compatible with component type "${componentType}". Expected types: ${expectedTypes.join(', ')}`,
      field,
      componentType,
      'TYPE_INCOMPATIBLE'
    ));
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate that a component has a data binding if required.
 * Dynamic components (non-static) must have data bindings.
 * 
 * Requirements:
 * - 14.3: Validate all dynamic components have valid data bindings
 */
export function requiresDataBinding(componentType: ComponentType): boolean {
  const validBindings = COMPONENT_VALID_BINDINGS[componentType];
  return validBindings.length > 0;
}

/**
 * Validate that a component with data binding requirement has one.
 */
export function validateComponentHasDataBinding(
  componentType: ComponentType,
  dataBinding: string | undefined
): DataBindingValidationResult {
  const errors: DataBindingValidationError[] = [];

  if (requiresDataBinding(componentType) && !dataBinding) {
    errors.push(new DataBindingValidationError(
      `Component type "${componentType}" requires a data binding but none was provided`,
      '',
      componentType,
      'MISSING_DATA_BINDING'
    ));
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
