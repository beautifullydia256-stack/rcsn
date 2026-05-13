/**
 * Visual Template Designer - Domain Models Index
 * 
 * Central export point for all domain models.
 * Import models from this file to access component metadata and category restrictions.
 * 
 * @example
 * import { COMPONENT_METADATA, getComponentsForCategory } from '@/features/visual-template-designer/domain/models';
 */

export {
  COMPONENT_METADATA,
  getComponentMetadata,
  getComponentsByCategory,
  getAllComponentCategories,
  type ComponentMetadata,
  type ComponentCategory
} from './componentMetadata';

export {
  CATEGORY_COMPONENT_RESTRICTIONS,
  isComponentAllowedForCategory,
  getComponentsForCategory,
  getCategoriesForComponent,
  validateComponentsForCategory
} from './categoryRestrictions';

export {
  createComponentFromLibrary,
  isValidComponentType,
} from './componentFactory';

export {
  preserveAspectRatio,
  type AspectRatioDimensions,
} from './aspectRatio';

export {
  bringToFront,
  sendToBack,
  bringForward,
  sendBackward,
  getMaxZIndex,
  getMinZIndex,
  normalizeZIndices,
} from './layerManagement';
