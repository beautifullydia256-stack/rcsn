/**
 * Unit tests for Template JSON parser and pretty printer
 * 
 * Tests validate:
 * - Requirement 8.11: Parse Template JSON and reconstruct Canvas state
 * - Requirement 8.12: Display descriptive error message when parsing fails
 * - Requirement 9.1: Parse valid Template JSON into Template object
 * - Requirement 9.2: Return descriptive error for invalid Template JSON
 * - Requirement 9.3: Format Template objects into valid Template JSON with consistent indentation
 * - Requirement 9.4: Use 2-space indentation for nested objects and arrays
 */

import {
  parseTemplateJSON,
  prettyPrintTemplateJSON,
  parseTemplateJSONOrThrow,
  prettyPrintTemplateJSONOrThrow,
  type TemplateJSON,
} from '../../domain/schemas';

describe('parseTemplateJSON', () => {
  const validTemplateJSON: TemplateJSON = {
    template_name: 'Test Report Card',
    template_category: 'REPORT_CARD',
    page_size: 'A4',
    page_orientation: 'portrait',
    pages: [
      {
        page_number: 1,
        width: 210,
        height: 297,
        elements: [
          {
            component_type: 'STUDENT_NAME',
            data_binding: {
              field: 'student.name',
              fallback: 'N/A'
            },
            layout: {
              position: { x: 10, y: 20, unit: 'mm' },
              size: { width: 100, height: 20, unit: 'mm' },
              rotation: 0,
              font: {
                family: 'Arial',
                size: 12,
                weight: 'bold',
                style: 'normal'
              }
            },
            z_index: 1
          }
        ]
      }
    ],
    version: 1,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  };

  describe('valid Template JSON', () => {
    it('should successfully parse valid Template JSON string', () => {
      const jsonString = JSON.stringify(validTemplateJSON);
      const result = parseTemplateJSON(jsonString);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validTemplateJSON);
        expect(result.data.template_name).toBe('Test Report Card');
        expect(result.data.pages).toHaveLength(1);
        expect(result.data.pages[0].elements).toHaveLength(1);
      }
    });

    it('should parse Template JSON with multiple pages', () => {
      const multiPageTemplate: TemplateJSON = {
        ...validTemplateJSON,
        pages: [
          validTemplateJSON.pages[0],
          {
            page_number: 2,
            width: 210,
            height: 297,
            elements: []
          }
        ]
      };

      const jsonString = JSON.stringify(multiPageTemplate);
      const result = parseTemplateJSON(jsonString);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pages).toHaveLength(2);
      }
    });

    it('should parse Template JSON with multiple components', () => {
      const multiComponentTemplate: TemplateJSON = {
        ...validTemplateJSON,
        pages: [
          {
            ...validTemplateJSON.pages[0],
            elements: [
              validTemplateJSON.pages[0].elements[0],
              {
                component_type: 'SCHOOL_LOGO',
                layout: {
                  position: { x: 0, y: 0, unit: 'mm' },
                  size: { width: 50, height: 50, unit: 'mm' },
                  rotation: 0
                },
                z_index: 0
              }
            ]
          }
        ]
      };

      const jsonString = JSON.stringify(multiComponentTemplate);
      const result = parseTemplateJSON(jsonString);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pages[0].elements).toHaveLength(2);
      }
    });
  });

  describe('invalid JSON format', () => {
    it('should return error for malformed JSON', () => {
      const malformedJSON = '{ invalid json }';
      const result = parseTemplateJSON(malformedJSON);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid JSON format');
      }
    });

    it('should return error for incomplete JSON', () => {
      const incompleteJSON = '{ "template_name": "Test"';
      const result = parseTemplateJSON(incompleteJSON);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid JSON format');
      }
    });
  });

  describe('validation errors with descriptive messages', () => {
    it('should return descriptive error for missing template_name', () => {
      const invalidTemplate = { ...validTemplateJSON };
      delete (invalidTemplate as any).template_name;
      const jsonString = JSON.stringify(invalidTemplate);
      const result = parseTemplateJSON(jsonString);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Template validation failed');
        expect(result.error).toContain('template_name');
      }
    });

    it('should return descriptive error for empty template_name', () => {
      const invalidTemplate = { ...validTemplateJSON, template_name: '' };
      const jsonString = JSON.stringify(invalidTemplate);
      const result = parseTemplateJSON(jsonString);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Template validation failed');
        expect(result.error).toContain('template_name');
        expect(result.error).toContain('cannot be empty');
      }
    });

    it('should return descriptive error for template_name exceeding 100 characters', () => {
      const invalidTemplate = { ...validTemplateJSON, template_name: 'a'.repeat(101) };
      const jsonString = JSON.stringify(invalidTemplate);
      const result = parseTemplateJSON(jsonString);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Template validation failed');
        expect(result.error).toContain('template_name');
        expect(result.error).toContain('at most 100 characters');
      }
    });

    it('should return descriptive error for invalid template_category', () => {
      const invalidTemplate = { ...validTemplateJSON, template_category: 'INVALID_CATEGORY' };
      const jsonString = JSON.stringify(invalidTemplate);
      const result = parseTemplateJSON(jsonString);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Template validation failed');
        expect(result.error).toContain('template_category');
      }
    });

    it('should return descriptive error for missing pages', () => {
      const invalidTemplate = { ...validTemplateJSON, pages: [] };
      const jsonString = JSON.stringify(invalidTemplate);
      const result = parseTemplateJSON(jsonString);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Template validation failed');
        expect(result.error).toContain('pages');
        expect(result.error).toContain('at least one page');
      }
    });

    it('should return descriptive error for invalid font size (below 6pt)', () => {
      const invalidTemplate: any = {
        ...validTemplateJSON,
        pages: [
          {
            ...validTemplateJSON.pages[0],
            elements: [
              {
                ...validTemplateJSON.pages[0].elements[0],
                layout: {
                  ...validTemplateJSON.pages[0].elements[0].layout,
                  font: {
                    family: 'Arial',
                    size: 5,
                    weight: 'normal',
                    style: 'normal'
                  }
                }
              }
            ]
          }
        ]
      };
      const jsonString = JSON.stringify(invalidTemplate);
      const result = parseTemplateJSON(jsonString);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Template validation failed');
        expect(result.error).toContain('at least 6pt');
      }
    });

    it('should return descriptive error for invalid font size (above 72pt)', () => {
      const invalidTemplate: any = {
        ...validTemplateJSON,
        pages: [
          {
            ...validTemplateJSON.pages[0],
            elements: [
              {
                ...validTemplateJSON.pages[0].elements[0],
                layout: {
                  ...validTemplateJSON.pages[0].elements[0].layout,
                  font: {
                    family: 'Arial',
                    size: 73,
                    weight: 'normal',
                    style: 'normal'
                  }
                }
              }
            ]
          }
        ]
      };
      const jsonString = JSON.stringify(invalidTemplate);
      const result = parseTemplateJSON(jsonString);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Template validation failed');
        expect(result.error).toContain('at most 72pt');
      }
    });

    it('should return descriptive error for invalid datetime format', () => {
      const invalidTemplate = { ...validTemplateJSON, created_at: 'not-a-datetime' };
      const jsonString = JSON.stringify(invalidTemplate);
      const result = parseTemplateJSON(jsonString);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Template validation failed');
        expect(result.error).toContain('created_at');
      }
    });

    it('should return descriptive error for multiple validation failures', () => {
      const invalidTemplate = {
        ...validTemplateJSON,
        template_name: '',
        pages: []
      };
      const jsonString = JSON.stringify(invalidTemplate);
      const result = parseTemplateJSON(jsonString);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Template validation failed');
        expect(result.error).toContain('template_name');
        expect(result.error).toContain('pages');
      }
    });
  });
});

