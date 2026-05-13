/**
 * Unit tests for Zod validation schemas
 * 
 * These tests verify that the validation schemas correctly validate
 * domain models and enforce the specified constraints.
 */

import { describe, it, expect } from 'vitest';
import {
  PositionSchema,
  SizeSchema,
  FontPropertiesSchema,
  ColorPropertiesSchema,
  BorderPropertiesSchema,
  SpacingPropertiesSchema,
  LayoutPropertiesSchema,
  ComponentTypeSchema,
  DataBindingSchema,
  ComponentJSONSchema,
  PageJSONSchema,
  TemplateJSONSchema,
} from '../../domain/schemas';

describe('PositionSchema', () => {
  it('should accept valid position with px unit', () => {
    const result = PositionSchema.safeParse({
      x: 100,
      y: 200,
      unit: 'px'
    });
    expect(result.success).toBe(true);
  });

  it('should accept negative coordinates', () => {
    const result = PositionSchema.safeParse({
      x: -50,
      y: -100,
      unit: 'mm'
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid unit', () => {
    const result = PositionSchema.safeParse({
      x: 100,
      y: 200,
      unit: 'cm'
    });
    expect(result.success).toBe(false);
  });
});

describe('SizeSchema', () => {
  it('should accept valid size', () => {
    const result = SizeSchema.safeParse({
      width: 100,
      height: 200,
      unit: 'px'
    });
    expect(result.success).toBe(true);
  });

  it('should accept size with aspect ratio locked', () => {
    const result = SizeSchema.safeParse({
      width: 100,
      height: 200,
      unit: 'px',
      aspectRatioLocked: true
    });
    expect(result.success).toBe(true);
  });

  it('should reject zero width', () => {
    const result = SizeSchema.safeParse({
      width: 0,
      height: 200,
      unit: 'px'
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative height', () => {
    const result = SizeSchema.safeParse({
      width: 100,
      height: -50,
      unit: 'px'
    });
    expect(result.success).toBe(false);
  });
});

describe('FontPropertiesSchema', () => {
  it('should accept valid font properties', () => {
    const result = FontPropertiesSchema.safeParse({
      family: 'Arial',
      size: 12,
      weight: 'normal',
      style: 'normal'
    });
    expect(result.success).toBe(true);
  });

  it('should accept font size at minimum boundary (6pt)', () => {
    const result = FontPropertiesSchema.safeParse({
      family: 'Arial',
      size: 6,
      weight: 'bold',
      style: 'italic'
    });
    expect(result.success).toBe(true);
  });

  it('should accept font size at maximum boundary (72pt)', () => {
    const result = FontPropertiesSchema.safeParse({
      family: 'Times New Roman',
      size: 72,
      weight: 'bold',
      style: 'normal'
    });
    expect(result.success).toBe(true);
  });

  it('should reject font size below 6pt', () => {
    const result = FontPropertiesSchema.safeParse({
      family: 'Arial',
      size: 5,
      weight: 'normal',
      style: 'normal'
    });
    expect(result.success).toBe(false);
  });

  it('should reject font size above 72pt', () => {
    const result = FontPropertiesSchema.safeParse({
      family: 'Arial',
      size: 73,
      weight: 'normal',
      style: 'normal'
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty font family', () => {
    const result = FontPropertiesSchema.safeParse({
      family: '',
      size: 12,
      weight: 'normal',
      style: 'normal'
    });
    expect(result.success).toBe(false);
  });
});

describe('ColorPropertiesSchema', () => {
  it('should accept valid hex color', () => {
    const result = ColorPropertiesSchema.safeParse({
      text: '#FF0000',
      background: '#00FF00'
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid RGB color', () => {
    const result = ColorPropertiesSchema.safeParse({
      text: 'rgb(255, 0, 0)',
      background: 'rgb(0, 255, 0)'
    });
    expect(result.success).toBe(true);
  });

  it('should accept lowercase hex color', () => {
    const result = ColorPropertiesSchema.safeParse({
      text: '#ff0000'
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional colors', () => {
    const result = ColorPropertiesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject invalid hex color format', () => {
    const result = ColorPropertiesSchema.safeParse({
      text: '#FFF'
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid RGB color format', () => {
    const result = ColorPropertiesSchema.safeParse({
      text: 'rgb(255, 0)'
    });
    expect(result.success).toBe(false);
  });
});

describe('BorderPropertiesSchema', () => {
  it('should accept valid border properties', () => {
    const result = BorderPropertiesSchema.safeParse({
      width: 2,
      color: '#000000',
      style: 'solid'
    });
    expect(result.success).toBe(true);
  });

  it('should accept border width at minimum boundary (0px)', () => {
    const result = BorderPropertiesSchema.safeParse({
      width: 0,
      color: '#000000',
      style: 'dashed'
    });
    expect(result.success).toBe(true);
  });

  it('should accept border width at maximum boundary (20px)', () => {
    const result = BorderPropertiesSchema.safeParse({
      width: 20,
      color: '#000000',
      style: 'dotted'
    });
    expect(result.success).toBe(true);
  });

  it('should reject border width below 0px', () => {
    const result = BorderPropertiesSchema.safeParse({
      width: -1,
      color: '#000000',
      style: 'solid'
    });
    expect(result.success).toBe(false);
  });

  it('should reject border width above 20px', () => {
    const result = BorderPropertiesSchema.safeParse({
      width: 21,
      color: '#000000',
      style: 'solid'
    });
    expect(result.success).toBe(false);
  });
});

describe('SpacingPropertiesSchema', () => {
  it('should accept valid spacing properties', () => {
    const result = SpacingPropertiesSchema.safeParse({
      padding: 10,
      margin: 20
    });
    expect(result.success).toBe(true);
  });

  it('should accept padding at minimum boundary (0px)', () => {
    const result = SpacingPropertiesSchema.safeParse({
      padding: 0,
      margin: 10
    });
    expect(result.success).toBe(true);
  });

  it('should accept padding at maximum boundary (50px)', () => {
    const result = SpacingPropertiesSchema.safeParse({
      padding: 50,
      margin: 10
    });
    expect(result.success).toBe(true);
  });

  it('should accept margin at minimum boundary (0px)', () => {
    const result = SpacingPropertiesSchema.safeParse({
      padding: 10,
      margin: 0
    });
    expect(result.success).toBe(true);
  });

  it('should accept margin at maximum boundary (50px)', () => {
    const result = SpacingPropertiesSchema.safeParse({
      padding: 10,
      margin: 50
    });
    expect(result.success).toBe(true);
  });

  it('should reject padding below 0px', () => {
    const result = SpacingPropertiesSchema.safeParse({
      padding: -1,
      margin: 10
    });
    expect(result.success).toBe(false);
  });

  it('should reject padding above 50px', () => {
    const result = SpacingPropertiesSchema.safeParse({
      padding: 51,
      margin: 10
    });
    expect(result.success).toBe(false);
  });

  it('should reject margin below 0px', () => {
    const result = SpacingPropertiesSchema.safeParse({
      padding: 10,
      margin: -1
    });
    expect(result.success).toBe(false);
  });

  it('should reject margin above 50px', () => {
    const result = SpacingPropertiesSchema.safeParse({
      padding: 10,
      margin: 51
    });
    expect(result.success).toBe(false);
  });
});

describe('LayoutPropertiesSchema', () => {
  it('should accept valid layout properties', () => {
    const result = LayoutPropertiesSchema.safeParse({
      position: { x: 100, y: 200, unit: 'px' },
      size: { width: 300, height: 400, unit: 'px' },
      rotation: 45
    });
    expect(result.success).toBe(true);
  });

  it('should accept layout with all optional properties', () => {
    const result = LayoutPropertiesSchema.safeParse({
      position: { x: 100, y: 200, unit: 'px' },
      size: { width: 300, height: 400, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 12, weight: 'normal', style: 'normal' },
      color: { text: '#000000', background: '#FFFFFF' },
      border: { width: 1, color: '#000000', style: 'solid' },
      spacing: { padding: 10, margin: 20 },
      alignment: 'center',
      imagefit: 'contain'
    });
    expect(result.success).toBe(true);
  });

  it('should accept rotation at minimum boundary (0 degrees)', () => {
    const result = LayoutPropertiesSchema.safeParse({
      position: { x: 0, y: 0, unit: 'px' },
      size: { width: 100, height: 100, unit: 'px' },
      rotation: 0
    });
    expect(result.success).toBe(true);
  });

  it('should accept rotation at maximum boundary (360 degrees)', () => {
    const result = LayoutPropertiesSchema.safeParse({
      position: { x: 0, y: 0, unit: 'px' },
      size: { width: 100, height: 100, unit: 'px' },
      rotation: 360
    });
    expect(result.success).toBe(true);
  });

  it('should reject rotation below 0 degrees', () => {
    const result = LayoutPropertiesSchema.safeParse({
      position: { x: 0, y: 0, unit: 'px' },
      size: { width: 100, height: 100, unit: 'px' },
      rotation: -1
    });
    expect(result.success).toBe(false);
  });

  it('should reject rotation above 360 degrees', () => {
    const result = LayoutPropertiesSchema.safeParse({
      position: { x: 0, y: 0, unit: 'px' },
      size: { width: 100, height: 100, unit: 'px' },
      rotation: 361
    });
    expect(result.success).toBe(false);
  });
});

describe('ComponentTypeSchema', () => {
  it('should accept valid school info component type', () => {
    const result = ComponentTypeSchema.safeParse('SCHOOL_LOGO');
    expect(result.success).toBe(true);
  });

  it('should accept valid student info component type', () => {
    const result = ComponentTypeSchema.safeParse('STUDENT_NAME');
    expect(result.success).toBe(true);
  });

  it('should accept valid academic component type', () => {
    const result = ComponentTypeSchema.safeParse('RESULTS_TABLE');
    expect(result.success).toBe(true);
  });

  it('should accept valid financial component type', () => {
    const result = ComponentTypeSchema.safeParse('FEES_BALANCE');
    expect(result.success).toBe(true);
  });

  it('should accept valid static component type', () => {
    const result = ComponentTypeSchema.safeParse('TEXT_LABEL');
    expect(result.success).toBe(true);
  });

  it('should reject invalid component type', () => {
    const result = ComponentTypeSchema.safeParse('INVALID_COMPONENT');
    expect(result.success).toBe(false);
  });
});

describe('DataBindingSchema', () => {
  it('should accept valid data binding', () => {
    const result = DataBindingSchema.safeParse({
      field: 'student_name'
    });
    expect(result.success).toBe(true);
  });

  it('should accept data binding with formatter', () => {
    const result = DataBindingSchema.safeParse({
      field: 'student_name',
      formatter: 'uppercase'
    });
    expect(result.success).toBe(true);
  });

  it('should accept data binding with fallback', () => {
    const result = DataBindingSchema.safeParse({
      field: 'student_name',
      fallback: 'N/A'
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty field name', () => {
    const result = DataBindingSchema.safeParse({
      field: ''
    });
    expect(result.success).toBe(false);
  });
});

describe('ComponentJSONSchema', () => {
  it('should accept valid component JSON', () => {
    const result = ComponentJSONSchema.safeParse({
      component_type: 'TEXT_LABEL',
      layout: {
        position: { x: 100, y: 200, unit: 'px' },
        size: { width: 300, height: 50, unit: 'px' },
        rotation: 0
      },
      z_index: 1
    });
    expect(result.success).toBe(true);
  });

  it('should accept component with data binding', () => {
    const result = ComponentJSONSchema.safeParse({
      component_type: 'STUDENT_NAME',
      data_binding: {
        field: 'student_name',
        fallback: 'N/A'
      },
      layout: {
        position: { x: 100, y: 200, unit: 'px' },
        size: { width: 300, height: 50, unit: 'px' },
        rotation: 0
      },
      z_index: 2
    });
    expect(result.success).toBe(true);
  });

  it('should accept component with group ID', () => {
    const result = ComponentJSONSchema.safeParse({
      component_type: 'TEXT_LABEL',
      layout: {
        position: { x: 100, y: 200, unit: 'px' },
        size: { width: 300, height: 50, unit: 'px' },
        rotation: 0
      },
      z_index: 1,
      group_id: 'group-123'
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-integer z-index', () => {
    const result = ComponentJSONSchema.safeParse({
      component_type: 'TEXT_LABEL',
      layout: {
        position: { x: 100, y: 200, unit: 'px' },
        size: { width: 300, height: 50, unit: 'px' },
        rotation: 0
      },
      z_index: 1.5
    });
    expect(result.success).toBe(false);
  });
});

describe('PageJSONSchema', () => {
  it('should accept valid page JSON', () => {
    const result = PageJSONSchema.safeParse({
      page_number: 1,
      width: 595,
      height: 842,
      elements: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept page with components', () => {
    const result = PageJSONSchema.safeParse({
      page_number: 1,
      width: 595,
      height: 842,
      elements: [
        {
          component_type: 'TEXT_LABEL',
          layout: {
            position: { x: 100, y: 200, unit: 'px' },
            size: { width: 300, height: 50, unit: 'px' },
            rotation: 0
          },
          z_index: 1
        }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-positive page number', () => {
    const result = PageJSONSchema.safeParse({
      page_number: 0,
      width: 595,
      height: 842,
      elements: []
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-positive width', () => {
    const result = PageJSONSchema.safeParse({
      page_number: 1,
      width: 0,
      height: 842,
      elements: []
    });
    expect(result.success).toBe(false);
  });
});

describe('TemplateJSONSchema', () => {
  it('should accept valid template JSON', () => {
    const result = TemplateJSONSchema.safeParse({
      template_name: 'Test Template',
      template_category: 'REPORT_CARD',
      page_size: 'A4',
      page_orientation: 'portrait',
      pages: [
        {
          page_number: 1,
          width: 595,
          height: 842,
          elements: []
        }
      ],
      version: 1,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty template name', () => {
    const result = TemplateJSONSchema.safeParse({
      template_name: '',
      template_category: 'REPORT_CARD',
      page_size: 'A4',
      page_orientation: 'portrait',
      pages: [
        {
          page_number: 1,
          width: 595,
          height: 842,
          elements: []
        }
      ],
      version: 1,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    });
    expect(result.success).toBe(false);
  });

  it('should reject template name longer than 100 characters', () => {
    const result = TemplateJSONSchema.safeParse({
      template_name: 'a'.repeat(101),
      template_category: 'REPORT_CARD',
      page_size: 'A4',
      page_orientation: 'portrait',
      pages: [
        {
          page_number: 1,
          width: 595,
          height: 842,
          elements: []
        }
      ],
      version: 1,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    });
    expect(result.success).toBe(false);
  });

  it('should reject template with no pages', () => {
    const result = TemplateJSONSchema.safeParse({
      template_name: 'Test Template',
      template_category: 'REPORT_CARD',
      page_size: 'A4',
      page_orientation: 'portrait',
      pages: [],
      version: 1,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid datetime format', () => {
    const result = TemplateJSONSchema.safeParse({
      template_name: 'Test Template',
      template_category: 'REPORT_CARD',
      page_size: 'A4',
      page_orientation: 'portrait',
      pages: [
        {
          page_number: 1,
          width: 595,
          height: 842,
          elements: []
        }
      ],
      version: 1,
      created_at: 'invalid-date',
      updated_at: '2024-01-01T00:00:00.000Z'
    });
    expect(result.success).toBe(false);
  });
});
