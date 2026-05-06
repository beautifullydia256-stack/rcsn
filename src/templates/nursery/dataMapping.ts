/**
 * Data Mapping Interfaces for Nursery Templates
 * 
 * This module provides interfaces and helper functions for mapping exam results data
 * from the database to nursery template data structures.
 */

import type {
  Template7Data,
  Template8Data,
  Template9Data,
  Template10Data,
  Template11Data,
  Template12Data,
  SkillStatus,
} from './types';

// ============================================================================
// DATABASE RESULT INTERFACES
// ============================================================================

/**
 * Raw exam result data from database
 */
export interface ExamResultRow {
  subject_name: string;
  marks_obtained: number;
  total_marks: number;
  grade?: string;
  remarks?: string;
  teacher_initials?: string;
}

/**
 * Student information from database
 */
export interface StudentInfo {
  student_id: string;
  student_name: string;
  current_class: string;
  age?: string;
  registration_number?: string;
  photo_url?: string;
  fees_balance?: number;
  schoolpay_code?: string;
}

/**
 * School information from database
 */
export interface SchoolInfo {
  school_id: string;
  school_name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  motto?: string;
  logo_url?: string;
}

/**
 * Term information
 */
export interface TermInfo {
  term: number;
  year: number;
  end_date?: string;
  next_term_begins?: string;
}

/**
 * Attendance information
 */
export interface AttendanceInfo {
  days_attended: number;
  days_absent: number;
  total_days: number;
}

/**
 * Teacher comments
 */
export interface TeacherComments {
  class_teacher_comment?: string;
  class_teacher_signature?: string;
  headteacher_comment?: string;
  headteacher_signature?: string;
  behaviors_comment?: string;
}

/**
 * Complete exam results data bundle
 */
export interface ExamResultsData {
  student: StudentInfo;
  school: SchoolInfo;
  term: TermInfo;
  results: ExamResultRow[];
  attendance?: AttendanceInfo;
  comments?: TeacherComments;
  position?: number;
  total_students?: number;
}

// ============================================================================
// DATA MAPPING FUNCTIONS
// ============================================================================

/**
 * Map exam results data to Template 7 format
 */
export function mapToTemplate7Data(data: ExamResultsData): Template7Data {
  const { student, school, term, results, comments } = data;

  return {
    school: {
      name: school.school_name,
      address: school.address || '',
      phone: school.phone || '',
    },
    student: {
      name: student.student_name,
      class: student.current_class,
      age: student.age || '',
      term: `Term ${term.term}`,
      year: term.year.toString(),
      position: data.position?.toString(),
      outOf: data.total_students?.toString(),
    },
    subjects: results.map((r) => ({
      name: r.subject_name,
      marksObtained: r.marks_obtained,
      outOf: r.total_marks,
      examAgg: Math.round((r.marks_obtained / r.total_marks) * 100),
      aggGrade: r.grade || calculateGrade(r.marks_obtained, r.total_marks),
      remarks: r.remarks || '',
      initials: r.teacher_initials,
    })),
    total: results.reduce((sum, r) => sum + r.marks_obtained, 0),
    comments: {
      classTeacher: {
        text: comments?.class_teacher_comment || '',
        signature: comments?.class_teacher_signature,
      },
      headteacher: {
        text: comments?.headteacher_comment || '',
        signature: comments?.headteacher_signature,
      },
    },
    requirements: 'School requirements as per school policy',
    termDates: {
      endDate: term.end_date || '',
      nextTermBegins: term.next_term_begins || '',
    },
  };
}

/**
 * Map exam results data to Template 8 format
 */
export function mapToTemplate8Data(
  data: ExamResultsData,
  skillsAssessment?: Array<{ skill: string; status: SkillStatus }>
): Template8Data {
  const { student, school, term, results, comments, attendance } = data;

  return {
    school: {
      name: school.school_name,
      address: school.address || '',
      phone: school.phone || '',
      logo: school.logo_url,
    },
    student: {
      name: student.student_name,
      class: student.current_class,
      year: term.year.toString(),
      term: `Term ${term.term}`,
      age: student.age || '',
      date: new Date().toISOString().split('T')[0],
      linNo: student.registration_number,
    },
    skillsAssessment: skillsAssessment || [],
    subjects: results.map((r) => ({
      name: r.subject_name,
      midTerm: r.grade || calculateGrade(r.marks_obtained, r.total_marks),
      endOfTerm: r.grade,
      outOf: r.total_marks,
      teacherRemarks: r.remarks,
      signature: r.teacher_initials,
    })),
    total: results.reduce((sum, r) => sum + r.marks_obtained, 0),
    comments: {
      classTeacher: {
        text: comments?.class_teacher_comment || '',
        signature: comments?.class_teacher_signature,
      },
      headteacher: {
        text: comments?.headteacher_comment || '',
        signature: comments?.headteacher_signature,
      },
    },
    termDates: {
      nextTermBegins: term.next_term_begins || '',
      endsOn: term.end_date || '',
    },
    requirements: {
      boarding: [],
      day: [],
    },
  };
}

