// Utility functions for managing exam results consistency

import { supabase } from './supabase';

export interface MissedExamRecord {
  school_id: string;
  exam_set_id: string;
  student_id: string;
  class_name: string;
  subject: string;
  marks_obtained: number;
  total_marks: number;
  grade: string;
  remarks: string;
}

/**
 * Creates "missed exam" records for a new student when their class already has exam results
 */
export async function createMissedExamRecordsForNewStudent(
  schoolId: string,
  studentId: string,
  className: string
): Promise<{ success: boolean; recordsCreated: number; error?: string }> {
  try {
    // Check if this class has any existing exam results
    const { data: existingResults } = await supabase
      .from('exam_results')
      .select('exam_set_id, subject')
      .eq('school_id', schoolId)
      .eq('class_name', className)
      .limit(1);

    if (!existingResults || existingResults.length === 0) {
      return { success: true, recordsCreated: 0 };
    }

    // Get all unique exam sets and subjects for this class
    const { data: classExamData } = await supabase
      .from('exam_results')
      .select('exam_set_id, subject')
      .eq('school_id', schoolId)
      .eq('class_name', className);

    if (!classExamData || classExamData.length === 0) {
      return { success: true, recordsCreated: 0 };
    }

    // Get unique combinations of exam_set_id and subject
    const uniqueExams = Array.from(
      new Set(classExamData.map(item => `${item.exam_set_id}-${item.subject}`))
    ).map(combo => {
      const [exam_set_id, subject] = combo.split('-');
      return { exam_set_id, subject };
    });

    // Create "missed exam" records (0 marks) for the new student
    const missedExamRecords: MissedExamRecord[] = uniqueExams.map(exam => ({
      school_id: schoolId,
      exam_set_id: exam.exam_set_id,
      student_id: studentId,
      class_name: className,
      subject: exam.subject,
      marks_obtained: 0,
      total_marks: 100,
      grade: 'F',
      remarks: 'Missed exam - student added after exam period'
    }));

    if (missedExamRecords.length > 0) {
      const { error: examInsertError } = await supabase
        .from('exam_results')
        .insert(missedExamRecords);

      if (examInsertError) {
        return { 
          success: false, 
          recordsCreated: 0, 
          error: `Failed to create missed exam records: ${examInsertError.message}` 
        };
      }

      return { success: true, recordsCreated: missedExamRecords.length };
    }

    return { success: true, recordsCreated: 0 };
  } catch (error) {
    return { 
      success: false, 
      recordsCreated: 0, 
      error: `Error creating missed exam records: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Backfills missing exam results for existing students in a class
 * This ensures all students in a class have exam records if any student has results
 */
export async function backfillMissingExamResultsForClass(
  schoolId: string,
  className: string
): Promise<{ success: boolean; recordsCreated: number; error?: string }> {
  try {
    // Get all students in this class
    const { data: students } = await supabase
      .from('students')
      .select('student_id')
      .eq('school_id', schoolId)
      .eq('current_class', className)
      .eq('status', 'active');

    if (!students || students.length === 0) {
      return { success: true, recordsCreated: 0 };
    }

    // Get all unique exam sets and subjects for this class
    const { data: classExamData } = await supabase
      .from('exam_results')
      .select('exam_set_id, subject')
      .eq('school_id', schoolId)
      .eq('class_name', className);

    if (!classExamData || classExamData.length === 0) {
      return { success: true, recordsCreated: 0 };
    }

    // Get unique combinations of exam_set_id and subject
    const uniqueExams = Array.from(
      new Set(classExamData.map(item => `${item.exam_set_id}-${item.subject}`))
    ).map(combo => {
      const [exam_set_id, subject] = combo.split('-');
      return { exam_set_id, subject };
    });

    let totalRecordsCreated = 0;

    // For each student, check if they have all exam records
    for (const student of students) {
      const { data: existingStudentResults } = await supabase
        .from('exam_results')
        .select('exam_set_id, subject')
        .eq('school_id', schoolId)
        .eq('student_id', student.student_id);

      if (!existingStudentResults) continue;

      // Find missing exam combinations for this student
      const existingCombinations = new Set(
        existingStudentResults.map(item => `${item.exam_set_id}-${item.subject}`)
      );

      const missingExams = uniqueExams.filter(
        exam => !existingCombinations.has(`${exam.exam_set_id}-${exam.subject}`)
      );

      if (missingExams.length > 0) {
        // Create "missed exam" records for missing combinations
        const missedExamRecords: MissedExamRecord[] = missingExams.map(exam => ({
          school_id: schoolId,
          exam_set_id: exam.exam_set_id,
          student_id: student.student_id,
          class_name: className,
          subject: exam.subject,
          marks_obtained: 0,
          total_marks: 100,
          grade: 'F',
          remarks: 'Missed exam - backfilled for consistency'
        }));

        const { error: examInsertError } = await supabase
          .from('exam_results')
          .insert(missedExamRecords);

        if (examInsertError) {
          console.error(`Failed to backfill exam records for student ${student.student_id}:`, examInsertError);
        } else {
          totalRecordsCreated += missedExamRecords.length;
        }
      }
    }

    return { success: true, recordsCreated: totalRecordsCreated };
  } catch (error) {
    return { 
      success: false, 
      recordsCreated: 0, 
      error: `Error backfilling missing exam results: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Ensures exam results consistency for a class
 * This is the main function that should be called to maintain consistency
 */
export async function ensureExamResultsConsistency(
  schoolId: string,
  className: string
): Promise<{ success: boolean; recordsCreated: number; error?: string }> {
  return await backfillMissingExamResultsForClass(schoolId, className);
}
