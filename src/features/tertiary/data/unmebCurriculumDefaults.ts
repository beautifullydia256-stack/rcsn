/**
 * National UNMEB (Uganda Nurses and Midwives Examinations Board)
 * Standard Curriculum Defaults & 5.0 Scale Grading Table
 * 
 * NOTE: These are pre-loaded editable defaults. Every school can freely
 * customize, add, modify, or delete course units or adjust grade boundaries.
 */

import { GradeScaleEntry, CourseUnit, Programme } from '../types';

export const UNMEB_STANDARD_GRADING_SCALE: GradeScaleEntry[] = [
  { minScore: 80, maxScore: 100, grade: 'A', gradePoint: 5.0, remarks: 'Excellent Distinction' },
  { minScore: 75, maxScore: 79.99, grade: 'B+', gradePoint: 4.5, remarks: 'Very Good' },
  { minScore: 70, maxScore: 74.99, grade: 'B', gradePoint: 4.0, remarks: 'Good Credit' },
  { minScore: 65, maxScore: 69.99, grade: 'C+', gradePoint: 3.5, remarks: 'Credit' },
  { minScore: 60, maxScore: 64.99, grade: 'C', gradePoint: 3.0, remarks: 'Satisfactory Pass' },
  { minScore: 55, maxScore: 59.99, grade: 'D+', gradePoint: 2.5, remarks: 'Pass' },
  { minScore: 50, maxScore: 54.99, grade: 'D', gradePoint: 2.0, remarks: 'Minimum Qualifying Pass' },
  { minScore: 0, maxScore: 49.99, grade: 'F', gradePoint: 0.0, remarks: 'Fail (Automatic Retake Required)' },
];

export const DEFAULT_PROGRAMMES: Omit<Programme, 'id' | 'schoolId'>[] = [
  {
    code: 'CN',
    title: 'Certificate in Nursing',
    awardLevel: 'certificate',
    durationYears: 2.5,
    totalSemesters: 5,
    department: 'Nursing',
  },
  {
    code: 'CM',
    title: 'Certificate in Midwifery',
    awardLevel: 'certificate',
    durationYears: 2.5,
    totalSemesters: 5,
    department: 'Midwifery',
  },
  {
    code: 'DN',
    title: 'Diploma in Nursing (Direct)',
    awardLevel: 'diploma',
    durationYears: 3.0,
    totalSemesters: 6,
    department: 'Nursing',
  },
  {
    code: 'DM',
    title: 'Diploma in Midwifery (Direct)',
    awardLevel: 'diploma',
    durationYears: 3.0,
    totalSemesters: 6,
    department: 'Midwifery',
  },
];

export const UNMEB_CERTIFICATE_NURSING_UNITS: Omit<CourseUnit, 'id' | 'schoolId'>[] = [
  // Year 1 Semester 1
  {
    code: 'CN 111',
    title: 'Anatomy and Physiology I and First Aid',
    creditUnits: 4.0,
    unitType: 'theory',
    defaultSemester: 'Y1S1',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 112',
    title: 'Foundations of Nursing and Basic Computer',
    creditUnits: 4.0,
    unitType: 'theory',
    defaultSemester: 'Y1S1',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 113',
    title: 'Personal and Communal Health and Microbiology',
    creditUnits: 3.0,
    unitType: 'theory',
    defaultSemester: 'Y1S1',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 114',
    title: 'Practical I (Skills Lab & Hospital Placement)',
    creditUnits: 5.0,
    unitType: 'practical',
    defaultSemester: 'Y1S1',
    passMark: 50.0,
    isCore: true,
  },

  // Year 1 Semester 2
  {
    code: 'CN 121',
    title: 'Anatomy and Physiology II',
    creditUnits: 4.0,
    unitType: 'theory',
    defaultSemester: 'Y1S2',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 122',
    title: 'Foundations of Nursing II, Sociology and Psychology',
    creditUnits: 4.0,
    unitType: 'theory',
    defaultSemester: 'Y1S2',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 123',
    title: 'Primary Health Care',
    creditUnits: 3.0,
    unitType: 'theory',
    defaultSemester: 'Y1S2',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 124',
    title: 'Practical II (Clinical Ward Placement)',
    creditUnits: 5.0,
    unitType: 'practical',
    defaultSemester: 'Y1S2',
    passMark: 50.0,
    isCore: true,
  },

  // Year 2 Semester 1
  {
    code: 'CN 211',
    title: 'Medical Nursing I and Pharmacology I',
    creditUnits: 4.0,
    unitType: 'theory',
    defaultSemester: 'Y2S1',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 212',
    title: 'Surgical Nursing I and Gynaecology',
    creditUnits: 4.0,
    unitType: 'theory',
    defaultSemester: 'Y2S1',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 213',
    title: 'Paediatric Nursing I and Palliative Care Nursing',
    creditUnits: 3.0,
    unitType: 'theory',
    defaultSemester: 'Y2S1',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 214',
    title: 'Practical III (Medical, Surgical & Paediatric Wards)',
    creditUnits: 5.0,
    unitType: 'practical',
    defaultSemester: 'Y2S1',
    passMark: 50.0,
    isCore: true,
  },

  // Year 2 Semester 2
  {
    code: 'CN 221',
    title: 'Medical Nursing II & Pharmacology II',
    creditUnits: 4.0,
    unitType: 'theory',
    defaultSemester: 'Y2S2',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 222',
    title: 'Surgical Nursing II and Paediatric Nursing II',
    creditUnits: 4.0,
    unitType: 'theory',
    defaultSemester: 'Y2S2',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 223',
    title: 'Mental Health Nursing and Occupational Health and Safety',
    creditUnits: 3.0,
    unitType: 'theory',
    defaultSemester: 'Y2S2',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 224',
    title: 'Practical IV (Specialized Hospital Rotations)',
    creditUnits: 5.0,
    unitType: 'practical',
    defaultSemester: 'Y2S2',
    passMark: 50.0,
    isCore: true,
  },

  // Year 3 Semester 1 (Final Semester for 2.5-Year Certificate)
  {
    code: 'CN 311',
    title: 'Tropical Medicine and Surgical Nursing III',
    creditUnits: 4.0,
    unitType: 'theory',
    defaultSemester: 'Y3S1',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 312',
    title: 'Reproductive Health, Guidance and Counselling',
    creditUnits: 4.0,
    unitType: 'theory',
    defaultSemester: 'Y3S1',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 313',
    title: 'Health Services Management and Entrepreneurship',
    creditUnits: 3.0,
    unitType: 'theory',
    defaultSemester: 'Y3S1',
    passMark: 50.0,
    isCore: true,
  },
  {
    code: 'CN 314',
    title: 'Practical V (Comprehensive Clinical Practical OSCE)',
    creditUnits: 5.0,
    unitType: 'practical',
    defaultSemester: 'Y3S1',
    passMark: 50.0,
    isCore: true,
  },
];

export const STAGE_LABELS: Record<string, string> = {
  Y1S1: 'Year 1 Semester 1',
  Y1S2: 'Year 1 Semester 2',
  Y2S1: 'Year 2 Semester 1',
  Y2S2: 'Year 2 Semester 2',
  Y3S1: 'Year 3 Semester 1',
  Y3S2: 'Year 3 Semester 2',
  COMPLETED: 'Graduated / Completed',
};