/**
 * Map exam results data to Template 9 format
 */
export function mapToTemplate9Data(data: ExamResultsData): Template9Data {
  const { student, school, term, results, comments } = data;

  return {
    school: {
      name: school.school_name,
      subtitle: 'Mixed Day & Boarding nursery and primary school',
      address: school.address || '',
      phone: school.phone || '',
      email: school.email || '',
      website: school.website || '',
      motto: school.motto || '',
      logo: school.logo_url,
    },
    student: {
      name: student.student_name,
      studentId: student.student_id,
      paymentCode: student.schoolpay_code || '',
      class: student.current_class,
      stream: '',
      sex: 'MALE', // Default, should be from database
      overallGroup: calculateOverallGrade(results),
      lin: student.registration_number || '',
      photo: student.photo_url,
    },
    reportTitle: `END OF TERM ${term.term} STUDENT REPORT CARD`,
    subjects: results.map((r) => ({
      learningArea: r.subject_name,
      mot: Math.round(r.marks_obtained * 0.5), // Mid of term (example calculation)
      eot: r.marks_obtained, // End of term
      avg: r.marks_obtained,
      grade: r.grade || calculateGrade(r.marks_obtained, r.total_marks),
      comment: r.remarks || '',
      initial: r.teacher_initials,
    })),
    summary: {
      totalMark: results.reduce((sum, r) => sum + r.marks_obtained, 0),
      averageMark: Math.round(
        results.reduce((sum, r) => sum + r.marks_obtained, 0) / results.length
      ),
    },
    comments: {
      classTeacher: {
        text: comments?.class_teacher_comment || '',
        signature: comments?.class_teacher_signature,
      },
      headTeacher: {
        text: comments?.headteacher_comment || '',
        signature: comments?.headteacher_signature,
      },
    },
    termDates: {
      nextTermBegins: term.next_term_begins || '',
      endsOn: term.end_date || '',
    },
    requirements: 'School requirements as per school policy',
    gradingScale: {
      ranges: ['0.0 - 19.9', '20.0 - 39.9', '40.0 - 69.9', '70.0 - 89.9', '90.0 - 100.0'],
      grades: ['E', 'D', 'C', 'B', 'A'],
    },
  };
}

/**
 * Map exam results data to Template 10 format
 */
export function mapToTemplate10Data(data: ExamResultsData): Template10Data {
  const { student, school, term, results, comments, attendance } = data;

  return {
    school: {
      name: school.school_name,
      address: school.address || '',
      website: school.website || '',
      phone: school.phone || '',
      motto: school.motto || '',
      logo: school.logo_url,
    },
    reportTitle: `LEARNER'S ASSESSMENT REPORT TERM ${term.term}, ${term.year}`,
    student: {
      name: student.student_name,
      class: student.current_class,
      regNo: student.registration_number || '',
      daysAttended: attendance?.days_attended || 0,
      daysAbsent: attendance?.days_absent || 0,
      totalDays: attendance?.total_days || 0,
      feesBal: student.fees_balance || 0,
      code: student.schoolpay_code || '',
      photo: student.photo_url,
    },
    learningAreas: results.slice(0, 5).map((r, index) => ({
      number: index + 1,
      description: r.subject_name,
      score: r.marks_obtained,
      remark: r.remarks || '',
      signature: r.teacher_initials,
    })),
    activities: {
      writing: true,
      listening: true,
      reading: true,
      speaking: true,
      drawing: true,
      games: true,
      rhymes: true,
      music: true,
      health: true,
      toilet: true,
    },
    summary: {
      total: 500,
      scored: results.reduce((sum, r) => sum + r.marks_obtained, 0),
      position: data.position || 0,
      outOf: data.total_students || 0,
    },
    comments: {
      classTeacher: {
        report: comments?.class_teacher_comment || '',
        name: '',
      },
      behaviorsAndCleanliness: {
        report: comments?.behaviors_comment || '',
        name: '',
      },
      headTeacher: {
        comment: comments?.headteacher_comment || '',
        name: '',
      },
    },
    footer: {
      dateOfIssue: new Date().toISOString().split('T')[0],
      nextTermBegins: term.next_term_begins || '',
      requirements: 'School requirements as per school policy',
    },
  };
}

