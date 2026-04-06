import { supabase } from '../lib/supabase';
import { buildReportAttendanceDetails } from '../lib/reportAttendanceDetails';
import { getSnapshotData } from './snapshotService';
import type { SnapshotData } from './snapshotService';

/**
 * Transform snapshot data into exact report format expected by templates
 * This preserves the EXACT structure from the old system
 * NO calculations - all data is pre-calculated in snapshot
 */
export async function transformSnapshotToReportFormat(
  snapshotId: string,
  studentId: string
): Promise<any> {
  // 1. Get snapshot metadata
  const { data: snapshot } = await supabase
    .from('report_snapshots')
    .select('*, exam_sets(*), schools(*)')
    .eq('id', snapshotId)
    .single();

  if (!snapshot) {
    throw new Error('Snapshot not found');
  }

  // 2. Get snapshot data for this student only (all subjects) — single-student query when possible
  const allSnapshotData = await getSnapshotData(snapshotId, studentId);
  const studentData = allSnapshotData.filter((d) => d.student_id === studentId);

  if (studentData.length === 0) {
    throw new Error('No data found for student in snapshot');
  }

  // 3. Get student info (from frozen_data or students table as fallback)
  const firstRecord = studentData[0];
  const frozenData = firstRecord.frozen_data || {};

  // 4. Group data by subject (teacher_comment from remarks when empty - matches snapshot/reportGenerator)
  const effectiveRemark = (d: { teacher_comment?: string; remarks?: string }) =>
    (d.teacher_comment && String(d.teacher_comment).trim()) ? d.teacher_comment : (d.remarks || '');
  const results = studentData.map((d: SnapshotData) => {
    const remark = effectiveRemark(d);
    return {
      subject: d.subject,
      marks_obtained: d.marks_obtained,
      total_marks: d.total_marks,
      grade: d.grade,
      remarks: d.remarks,
      teacher_initials: d.teacher_initials,
      teacher_comment: remark,
      teacher_remark: remark,
      overall_remark: remark,
      remark,
      exam_set_id: snapshot.exam_set_id,
      exam_set_name: d.exam_set_name || snapshot.exam_sets?.name,
      nursery_skill_performance: d.nursery_skill_performance,
    };
  });

  // 5. Calculate summary from frozen data (already calculated, just extract)
  const attendanceDetails = buildReportAttendanceDetails(
    firstRecord.attendance_percentage,
    frozenData as Record<string, unknown>
  );
  const summary = {
    totalMarks: studentData.reduce((sum, d) => sum + (d.marks_obtained || 0), 0),
    totalPossibleMarks: studentData.reduce((sum, d) => sum + (d.total_marks || 100), 0),
    average: (() => {
      const v = firstRecord.average_percentage;
      if (v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : Math.round(n);
    })(),
    aggregate: firstRecord.aggregate || null,
    division: firstRecord.division || null,
    attendancePercentage: firstRecord.attendance_percentage || null,
    classPosition: firstRecord.position || null,
    totalStudents: frozenData.total_students_in_class || null,
    performanceRemark: firstRecord.division || 'N/A',
    attendanceDetails,
  };

  // 7. Build exact report format matching old system
  const reportData = {
    school: {
      ...snapshot.schools,
      name: frozenData.school_name || snapshot.schools?.name || '',
      address: frozenData.school_address || snapshot.schools?.address || '',
      phone: frozenData.school_phone || snapshot.schools?.phone || '',
      email: frozenData.school_email || snapshot.schools?.email || '',
      motto: frozenData.school_motto || snapshot.schools?.motto || '',
      logo_url: firstRecord.school_logo_url || snapshot.schools?.logo_url || null,
    },
    examSet: {
      id: snapshot.exam_set_id,
      // IMPORTANT: the snapshot itself represents the selected exam set (e.g. End of Term).
      // Snapshot rows may include Mid/End rows to support multi-column templates, so never
      // take the "firstRecord" exam_set_name (it can be Mid Term and will break preview).
      name: snapshot.exam_sets?.name || '',
      term: snapshot.exam_sets?.term ?? snapshot.term,
      year: snapshot.exam_sets?.year ?? snapshot.year,
    },
    students: [
      {
        student_id: studentId,
        name: frozenData.student_name || '',
        current_class: firstRecord.class_name,
        admission_number: frozenData.admission_number || '',
        profile_photo: firstRecord.student_photo_url || null,
        results: results,
        fees: {
          expected: firstRecord.fees_expected || 0,
          paid: firstRecord.fees_paid || 0,
          balance: firstRecord.fees_balance || 0,
        },
        comments: {
          class_teacher_text: firstRecord.class_teacher_comment || '',
          headteacher_text: firstRecord.headteacher_comment || '',
        },
        summary: summary,
        attendance: attendanceDetails,
      },
    ],
  };

  return reportData;
}

/**
 * Transform snapshot data for multiple students (bulk)
 */
export async function transformSnapshotToReportFormatBulk(
  snapshotId: string,
  studentIds?: string[]
): Promise<any[]> {
  const allSnapshotData = await getSnapshotData(snapshotId);
  const uniqueStudentIds = studentIds 
    ? studentIds 
    : [...new Set(allSnapshotData.map((d) => d.student_id))];

  const reports = await Promise.all(
    uniqueStudentIds.map((studentId) =>
      transformSnapshotToReportFormat(snapshotId, studentId)
    )
  );

  return reports;
}




