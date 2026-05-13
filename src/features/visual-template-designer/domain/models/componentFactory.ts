/**
 * Visual Template Designer - Component Factory
 *
 * Provides functions for creating component instances from the library
 * and validating component types.
 */

import type { ComponentType } from '../types/enums';
import type { TemplateComponent } from '../types/component';
import { COMPONENT_METADATA } from './componentMetadata';

/**
 * All valid ComponentType string values, derived from the metadata record keys.
 * Used for runtime validation.
 */
const VALID_COMPONENT_TYPES: ReadonlySet<string> = new Set(
  Object.keys(COMPONENT_METADATA) as ComponentType[]
);

/**
 * Check if an arbitrary string is a valid ComponentType.
 *
 * @param value - The string to check
 * @returns true if value is a recognised ComponentType
 *
 * @example
 * isValidComponentType('SCHOOL_LOGO') // true
 * isValidComponentType('UNKNOWN')     // false
 */
export function isValidComponentType(value: string): value is ComponentType {
  return VALID_COMPONENT_TYPES.has(value);
}

/**
 * Create a new TemplateComponent from a ComponentType using the default
 * properties defined in componentMetadata.
 *
 * The component receives a fresh UUID, a starting zIndex of 1, and
 * layout properties sourced from the metadata defaults.  Any optional
 * layout fields not present in the defaults are omitted so the
 * resulting object satisfies the TemplateComponent interface exactly.
 *
 * @param type - A valid ComponentType
 * @returns A new TemplateComponent ready to be added to a page
 *
 * @example
 * const logo = createComponentFromLibrary('SCHOOL_LOGO');
 * // logo.type === 'SCHOOL_LOGO'
 * // logo.layout.size.width > 0
 */
export function createComponentFromLibrary(type: ComponentType): TemplateComponent {
  const metadata = COMPONENT_METADATA[type];
  const defaults = metadata.defaultProperties;

  const component: TemplateComponent = {
    id: crypto.randomUUID(),
    type,
    zIndex: 1,
    layout: {
      position: defaults.position ?? { x: 50, y: 50, unit: 'px' },
      size: defaults.size ?? { width: 100, height: 50, unit: 'px' },
      rotation: defaults.rotation ?? 0,
      ...(defaults.font !== undefined && { font: defaults.font }),
      ...(defaults.color !== undefined && { color: defaults.color }),
      ...(defaults.border !== undefined && { border: defaults.border }),
      ...(defaults.spacing !== undefined && { spacing: defaults.spacing }),
      ...(defaults.alignment !== undefined && { alignment: defaults.alignment }),
      ...(defaults.imagefit !== undefined && { imagefit: defaults.imagefit }),
    },
    ...(metadata.dataBindingField !== undefined && {
      dataBinding: {
        field: metadata.dataBindingField,
      },
    }),
  };

  return component;
}
