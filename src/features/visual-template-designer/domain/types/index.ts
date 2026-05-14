/**
 * Visual Template Designer - Domain Types Index
 * 
 * Central export point for all domain type definitions.
 * Import types from this file to access all template designer types.
 * 
 * @example
 * ```typescript
 * import type { Template, TemplateComponent, ComponentType } from './domain/types';
 * ```
 */

// Enums
export type {
  TemplateCategory,
  PageSize,
  PageOrientation,
  ComponentType,
  TextAlignment,
  ImageFit,
  FontWeight,
  FontStyle,
  BorderStyle,
  Unit,
} from './enums';

// Layout Properties
export type {
  Position,
  Size,
  FontProperties,
  ColorProperties,
  BorderProperties,
  SpacingProperties,
  LayoutProperties,
} from './layout';

// Component Types
export type {
  DataBinding,
  TableColumnDataKey,
  TableColumn,
  ResultsTableStyle,
  TemplateComponent,
  ResultsTableComponent,
  ComponentGroup,
} from './component';

export { DEFAULT_TABLE_COLUMNS } from './component';

// Template Types
export type {
  TemplatePage,
  Template,
} from './template';
