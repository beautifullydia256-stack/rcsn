/**
 * Property-Based Test: Data Binding Validation
 * 
 * Feature: visual-template-designer
 * Property 20: Component data binding validation
 * 
 * **Validates: Requirements 14.3, 14.4, 16.1, 16.6**
 * 
 * Property Definition:
 * For any dynamic component and any data binding value, the binding SHALL be 
 * accepted if and only if it appears in the predefined list of valid bindings 
 * for that component type.
 * 
 * This test verifies that:
 * 1. Valid bindings always pass validation
 * 2. Invalid bindings always fail validation
 * 3. SQL injection patterns are always detected
 * 4. Type mismatches are always detected
 * 5. Static components correctly reject data bindings
 * 6. Dynamic components require data bindings
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { propertyTestParams } from './fast-check.config';
import {
  validateDataBinding,
  validateComponentHasDataBinding,
  fieldExistsInSchema,
  isFieldValidForComponent,
  isTypeCompatible,
  containsSQLInjectionPattern,
  getValidBindingsForComponent,
  requiresDataBinding,
  DATA_SOURCE_SCHEMA,
  COMPONENT_VALID_BINDINGS,
  type DataFieldSchema
} from '../../domain/validation/dataBindingValidation';
import type { ComponentType } from '../../domain/types/enums';

/**
 * Arbitrary generator for ComponentType
 * Generates all valid component types
 */
const arbComponentType = (): fc.Arbitrary<ComponentType> =>
  fc.constantFrom<ComponentType>(
    // School Info Components
    'SCHOOL_LOGO',
    'SCHOOL_NAME',
    'SCHOOL_MOTTO',
    'SCHOOL_ADDRESS',
    'SCHOOL_CONTACT',
    // Student Info Components
    'STUDENT_NAME',
    'STUDENT_PHOTO',
    'STUDENT_CLASS',
    'STUDENT_STREAM',
    'STUDENT_NUMBER',
    'STUDENT_ATTENDANCE',
    // Academic Components
    'RESULTS_TABLE',
    'SUBJECT_SCORES',
    'GRADE_DISPLAY',
    'AGGREGATE_DISPLAY',
    'DIVISION_DISPLAY',
    'TEACHER_REMARKS',
    'HEAD_TEACHER_COMMENTS',
    // Financial Components
    'FEES_BALANCE',
    'PAYMENT_SUMMARY',
    'FEE_STRUCTURE',
    // Static Components
    'LINE',
    'BORDER',
    'RECTANGLE',
    'CIRCLE',
    'BACKGROUND_IMAGE',
    'WATERMARK',
    'TEXT_LABEL',
    'SIGNATURE_FIELD'
  );

/**
 * Arbitrary generator for dynamic ComponentType (components that require data bindings)
 * Excludes static components
 */
const arbDynamicComponentType = (): fc.Arbitrary<ComponentType> =>
  fc.constantFrom<ComponentType>(
    // School Info Components
    'SCHOOL_LOGO',
    'SCHOOL_NAME',
    'SCHOOL_MOTTO',
    'SCHOOL_ADDRESS',
    'SCHOOL_CONTACT',
    // Student Info Components
    'STUDENT_NAME',
    'STUDENT_PHOTO',
    'STUDENT_CLASS',
    'STUDENT_STREAM',
    'STUDENT_NUMBER',
    'STUDENT_ATTENDANCE',
    // Academic Components
    'RESULTS_TABLE',
    'SUBJECT_SCORES',
    'GRADE_DISPLAY',
    'AGGREGATE_DISPLAY',
    'DIVISION_DISPLAY',
    'TEACHER_REMARKS',
    'HEAD_TEACHER_COMMENTS',
    // Financial Components
    'FEES_BALANCE',
    'PAYMENT_SUMMARY',
    'FEE_STRUCTURE'
  );

/**
 * Arbitrary generator for static ComponentType (components that don't have data bindings)
 */
