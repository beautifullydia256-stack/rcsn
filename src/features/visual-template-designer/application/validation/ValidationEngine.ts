/**
 * Visual Template Designer - Validation Engine
 *
 * Provides runtime validation for templates, components, layout properties,
 * data bindings, and category compatibility.
 *
 * Requirements:
 * - 14.1: Validate template structure on save / import
 * - 14.3: Validate all dynamic components have valid data bindings
 * - 14.4: Validate data bindings reference existing database fields
 * - 14.6: Validate complete template
 */

import type { Template, TemplateComponent, LayoutProperties } from '../../domain/types';
import type { TemplateCategory } from '../../domain/types/enums';
import {
  validateDataBinding,
  requiresDataBinding,
} from '../../domain/validation/dataBindingValidation';
import { isComponentAllowedForCategory } from '../../domain/models/categoryRestrictions';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export const ERROR_CODES = {
  INVALID_COMPONENT_TYPE: 'INVALID_COMPONENT_TYPE',
  MISSING_DATA_BINDING: 'MISSING_DATA_BINDING',
  INVALID_DATA_BINDING: 'INVALID_DATA_BINDING',
  LAYOUT_OUT_OF_RANGE: 'LAYOUT_OUT_OF_RANGE',
  CATEGORY_INCOMPATIBLE: 'CATEGORY_INCOMPATIBLE',
  INVALID_JSON_STRUCTURE: 'INVALID_JSON_STRUCTURE',
} as const;

// ---------------------------------------------------------------------------
// Valid component types (mirrors enums.ts ComponentType)
// ---------------------------------------------------------------------------
const VALID_COMPONENT_TYPES = new Set([
  'SCHOOL_LOGO', 'SCHOOL_NAME', 'SCHOOL_MOTTO', 'SCHOOL_ADDRESS', 'SCHOOL_CONTACT',
  'STUDENT_NAME', 'STUDENT_PHOTO', 'STUDENT_CLASS', 'STUDENT_STREAM', 'STUDENT_NUMBER', 'STUDENT_ATTENDANCE',
  'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY', 'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY',
  'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS',
  'FEES_BALANCE', 'PAYMENT_SUMMARY', 'FEE_STRUCTURE',
  'LINE', 'BORDER', 'RECTANGLE', 'CIRCLE', 'BACKGROUND_IMAGE', 'WATERMARK', 'TEXT_LABEL', 'SIGNATURE_FIELD',
]);

// ---------------------------------------------------------------------------
// ValidationEngine class
// ---------------------------------------------------------------------------

