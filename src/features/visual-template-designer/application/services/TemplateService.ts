/**
 * Visual Template Designer - Template Service
 *
 * Application-layer service for template management: create, duplicate, export,
 * import, search, and versioning. All state is kept in-memory (Maps).
 *
 * Requirements:
 * - 13.1: Create new template
 * - 13.2: Duplicate template
 * - 13.3: Export template to JSON
 * - 13.4: Import template from JSON
 * - 13.5: Search/filter templates
 * - 15.1-15.4: Template versioning (max 20 versions per template)
 */

import type { Template, TemplatePage } from '../../domain/types';
import type { TemplateCategory } from '../../domain/types/enums';
import { parseTemplateJSON, prettyPrintTemplateJSON } from '../../domain/schemas/parser';
import type { TemplateJSON } from '../../domain/schemas/validation';
import { ValidationEngine } from '../validation/ValidationEngine';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: number;
  timestamp: Date;
  administratorId: string;
  templateSnapshot: Template;
}

// ---------------------------------------------------------------------------
// uuid shim: use crypto.randomUUID when available, otherwise fallback
// ---------------------------------------------------------------------------
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Simple RFC-4122 v4 UUID fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// TemplateService
// ---------------------------------------------------------------------------

export class TemplateService {
  private readonly validationEngine = new ValidationEngine();

  /** In-memory store: templateId → TemplateVersion[] (max 20 per template) */
  private readonly versionStore = new Map<string, TemplateVersion[]>();

  /** Maximum number of versions stored per template */
  private static readonly MAX_VERSIONS = 20;

  // -------------------------------------------------------------------------
  // Template lifecycle
  // -------------------------------------------------------------------------

  /**
   * Create a new empty template for the given category and name.
   */
  createTemplate(category: TemplateCategory, name: string): Template {
    const now = new Date();
    const pageId = generateId();
    const defaultPage: TemplatePage = {
      id: pageId,
      pageNumber: 1,
      width: 595,  // A4 at 72 DPI
      height: 842,
      elements: [],
    };

    const template: Template = {
      id: generateId(),
      name,
      category,
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pages: [defaultPage],
      createdAt: now,
      updatedAt: now,
      createdBy: 'current-user',
      version: 1,
    };

    return template;
  }

  /**
   * Duplicate an existing template, giving it a new name, id, and timestamps.
   */
  duplicateTemplate(template: Template, newName: string): Template {
    const now = new Date();

    // Deep-clone pages with new IDs
    const clonedPages: TemplatePage[] = template.pages.map((page) => ({
      ...page,
      id: generateId(),
      elements: page.elements.map((el) => ({ ...el, id: generateId() })),
    }));

    return {
      ...template,
      id: generateId(),
      name: newName,
      pages: clonedPages,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
  }

  /**
   * Export a Template to a JSON string in the canonical Template JSON format.
   * Throws if the template cannot be serialised.
   */
  exportTemplate(template: Template): string {
    const templateJSON = this._toTemplateJSON(template);
    const result = prettyPrintTemplateJSON(templateJSON);

    if (!result.success) {
      throw new Error(`Export failed: ${result.error}`);
    }
    return result.data;
  }

  /**
   * Import a template from a JSON string.
   * Validates structure with the parser and then with ValidationEngine.
   * Throws on any validation error.
   */
  importTemplate(jsonString: string): Template {
    const parseResult = parseTemplateJSON(jsonString);
    if (!parseResult.success) {
      throw new Error(`Import failed: ${parseResult.error}`);
    }

    const template = this._fromTemplateJSON(parseResult.data);

    // Run full validation
    const validationResult = this.validationEngine.validateTemplate(template);
    if (!validationResult.valid) {
      const messages = validationResult.errors.map((e) => `${e.field}: ${e.message}`).join('\n');
      throw new Error(`Imported template is invalid:\n${messages}`);
    }

    return template;
  }

  /**
   * Search templates by name (case-insensitive substring match).
   * Returns templates whose name contains the query string.
   */
  searchTemplates(templates: Template[], query: string): Template[] {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => t.name.toLowerCase().includes(q));
  }

