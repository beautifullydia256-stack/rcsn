/**
 * Visual Template Designer - Custom Error Classes
 *
 * Typed error hierarchy for structured error handling throughout the designer.
 */

import type { ValidationError } from '../validation/ValidationEngine';

/**
 * Thrown when template validation fails on save / import.
 * Carries the full list of validation errors for display.
 */
export class TemplateValidationError extends Error {
  public readonly errors: ValidationError[];

  constructor(message: string, errors: ValidationError[]) {
    super(message);
    this.name = 'TemplateValidationError';
    this.errors = errors;
    // Restore prototype chain (required when extending built-ins in TS)
    Object.setPrototypeOf(this, TemplateValidationError.prototype);
  }
}

/**
 * Thrown when PDF rendering fails.
 * Optionally wraps the underlying cause for logging.
 */
export class PDFRenderError extends Error {
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'PDFRenderError';
    this.cause = cause;
    Object.setPrototypeOf(this, PDFRenderError.prototype);
  }
}

/**
 * Thrown when a data-fetch operation fails.
 * Optionally wraps the underlying cause for logging.
 */
export class DataFetchError extends Error {
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'DataFetchError';
    this.cause = cause;
    Object.setPrototypeOf(this, DataFetchError.prototype);
  }
}

/**
 * Thrown when the user is not authorised to perform an action.
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}