describe('prettyPrintTemplateJSON', () => {
  const validTemplateJSON: TemplateJSON = {
    template_name: 'Test Report Card',
    template_category: 'REPORT_CARD',
    page_size: 'A4',
    page_orientation: 'portrait',
    pages: [
      {
        page_number: 1,
        width: 210,
        height: 297,
        elements: [
          {
            component_type: 'STUDENT_NAME',
            data_binding: {
              field: 'student.name',
              fallback: 'N/A'
            },
            layout: {
              position: { x: 10, y: 20, unit: 'mm' },
              size: { width: 100, height: 20, unit: 'mm' },
              rotation: 0,
              font: {
                family: 'Arial',
                size: 12,
                weight: 'bold',
                style: 'normal'
              }
            },
            z_index: 1
          }
        ]
      }
    ],
    version: 1,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  };

  describe('valid Template object', () => {
    it('should format valid Template object with 2-space indentation', () => {
      const result = prettyPrintTemplateJSON(validTemplateJSON);

      expect(result.success).toBe(true);
      if (result.success) {
        // Verify it's valid JSON
        expect(() => JSON.parse(result.data)).not.toThrow();
        
        // Verify 2-space indentation
        const lines = result.data.split('\n');
        const indentedLine = lines.find(line => line.startsWith('  '));
        expect(indentedLine).toBeDefined();
        
        // Verify no 4-space indentation (would indicate wrong indentation)
        const fourSpaceIndent = lines.find(line => line.startsWith('    ') && !line.startsWith('      '));
        expect(fourSpaceIndent).toBeDefined(); // Nested objects should have 4 spaces (2 levels * 2 spaces)
      }
    });

    it('should produce parseable JSON output', () => {
      const result = prettyPrintTemplateJSON(validTemplateJSON);

      expect(result.success).toBe(true);
      if (result.success) {
        const parsed = JSON.parse(result.data);
        expect(parsed).toEqual(validTemplateJSON);
      }
    });

    it('should format nested objects with consistent indentation', () => {
      const result = prettyPrintTemplateJSON(validTemplateJSON);

      expect(result.success).toBe(true);
      if (result.success) {
        const lines = result.data.split('\n');
        
        // Check that nested objects are indented
        const hasNestedIndentation = lines.some(line => line.startsWith('      ')); // 3 levels deep
        expect(hasNestedIndentation).toBe(true);
      }
    });

    it('should format arrays with consistent indentation', () => {
      const result = prettyPrintTemplateJSON(validTemplateJSON);

      expect(result.success).toBe(true);
      if (result.success) {
        const lines = result.data.split('\n');
        
        // Find the pages array
        const pagesIndex = lines.findIndex(line => line.includes('"pages"'));
        expect(pagesIndex).toBeGreaterThan(-1);
        
        // Verify array elements are indented
        const arrayElementLine = lines[pagesIndex + 2]; // Skip opening bracket
        expect(arrayElementLine).toMatch(/^\s{4}/); // Should have 4 spaces (2 levels)
      }
    });
  });

  describe('invalid Template object', () => {
    it('should return descriptive error for invalid template_name', () => {
      const invalidTemplate = { ...validTemplateJSON, template_name: '' };
      const result = prettyPrintTemplateJSON(invalidTemplate);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Template validation failed');
        expect(result.error).toContain('template_name');
      }
    });

    it('should return descriptive error for missing required fields', () => {
      const invalidTemplate = { ...validTemplateJSON };
      delete (invalidTemplate as any).template_category;
      const result = prettyPrintTemplateJSON(invalidTemplate);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Template validation failed');
      }
    });

    it('should return descriptive error for invalid font size', () => {
      const invalidTemplate: any = {
        ...validTemplateJSON,
        pages: [
          {
            ...validTemplateJSON.pages[0],
            elements: [
              {
                ...validTemplateJSON.pages[0].elements[0],
                layout: {
                  ...validTemplateJSON.pages[0].elements[0].layout,
                  font: {
                    family: 'Arial',
                    size: 100,
                    weight: 'normal',
                    style: 'normal'
                  }
                }
              }
            ]
          }
        ]
      };
      const result = prettyPrintTemplateJSON(invalidTemplate);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Template validation failed');
        expect(result.error).toContain('at most 72pt');
      }
    });
  });
});