  // -------------------------------------------------------------------------
  // Versioning
  // -------------------------------------------------------------------------

  /**
   * Create a new version snapshot for the given template.
   * Stores up to MAX_VERSIONS (20) per template, dropping the oldest.
   */
  createVersion(template: Template, administratorId: string): TemplateVersion {
    const existing = this.versionStore.get(template.id) ?? [];

    const nextVersionNumber =
      existing.length > 0
        ? Math.max(...existing.map((v) => v.versionNumber)) + 1
        : 1;

    const version: TemplateVersion = {
      id: generateId(),
      templateId: template.id,
      versionNumber: nextVersionNumber,
      timestamp: new Date(),
      administratorId,
      templateSnapshot: { ...template, pages: template.pages.map((p) => ({ ...p, elements: [...p.elements] })) },
    };

    // Keep only the most recent MAX_VERSIONS
    const updated = [...existing, version].slice(-TemplateService.MAX_VERSIONS);
    this.versionStore.set(template.id, updated);

    return version;
  }

  /**
   * Retrieve all versions for a given template ID, sorted by version number ascending.
   */
  getVersions(templateId: string): TemplateVersion[] {
    const versions = this.versionStore.get(templateId) ?? [];
    return [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
  }

  /**
   * Restore a template from a version snapshot.
   * Returns a new Template object with the snapshot content and a fresh updatedAt.
   */
  restoreVersion(version: TemplateVersion): Template {
    return {
      ...version.templateSnapshot,
      updatedAt: new Date(),
    };
  }

  // -------------------------------------------------------------------------
  // Private conversion helpers
  // -------------------------------------------------------------------------

  /**
   * Convert a Template (domain) to TemplateJSON (canonical JSON format).
   */
  private _toTemplateJSON(template: Template): TemplateJSON {
    return {
      template_name: template.name,
      template_category: template.category,
      page_size: template.pageSize,
      page_orientation: template.pageOrientation,
      pages: template.pages.map((page, index) => ({
        page_number: page.pageNumber ?? index + 1,
        width: page.width,
        height: page.height,
        elements: page.elements.map((el) => ({
          component_type: el.type,
          data_binding: el.dataBinding
            ? {
                field: el.dataBinding.field,
                formatter: el.dataBinding.formatter,
                fallback: el.dataBinding.fallback,
              }
            : undefined,
          layout: el.layout,
          z_index: el.zIndex,
          group_id: el.groupId,
        })),
      })),
      version: template.version,
      created_at: template.createdAt instanceof Date
        ? template.createdAt.toISOString()
        : String(template.createdAt),
      updated_at: template.updatedAt instanceof Date
        ? template.updatedAt.toISOString()
        : String(template.updatedAt),
    };
  }

  /**
   * Convert a TemplateJSON (canonical JSON format) back to a Template (domain).
   */
  private _fromTemplateJSON(json: TemplateJSON): Template {
    return {
      id: generateId(),
      name: json.template_name,
      category: json.template_category,
      pageSize: json.page_size,
      pageOrientation: json.page_orientation,
      pages: json.pages.map((page) => ({
        id: generateId(),
        pageNumber: page.page_number,
        width: page.width,
        height: page.height,
        elements: page.elements.map((el) => ({
          id: generateId(),
          type: el.component_type,
          dataBinding: el.data_binding
            ? {
                field: el.data_binding.field,
                formatter: el.data_binding.formatter,
                fallback: el.data_binding.fallback,
              }
            : undefined,
          layout: el.layout,
          zIndex: el.z_index,
          groupId: el.group_id,
        })),
      })),
      createdAt: new Date(json.created_at),
      updatedAt: new Date(json.updated_at),
      createdBy: 'imported',
      version: json.version,
    };
  }
}