const arbStaticComponentType = (): fc.Arbitrary<ComponentType> =>
  fc.constantFrom<ComponentType>(
    'LINE',
    'BORDER',
    'RECTANGLE',
    'CIRCLE',
    'BACKGROUND_IMAGE',
    'WATERMARK',
    'TEXT_LABEL',
    'SIGNATURE_FIELD'
  );

/**
 * Arbitrary generator for valid field names from the schema
 */
const arbValidField = (): fc.Arbitrary<string> =>
  fc.constantFrom(...Object.keys(DATA_SOURCE_SCHEMA));

/**
 * Arbitrary generator for valid binding for a specific component type
 */
const arbValidBindingForComponent = (componentType: ComponentType): fc.Arbitrary<string> => {
  const validBindings = COMPONENT_VALID_BINDINGS[componentType];
  if (validBindings.length === 0) {
    // For static components, return an arbitrary string (should fail validation)
    return fc.string();
  }
  return fc.constantFrom(...validBindings);
};

/**
 * Arbitrary generator for invalid field names (not in schema)
 */
const arbInvalidField = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.string().filter(s => !(s in DATA_SOURCE_SCHEMA)),
    fc.constant('invalid.field'),
    fc.constant('nonexistent.data'),
    fc.constant('custom_field'),
    fc.constant('user.password')
  );

/**
 * Arbitrary generator for SQL injection patterns
 */
const arbSQLInjectionPattern = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant('SELECT * FROM users'),
    fc.constant('student.name; DROP TABLE students'),
    fc.constant('student.name OR 1=1'),
    fc.constant('student.name AND 1=1'),
    fc.constant('student.name UNION SELECT password'),
    fc.constant('student.name--'),
    fc.constant('student.name/*comment*/'),
    fc.constant('student.name\' OR \'1\'=\'1'),
    fc.constant('INSERT INTO users VALUES'),
    fc.constant('UPDATE students SET'),
    fc.constant('DELETE FROM students'),
    fc.constant('CREATE TABLE malicious'),
    fc.constant('ALTER TABLE students'),
    fc.constant('EXEC sp_executesql')
  );