export class ValidationEngine {
  /**
   * Validate a complete template.
   * Runs all sub-validations on all components in all pages and aggregates errors.
   */
  validateTemplate(template: Template): ValidationResult {
    const errors: ValidationError[] = [];

    // Basic structure checks
    if (!template || typeof template !== 'object') {
      errors.push({
        field: 'template',
        message: 'Template must be a valid object',
        code: ERROR_CODES.INVALID_JSON_STRUCTURE,
      });
      return { valid: false, errors };
    }

    if (!template.id || typeof template.id !== 'string') {
      errors.push({ field: 'id', message: 'Template id is required', code: ERROR_CODES.INVALID_JSON_STRUCTURE });
    }

    if (!template.name || typeof template.name !== 'string' || template.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Template name is required', code: ERROR_CODES.INVALID_JSON_STRUCTURE });
    }

    if (!template.category) {
      errors.push({ field: 'category', message: 'Template category is required', code: ERROR_CODES.INVALID_JSON_STRUCTURE });
    }

    if (!template.pageSize) {
      errors.push({ field: 'pageSize', message: 'Template pageSize is required', code: ERROR_CODES.INVALID_JSON_STRUCTURE });
    }

    if (!template.pageOrientation) {
      errors.push({ field: 'pageOrientation', message: 'Template pageOrientation is required', code: ERROR_CODES.INVALID_JSON_STRUCTURE });
    }

    if (!Array.isArray(template.pages) || template.pages.length === 0) {
      errors.push({ field: 'pages', message: 'Template must have at least one page', code: ERROR_CODES.INVALID_JSON_STRUCTURE });
      return { valid: errors.length === 0, errors };
    }

    // Validate all components in all pages
    template.pages.forEach((page, pageIndex) => {
      if (!Array.isArray(page.elements)) return;

      page.elements.forEach((component, compIndex) => {
        const prefix = `pages[${pageIndex}].elements[${compIndex}]`;

        // Component type validation
        const typeResult = this.validateComponent(component, template.category);
        typeResult.errors.forEach((e) =>
          errors.push({ field: `${prefix}.${e.field}`, message: e.message, code: e.code })
        );

        // Layout validation
        const layoutResult = this.validateLayoutProperties(component.layout);
        layoutResult.errors.forEach((e) =>
          errors.push({ field: `${prefix}.layout.${e.field}`, message: e.message, code: e.code })
        );

        // Category compatibility
        const catResult = this.validateCategoryCompatibility(component, template.category);
        catResult.errors.forEach((e) =>
          errors.push({ field: `${prefix}.${e.field}`, message: e.message, code: e.code })
        );
      });
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate a single component: type validity + data binding for dynamic components.
   */
  validateComponent(
    component: TemplateComponent,
    _category: TemplateCategory,
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // 1. Check component type is valid
    if (!component.type || !VALID_COMPONENT_TYPES.has(component.type)) {
      errors.push({
        field: 'type',
        message: `Component type "${String(component.type)}" is not a valid component type`,
        code: ERROR_CODES.INVALID_COMPONENT_TYPE,
      });
      // No point checking data binding if type is invalid
      return { valid: false, errors };
    }

    // 2. Data binding validation for dynamic components
    if (requiresDataBinding(component.type)) {
      if (!component.dataBinding) {
        errors.push({
          field: 'dataBinding',
          message: `Component type "${component.type}" requires a data binding but none was provided`,
          code: ERROR_CODES.MISSING_DATA_BINDING,
        });
      } else {
        const dbResult = this.validateDataBinding(component);
        errors.push(...dbResult.errors);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate data binding on a component using the domain validation layer.
   */
  validateDataBinding(component: TemplateComponent): ValidationResult {
    const errors: ValidationError[] = [];

    if (!component.dataBinding) {
      // No data binding present — only invalid if component requires one
      if (requiresDataBinding(component.type)) {
        errors.push({
          field: 'dataBinding',
          message: `Component type "${component.type}" requires a data binding but none was provided`,
          code: ERROR_CODES.MISSING_DATA_BINDING,
        });
      }
      return { valid: errors.length === 0, errors };
    }

    const result = validateDataBinding(component.dataBinding.field, component.type);
    result.errors.forEach((e) => {
      errors.push({
        field: 'dataBinding.field',
        message: e.message,
        code: ERROR_CODES.INVALID_DATA_BINDING,
      });
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate layout properties: numeric ranges for font, border, padding/margin, rotation.
   */
  validateLayoutProperties(layout: LayoutProperties): ValidationResult {
    const errors: ValidationError[] = [];

    if (!layout) {
      errors.push({
        field: 'layout',
        message: 'Layout properties are required',
        code: ERROR_CODES.LAYOUT_OUT_OF_RANGE,
      });
      return { valid: false, errors };
    }

    // Font size: 6–72pt
    if (layout.font !== undefined && layout.font !== null) {
      const { size } = layout.font;
      if (typeof size !== 'number' || size < 6 || size > 72) {
        errors.push({
          field: 'font.size',
          message: `Font size ${size} is out of range. Must be between 6pt and 72pt`,
          code: ERROR_CODES.LAYOUT_OUT_OF_RANGE,
        });
      }
    }

    // Border width: 0–20px
    if (layout.border !== undefined && layout.border !== null) {
      const { width } = layout.border;
      if (typeof width !== 'number' || width < 0 || width > 20) {
        errors.push({
          field: 'border.width',
          message: `Border width ${width} is out of range. Must be between 0px and 20px`,
          code: ERROR_CODES.LAYOUT_OUT_OF_RANGE,
        });
      }
    }

    // Padding and margin: 0–50px
    if (layout.spacing !== undefined && layout.spacing !== null) {
      const { padding, margin } = layout.spacing;
      if (typeof padding !== 'number' || padding < 0 || padding > 50) {
        errors.push({
          field: 'spacing.padding',
          message: `Padding ${padding} is out of range. Must be between 0px and 50px`,
          code: ERROR_CODES.LAYOUT_OUT_OF_RANGE,
        });
      }
      if (typeof margin !== 'number' || margin < 0 || margin > 50) {
        errors.push({
          field: 'spacing.margin',
          message: `Margin ${margin} is out of range. Must be between 0px and 50px`,
          code: ERROR_CODES.LAYOUT_OUT_OF_RANGE,
        });
      }
    }

    // Rotation: 0–360 degrees
    if (typeof layout.rotation !== 'number' || layout.rotation < 0 || layout.rotation > 360) {
      errors.push({
        field: 'rotation',
        message: `Rotation ${layout.rotation} is out of range. Must be between 0 and 360 degrees`,
        code: ERROR_CODES.LAYOUT_OUT_OF_RANGE,
      });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate that a component's type is allowed for the given template category.
   */
  validateCategoryCompatibility(
    component: TemplateComponent,
    category: TemplateCategory,
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (!VALID_COMPONENT_TYPES.has(component.type)) {
      // Type is invalid — skip category check (handled by validateComponent)
      return { valid: true, errors };
    }

    if (!isComponentAllowedForCategory(category, component.type)) {
      errors.push({
        field: 'type',
        message: `Component type "${component.type}" is not allowed for template category "${category}"`,
        code: ERROR_CODES.CATEGORY_INCOMPATIBLE,
      });
    }

    return { valid: errors.length === 0, errors };
  }
}