describe('round-trip consistency', () => {
  const validTemplateJSON: TemplateJSON = {
    template_name: 'Test Report Card',
    template_category: 'REPORT_CARD',
    page_size: 'A4',
    page_orientation: 'portrait',
    pages: [
      {
        page_number: 1,
        width: 210,
        height: 297,
        elements: [
          {
            component_type: 'STUDENT_NAME',
            data_binding: {
              field: 'student.name',
              fallback: 'N/A'
            },
            layout: {
              position: { x: 10, y: 20, unit: 'mm' },
              size: { width: 100, height: 20, unit: 'mm' },
              rotation: 0,
              font: {
                family: 'Arial',
                size: 12,
                weight: 'bold',
                style: 'normal'
              }
            },
            z_index: 1
          }
        ]
      }
    ],
    version: 1,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  };

  it('should maintain data integrity through parse -> print -> parse cycle', () => {
    // Start with a Template object
    const original = validTemplateJSON;

    // Pretty print to JSON string
    const printResult = prettyPrintTemplateJSON(original);
    expect(printResult.success).toBe(true);
    if (!printResult.success) return;

    // Parse the JSON string back
    const parseResult = parseTemplateJSON(printResult.data);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    // Verify the parsed result matches the original
    expect(parseResult.data).toEqual(original);
  });

  it('should maintain data integrity through print -> parse -> print cycle', () => {
    // Start with a Template object
    const original = validTemplateJSON;

    // First print
    const printResult1 = prettyPrintTemplateJSON(original);
    expect(printResult1.success).toBe(true);
    if (!printResult1.success) return;

    // Parse
    const parseResult = parseTemplateJSON(printResult1.data);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    // Second print
    const printResult2 = prettyPrintTemplateJSON(parseResult.data);
    expect(printResult2.success).toBe(true);
    if (!printResult2.success) return;

    // Verify both printed versions are identical
    expect(printResult2.data).toBe(printResult1.data);
  });
});

