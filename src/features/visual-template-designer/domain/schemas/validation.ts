/**
 * Visual Template Designer - Zod Validation Schemas
 * 
 * This file defines Zod schemas for runtime validation of all domain models.
 * These schemas enforce type safety at runtime and validate that all values
 * are within allowed ranges as specified in the requirements.
 * 
 * Requirements validated:
 * - 5.5: Font size between 6pt and 72pt
 * - 5.6: Font weight (normal, bold)
 * - 5.10: Border width between 0px and 20px
 * - 5.13: Padding between 0px and 50px
 * - 5.14: Margin between 0px and 50px
 * - 8.2-8.12: Template JSON structure
 * - 14.6: Template validation
 */

import { z } from 'zod';

/**
 * Position schema validates x,y coordinates with unit of measurement.
 * Coordinates can be any number (positive or negative).
 */
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  unit: z.enum(['px', 'mm', 'in'])
});

/**
 * Size schema validates width and height dimensions.
 * Both dimensions must be positive numbers.
 * Optionally includes aspect ratio lock flag.
 */
export const SizeSchema = z.object({
  width: z.number().positive('Width must be a positive number'),
  height: z.number().positive('Height must be a positive number'),
  unit: z.enum(['px', 'mm', 'in']),
  aspectRatioLocked: z.boolean().optional()
});

/**
 * Font properties schema validates font styling.
 * Font size is constrained to 6-72pt range (Requirement 5.5).
 */
export const FontPropertiesSchema = z.object({
  family: z.string().min(1, 'Font family cannot be empty'),
  size: z.number().min(6, 'Font size must be at least 6pt').max(72, 'Font size must be at most 72pt'),
  weight: z.enum(['normal', 'bold']),
  style: z.enum(['normal', 'italic'])
});

/**
 * Color properties schema validates text and background colors.
 * Colors must be valid hex (#RRGGBB) or RGB (rgb(r,g,b)) format.
 */
export const ColorPropertiesSchema = z.object({
  text: z.string().regex(
    /^#[0-9A-Fa-f]{6}$|^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/,
    'Text color must be a valid hex (#RRGGBB) or RGB (rgb(r,g,b)) format'
  ).optional(),
  background: z.string().regex(
    /^#[0-9A-Fa-f]{6}$|^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/,
    'Background color must be a valid hex (#RRGGBB) or RGB (rgb(r,g,b)) format'
  ).optional()
});

/**
 * Border properties schema validates border styling.
 * Border width is constrained to 0-20px range (Requirement 5.10).
 */
export const BorderPropertiesSchema = z.object({
  width: z.number().min(0, 'Border width must be at least 0px').max(20, 'Border width must be at most 20px'),
  color: z.string().regex(
    /^#[0-9A-Fa-f]{6}$|^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/,
    'Border color must be a valid hex (#RRGGBB) or RGB (rgb(r,g,b)) format'
  ),
  style: z.enum(['solid', 'dashed', 'dotted'])
});

/**
 * Spacing properties schema validates padding and margin.
 * Both are constrained to 0-50px range (Requirements 5.13, 5.14).
 */
export const SpacingPropertiesSchema = z.object({
  padding: z.number().min(0, 'Padding must be at least 0px').max(50, 'Padding must be at most 50px'),
  margin: z.number().min(0, 'Margin must be at least 0px').max(50, 'Margin must be at most 50px')
});

/**
 * Layout properties schema validates complete component layout.
 * Combines position, size, rotation, and all styling properties.
 * Rotation is constrained to 0-360 degrees.
 */
export const LayoutPropertiesSchema = z.object({
  position: PositionSchema,
  size: SizeSchema,
  rotation: z.number().min(0, 'Rotation must be at least 0 degrees').max(360, 'Rotation must be at most 360 degrees'),
  font: FontPropertiesSchema.optional(),
  color: ColorPropertiesSchema.optional(),
  border: BorderPropertiesSchema.optional(),
  spacing: SpacingPropertiesSchema.optional(),
  alignment: z.enum(['left', 'center', 'right', 'justify']).optional(),
  imagefit: z.enum(['contain', 'cover', 'fill', 'scale-down']).optional()
});

/**
 * Component type schema validates component types.
 * Only predefined component types from the Component Library are allowed.
 */
export const ComponentTypeSchema = z.enum([
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
]);

/**
 * Data binding schema validates database field connections.
 * Field name must be non-empty string.
 * Formatter and fallback are optional.
 */
export const DataBindingSchema = z.object({
  field: z.string().min(1, 'Data binding field cannot be empty'),
  formatter: z.string().optional(),
  fallback: z.string().optional()
});

/**
 * Component JSON schema validates individual component structure.
 * Used for Template JSON serialization and validation.
 */
export const ComponentJSONSchema = z.object({
  component_type: ComponentTypeSchema,
  data_binding: DataBindingSchema.optional(),
  layout: LayoutPropertiesSchema,
  z_index: z.number().int('Z-index must be an integer'),
  group_id: z.string().optional()
});

/**
 * Page JSON schema validates page structure.
 * Page number must be a positive integer.
 * Width and height must be positive numbers.
 * Elements array contains all components on the page.
 */
export const PageJSONSchema = z.object({
  page_number: z.number().int('Page number must be an integer').positive('Page number must be positive'),
  width: z.number().positive('Page width must be positive'),
  height: z.number().positive('Page height must be positive'),
  elements: z.array(ComponentJSONSchema)
});

/**
 * Template JSON schema validates complete template structure.
 * This is the main schema for template serialization and validation.
 * 
 * Validates:
 * - Template name (1-100 characters)
 * - Template category (from predefined list)
 * - Page size and orientation
 * - At least one page
 * - Version number (positive integer)
 * - ISO datetime strings for timestamps
 */
export const TemplateJSONSchema = z.object({
  template_name: z.string().min(1, 'Template name cannot be empty').max(100, 'Template name must be at most 100 characters'),
  template_category: z.enum([
    'REPORT_CARD',
    'CERTIFICATE',
    'ID_CARD',
    'RECEIPT',
    'FEE_STATEMENT',
    'ADMISSION_FORM',
    'RESULT_SLIP'
  ]),
  page_size: z.enum(['A4', 'LETTER', 'LEGAL', 'CUSTOM']),
  page_orientation: z.enum(['portrait', 'landscape']),
  pages: z.array(PageJSONSchema).min(1, 'Template must have at least one page'),
  version: z.number().int('Version must be an integer').positive('Version must be positive'),
  created_at: z.string().datetime('Created at must be a valid ISO datetime string'),
  updated_at: z.string().datetime('Updated at must be a valid ISO datetime string')
});

/**
 * Type inference from Zod schemas.
 * These types can be used for TypeScript type checking.
 */
export type TemplateJSON = z.infer<typeof TemplateJSONSchema>;
export type PageJSON = z.infer<typeof PageJSONSchema>;
export type ComponentJSON = z.infer<typeof ComponentJSONSchema>;
export type LayoutProperties = z.infer<typeof LayoutPropertiesSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type Size = z.infer<typeof SizeSchema>;
export type FontProperties = z.infer<typeof FontPropertiesSchema>;
export type ColorProperties = z.infer<typeof ColorPropertiesSchema>;
export type BorderProperties = z.infer<typeof BorderPropertiesSchema>;
export type SpacingProperties = z.infer<typeof SpacingPropertiesSchema>;
export type DataBinding = z.infer<typeof DataBindingSchema>;
export type ComponentType = z.infer<typeof ComponentTypeSchema>;