describe('Property 20: Data Binding Validation Correctness', () => {
  describe('Valid bindings always pass validation', () => {
    it('should accept all valid bindings for dynamic components', () => {
      fc.assert(
        fc.property(
          arbDynamicComponentType(),
          (componentType) => {
            const validBindings = COMPONENT_VALID_BINDINGS[componentType];
            
            // Test each valid binding for this component type
            return validBindings.every(field => {
              const result = validateDataBinding(field, componentType);
              return result.valid && result.errors.length === 0;
            });
          }
        ),
        propertyTestParams()
      );
    });

    it('should accept valid bindings with correct type compatibility', () => {
      fc.assert(
        fc.property(
          arbDynamicComponentType(),
          (componentType) => {
            const validBindings = getValidBindingsForComponent(componentType);
            
            // All valid bindings should pass validation
            return validBindings.every(fieldSchema => {
              const result = validateDataBinding(fieldSchema.field, componentType);
              return result.valid;
            });
          }
        ),
        propertyTestParams()
      );
    });

    it('should consistently validate the same binding for the same component', () => {
      fc.assert(
        fc.property(
          arbDynamicComponentType(),
          (componentType) => {
            const validBindings = COMPONENT_VALID_BINDINGS[componentType];
            if (validBindings.length === 0) return true;
            
            const field = validBindings[0];
            const result1 = validateDataBinding(field, componentType);
            const result2 = validateDataBinding(field, componentType);
            
            // Same input should produce same output
            return result1.valid === result2.valid &&
                   result1.errors.length === result2.errors.length;
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('Invalid bindings always fail validation', () => {
    it('should reject fields not in the schema', () => {
      fc.assert(
        fc.property(
          arbInvalidField(),
          arbComponentType(),
          (field, componentType) => {
            // Skip if field happens to be in schema
            if (fieldExistsInSchema(field)) return true;
            
            const result = validateDataBinding(field, componentType);
            
            // Should fail validation
            return !result.valid && result.errors.length > 0;
          }
        ),
        propertyTestParams()
      );
    });

    it('should reject fields not valid for the component type', () => {
      fc.assert(
        fc.property(
          arbValidField(),
          arbDynamicComponentType(),
          (field, componentType) => {
            // Skip if field is valid for this component
            if (isFieldValidForComponent(field, componentType)) return true;
            
            const result = validateDataBinding(field, componentType);
            
            // Should fail validation with appropriate error
            const hasFieldNotValidError = result.errors.some(
              error => error.code === 'FIELD_NOT_VALID_FOR_COMPONENT'
            );
            
            return !result.valid && hasFieldNotValidError;
          }
        ),
        propertyTestParams()
      );
    });

    it('should reject bindings for static components', () => {
      fc.assert(
        fc.property(
          arbValidField(),
          arbStaticComponentType(),
          (field, componentType) => {
            const result = validateDataBinding(field, componentType);
            
            // Static components should reject all bindings
            return !result.valid && result.errors.length > 0;
          }
        ),
        propertyTestParams()
      );
    });

    it('should detect when required bindings are missing', () => {
      fc.assert(
        fc.property(
          arbDynamicComponentType(),
          (componentType) => {
            const result = validateComponentHasDataBinding(componentType, undefined);
            
            // Dynamic components require data bindings
            return !result.valid && 
                   result.errors.some(error => error.code === 'MISSING_DATA_BINDING');
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('SQL injection patterns are always detected', () => {
    it('should detect SQL injection patterns in field names', () => {
      fc.assert(
        fc.property(
          arbSQLInjectionPattern(),
          arbComponentType(),
          (field, componentType) => {
            const result = validateDataBinding(field, componentType);
            
            // Should detect SQL injection
            const hasSQLInjectionError = result.errors.some(
              error => error.code === 'SQL_INJECTION_PATTERN'
            );
            
            return !result.valid && hasSQLInjectionError;
          }
        ),
        propertyTestParams()
      );
    });

    it('should detect SQL keywords in various cases', () => {
      const sqlKeywords = ['SELECT', 'select', 'SeLeCt', 'INSERT', 'UPDATE', 'DELETE', 'DROP'];
      
      sqlKeywords.forEach(keyword => {
        fc.assert(
          fc.property(
            arbComponentType(),
            (componentType) => {
              const field = `student.name ${keyword} something`;
              const detected = containsSQLInjectionPattern(field);
              
              return detected === true;
            }
          ),
          propertyTestParams()
        );
      });
    });

    it('should detect SQL comment patterns', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('field--comment'),
            fc.constant('field/*comment*/'),
            fc.constant('field;')
          ),
          arbComponentType(),
          (field, componentType) => {
            const detected = containsSQLInjectionPattern(field);
            return detected === true;
          }
        ),
        propertyTestParams()
      );
    });

    it('should detect OR/AND-based injection patterns', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('field OR 1=1'),
            fc.constant('field AND 1=1'),
            fc.constant("field' OR '1'='1"),
            fc.constant('field" OR "1"="1')
          ),
          arbComponentType(),
          (field, componentType) => {
            const detected = containsSQLInjectionPattern(field);
            return detected === true;
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('Type compatibility is always validated', () => {
    it('should validate type compatibility for all valid bindings', () => {
      fc.assert(
        fc.property(
          arbDynamicComponentType(),
          (componentType) => {
            const validBindings = COMPONENT_VALID_BINDINGS[componentType];
            
            // All valid bindings should be type-compatible
            return validBindings.every(field => {
              return isTypeCompatible(field, componentType);
            });
          }
        ),
        propertyTestParams()
      );
    });

    it('should reject type-incompatible bindings', () => {
      // Test specific known incompatibilities
      const incompatiblePairs: Array<[string, ComponentType]> = [
        ['student.full_name', 'STUDENT_PHOTO'], // string field for image component
        ['student.photo_url', 'STUDENT_NAME'],  // url field for text component
        ['student.results', 'STUDENT_NAME'],    // array field for text component
        ['student.fees_balance', 'STUDENT_PHOTO'], // number field for image component
      ];
      
      incompatiblePairs.forEach(([field, componentType]) => {
        const result = validateDataBinding(field, componentType);
        
        // Should fail due to type incompatibility or field not valid for component
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Component binding requirements', () => {
    it('should correctly identify components that require data bindings', () => {
      fc.assert(
        fc.property(
          arbDynamicComponentType(),
          (componentType) => {
            const requires = requiresDataBinding(componentType);
            const validBindings = COMPONENT_VALID_BINDINGS[componentType];
            
            // Dynamic components should require bindings (have valid bindings available)
            return requires === (validBindings.length > 0);
          }
        ),
        propertyTestParams()
      );
    });

    it('should correctly identify static components that do not require bindings', () => {
      fc.assert(
        fc.property(
          arbStaticComponentType(),
          (componentType) => {
            const requires = requiresDataBinding(componentType);
            const validBindings = COMPONENT_VALID_BINDINGS[componentType];
            
            // Static components should not require bindings
            return !requires && validBindings.length === 0;
          }
        ),
        propertyTestParams()
      );
    });

    it('should accept static components without data bindings', () => {
      fc.assert(
        fc.property(
          arbStaticComponentType(),
          (componentType) => {
            const result = validateComponentHasDataBinding(componentType, undefined);
            
            // Static components should pass validation without bindings
            return result.valid && result.errors.length === 0;
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('Validation result structure', () => {
    it('should return consistent result structure for all inputs', () => {
      fc.assert(
        fc.property(
          fc.string(),
          arbComponentType(),
          (field, componentType) => {
            const result = validateDataBinding(field, componentType);
            
            // Result should always have valid and errors properties
            return typeof result.valid === 'boolean' &&
                   Array.isArray(result.errors) &&
                   result.errors.every(error => 
                     typeof error.message === 'string' &&
                     typeof error.code === 'string' &&
                     typeof error.field === 'string' &&
                     typeof error.componentType === 'string'
                   );
          }
        ),
        propertyTestParams()
      );
    });

    it('should have valid=true if and only if errors array is empty', () => {
      fc.assert(
        fc.property(
          fc.string(),
          arbComponentType(),
          (field, componentType) => {
            const result = validateDataBinding(field, componentType);
            
            // valid should be true iff errors is empty
            return result.valid === (result.errors.length === 0);
          }
        ),
        propertyTestParams()
      );
    });

    it('should provide descriptive error codes for all error types', () => {
      const validErrorCodes = [
        'SQL_INJECTION_PATTERN',
        'FIELD_NOT_IN_SCHEMA',
        'FIELD_NOT_VALID_FOR_COMPONENT',
        'TYPE_INCOMPATIBLE',
        'MISSING_DATA_BINDING'
      ];
      
      fc.assert(
        fc.property(
          fc.string(),
          arbComponentType(),
          (field, componentType) => {
            const result = validateDataBinding(field, componentType);
            
            // All error codes should be from the valid set
            return result.errors.every(error =>
              validErrorCodes.includes(error.code)
            );
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('Schema completeness', () => {
    it('should have valid bindings defined for all dynamic components', () => {
      fc.assert(
        fc.property(
          arbDynamicComponentType(),
          (componentType) => {
            const validBindings = COMPONENT_VALID_BINDINGS[componentType];
            
            // Dynamic components should have at least one valid binding
            return validBindings.length > 0;
          }
        ),
        propertyTestParams()
      );
    });

    it('should have all valid bindings present in the schema', () => {
      fc.assert(
        fc.property(
          arbComponentType(),
          (componentType) => {
            const validBindings = COMPONENT_VALID_BINDINGS[componentType];
            
            // All valid bindings should exist in the schema
            return validBindings.every(field => fieldExistsInSchema(field));
          }
        ),
        propertyTestParams()
      );
    });

    it('should return valid field schemas for all component types', () => {
      fc.assert(
        fc.property(
          arbDynamicComponentType(),
          (componentType) => {
            const schemas = getValidBindingsForComponent(componentType);
            
            // All returned schemas should be valid
            return schemas.every(schema =>
              schema.field &&
              schema.type &&
              schema.description &&
              fieldExistsInSchema(schema.field)
            );
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle empty string field names', () => {
      fc.assert(
        fc.property(
          arbComponentType(),
          (componentType) => {
            const result = validateDataBinding('', componentType);
            
            // Empty string should fail validation
            return !result.valid && result.errors.length > 0;
          }
        ),
        propertyTestParams()
      );
    });

    it('should handle whitespace-only field names', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 }).map(arr => arr.join('')),
          arbComponentType(),
          (field, componentType) => {
            if (field.length === 0) return true; // Skip empty strings
            
            const result = validateDataBinding(field, componentType);
            
            // Whitespace-only should fail validation
            return !result.valid && result.errors.length > 0;
          }
        ),
        propertyTestParams()
      );
    });

    it('should handle very long field names', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 100, maxLength: 1000 }),
          arbComponentType(),
          (field, componentType) => {
            const result = validateDataBinding(field, componentType);
            
            // Should return a valid result structure (pass or fail)
            return typeof result.valid === 'boolean' &&
                   Array.isArray(result.errors);
          }
        ),
        propertyTestParams()
      );
    });

    it('should handle special characters in field names', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => /[!@#$%^&*()+=\[\]{}|\\:;"'<>?,/]/.test(s)),
          arbComponentType(),
          (field, componentType) => {
            const result = validateDataBinding(field, componentType);
            
            // Should return a valid result structure
            return typeof result.valid === 'boolean' &&
                   Array.isArray(result.errors);
          }
        ),
        propertyTestParams()
      );
    });
  });

  describe('Comprehensive validation scenarios', () => {
    it('should validate complete component-binding pairs correctly', () => {
      // Test all dynamic components with their valid bindings
      const dynamicComponents: ComponentType[] = [
        'SCHOOL_LOGO', 'SCHOOL_NAME', 'SCHOOL_MOTTO', 'SCHOOL_ADDRESS', 'SCHOOL_CONTACT',
        'STUDENT_NAME', 'STUDENT_PHOTO', 'STUDENT_CLASS', 'STUDENT_STREAM', 
        'STUDENT_NUMBER', 'STUDENT_ATTENDANCE',
        'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY', 'AGGREGATE_DISPLAY',
        'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS',
        'FEES_BALANCE', 'PAYMENT_SUMMARY', 'FEE_STRUCTURE'
      ];
      
      dynamicComponents.forEach(componentType => {
        const validBindings = COMPONENT_VALID_BINDINGS[componentType];
        
        validBindings.forEach(field => {
          const result = validateDataBinding(field, componentType);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });
    });

    it('should reject all invalid combinations systematically', () => {
      fc.assert(
        fc.property(
          arbDynamicComponentType(),
          arbValidField(),
          (componentType, field) => {
            const result = validateDataBinding(field, componentType);
            const isValidForComponent = isFieldValidForComponent(field, componentType);
            
            // If field is not valid for component, validation should fail
            if (!isValidForComponent) {
              return !result.valid && result.errors.length > 0;
            }
            
            // If field is valid for component, validation should pass
            return result.valid && result.errors.length === 0;
          }
        ),
        propertyTestParams()
      );
    });
  });
});
