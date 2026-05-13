/**
 * Visual Template Designer — Public API
 *
 * Re-exports the key entry-points that the rest of the app needs.
 * Internal implementation details stay private to this feature boundary.
 */

// Pages (used by the router)
export { TemplateDesignerPage } from './presentation/pages/TemplateDesignerPage';
export { TemplateListPage } from './presentation/pages/TemplateListPage';

// Root component (useful for embedding in other layouts)
export { TemplateDesigner } from './presentation/components/TemplateDesigner';
export type { TemplateDesignerProps } from './presentation/components/TemplateDesigner';

// Domain types (consumed by other features, e.g. report generation)
export type {
  Template,
  TemplatePage,
  TemplateComponent,
  LayoutProperties,
  DataBinding,
} from './domain/types';

export type {
  TemplateCategory,
  PageSize,
  PageOrientation,
  ComponentType,
} from './domain/types/enums';

// Application services (used by infrastructure / other features)
export { TemplateService } from './application/services/TemplateService';
export { ValidationEngine } from './application/validation/ValidationEngine';
export { PDFRendererService } from './infrastructure/pdf/PDFRendererService';

// Store (for parent-level state access if needed)
export { useTemplateStore } from './application/state/store';
