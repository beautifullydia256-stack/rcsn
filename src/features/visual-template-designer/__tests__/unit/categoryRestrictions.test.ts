/**
 * Unit Tests: Category Restrictions
 * 
 * Tests for category-based component restrictions and validation functions.
 * Validates that component filtering logic correctly enforces business rules.
 */

import { describe, it, expect } from 'vitest';
import {
  CATEGORY_COMPONENT_RESTRICTIONS,
  isComponentAllowedForCategory,
  getComponentsForCategory,
  getCategoriesForComponent,
  validateComponentsForCategory
} from '../../domain/models/categoryRestrictions';
import type { ComponentType, TemplateCategory } from '../../domain/types/enums';

describe('Category Restrictions', () => {
  describe('CATEGORY_COMPONENT_RESTRICTIONS', () => {
    it('should have restrictions defined for all template categories', () => {
      const expectedCategories: TemplateCategory[] = [
        'REPORT_CARD', 'CERTIFICATE', 'ID_CARD', 'RECEIPT', 
        'FEE_STATEMENT', 'ADMISSION_FORM', 'RESULT_SLIP'
      ];

      expectedCategories.forEach(category => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS[category]).toBeDefined();
        expect(Array.isArray(CATEGORY_COMPONENT_RESTRICTIONS[category])).toBe(true);
        expect(CATEGORY_COMPONENT_RESTRICTIONS[category].length).toBeGreaterThan(0);
      });
    });

    it('should include all static components in every category', () => {
      const staticComponents: ComponentType[] = [
        'LINE', 'BORDER', 'RECTANGLE', 'CIRCLE', 'BACKGROUND_IMAGE', 
        'WATERMARK', 'TEXT_LABEL', 'SIGNATURE_FIELD'
      ];

      Object.values(CATEGORY_COMPONENT_RESTRICTIONS).forEach(allowedComponents => {
        staticComponents.forEach(staticComponent => {
          expect(allowedComponents).toContain(staticComponent);
        });
      });
    });
  });

  describe('Report Card Category (Requirement 4.1)', () => {
    it('should allow School Info components', () => {
      const schoolInfoComponents: ComponentType[] = [
        'SCHOOL_LOGO', 'SCHOOL_NAME', 'SCHOOL_MOTTO', 'SCHOOL_ADDRESS', 'SCHOOL_CONTACT'
      ];

      schoolInfoComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.REPORT_CARD).toContain(component);
      });
    });

    it('should allow Student Info components', () => {
      const studentInfoComponents: ComponentType[] = [
        'STUDENT_NAME', 'STUDENT_PHOTO', 'STUDENT_CLASS', 
        'STUDENT_STREAM', 'STUDENT_NUMBER', 'STUDENT_ATTENDANCE'
      ];

      studentInfoComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.REPORT_CARD).toContain(component);
      });
    });

    it('should allow Academic components', () => {
      const academicComponents: ComponentType[] = [
        'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY', 
        'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS'
      ];

      academicComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.REPORT_CARD).toContain(component);
      });
    });

    it('should allow Static components', () => {
      const staticComponents: ComponentType[] = [
        'LINE', 'BORDER', 'RECTANGLE', 'CIRCLE', 'BACKGROUND_IMAGE', 
        'WATERMARK', 'TEXT_LABEL', 'SIGNATURE_FIELD'
      ];

      staticComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.REPORT_CARD).toContain(component);
      });
    });

    it('should not allow Financial components', () => {
      const financialComponents: ComponentType[] = [
        'FEES_BALANCE', 'PAYMENT_SUMMARY', 'FEE_STRUCTURE'
      ];

      financialComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.REPORT_CARD).not.toContain(component);
      });
    });
  });

  describe('Certificate Category (Requirement 4.2)', () => {
    it('should allow School Info components', () => {
      const schoolInfoComponents: ComponentType[] = [
        'SCHOOL_LOGO', 'SCHOOL_NAME', 'SCHOOL_MOTTO', 'SCHOOL_ADDRESS', 'SCHOOL_CONTACT'
      ];

      schoolInfoComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.CERTIFICATE).toContain(component);
      });
    });

    it('should allow Student Info components', () => {
      const studentInfoComponents: ComponentType[] = [
        'STUDENT_NAME', 'STUDENT_PHOTO', 'STUDENT_CLASS', 
        'STUDENT_STREAM', 'STUDENT_NUMBER', 'STUDENT_ATTENDANCE'
      ];

      studentInfoComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.CERTIFICATE).toContain(component);
      });
    });

    it('should allow Text Label and Signature Field', () => {
      expect(CATEGORY_COMPONENT_RESTRICTIONS.CERTIFICATE).toContain('TEXT_LABEL');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.CERTIFICATE).toContain('SIGNATURE_FIELD');
    });

    it('should not allow Academic components', () => {
      const academicComponents: ComponentType[] = [
        'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY', 
        'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS'
      ];

      academicComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.CERTIFICATE).not.toContain(component);
      });
    });

    it('should not allow Financial components', () => {
      const financialComponents: ComponentType[] = [
        'FEES_BALANCE', 'PAYMENT_SUMMARY', 'FEE_STRUCTURE'
      ];

      financialComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.CERTIFICATE).not.toContain(component);
      });
    });
  });

  describe('ID Card Category (Requirement 4.3)', () => {
    it('should allow School Logo only from School Info', () => {
      expect(CATEGORY_COMPONENT_RESTRICTIONS.ID_CARD).toContain('SCHOOL_LOGO');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.ID_CARD).not.toContain('SCHOOL_NAME');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.ID_CARD).not.toContain('SCHOOL_MOTTO');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.ID_CARD).not.toContain('SCHOOL_ADDRESS');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.ID_CARD).not.toContain('SCHOOL_CONTACT');
    });

    it('should allow limited Student Info components', () => {
      expect(CATEGORY_COMPONENT_RESTRICTIONS.ID_CARD).toContain('STUDENT_NAME');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.ID_CARD).toContain('STUDENT_PHOTO');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.ID_CARD).toContain('STUDENT_CLASS');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.ID_CARD).toContain('STUDENT_NUMBER');
    });

    it('should not allow Student Stream and Attendance', () => {
      expect(CATEGORY_COMPONENT_RESTRICTIONS.ID_CARD).not.toContain('STUDENT_STREAM');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.ID_CARD).not.toContain('STUDENT_ATTENDANCE');
    });

    it('should not allow Academic components', () => {
      const academicComponents: ComponentType[] = [
        'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY', 
        'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS'
      ];

      academicComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.ID_CARD).not.toContain(component);
      });
    });

    it('should not allow Financial components', () => {
      const financialComponents: ComponentType[] = [
        'FEES_BALANCE', 'PAYMENT_SUMMARY', 'FEE_STRUCTURE'
      ];

      financialComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.ID_CARD).not.toContain(component);
      });
    });
  });

  describe('Receipt Category (Requirement 4.4)', () => {
    it('should allow School Info components', () => {
      const schoolInfoComponents: ComponentType[] = [
        'SCHOOL_LOGO', 'SCHOOL_NAME', 'SCHOOL_MOTTO', 'SCHOOL_ADDRESS', 'SCHOOL_CONTACT'
      ];

      schoolInfoComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.RECEIPT).toContain(component);
      });
    });

    it('should allow Student Name only from Student Info', () => {
      expect(CATEGORY_COMPONENT_RESTRICTIONS.RECEIPT).toContain('STUDENT_NAME');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.RECEIPT).not.toContain('STUDENT_PHOTO');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.RECEIPT).not.toContain('STUDENT_CLASS');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.RECEIPT).not.toContain('STUDENT_STREAM');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.RECEIPT).not.toContain('STUDENT_NUMBER');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.RECEIPT).not.toContain('STUDENT_ATTENDANCE');
    });

    it('should allow Payment Summary', () => {
      expect(CATEGORY_COMPONENT_RESTRICTIONS.RECEIPT).toContain('PAYMENT_SUMMARY');
    });

    it('should not allow other Financial components', () => {
      expect(CATEGORY_COMPONENT_RESTRICTIONS.RECEIPT).not.toContain('FEES_BALANCE');
      expect(CATEGORY_COMPONENT_RESTRICTIONS.RECEIPT).not.toContain('FEE_STRUCTURE');
    });

    it('should not allow Academic components', () => {
      const academicComponents: ComponentType[] = [
        'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY', 
        'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS'
      ];

      academicComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.RECEIPT).not.toContain(component);
      });
    });
  });

  describe('Fee Statement Category (Requirement 4.5)', () => {
    it('should allow School Info components', () => {
      const schoolInfoComponents: ComponentType[] = [
        'SCHOOL_LOGO', 'SCHOOL_NAME', 'SCHOOL_MOTTO', 'SCHOOL_ADDRESS', 'SCHOOL_CONTACT'
      ];

      schoolInfoComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.FEE_STATEMENT).toContain(component);
      });
    });

    it('should allow Student Info components', () => {
      const studentInfoComponents: ComponentType[] = [
        'STUDENT_NAME', 'STUDENT_PHOTO', 'STUDENT_CLASS', 
        'STUDENT_STREAM', 'STUDENT_NUMBER', 'STUDENT_ATTENDANCE'
      ];

      studentInfoComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.FEE_STATEMENT).toContain(component);
      });
    });

    it('should allow Financial components', () => {
      const financialComponents: ComponentType[] = [
        'FEES_BALANCE', 'PAYMENT_SUMMARY', 'FEE_STRUCTURE'
      ];

      financialComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.FEE_STATEMENT).toContain(component);
      });
    });

    it('should not allow Academic components', () => {
      const academicComponents: ComponentType[] = [
        'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY', 
        'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS'
      ];

      academicComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.FEE_STATEMENT).not.toContain(component);
      });
    });
  });

  describe('Admission Form Category (Requirement 4.6)', () => {
    it('should allow School Info components', () => {
      const schoolInfoComponents: ComponentType[] = [
        'SCHOOL_LOGO', 'SCHOOL_NAME', 'SCHOOL_MOTTO', 'SCHOOL_ADDRESS', 'SCHOOL_CONTACT'
      ];

      schoolInfoComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.ADMISSION_FORM).toContain(component);
      });
    });

    it('should allow Student Info components', () => {
      const studentInfoComponents: ComponentType[] = [
        'STUDENT_NAME', 'STUDENT_PHOTO', 'STUDENT_CLASS', 
        'STUDENT_STREAM', 'STUDENT_NUMBER', 'STUDENT_ATTENDANCE'
      ];

      studentInfoComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.ADMISSION_FORM).toContain(component);
      });
    });

    it('should not allow Academic components', () => {
      const academicComponents: ComponentType[] = [
        'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY', 
        'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS'
      ];

      academicComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.ADMISSION_FORM).not.toContain(component);
      });
    });

    it('should not allow Financial components', () => {
      const financialComponents: ComponentType[] = [
        'FEES_BALANCE', 'PAYMENT_SUMMARY', 'FEE_STRUCTURE'
      ];

      financialComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.ADMISSION_FORM).not.toContain(component);
      });
    });
  });

  describe('Result Slip Category (Requirement 4.7)', () => {
    it('should allow School Info components', () => {
      const schoolInfoComponents: ComponentType[] = [
        'SCHOOL_LOGO', 'SCHOOL_NAME', 'SCHOOL_MOTTO', 'SCHOOL_ADDRESS', 'SCHOOL_CONTACT'
      ];

      schoolInfoComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.RESULT_SLIP).toContain(component);
      });
    });

    it('should allow Student Info components', () => {
      const studentInfoComponents: ComponentType[] = [
        'STUDENT_NAME', 'STUDENT_PHOTO', 'STUDENT_CLASS', 
        'STUDENT_STREAM', 'STUDENT_NUMBER', 'STUDENT_ATTENDANCE'
      ];

      studentInfoComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.RESULT_SLIP).toContain(component);
      });
    });

    it('should allow Academic components', () => {
      const academicComponents: ComponentType[] = [
        'RESULTS_TABLE', 'SUBJECT_SCORES', 'GRADE_DISPLAY', 
        'AGGREGATE_DISPLAY', 'DIVISION_DISPLAY', 'TEACHER_REMARKS', 'HEAD_TEACHER_COMMENTS'
      ];

      academicComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.RESULT_SLIP).toContain(component);
      });
    });

    it('should not allow Financial components', () => {
      const financialComponents: ComponentType[] = [
        'FEES_BALANCE', 'PAYMENT_SUMMARY', 'FEE_STRUCTURE'
      ];

      financialComponents.forEach(component => {
        expect(CATEGORY_COMPONENT_RESTRICTIONS.RESULT_SLIP).not.toContain(component);
      });
    });
  });

  describe('isComponentAllowedForCategory', () => {
    it('should return true for allowed components', () => {
      expect(isComponentAllowedForCategory('REPORT_CARD', 'RESULTS_TABLE')).toBe(true);
      expect(isComponentAllowedForCategory('ID_CARD', 'STUDENT_NAME')).toBe(true);
      expect(isComponentAllowedForCategory('RECEIPT', 'PAYMENT_SUMMARY')).toBe(true);
      expect(isComponentAllowedForCategory('FEE_STATEMENT', 'FEES_BALANCE')).toBe(true);
    });

    it('should return false for disallowed components', () => {
      expect(isComponentAllowedForCategory('ID_CARD', 'RESULTS_TABLE')).toBe(false);
      expect(isComponentAllowedForCategory('CERTIFICATE', 'FEES_BALANCE')).toBe(false);
      expect(isComponentAllowedForCategory('RECEIPT', 'RESULTS_TABLE')).toBe(false);
      expect(isComponentAllowedForCategory('ADMISSION_FORM', 'PAYMENT_SUMMARY')).toBe(false);
    });

    it('should return true for static components in all categories', () => {
      const categories: TemplateCategory[] = [
        'REPORT_CARD', 'CERTIFICATE', 'ID_CARD', 'RECEIPT', 
        'FEE_STATEMENT', 'ADMISSION_FORM', 'RESULT_SLIP'
      ];

      categories.forEach(category => {
        expect(isComponentAllowedForCategory(category, 'TEXT_LABEL')).toBe(true);
        expect(isComponentAllowedForCategory(category, 'LINE')).toBe(true);
        expect(isComponentAllowedForCategory(category, 'BORDER')).toBe(true);
      });
    });
  });

  describe('getComponentsForCategory', () => {
    it('should return all allowed components for a category', () => {
      const reportCardComponents = getComponentsForCategory('REPORT_CARD');
      expect(reportCardComponents).toContain('SCHOOL_LOGO');
      expect(reportCardComponents).toContain('STUDENT_NAME');
      expect(reportCardComponents).toContain('RESULTS_TABLE');
      expect(reportCardComponents).toContain('TEXT_LABEL');
    });

    it('should not return disallowed components', () => {
      const idCardComponents = getComponentsForCategory('ID_CARD');
      expect(idCardComponents).not.toContain('RESULTS_TABLE');
      expect(idCardComponents).not.toContain('FEES_BALANCE');
      expect(idCardComponents).not.toContain('SCHOOL_NAME');
    });

    it('should return different components for different categories', () => {
      const reportCardComponents = getComponentsForCategory('REPORT_CARD');
      const idCardComponents = getComponentsForCategory('ID_CARD');
      
      expect(reportCardComponents.length).toBeGreaterThan(idCardComponents.length);
      expect(reportCardComponents).toContain('RESULTS_TABLE');
      expect(idCardComponents).not.toContain('RESULTS_TABLE');
    });
  });

  describe('getCategoriesForComponent', () => {
    it('should return all categories that allow a component', () => {
      const resultsTableCategories = getCategoriesForComponent('RESULTS_TABLE');
      expect(resultsTableCategories).toContain('REPORT_CARD');
      expect(resultsTableCategories).toContain('RESULT_SLIP');
      expect(resultsTableCategories).not.toContain('ID_CARD');
      expect(resultsTableCategories).not.toContain('CERTIFICATE');
    });

    it('should return all categories for static components', () => {
      const textLabelCategories = getCategoriesForComponent('TEXT_LABEL');
      expect(textLabelCategories).toHaveLength(7);
      expect(textLabelCategories).toContain('REPORT_CARD');
      expect(textLabelCategories).toContain('CERTIFICATE');
      expect(textLabelCategories).toContain('ID_CARD');
      expect(textLabelCategories).toContain('RECEIPT');
      expect(textLabelCategories).toContain('FEE_STATEMENT');
      expect(textLabelCategories).toContain('ADMISSION_FORM');
      expect(textLabelCategories).toContain('RESULT_SLIP');
    });

    it('should return limited categories for specialized components', () => {
      const feesBalanceCategories = getCategoriesForComponent('FEES_BALANCE');
      expect(feesBalanceCategories).toContain('FEE_STATEMENT');
      expect(feesBalanceCategories).not.toContain('REPORT_CARD');
      expect(feesBalanceCategories).not.toContain('ID_CARD');
    });
  });

  describe('validateComponentsForCategory', () => {
    it('should validate all components are allowed', () => {
      const components: ComponentType[] = ['SCHOOL_LOGO', 'STUDENT_NAME', 'TEXT_LABEL'];
      const result = validateComponentsForCategory('ID_CARD', components);
      
      expect(result.valid).toBe(true);
      expect(result.invalidComponents).toHaveLength(0);
    });

    it('should detect invalid components', () => {
      const components: ComponentType[] = ['SCHOOL_LOGO', 'RESULTS_TABLE', 'TEXT_LABEL'];
      const result = validateComponentsForCategory('ID_CARD', components);
      
      expect(result.valid).toBe(false);
      expect(result.invalidComponents).toContain('RESULTS_TABLE');
      expect(result.invalidComponents).toHaveLength(1);
    });

    it('should detect multiple invalid components', () => {
      const components: ComponentType[] = ['RESULTS_TABLE', 'FEES_BALANCE', 'PAYMENT_SUMMARY'];
      const result = validateComponentsForCategory('ID_CARD', components);
      
      expect(result.valid).toBe(false);
      expect(result.invalidComponents).toContain('RESULTS_TABLE');
      expect(result.invalidComponents).toContain('FEES_BALANCE');
      expect(result.invalidComponents).toContain('PAYMENT_SUMMARY');
      expect(result.invalidComponents).toHaveLength(3);
    });

    it('should validate empty component list', () => {
      const result = validateComponentsForCategory('REPORT_CARD', []);
      
      expect(result.valid).toBe(true);
      expect(result.invalidComponents).toHaveLength(0);
    });

    it('should validate all static components for any category', () => {
      const staticComponents: ComponentType[] = [
        'LINE', 'BORDER', 'RECTANGLE', 'CIRCLE', 'BACKGROUND_IMAGE', 
        'WATERMARK', 'TEXT_LABEL', 'SIGNATURE_FIELD'
      ];
      
      const categories: TemplateCategory[] = [
        'REPORT_CARD', 'CERTIFICATE', 'ID_CARD', 'RECEIPT', 
        'FEE_STATEMENT', 'ADMISSION_FORM', 'RESULT_SLIP'
      ];

      categories.forEach(category => {
        const result = validateComponentsForCategory(category, staticComponents);
        expect(result.valid).toBe(true);
        expect(result.invalidComponents).toHaveLength(0);
      });
    });
  });
});
