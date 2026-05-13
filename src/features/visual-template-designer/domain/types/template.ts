/**
 * Visual Template Designer - Template Types
 * 
 * This file defines the core template interfaces that represent the complete
 * structure of a template document. Templates consist of pages, which contain
 * components arranged on a canvas.
 */

import type { TemplateCategory, PageSize, PageOrientation } from './enums';
import type { TemplateComponent } from './component';

/**
 * A single page within a template.
 * Templates can have multiple pages for comprehensive reports.
 */
export interface TemplatePage {
  id: string; // Unique page identifier
  pageNumber: number; // Page number (1-indexed)
  width: number; // Page width in pixels or mm
  height: number; // Page height in pixels or mm
  elements: TemplateComponent[]; // Components on this page
}

/**
 * Complete template definition.
 * Represents a full template document with metadata and pages.
 */
export interface Template {
  id: string; // Unique template identifier
  name: string; // Template name (1-100 characters)
  category: TemplateCategory; // Template category (determines allowed components)
  pageSize: PageSize; // Standard page size or custom
  pageOrientation: PageOrientation; // Portrait or landscape
  pages: TemplatePage[]; // Array of pages (minimum 1 page)
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Last modification timestamp
  createdBy: string; // User ID of creator
  version: number; // Template version number (for versioning)
}
