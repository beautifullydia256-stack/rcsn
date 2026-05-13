/**
 * Visual Template Designer - Template JSON Parser and Pretty Printer
 * 
 * This file provides functions for parsing and formatting Template JSON.
 * The parser uses Zod schema validation to ensure data integrity and provide
 * descriptive error messages. The pretty printer formats templates with
 * consistent 2-space indentation.
 * 
 * Requirements validated:
 * - 8.11: Parse Template JSON and reconstruct Canvas state
 * - 8.12: Display descriptive error message when parsing fails
 * - 9.1: Parse valid Template JSON into Template object
 * - 9.2: Return descriptive error for invalid Template JSON
 * - 9.3: Format Template objects into valid Template JSON with consistent indentation
 * - 9.4: Use 2-space indentation for nested objects and arrays
 */

import { z } from 'zod';
import { TemplateJSONSchema, type TemplateJSON } from './validation';

/**
 * Result type for parsing operations.
 * Success contains the parsed template data.
 * Failure contains a descriptive error message.
 */
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Parses a Template JSON string into a validated Template object.
 * 
 * This function:
 * 1. Parses the JSON string
 * 2. Validates the structure using Zod schema
 * 3. Returns either the validated data or a descriptive error message
 * 
 * @param jsonString - The Template JSON string to parse
 * @returns ParseResult containing either the validated TemplateJSON or an error message
 * 
 * @example
 * ```typescript
 * const result = parseTemplateJSON(jsonString);
 * if (result.success) {
 *   console.log('Template loaded:', result.data.template_name);
 * } else {
 *   console.error('Parse error:', result.error);
 * }
 * ```
 * 
 * Requirements:
 * - 8.11: Parse Template JSON and reconstruct Canvas state
 * - 8.12: Display descriptive error message when parsing fails
 * - 9.1: Parse valid Template JSON into Template object
 * - 9.2: Return descriptive error for invalid Template JSON
 */
export function parseTemplateJSON(jsonString: string): ParseResult<TemplateJSON> {
  try {
    // Step 1: Parse the JSON string
    const parsed = JSON.parse(jsonString);
    
    // Step 2: Validate using Zod schema
    const validationResult = TemplateJSONSchema.safeParse(parsed);
    
    if (validationResult.success) {
      return {
        success: true,
        data: validationResult.data
      };
    } else {
      // Format Zod validation errors into a descriptive message
      try {
        const errorMessages = validationResult.error.issues.map((err) => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        
        return {
          success: false,
          error: `Template validation failed:\n${errorMessages.join('\n')}`
        };
      } catch (formatError) {
        // Fallback if error formatting fails
        return {
          success: false,
          error: `Template validation failed: ${validationResult.error.message || 'Invalid template structure'}`
        };
      }
    }
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: `Invalid JSON format: ${error.message}`
      };
    }
    
    // Handle unexpected errors
    return {
      success: false,
      error: `Unexpected error during parsing: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Formats a Template object into a pretty-printed JSON string.
 * 
 * This function:
 * 1. Validates the template object using Zod schema
 * 2. Serializes to JSON with 2-space indentation
 * 3. Returns either the formatted JSON string or a descriptive error message
 * 
 * @param template - The Template object to format
 * @returns ParseResult containing either the formatted JSON string or an error message
 * 
 * @example
 * ```typescript
 * const result = prettyPrintTemplateJSON(template);
 * if (result.success) {
 *   console.log('Formatted JSON:', result.data);
 * } else {
 *   console.error('Format error:', result.error);
 * }
 * ```
 * 
 * Requirements:
 * - 9.3: Format Template objects into valid Template JSON with consistent indentation
 * - 9.4: Use 2-space indentation for nested objects and arrays
 */
export function prettyPrintTemplateJSON(template: unknown): ParseResult<string> {
  try {
    // Step 1: Validate the template object using Zod schema
    const validationResult = TemplateJSONSchema.safeParse(template);
    
    if (!validationResult.success) {
      // Format Zod validation errors into a descriptive message
      try {
        const errorMessages = validationResult.error.issues.map((err) => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        
        return {
          success: false,
          error: `Template validation failed:\n${errorMessages.join('\n')}`
        };
      } catch (formatError) {
        // Fallback if error formatting fails
        return {
          success: false,
          error: `Template validation failed: ${validationResult.error.message || 'Invalid template structure'}`
        };
      }
    }
    
    // Step 2: Serialize to JSON with 2-space indentation
    const jsonString = JSON.stringify(validationResult.data, null, 2);
    
    return {
      success: true,
      data: jsonString
    };
  } catch (error) {
    // Handle unexpected errors during serialization
    return {
      success: false,
      error: `Unexpected error during formatting: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Convenience function that parses Template JSON and throws on error.
 * Useful when you want to handle errors with try-catch instead of result types.
 * 
 * @param jsonString - The Template JSON string to parse
 * @returns The validated TemplateJSON object
 * @throws Error with descriptive message if parsing or validation fails
 * 
 * @example
 * ```typescript
 * try {
 *   const template = parseTemplateJSONOrThrow(jsonString);
 *   console.log('Template loaded:', template.template_name);
 * } catch (error) {
 *   console.error('Parse error:', error.message);
 * }
 * ```
 */
export function parseTemplateJSONOrThrow(jsonString: string): TemplateJSON {
  const result = parseTemplateJSON(jsonString);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

/**
 * Convenience function that formats Template JSON and throws on error.
 * Useful when you want to handle errors with try-catch instead of result types.
 * 
 * @param template - The Template object to format
 * @returns The formatted JSON string
 * @throws Error with descriptive message if validation or formatting fails
 * 
 * @example
 * ```typescript
 * try {
 *   const jsonString = prettyPrintTemplateJSONOrThrow(template);
 *   console.log('Formatted JSON:', jsonString);
 * } catch (error) {
 *   console.error('Format error:', error.message);
 * }
 * ```
 */
export function prettyPrintTemplateJSONOrThrow(template: unknown): string {
  const result = prettyPrintTemplateJSON(template);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}
