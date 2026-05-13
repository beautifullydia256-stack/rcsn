/**
 * Visual Template Designer - Data Fetcher Service
 *
 * Fetches sample student data from the school system (Supabase) for use
 * in live preview and PDF generation.
 */

import { supabase } from '@/lib/supabase';

export interface SampleStudentData {
  studentName: string;
  studentClass: string;
  studentStream: string;
  studentNumber: string;
  attendancePercentage: string;
  schoolName: string;
  schoolMotto: string;
  schoolAddress: string;
  schoolContact: string;
  results: Array<{ subject: string; score: number; grade: string; remarks: string }>;
  aggregate: number;
  division: string;
  teacherRemarks: string;
  headTeacherComments: string;
  feesBalance: number;
  totalFees: number;
  amountPaid: number;
}

export class DataFetcherService {
  /**
   * Fetch sample data from Supabase for a given school.
   * Falls back to placeholder data on error or missing data.
   */
  async fetchSampleData(schoolId?: string): Promise<SampleStudentData> {
    try {
      let query = supabase
        .from('students')
        .select(`
          id,
          full_name,
          student_number,
          class:classes(name, stream),
          school:schools(name, motto, address, contact_info)
        `)
        .limit(1);

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return this.getSampleDataPlaceholder();
      }

      // Attempt to build result from fetched data; fill gaps with placeholder values
      const placeholder = this.getSampleDataPlaceholder();

      const schoolRecord = Array.isArray(data.school) ? data.school[0] : data.school;
      const classRecord = Array.isArray(data.class) ? data.class[0] : data.class;

      return {
        ...placeholder,
        studentName: (data.full_name as string) ?? placeholder.studentName,
        studentNumber: (data.student_number as string) ?? placeholder.studentNumber,
        studentClass: (classRecord?.name as string) ?? placeholder.studentClass,
        studentStream: (classRecord?.stream as string) ?? placeholder.studentStream,
        schoolName: (schoolRecord?.name as string) ?? placeholder.schoolName,
        schoolMotto: (schoolRecord?.motto as string) ?? placeholder.schoolMotto,
        schoolAddress: (schoolRecord?.address as string) ?? placeholder.schoolAddress,
        schoolContact: (schoolRecord?.contact_info as string) ?? placeholder.schoolContact,
      };
    } catch {
      return this.getSampleDataPlaceholder();
    }
  }

  /**
   * Returns hardcoded placeholder data with realistic-looking school values.
   * Used as a fallback when Supabase data is unavailable.
   */
  getSampleDataPlaceholder(): SampleStudentData {
    return {
      studentName: 'Jane Nakamya Ssemakula',
      studentClass: 'S.4',
      studentStream: 'East',
      studentNumber: 'STU-2024-0042',
      attendancePercentage: '94%',
      schoolName: 'Pweza Secondary School',
      schoolMotto: 'Excellence Through Discipline',
      schoolAddress: 'P.O. Box 1234, Kampala, Uganda',
      schoolContact: '+256 700 123 456',
      results: [
        { subject: 'Mathematics', score: 78, grade: 'B2', remarks: 'Very Good' },
        { subject: 'English Language', score: 85, grade: 'A', remarks: 'Excellent' },
        { subject: 'Physics', score: 70, grade: 'B3', remarks: 'Good' },
        { subject: 'Chemistry', score: 65, grade: 'C4', remarks: 'Good' },
        { subject: 'Biology', score: 80, grade: 'B2', remarks: 'Very Good' },
        { subject: 'History', score: 72, grade: 'B3', remarks: 'Good' },
        { subject: 'Geography', score: 68, grade: 'C4', remarks: 'Good' },
        { subject: 'Christian Religious Education', score: 90, grade: 'A', remarks: 'Excellent' },
      ],
      aggregate: 9,
      division: 'Division I',
      teacherRemarks: 'Jane is a hardworking and committed student. Keep it up!',
      headTeacherComments: 'An outstanding performance. We are proud of you, Jane.',
      feesBalance: 150000,
      totalFees: 800000,
      amountPaid: 650000,
    };
  }
}
