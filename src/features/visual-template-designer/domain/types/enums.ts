/**
 * Visual Template Designer - Domain Enums
 * 
 * This file defines the core enumerations used throughout the template designer.
 * These enums enforce type safety and restrict values to predefined options.
 */

/**
 * Template categories define the type of document being created.
 * Each category has specific component restrictions and use cases.
 */
export type TemplateCategory =
  | 'REPORT_CARD'
  | 'CERTIFICATE'
  | 'ID_CARD'
  | 'RECEIPT'
  | 'FEE_STATEMENT'
  | 'ADMISSION_FORM'
  | 'RESULT_SLIP';

/**
 * Standard page sizes for templates.
 * CUSTOM allows for user-defined dimensions.
 */
export type PageSize = 'A4' | 'LETTER' | 'LEGAL' | 'CUSTOM';

/**
 * Page orientation options.
 */
export type PageOrientation = 'portrait' | 'landscape';

/**
 * Component types available in the template designer.
 * Components are organized by category: School Info, Student Info, Academic, Financial, and Static.
 */
export type ComponentType =
  // School Info Components
  | 'SCHOOL_LOGO'
  | 'SCHOOL_NAME'
  | 'SCHOOL_MOTTO'
  | 'SCHOOL_ADDRESS'
  | 'SCHOOL_CONTACT'
  | 'SCHOOL_POBOX'
  // Student Info Components
  | 'STUDENT_NAME'
  | 'STUDENT_PHOTO'
  | 'STUDENT_CLASS'
  | 'STUDENT_STREAM'
  | 'STUDENT_NUMBER'
  | 'STUDENT_ATTENDANCE'
  | 'STUDENT_GENDER'
  | 'STUDENT_DOB'
  | 'STUDENT_GUARDIAN'
  | 'BOARDING_TYPE'
  // Academic Components
  | 'RESULTS_TABLE'
  | 'SUBJECT_SCORES'
  | 'GRADE_DISPLAY'
  | 'AGGREGATE_DISPLAY'
  | 'DIVISION_DISPLAY'
  | 'CLASS_POSITION'
  | 'PERCENTAGE_DISPLAY'
  | 'TEACHER_REMARKS'
  | 'HEAD_TEACHER_COMMENTS'
  | 'TERM_DISPLAY'
  | 'YEAR_DISPLAY'
  | 'NEXT_TERM_DATE'
  // Financial Components
  | 'FEES_BALANCE'
  | 'PAYMENT_SUMMARY'
  | 'FEE_STRUCTURE'
  | 'REQUIREMENTS_TABLE'
  // Static Components
  | 'LINE'
  | 'BORDER'
  | 'RECTANGLE'
  | 'CIRCLE'
  | 'BACKGROUND_IMAGE'
  | 'WATERMARK'
  | 'TEXT_LABEL'
  | 'SIGNATURE_FIELD';

/**
 * Text alignment options for text-based components.
 */
export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

/**
 * Image fit options for image components.
 * Determines how images are scaled within their bounds.
 */
export type ImageFit = 'contain' | 'cover' | 'fill' | 'scale-down';

/**
 * Font weight options.
 */
export type FontWeight = 'normal' | 'bold';

/**
 * Font style options.
 */
export type FontStyle = 'normal' | 'italic';

/**
 * Border style options.
 */
export type BorderStyle = 'solid' | 'dashed' | 'dotted';

/**
 * Unit of measurement for positions and sizes.
 */
export type Unit = 'px' | 'mm' | 'in';
