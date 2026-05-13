/**
 * Unit Tests for Data Binding Validation
 * 
 * These tests verify that data binding validation correctly:
 * 1. Validates field existence in schema
 * 2. Validates field compatibility with component types
 * 3. Validates type compatibility
 * 4. Detects SQL injection patterns
 * 5. Provides appropriate error messages
 * 
 * Requirements tested:
 * - 4.9: Data binding validation ensures bound fields exist and match expected types
 * - 14.3: Validate all dynamic components have valid data bindings
 * - 14.4: Validate data bindings reference existing database fields
 * - 16.1-16.6: Data binding restrictions and validation
 */

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
  COMPONENT_EXPECTED_TYPES,
  DataBindingValidationError
} from '../../domain/validation/dataBindingValidation';
import type { ComponentType } from '../../domain/types/enums';

describe('Data Binding Validation', () => {
  describe('fieldExistsInSchema', () => {
    it('should return true for valid school fields', () => {
      expect(fieldExistsInSchema('school.name')).toBe(true);
      expect(fieldExistsInSchema('school.logo_url')).toBe(true);
      expect(fieldExistsInSchema('school.motto')).toBe(true);
      expect(fieldExistsInSchema('school.address')).toBe(true);
      expect(fieldExistsInSchema('school.contact')).toBe(true);
    });

    it('should return true for valid student fields', () => {
      expect(fieldExistsInSchema('student.full_name')).toBe(true);
      expect(fieldExistsInSchema('student.photo_url')).toBe(true);
      expect(fieldExistsInSchema('student.class')).toBe(true);
      expect(fieldExistsInSchema('student.stream')).toBe(true);
      expect(fieldExistsInSchema('student.student_number')).toBe(true);
    });

    it('should return true for valid academic fields', () => {
      expect(fieldExistsInSchema('student.results')).toBe(true);
      expect(fieldExistsInSchema('student.grade')).toBe(true);
      expect(fieldExistsInSchema('student.aggregate')).toBe(true);
      expect(fieldExistsInSchema('student.division')).toBe(true);
    });

    it('should return true for valid financial fields', () => {
      expect(fieldExistsInSchema('student.fees_balance')).toBe(true);
      expect(fieldExistsInSchema('student.payment_summary')).toBe(true);
      expect(fieldExistsInSchema('school.fee_structure')).toBe(true);
    });

    it('should return false for non-existent fields', () => {
      expect(fieldExistsInSchema('student.invalid_field')).toBe(false);
      expect(fieldExistsInSchema('school.nonexistent')).toBe(false);
      expect(fieldExistsInSchema('random.field')).toBe(false);
      expect(fieldExistsInSchema('')).toBe(false);
    });
  });

  describe('isFieldValidForComponent', () => {
    it('should return true for correct school component bindings', () => {
      expect(isFieldValidForComponent('school.name', 'SCHOOL_NAME')).toBe(true);
      expect(isFieldValidForComponent('school.logo_url', 'SCHOOL_LOGO')).toBe(true);
      expect(isFieldValidForComponent('school.motto', 'SCHOOL_MOTTO')).toBe(true);
    });

    it('should return true for correct student component bindings', () => {
      expect(isFieldValidForComponent('student.full_name', 'STUDENT_NAME')).toBe(true);
      expect(isFieldValidForComponent('student.photo_url', 'STUDENT_PHOTO')).toBe(true);
      expect(isFieldValidForComponent('student.class', 'STUDENT_CLASS')).toBe(true);
    });

    it('should return true for correct academic component bindings', () => {
      expect(isFieldValidForComponent('student.results', 'RESULTS_TABLE')).toBe(true);
      expect(isFieldValidForComponent('student.grade', 'GRADE_DISPLAY')).toBe(true);
      expect(isFieldValidForComponent('student.aggregate', 'AGGREGATE_DISPLAY')).toBe(true);
    });

    it('should return true for correct financial component bindings', () => {
      expect(isFieldValidForComponent('student.fees_balance', 'FEES_BALANCE')).toBe(true);
      expect(isFieldValidForComponent('student.payment_summary', 'PAYMENT_SUMMARY')).toBe(true);
      expect(isFieldValidForComponent('school.fee_structure', 'FEE_STRUCTURE')).toBe(true);
    });

    it('should return false for incorrect component bindings', () => {
      expect(isFieldValidForComponent('student.full_name', 'SCHOOL_NAME')).toBe(false);
      expect(isFieldValidForComponent('school.name', 'STUDENT_NAME')).toBe(false);
      expect(isFieldValidForComponent('student.results', 'STUDENT_NAME')).toBe(false);
    });

    it('should return false for static components with any field', () => {
      expect(isFieldValidForComponent('student.full_name', 'LINE')).toBe(false);
      expect(isFieldValidForComponent('school.name', 'RECTANGLE')).toBe(false);
      expect(isFieldValidForComponent('student.results', 'TEXT_LABEL')).toBe(false);
    });
  });

  describe('isTypeCompatible', () => {
    it('should return true for string fields with string components', () => {
      expect(isTypeCompatible('school.name', 'SCHOOL_NAME')).toBe(true);
      expect(isTypeCompatible('student.full_name', 'STUDENT_NAME')).toBe(true);
      expect(isTypeCompatible('student.class', 'STUDENT_CLASS')).toBe(true);
    });

    it('should return true for url fields with image components', () => {
      expect(isTypeCompatible('school.logo_url', 'SCHOOL_LOGO')).toBe(true);
      expect(isTypeCompatible('student.photo_url', 'STUDENT_PHOTO')).toBe(true);
    });

    it('should return true for array fields with table components', () => {
      expect(isTypeCompatible('student.results', 'RESULTS_TABLE')).toBe(true);
      expect(isTypeCompatible('student.subject_scores', 'SUBJECT_SCORES')).toBe(true);
    });

    it('should return true for number fields with numeric components', () => {
      expect(isTypeCompatible('student.aggregate', 'AGGREGATE_DISPLAY')).toBe(true);
      expect(isTypeCompatible('student.fees_balance', 'FEES_BALANCE')).toBe(true);
    });

    it('should return true for object fields with object components', () => {
      expect(isTypeCompatible('student.payment_summary', 'PAYMENT_SUMMARY')).toBe(true);
      expect(isTypeCompatible('school.fee_structure', 'FEE_STRUCTURE')).toBe(true);
    });

    it('should return false for incompatible types', () => {
      // Can't bind array to string component
      expect(isTypeCompatible('student.results', 'STUDENT_NAME')).toBe(false);
      // Can't bind string to url component
      expect(isTypeCompatible('student.full_name', 'SCHOOL_LOGO')).toBe(false);
    });

    it('should return false for non-existent fields', () => {
      expect(isTypeCompatible('invalid.field', 'STUDENT_NAME')).toBe(false);
    });
  });

  describe('containsSQLInjectionPattern', () => {
    it('should detect SELECT statements', () => {
      expect(containsSQLInjectionPattern('SELECT * FROM users')).toBe(true);
      expect(containsSQLInjectionPattern('select name from students')).toBe(true);
      expect(containsSQLInjectionPattern('SeLeCt id')).toBe(true);
    });

    it('should detect INSERT statements', () => {
      expect(containsSQLInjectionPattern('INSERT INTO users')).toBe(true);
      expect(containsSQLInjectionPattern('insert into students')).toBe(true);
    });

    it('should detect UPDATE statements', () => {
      expect(containsSQLInjectionPattern('UPDATE users SET')).toBe(true);
      expect(containsSQLInjectionPattern('update students')).toBe(true);
    });

    it('should detect DELETE statements', () => {
      expect(containsSQLInjectionPattern('DELETE FROM users')).toBe(true);
      expect(containsSQLInjectionPattern('delete from students')).toBe(true);
    });

    it('should detect DROP statements', () => {
      expect(containsSQLInjectionPattern('DROP TABLE users')).toBe(true);
      expect(containsSQLInjectionPattern('drop database')).toBe(true);
    });

    it('should detect UNION attacks', () => {
      expect(containsSQLInjectionPattern('1 UNION SELECT')).toBe(true);
      expect(containsSQLInjectionPattern('union all select')).toBe(true);
    });

    it('should detect SQL comments', () => {
      expect(containsSQLInjectionPattern('admin--')).toBe(true);
      expect(containsSQLInjectionPattern('/* comment */')).toBe(true);
    });

    it('should detect OR-based injection', () => {
      expect(containsSQLInjectionPattern("' OR '1'='1")).toBe(true);
      expect(containsSQLInjectionPattern('" OR "1"="1')).toBe(true);
      expect(containsSQLInjectionPattern('OR 1=1')).toBe(true);
    });

    it('should detect AND-based injection', () => {
      expect(containsSQLInjectionPattern('AND 1=1')).toBe(true);
    });

    it('should detect semicolon terminators', () => {
      expect(containsSQLInjectionPattern('field; DROP TABLE')).toBe(true);
    });

    it('should not flag valid field names', () => {
      expect(containsSQLInjectionPattern('student.full_name')).toBe(false);
      expect(containsSQLInjectionPattern('school.name')).toBe(false);
      expect(containsSQLInjectionPattern('student.results')).toBe(false);
    });
  });

  describe('getValidBindingsForComponent', () => {
    it('should return valid bindings for school components', () => {
      const schoolNameBindings = getValidBindingsForComponent('SCHOOL_NAME');
      expect(schoolNameBindings).toHaveLength(1);
      expect(schoolNameBindings[0].field).toBe('school.name');
      expect(schoolNameBindings[0].type).toBe('string');
    });

    it('should return valid bindings for student components', () => {
      const studentNameBindings = getValidBindingsForComponent('STUDENT_NAME');
      expect(studentNameBindings).toHaveLength(1);
      expect(studentNameBindings[0].field).toBe('student.full_name');
    });

    it('should return valid bindings for academic components', () => {
      const resultsBindings = getValidBindingsForComponent('RESULTS_TABLE');
      expect(resultsBindings).toHaveLength(1);
      expect(resultsBindings[0].field).toBe('student.results');
      expect(resultsBindings[0].type).toBe('array');
    });

    it('should return empty array for static components', () => {
      expect(getValidBindingsForComponent('LINE')).toHaveLength(0);
      expect(getValidBindingsForComponent('RECTANGLE')).toHaveLength(0);
      expect(getValidBindingsForComponent('TEXT_LABEL')).toHaveLength(0);
    });
  });

  describe('requiresDataBinding', () => {
    it('should return true for dynamic components', () => {
      expect(requiresDataBinding('SCHOOL_NAME')).toBe(true);
      expect(requiresDataBinding('STUDENT_NAME')).toBe(true);
      expect(requiresDataBinding('RESULTS_TABLE')).toBe(true);
      expect(requiresDataBinding('FEES_BALANCE')).toBe(true);
    });

    it('should return false for static components', () => {
      expect(requiresDataBinding('LINE')).toBe(false);
      expect(requiresDataBinding('BORDER')).toBe(false);
      expect(requiresDataBinding('RECTANGLE')).toBe(false);
      expect(requiresDataBinding('CIRCLE')).toBe(false);
      expect(requiresDataBinding('TEXT_LABEL')).toBe(false);
      expect(requiresDataBinding('SIGNATURE_FIELD')).toBe(false);
    });
  });

  describe('validateDataBinding', () => {
    it('should validate correct bindings', () => {
      const result1 = validateDataBinding('school.name', 'SCHOOL_NAME');
      expect(result1.valid).toBe(true);
      expect(result1.errors).toHaveLength(0);

      const result2 = validateDataBinding('student.full_name', 'STUDENT_NAME');
      expect(result2.valid).toBe(true);
      expect(result2.errors).toHaveLength(0);

      const result3 = validateDataBinding('student.results', 'RESULTS_TABLE');
      expect(result3.valid).toBe(true);
      expect(result3.errors).toHaveLength(0);
    });

    it('should reject non-existent fields', () => {
      const result = validateDataBinding('student.invalid_field', 'STUDENT_NAME');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2); // Not in schema + not valid for component
      expect(result.errors[0].code).toBe('FIELD_NOT_IN_SCHEMA');
      expect(result.errors[0].message).toContain('does not exist in the data source schema');
    });

    it('should reject fields not valid for component type', () => {
      const result = validateDataBinding('student.full_name', 'SCHOOL_NAME');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      const notValidError = result.errors.find(e => e.code === 'FIELD_NOT_VALID_FOR_COMPONENT');
      expect(notValidError).toBeDefined();
      expect(notValidError!.message).toContain('not valid for component type');
    });

    it('should reject type-incompatible bindings', () => {
      // Try to bind array field to string component
      const result = validateDataBinding('student.results', 'STUDENT_NAME');
      expect(result.valid).toBe(false);
      const typeError = result.errors.find(e => e.code === 'TYPE_INCOMPATIBLE');
      expect(typeError).toBeDefined();
      expect(typeError!.message).toContain('not compatible');
    });

    it('should reject SQL injection patterns', () => {
      const result = validateDataBinding('SELECT * FROM users', 'STUDENT_NAME');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      const sqlError = result.errors.find(e => e.code === 'SQL_INJECTION_PATTERN');
      expect(sqlError).toBeDefined();
      expect(sqlError!.message).toContain('SQL injection pattern');
    });

    it('should provide multiple errors for multiple violations', () => {
      // Non-existent field with SQL pattern
      const result = validateDataBinding('DROP TABLE users', 'STUDENT_NAME');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors.some(e => e.code === 'SQL_INJECTION_PATTERN')).toBe(true);
      expect(result.errors.some(e => e.code === 'FIELD_NOT_IN_SCHEMA')).toBe(true);
    });

    it('should provide descriptive error messages', () => {
      const result = validateDataBinding('invalid.field', 'STUDENT_NAME');
      expect(result.errors[0].message).toContain('invalid.field');
      expect(result.errors[0].message).toContain('does not exist');
      expect(result.errors[0].field).toBe('invalid.field');
      expect(result.errors[0].componentType).toBe('STUDENT_NAME');
    });
  });

  describe('validateComponentHasDataBinding', () => {
    it('should pass when dynamic component has data binding', () => {
      const result = validateComponentHasDataBinding('STUDENT_NAME', 'student.full_name');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when dynamic component lacks data binding', () => {
      const result = validateComponentHasDataBinding('STUDENT_NAME', undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_DATA_BINDING');
      expect(result.errors[0].message).toContain('requires a data binding');
    });

    it('should pass when static component has no data binding', () => {
      const result = validateComponentHasDataBinding('LINE', undefined);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when static component has data binding (even though not required)', () => {
      // Static components don't require bindings, so having one is not an error
      const result = validateComponentHasDataBinding('LINE', 'some.field');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string field', () => {
      const result = validateDataBinding('', 'STUDENT_NAME');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle whitespace-only field', () => {
      const result = validateDataBinding('   ', 'STUDENT_NAME');
      expect(result.valid).toBe(false);
    });

    it('should handle case-sensitive field names', () => {
      // Field names are case-sensitive
      const result = validateDataBinding('STUDENT.FULL_NAME', 'STUDENT_NAME');
      expect(result.valid).toBe(false);
    });

    it('should handle fields with special characters', () => {
      const result = validateDataBinding('student.full-name', 'STUDENT_NAME');
      expect(result.valid).toBe(false);
    });
  });

  describe('Data Source Schema Coverage', () => {
    it('should have schema entries for all dynamic component bindings', () => {
      const allComponentTypes = Object.keys(COMPONENT_VALID_BINDINGS) as ComponentType[];
      
      allComponentTypes.forEach(componentType => {
        const validBindings = COMPONENT_VALID_BINDINGS[componentType];
        validBindings.forEach(field => {
          expect(DATA_SOURCE_SCHEMA[field]).toBeDefined();
          expect(DATA_SOURCE_SCHEMA[field].field).toBe(field);
          expect(DATA_SOURCE_SCHEMA[field].type).toBeDefined();
          expect(DATA_SOURCE_SCHEMA[field].description).toBeDefined();
        });
      });
    });

    it('should have expected types for all component types', () => {
      const allComponentTypes = Object.keys(COMPONENT_EXPECTED_TYPES) as ComponentType[];
      
      allComponentTypes.forEach(componentType => {
        expect(COMPONENT_EXPECTED_TYPES[componentType]).toBeDefined();
        expect(Array.isArray(COMPONENT_EXPECTED_TYPES[componentType])).toBe(true);
      });
    });
  });

  describe('Comprehensive Validation Scenarios', () => {
    it('should validate all school components with correct bindings', () => {
      const schoolComponents: Array<[ComponentType, string]> = [
        ['SCHOOL_LOGO', 'school.logo_url'],
        ['SCHOOL_NAME', 'school.name'],
        ['SCHOOL_MOTTO', 'school.motto'],
        ['SCHOOL_ADDRESS', 'school.address'],
        ['SCHOOL_CONTACT', 'school.contact']
      ];

      schoolComponents.forEach(([componentType, field]) => {
        const result = validateDataBinding(field, componentType);
        expect(result.valid).toBe(true);
      });
    });

    it('should validate all student components with correct bindings', () => {
      const studentComponents: Array<[ComponentType, string]> = [
        ['STUDENT_NAME', 'student.full_name'],
        ['STUDENT_PHOTO', 'student.photo_url'],
        ['STUDENT_CLASS', 'student.class'],
        ['STUDENT_STREAM', 'student.stream'],
        ['STUDENT_NUMBER', 'student.student_number'],
        ['STUDENT_ATTENDANCE', 'student.attendance']
      ];

      studentComponents.forEach(([componentType, field]) => {
        const result = validateDataBinding(field, componentType);
        expect(result.valid).toBe(true);
      });
    });

    it('should validate all academic components with correct bindings', () => {
      const academicComponents: Array<[ComponentType, string]> = [
        ['RESULTS_TABLE', 'student.results'],
        ['SUBJECT_SCORES', 'student.subject_scores'],
        ['GRADE_DISPLAY', 'student.grade'],
        ['AGGREGATE_DISPLAY', 'student.aggregate'],
        ['DIVISION_DISPLAY', 'student.division'],
        ['TEACHER_REMARKS', 'student.teacher_remarks'],
        ['HEAD_TEACHER_COMMENTS', 'student.head_teacher_comments']
      ];

      academicComponents.forEach(([componentType, field]) => {
        const result = validateDataBinding(field, componentType);
        expect(result.valid).toBe(true);
      });
    });

    it('should validate all financial components with correct bindings', () => {
      const financialComponents: Array<[ComponentType, string]> = [
        ['FEES_BALANCE', 'student.fees_balance'],
        ['PAYMENT_SUMMARY', 'student.payment_summary'],
        ['FEE_STRUCTURE', 'school.fee_structure']
      ];

      financialComponents.forEach(([componentType, field]) => {
        const result = validateDataBinding(field, componentType);
        expect(result.valid).toBe(true);
      });
    });
  });
});