/**
 * Map exam results data to Template 11 format
 */
export function mapToTemplate11Data(data: ExamResultsData): Template11Data {
  const { student, school, term, comments, attendance } = data;

  return {
    school: {
      name: school.school_name,
      address: school.address || '',
      email: school.email || '',
      website: school.website || '',
      phone: school.phone || '',
      motto: school.motto || '',
      logo: school.logo_url,
    },
    reportTitle: `LEARNER'S ASSESSMENT REPORT, TERM ${term.term}, ${term.year}`,
    student: {
      regNo: student.registration_number || '',
      class: student.current_class,
      name: student.student_name,
      feesBal: student.fees_balance || 0,
      schoolPayCode: student.schoolpay_code || '',
      daysAttended: attendance?.days_attended || 0,
      daysAbsent: attendance?.days_absent || 0,
      totalDays: attendance?.total_days || 0,
      photo: student.photo_url,
    },
    activities: [
      { name: 'WRITING', comment: '' },
      { name: 'LISTENING', comment: '' },
      { name: 'READING', comment: '' },
      { name: 'SPEAKING', comment: '' },
      { name: 'DRAWING', comment: '' },
      { name: 'GAMES', comment: '' },
      { name: 'RHYMES / STORIES', comment: '' },
      { name: 'MUSIC', comment: '' },
      { name: 'HEALTH HABITS', comment: '' },
      { name: 'TOILET HABITS', comment: '' },
    ],
    comments: {
      classTeacher: {
        report: comments?.class_teacher_comment || '',
      },
      behaviorsAndCleanliness: {
        report: comments?.behaviors_comment || '',
      },
      headTeacher: {
        comment: comments?.headteacher_comment || '',
      },
    },
    footer: {
      dateOfIssue: new Date().toISOString().split('T')[0],
      nextTermBegins: term.next_term_begins || '',
      requirements: 'School requirements as per school policy',
    },
  };
}

/**
 * Map exam results data to Template 12 format
 */
export function mapToTemplate12Data(data: ExamResultsData): Template12Data {
  const { student, school, term, results, comments, attendance } = data;

  return {
    school: {
      name: school.school_name,
      address: school.address || '',
      email: school.email || '',
      website: school.website || '',
      phone: school.phone || '',
      motto: school.motto || '',
      logo: school.logo_url,
    },
    reportTitle: `LEARNER'S ASSESSMENT REPORT, TERM ${term.term}, ${term.year}`,
    student: {
      regNo: student.registration_number || '',
      class: student.current_class,
      name: student.student_name,
      feesBal: student.fees_balance || 0,
      schoolPayCode: student.schoolpay_code || '',
      daysAttended: attendance?.days_attended || 0,
      daysAbsent: attendance?.days_absent || 0,
      totalDays: attendance?.total_days || 0,
      photo: student.photo_url,
    },
    learningAreas: results.slice(0, 5).map((r, index) => ({
      number: index + 1,
      description: r.subject_name,
      achievementScore: r.marks_obtained,
      position: data.position || 0,
      comments: r.remarks || '',
      signature: r.teacher_initials,
    })),
    summary: {
      total: 500,
      scored: results.reduce((sum, r) => sum + r.marks_obtained, 0),
      position: data.position || 0,
      outOf: data.total_students || 0,
    },
    comments: {
      classTeacher: {
        report: comments?.class_teacher_comment || '',
      },
      behaviorsAndCleanliness: {
        report: comments?.behaviors_comment || '',
      },
      headTeacher: {
        comment: comments?.headteacher_comment || '',
      },
    },
    footer: {
      dateOfIssue: new Date().toISOString().split('T')[0],
      nextTermBegins: term.next_term_begins || '',
      requirements: 'School requirements as per school policy',
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate grade from marks
 */
function calculateGrade(marksObtained: number, totalMarks: number): string {
  const percentage = (marksObtained / totalMarks) * 100;

  if (percentage >= 90) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 40) return 'C';
  if (percentage >= 20) return 'D';
  return 'E';
}

/**
 * Calculate overall grade from all results
 */
function calculateOverallGrade(results: ExamResultRow[]): string {
  if (results.length === 0) return 'E';

  const totalMarks = results.reduce((sum, r) => sum + r.total_marks, 0);
  const totalObtained = results.reduce((sum, r) => sum + r.marks_obtained, 0);

  return calculateGrade(totalObtained, totalMarks);
}

/**
 * Format ordinal position (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinalPosition(position: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = position % 100;
  return position + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
}
