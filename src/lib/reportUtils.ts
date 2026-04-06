// Utility functions for student report generation

import { studentAttendanceRowIsPresent } from './studentAttendanceRow';

function attendanceRowDayMs(a: { date?: string | null; attendance_date?: string | null }): number {
  const raw = a.attendance_date ?? a.date;
  if (raw == null || raw === '') return NaN;
  return new Date(raw).getTime();
}

export interface GradeScale {
  min: number;
  max: number;
  grade: string;
  points: number;
  remark: string;
}

// Ugandan grading system (secondary / O-Level style) – A to E only (no F)
export const UGANDA_GRADE_SCALE: GradeScale[] = [
  { min: 80, max: 100, grade: 'A', points: 6, remark: 'Excellent' },
  { min: 70, max: 79, grade: 'B', points: 5, remark: 'Very Good' },
  { min: 60, max: 69, grade: 'C', points: 4, remark: 'Good' },
  { min: 50, max: 59, grade: 'D', points: 3, remark: 'Pass' },
  { min: 0, max: 49, grade: 'E', points: 1, remark: 'Fail' }
];

// Primary school Subject Grade Boundaries (D1–F9) – used in report templates
export const PRIMARY_GRADE_SCALE: { min: number; max: number; grade: string }[] = [
  { min: 75, max: 100, grade: 'D1' },
  { min: 70, max: 74, grade: 'D2' },
  { min: 65, max: 69, grade: 'C3' },
  { min: 60, max: 64, grade: 'C4' },
  { min: 55, max: 59, grade: 'C5' },
  { min: 50, max: 54, grade: 'C6' },
  { min: 45, max: 49, grade: 'P7' },
  { min: 40, max: 44, grade: 'P8' },
  { min: 0, max: 39, grade: 'F9' }
];

export function calculatePrimaryGrade(marks: number, totalMarks: number): { grade: string; remark: string } {
  const percentage = (marks / totalMarks) * 100;
  const scale = PRIMARY_GRADE_SCALE.find(s => percentage >= s.min && percentage <= s.max);
  const grade = scale?.grade ?? 'F9';
  const remark = grade === 'F9' ? 'Fail' : 'Pass';
  return { grade, remark };
}

export function calculateGrade(marks: number, totalMarks: number): { grade: string; points: number; remark: string } {
  const percentage = (marks / totalMarks) * 100;
  
  const gradeInfo = UGANDA_GRADE_SCALE.find(scale => 
    percentage >= scale.min && percentage <= scale.max
  );
  
  return gradeInfo || { grade: 'E', points: 1, remark: 'Fail' };
}

export function calculateDivision(average: number): string {
  if (average >= 80) return 'Division 1';
  if (average >= 60) return 'Division 2';
  if (average >= 40) return 'Division 3';
  if (average >= 20) return 'Division 4';
  return 'Ungraded';
}

