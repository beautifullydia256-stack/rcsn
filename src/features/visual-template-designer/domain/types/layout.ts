/**
 * Visual Template Designer - Layout Properties
 * 
 * This file defines interfaces for layout and styling properties of template components.
 * These properties control the visual appearance and positioning of components on the canvas.
 */

import type {
  Unit,
  TextAlignment,
  ImageFit,
  FontWeight,
  FontStyle,
  BorderStyle,
} from './enums';

/**
 * Position defines the x,y coordinates of a component on the canvas.
 * Coordinates can be specified in pixels, millimeters, or inches.
 */
export interface Position {
  x: number; // Horizontal position
  y: number; // Vertical position
  unit: Unit; // Unit of measurement
}

/**
 * Size defines the width and height of a component.
 * Optionally supports aspect ratio locking for proportional resizing.
 */
export interface Size {
  width: number; // Component width
  height: number; // Component height
  unit: Unit; // Unit of measurement
  aspectRatioLocked?: boolean; // If true, maintains aspect ratio during resize
}

/**
 * Font properties for text-based components.
 * Font size is constrained to 6-72pt range.
 */
export interface FontProperties {
  family: string; // Font family name (e.g., 'Arial', 'Times New Roman')
  size: number; // Font size in points (6-72pt)
  weight: FontWeight; // Font weight (normal or bold)
  style: FontStyle; // Font style (normal or italic)
}

/**
 * Color properties for components.
 * Colors can be specified as RGB or hex values.
 */
export interface ColorProperties {
  text?: string; // Text color (RGB or hex, e.g., '#000000' or 'rgb(0,0,0)')
  background?: string; // Background color (RGB or hex)
}

/**
 * Border properties for components.
 * Border width is constrained to 0-20px range.
 */
export interface BorderProperties {
  width: number; // Border width in pixels (0-20px)
  color: string; // Border color (RGB or hex)
  style: BorderStyle; // Border style (solid, dashed, or dotted)
}

/**
 * Spacing properties for components.
 * Padding and margin are constrained to 0-50px range.
 */
export interface SpacingProperties {
  padding: number; // Inner spacing in pixels (0-50px)
  margin: number; // Outer spacing in pixels (0-50px)
}

/**
 * Complete layout properties for a component.
 * Combines position, size, rotation, and all styling properties.
 */
export interface LayoutProperties {
  position: Position; // Component position on canvas
  size: Size; // Component dimensions
  rotation: number; // Rotation angle in degrees (0-360)
  font?: FontProperties; // Font properties (for text-based components)
  color?: ColorProperties; // Color properties
  border?: BorderProperties; // Border properties
  spacing?: SpacingProperties; // Padding and margin
  alignment?: TextAlignment; // Text alignment (for text-based components)
  imagefit?: ImageFit; // Image fit mode (for image components)
}