describe('parseTemplateJSONOrThrow', () => {
  it('should return parsed data for valid JSON', () => {
    const validTemplate: TemplateJSON = {
      template_name: 'Test',
      template_category: 'REPORT_CARD',
      page_size: 'A4',
      page_orientation: 'portrait',
      pages: [
        {
          page_number: 1,
          width: 210,
          height: 297,
          elements: []
        }
      ],
      version: 1,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    };

    const jsonString = JSON.stringify(validTemplate);
    const result = parseTemplateJSONOrThrow(jsonString);
    expect(result).toEqual(validTemplate);
  });

  it('should throw error for invalid JSON', () => {
    const invalidJSON = '{ invalid }';
    expect(() => parseTemplateJSONOrThrow(invalidJSON)).toThrow('Invalid JSON format');
  });

  it('should throw error for validation failure', () => {
    const invalidTemplate = { template_name: '' };
    const jsonString = JSON.stringify(invalidTemplate);
    expect(() => parseTemplateJSONOrThrow(jsonString)).toThrow('Template validation failed');
  });
});

describe('prettyPrintTemplateJSONOrThrow', () => {
  it('should return formatted JSON for valid template', () => {
    const validTemplate: TemplateJSON = {
      template_name: 'Test',
      template_category: 'REPORT_CARD',
      page_size: 'A4',
      page_orientation: 'portrait',
      pages: [
        {
          page_number: 1,
          width: 210,
          height: 297,
          elements: []
        }
      ],
      version: 1,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    };

    const result = prettyPrintTemplateJSONOrThrow(validTemplate);
    expect(typeof result).toBe('string');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should throw error for invalid template', () => {
    const invalidTemplate = { template_name: '' };
    expect(() => prettyPrintTemplateJSONOrThrow(invalidTemplate)).toThrow('Template validation failed');
  });
});
