/**
 * Visual Template Designer - Component Types
 * 
 * This file defines interfaces for template components and their related types.
 * Components are the building blocks of templates, representing both dynamic data
 * (from database) and static design elements.
 */

import type { ComponentType } from './enums';
import type { LayoutProperties } from './layout';

/**
 * Data binding connects a dynamic component to a database field.
 * Only predefined database fields are allowed to prevent SQL injection.
 */
export interface DataBinding {
  field: string; // Database field name (must be from predefined list)
  formatter?: string; // Optional formatting function name
  fallback?: string; // Fallback text when data is unavailable
}

/**
 * Styling properties specific to results table components.
 * Controls the appearance of academic results tables.
 */
export interface ResultsTableStyle {
  borderWidth: number; // Table border width in pixels
  borderColor: string; // Table border color (RGB or hex)
  headerBackgroundColor: string; // Header row background color
  headerTextColor: string; // Header row text color
  rowBackgroundColor: string; // Data row background color
  alternatingRowBackgroundColor: string; // Alternating row background color
  cellPadding: number; // Cell padding in pixels
  fontSize: number; // Font size for table content in points
}

/**
 * Base template component interface.
 * All components on the canvas implement this interface.
 */
export interface TemplateComponent {
  id: string; // Unique component identifier
  type: ComponentType; // Component type from predefined list
  dataBinding?: DataBinding; // Data binding (for dynamic components only)
  layout: LayoutProperties; // Visual layout and styling properties
  zIndex: number; // Stacking order (higher values render on top)
  groupId?: string; // Optional group identifier for grouped components
}

/**
 * Results table component with specialized styling.
 * Extends base component with table-specific properties.
 */
export interface ResultsTableComponent extends TemplateComponent {
  type: 'RESULTS_TABLE';
  tableStyle: ResultsTableStyle; // Table-specific styling
}

/**
 * Component group for managing multiple components as a single unit.
 * Grouped components move and transform together.
 */
export interface ComponentGroup {
  id: string; // Unique group identifier
  name: string; // Human-readable group name
  componentIds: string[]; // Array of component IDs in this group
  locked: boolean; // If true, prevents editing of group structure
}
