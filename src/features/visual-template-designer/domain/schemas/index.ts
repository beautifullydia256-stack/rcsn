/**
 * Visual Template Designer - Schemas Index
 * 
 * Central export point for all Zod validation schemas and parser utilities.
 * Import schemas and parser functions from this file to access validation functionality.
 * 
 * @example
 * ```typescript
 * import { TemplateJSONSchema, parseTemplateJSON } from './domain/schemas';
 * 
 * // Validate template JSON
 * const result = TemplateJSONSchema.safeParse(jsonData);
 * if (result.success) {
 *   console.log('Valid template:', result.data);
 * } else {
 *   console.error('Validation errors:', result.error);
 * }
 * 
 * // Parse template JSON string
 * const parseResult = parseTemplateJSON(jsonString);
 * if (parseResult.success) {
 *   console.log('Parsed template:', parseResult.data);
 * }
 * ```
 */

export {
  // Core schemas
  PositionSchema,
  SizeSchema,
  FontPropertiesSchema,
  ColorPropertiesSchema,
  BorderPropertiesSchema,
  SpacingPropertiesSchema,
  LayoutPropertiesSchema,
  ComponentTypeSchema,
  DataBindingSchema,
  ComponentJSONSchema,
  PageJSONSchema,
  TemplateJSONSchema,
  
  // Type exports
  type TemplateJSON,
  type PageJSON,
  type ComponentJSON,
  type LayoutProperties,
  type Position,
  type Size,
  type FontProperties,
  type ColorProperties,
  type BorderProperties,
  type SpacingProperties,
  type DataBinding,
  type ComponentType,
} from './validation';

export {
  // Parser and pretty printer functions
  parseTemplateJSON,
  prettyPrintTemplateJSON,
  parseTemplateJSONOrThrow,
  prettyPrintTemplateJSONOrThrow,
  
  // Type exports
  type ParseResult,
} from './parser';
