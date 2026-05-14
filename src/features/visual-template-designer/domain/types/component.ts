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

// ─── Results table column config ─────────────────────────────────────────────

export type TableColumnDataKey = 'name' | 'score' | 'grade' | 'remarks' | 'max';

export interface TableColumn {
  id: string;
  label: string;
  dataKey: TableColumnDataKey;
  widthPercent: number; // percentage of total visible width (visible cols should sum ~100)
  align: 'left' | 'center' | 'right';
  visible: boolean;
}

export const DEFAULT_TABLE_COLUMNS: TableColumn[] = [
  { id: 'c-name',    label: 'Subject', dataKey: 'name',    widthPercent: 35, align: 'left',   visible: true },
  { id: 'c-score',   label: 'Score',   dataKey: 'score',   widthPercent: 20, align: 'center', visible: true },
  { id: 'c-grade',   label: 'Grade',   dataKey: 'grade',   widthPercent: 15, align: 'center', visible: true },
  { id: 'c-remarks', label: 'Remarks', dataKey: 'remarks', widthPercent: 30, align: 'left',   visible: true },
];

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
  // Column structure
  columns?: TableColumn[]; // Column definitions (uses DEFAULT_TABLE_COLUMNS if omitted)
  rowCount?: number; // How many subject rows to display (default: all preview rows)
  showHeader?: boolean; // Whether to render the header row (default: true)
}

/**
 * Base template component interface.
 * All components on the canvas implement this interface.
 */
export interface TemplateComponent {
  id: string; // Unique component identifier
  type: ComponentType; // Component type from predefined list
  content?: string; // Static text content (TEXT_LABEL and similar)
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