export function calculateAggregate(results: any[]): number {
  let totalPoints = 0;
  let totalSubjects = 0;
  
  results.forEach(result => {
    const gradeInfo = calculateGrade(result.marks_obtained, result.total_marks);
    totalPoints += gradeInfo.points;
    totalSubjects++;
  });
  
  return totalSubjects > 0 ? totalPoints / totalSubjects : 0;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/** Whole-number average for reports (avoids float artifacts like 28.999999999999996). */
export function formatAverageWhole(value: unknown, emptyLabel = 'N/A'): string {
  if (value === null || value === undefined || value === '') return emptyLabel;
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return emptyLabel;
  return String(Math.round(n));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-UG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
}

export function calculateAttendancePercentage(attendance: any[], examSet: any, allExamSets: any[]): number | null {
  if (attendance.length === 0 || !examSet || !allExamSets) return null;

  const dayTimes = attendance.map(attendanceRowDayMs).filter((t) => !Number.isNaN(t));
  if (dayTimes.length === 0) return null;

  // Get the first attendance record date for this class (not just this student)
  const firstAttendanceDate = new Date(Math.min(...dayTimes));
  
  // Find the LAST exam set for this term (the one with the latest activation date)
  const lastExamSetForTerm = allExamSets
    .filter(es => es.term === examSet.term && es.year === examSet.year && es.is_active)
    .sort((a, b) => new Date(b.created_at || b.updated_at).getTime() - new Date(a.created_at || a.updated_at).getTime())[0];
  
  if (!lastExamSetForTerm) return null;
  
  // Get the last exam set activation date (when the last exam set for this term was activated)
  const lastExamSetDate = new Date(lastExamSetForTerm.created_at || lastExamSetForTerm.updated_at);
  
  // Calculate total school days between first class attendance and last exam set activation
  const totalSchoolDays = calculateSchoolDaysBetween(firstAttendanceDate, lastExamSetDate);
  
  if (totalSchoolDays === 0) return null;
  
  // Count present days from attendance records within this period
  const presentDays = attendance.filter((a) => {
    const attendanceDate = new Date(a.attendance_date ?? a.date);
    return (
      studentAttendanceRowIsPresent(a) &&
      attendanceDate >= firstAttendanceDate &&
      attendanceDate <= lastExamSetDate
    );
  }).length;

  return Math.round((presentDays / totalSchoolDays) * 100);
}

export function calculateSchoolDaysBetween(startDate: Date, endDate: Date): number {
  if (startDate >= endDate) return 0;
  
  let schoolDays = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Count weekdays only (Monday to Friday)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday = 1, Friday = 5
      schoolDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return schoolDays;
}

export function getAttendanceDetails(attendance: any[], examSet: any, allExamSets: any[]): {
  totalSchoolDays: number | null;
  presentDays: number | null;
  absentDays: number | null;
  percentage: number | null;
  firstAttendanceDate: string;
  lastSchoolDay: string;
  lastExamSetName: string;
} {
  if (attendance.length === 0 || !examSet || !allExamSets) {
    return {
      totalSchoolDays: null,
      presentDays: null,
      absentDays: null,
      percentage: null,
      firstAttendanceDate: 'N/A',
      lastSchoolDay: 'N/A',
      lastExamSetName: 'N/A'
    };
  }

  const dayTimes = attendance.map(attendanceRowDayMs).filter((t) => !Number.isNaN(t));
  if (dayTimes.length === 0) {
    return {
      totalSchoolDays: null,
      presentDays: null,
      absentDays: null,
      percentage: null,
      firstAttendanceDate: 'N/A',
      lastSchoolDay: 'N/A',
      lastExamSetName: 'N/A',
    };
  }

  // Get the first attendance record date for this class
  const firstAttendanceDate = new Date(Math.min(...dayTimes));
  
  // Find the LAST exam set for this term (the one with the latest activation date)
  const lastExamSetForTerm = allExamSets
    .filter(es => es.term === examSet.term && es.year === examSet.year && es.is_active)
    .sort((a, b) => new Date(b.created_at || b.updated_at).getTime() - new Date(a.created_at || a.updated_at).getTime())[0];
  
  if (!lastExamSetForTerm) {
    return {
      totalSchoolDays: null,
      presentDays: null,
      absentDays: null,
      percentage: null,
      firstAttendanceDate: formatDate(firstAttendanceDate),
      lastSchoolDay: 'N/A',
      lastExamSetName: 'N/A'
    };
  }
  
  // Get the last exam set activation date
  const lastExamSetDate = new Date(lastExamSetForTerm.created_at || lastExamSetForTerm.updated_at);
  
  // Calculate total school days
  const totalSchoolDays = calculateSchoolDaysBetween(firstAttendanceDate, lastExamSetDate);
  
  // Count present days from attendance records within this period
  const presentDays = attendance.filter((a) => {
    const attendanceDate = new Date(a.attendance_date ?? a.date);
    return (
      studentAttendanceRowIsPresent(a) &&
      attendanceDate >= firstAttendanceDate &&
      attendanceDate <= lastExamSetDate
    );
  }).length;

  const absentDays = totalSchoolDays - presentDays;
  
  const percentage = totalSchoolDays > 0 ? Math.round((presentDays / totalSchoolDays) * 100) : null;
  
  return {
    totalSchoolDays,
    presentDays,
    absentDays,
    percentage,
    firstAttendanceDate: formatDate(firstAttendanceDate),
    lastSchoolDay: formatDate(lastExamSetDate),
    lastExamSetName: lastExamSetForTerm.name
  };
}

export function getAttendanceRemark(percentage: number): string {
  if (percentage >= 95) return 'Excellent';
  if (percentage >= 85) return 'Very Good';
  if (percentage >= 75) return 'Good';
  if (percentage >= 65) return 'Fair';
  return 'Poor';
}

export function generateReportId(): string {
  return `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function validateReportData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.school) errors.push('School information is missing');
  if (!data.examSet) errors.push('Exam set information is missing');
  if (!data.students || data.students.length === 0) errors.push('No students selected');
  
  data.students?.forEach((student: any, index: number) => {
    if (!student.name) errors.push(`Student ${index + 1}: Name is missing`);
    if (!student.current_class) errors.push(`Student ${index + 1}: Class is missing`);
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function getPerformanceRemark(average: number): string {
  if (average >= 80) return 'Outstanding performance. Keep up the excellent work!';
  if (average >= 70) return 'Very good performance. Continue working hard.';
  if (average >= 60) return 'Good performance. There is room for improvement.';
  if (average >= 50) return 'Satisfactory performance. More effort needed.';
  if (average >= 40) return 'Below average performance. Significant improvement required.';
  return 'Poor performance. Immediate attention and support needed.';
}

/**
 * Calculate class position based on overall performance (average percentage)
 * Position 1 = best performance (highest average), higher numbers = lower performance
 * Example: If there are 30 students in the class:
 * - Position 1 = performed better than all 29 others
 * - Position 30 = lowest performance in the class
 */
export function getClassPosition(students: any[], currentStudent: any): number {
  // Filter to only students in the same class
  const classStudents = students.filter(s => s.current_class === currentStudent.current_class);
  
  // Sort by average (descending - highest average first)
  // Students with null averages (missing exam results) are treated as 0 and rank last
  const sortedStudents = classStudents.sort((a, b) => {
    const avgA = a.summary.average !== null ? a.summary.average : 0;
    const avgB = b.summary.average !== null ? b.summary.average : 0;
    return avgB - avgA; // Descending order: highest average = position 1
  });
  
  // Return position (1-based index: 1st, 2nd, 3rd, etc.)
  return sortedStudents.findIndex(s => s.student_id === currentStudent.student_id) + 1;
}

export function getStreamPosition(students: any[], currentStudent: any): number | null {
  // Assuming stream is part of class name (e.g., "S1A", "S1B")
  const stream = currentStudent.current_class.replace(/\d+/g, ''); // Remove numbers to get stream
  const streamStudents = students.filter(s => 
    s.current_class.replace(/\d+/g, '') === stream
  );
  
  if (streamStudents.length === 0) return null;
  
  const sortedStreamStudents = streamStudents.sort((a, b) => {
    // Treat null averages as 0 so students with missing exam results rank last
    const avgA = a.summary.average !== null ? a.summary.average : 0;
    const avgB = b.summary.average !== null ? b.summary.average : 0;
    return avgB - avgA;
  });
  return sortedStreamStudents.findIndex(s => s.student_id === currentStudent.student_id) + 1;
}

// Helper function to format values with N/A for missing data
export function formatValue(value: any, fallback: string = 'N/A'): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return value.toString();
}

// Helper function to format percentage with N/A for missing data
export function formatPercentage(value: number | null): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return `${value}%`;
}

// Helper function to format attendance with N/A for missing data
export function formatAttendance(presentDays: number | null, totalDays: number | null, percentage: number | null): string {
  if (presentDays === null || totalDays === null || percentage === null) {
    return 'N/A';
  }
  return `${presentDays}/${totalDays} days (${percentage}%)`;
}

// Helper function to format position with indication if student missed exams
export function formatPosition(position: number | null, average: number | null): string {
  if (position === null) {
    return 'N/A';
  }
  
  // If student has no exam results (null average), show position with note
  if (average === null) {
    return `${position} (Missed Exams)`;
  }
  
  return position.toString();
}
