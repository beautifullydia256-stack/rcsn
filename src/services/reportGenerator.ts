import { supabase } from '../lib/supabase';
import { transformSnapshotToReportFormat } from './reportDataTransformer';

/**
 * Get cached report from generated_reports table
 * 
 * CRITICAL: This function ONLY retrieves cached reports.
 * It NEVER generates reports or does calculations.
 * Reports must be generated first using bulk generation.
 */
export async function getCachedReport(
  snapshotId: string,
  studentId: string,
  templateId?: string
): Promise<any | null> {
  // Check cache first
  let query = supabase
    .from('generated_reports')
    .select('report_data')
    .eq('snapshot_id', snapshotId)
    .eq('student_id', studentId);

  if (templateId) {
    query = query.eq('template_id', templateId);
  } else {
    query = query.is('template_id', null);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data?.report_data || null;
}

/**
 * DEPRECATED: Use getCachedReport instead
 * This function is kept for backward compatibility but should not be used
 * for new code. Reports must be generated via bulk generation first.
 */
export async function generateReportFromSnapshot(
  snapshotId: string,
  studentId: string,
  templateId?: string
): Promise<any> {
  // First check cache
  const cached = await getCachedReport(snapshotId, studentId, templateId);
  if (cached) {
    return cached;
  }

  // If not cached, transform from snapshot (for viewing draft snapshots)
  // But this should rarely happen - reports should be generated first
  return transformSnapshotToReportFormat(snapshotId, studentId);
}

/**
 * Trigger bulk report generation via Edge Function
 * 
 * This function calls the server-side Edge Function for bulk generation.
 * All actual generation happens server-side.
 */
export async function triggerBulkGeneration(
  snapshotId: string,
  templateId?: string,
  classNames?: string[],
  studentIds?: string[]
): Promise<{ success: boolean; generatedCount?: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-reports-bulk', {
      body: {
        snapshotId,
        templateId,
        classNames,
        studentIds,
      },
    });

    if (error) throw error;

    return {
      success: data?.success || false,
      generatedCount: data?.generatedCount,
      error: data?.error,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Bulk generation failed',
    };
  }
}

/**
 * DEPRECATED: Use triggerBulkGeneration instead
 * This client-side function is kept for backward compatibility
 * but should use Edge Function for actual generation.
 */
export async function bulkGenerateReports(
  snapshotId: string,
  templateId?: string,
  onProgress?: (progress: number, total: number) => void
): Promise<string[]> {
  // Call Edge Function instead
  const result = await triggerBulkGeneration(snapshotId, templateId);
  
  if (!result.success) {
    throw new Error(result.error || 'Bulk generation failed');
  }

  // Return empty array - actual IDs are stored in database
  return [];
}

/**
 * Bulk report generation done entirely in the client (no Edge Function, no API).
 * Same logic as supabase/functions/generate-reports-bulk. Use when Edge Function
 * is unavailable (CORS) or API proxy has env issues. Requires RLS to allow
 * SELECT on report_snapshots, report_snapshot_data, schools, exam_sets;
 * INSERT on generated_reports; UPDATE on report_snapshots.
 */
export async function generateReportsBulkClient(
  snapshotId: string,
  templateId?: string,
  classNames?: string[],
  studentIds?: string[]
): Promise<{ success: boolean; generatedCount: number; totalStudents: number; error?: string }> {
  const { data: snapshot, error: snapshotError } = await supabase
    .from('report_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single();

  if (snapshotError || !snapshot) {
    return { success: false, generatedCount: 0, totalStudents: 0, error: 'Snapshot not found' };
  }
  if (snapshot.status !== 'locked' && snapshot.status !== 'generated') {
    return { success: false, generatedCount: 0, totalStudents: 0, error: 'Snapshot must be locked before generation' };
  }

  let snapshotDataQuery = supabase
    .from('report_snapshot_data')
    .select('*')
    .eq('snapshot_id', snapshotId);
  if (classNames?.length) {
    snapshotDataQuery = snapshotDataQuery.in('class_name', classNames);
  }
  const { data: allSnapshotData, error: dataError } = await snapshotDataQuery;
  if (dataError) {
    return { success: false, generatedCount: 0, totalStudents: 0, error: dataError.message };
  }

  let uniqueStudentIds = [...new Set(allSnapshotData?.map((d: any) => d.student_id) || [])];
  if (studentIds?.length) {
    uniqueStudentIds = uniqueStudentIds.filter((id) => studentIds.includes(id));
  }

  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('school_id', snapshot.school_id)
    .single();

  const { data: examSet } = await supabase
    .from('exam_sets')
    .select('*')
    .eq('id', snapshot.exam_set_id)
    .single();

  const startTime = Date.now();
  await supabase
    .from('report_snapshots')
    .update({ status: 'generated', generation_started_at: new Date().toISOString() })
    .eq('id', snapshotId);

  const batchSize = 50;
  let generatedCount = 0;

  try {
  for (let i = 0; i < uniqueStudentIds.length; i += batchSize) {
    const batch = uniqueStudentIds.slice(i, i + batchSize);
    const inserts = batch.map(async (studentId) => {
      const studentData = allSnapshotData?.filter((d: any) => d.student_id === studentId) || [];
      if (studentData.length === 0) return null;
      const firstRecord = studentData[0];
      const frozenData = firstRecord.frozen_data || {};
      const examSetName = firstRecord.exam_set_name || examSet?.name || '';
      const effectiveRemark = (d: any) => (d.teacher_comment && String(d.teacher_comment).trim()) ? d.teacher_comment : (d.remarks || '');
      const results = studentData.map((d: any) => {
        const remark = effectiveRemark(d);
        return {
          subject: d.subject,
          marks_obtained: d.marks_obtained,
          total_marks: d.total_marks,
          grade: d.grade,
          remarks: d.remarks,
          teacher_initials: d.teacher_initials,
          teacher_comment: remark,
          exam_set_name: d.exam_set_name ?? examSetName,
          teacher_remark: remark,
          overall_remark: remark,
          remark,
          final_score: d.marks_obtained,
        };
      });
      // Template4 (Upper Section) expects student.subjects: array of { subject_name, eot_marks, mot_marks, bot_marks, eot_grade, mot_grade, bot_grade, total_marks, teacher_comment, teacher_name }
      const subjectMap = new Map<string, { subject_name: string; eot_marks: number | ''; mot_marks: number | ''; bot_marks: number | ''; eot_grade: string; mot_grade: string; bot_grade: string; total_marks: number; teacher_comment: string; teacher_name: string }>();
      const isBot = (n: string) => /beginning|bot/i.test(String(n || '').trim());
      const isMid = (n: string) => /mid|midterm|mid-term/i.test(String(n || '').trim());
      const isEot = (n: string) => /end|eot/i.test(String(n || '').trim());
      for (const d of studentData) {
        const sub = d.subject ?? '';
        if (!sub) continue;
        const existing = subjectMap.get(sub);
        const marks = d.marks_obtained ?? '';
        const grade = d.grade ?? '';
        const total = Number(d.total_marks ?? 100);
        const teacherComment = (d.teacher_comment && String(d.teacher_comment).trim()) ? d.teacher_comment : (d.remarks || '');
        const teacherName = d.teacher_initials ?? '';
        if (!existing) {
          subjectMap.set(sub, {
            subject_name: sub,
            eot_marks: isEot(d.exam_set_name ?? examSetName) ? marks : '',
            mot_marks: isMid(d.exam_set_name ?? examSetName) ? marks : '',
            bot_marks: isBot(d.exam_set_name ?? examSetName) ? marks : '',
            eot_grade: isEot(d.exam_set_name ?? examSetName) ? grade : '',
            mot_grade: isMid(d.exam_set_name ?? examSetName) ? grade : '',
            bot_grade: isBot(d.exam_set_name ?? examSetName) ? grade : '',
            total_marks: total,
            teacher_comment: teacherComment,
            teacher_name: teacherName,
          });
        } else {
          if (isEot(d.exam_set_name ?? examSetName)) {
            existing.eot_marks = marks;
            existing.eot_grade = grade;
          } else if (isMid(d.exam_set_name ?? examSetName)) {
            existing.mot_marks = marks;
            existing.mot_grade = grade;
          } else if (isBot(d.exam_set_name ?? examSetName)) {
            existing.bot_marks = marks;
            existing.bot_grade = grade;
          }
          if (teacherComment) existing.teacher_comment = teacherComment;
          if (teacherName) existing.teacher_name = teacherName;
        }
      }
      // Single exam set: use same marks/grade for eot and mot so table shows data
      const subjects = Array.from(subjectMap.values()).map((s) => {
        if (s.eot_marks === '' && s.mot_marks === '' && s.bot_marks === '') {
          const first = studentData.find((d: any) => (d.subject ?? '') === s.subject_name);
          if (first) {
            s.eot_marks = first.marks_obtained ?? '';
            s.eot_grade = first.grade ?? '';
            s.mot_marks = first.marks_obtained ?? '';
            s.mot_grade = first.grade ?? '';
          }
        }
        return s;
      });
      const reportData = {
        school: {
          ...school,
          name: frozenData.school_name || school?.name || '',
          address: frozenData.school_address || school?.address || '',
          phone: frozenData.school_phone || school?.phone || '',
          email: frozenData.school_email || school?.email || '',
          motto: frozenData.school_motto || school?.motto || '',
          logo_url: firstRecord.school_logo_url || school?.logo_url || null,
        },
        examSet: {
          id: snapshot.exam_set_id,
          name: firstRecord.exam_set_name || examSet?.name || '',
          term: firstRecord.exam_set_term || snapshot.term,
          year: firstRecord.exam_set_year || snapshot.year,
        },
        students: [
          {
            student_id: studentId,
            name: frozenData.student_name || '',
            current_class: firstRecord.class_name,
            admission_number: frozenData.admission_number || '',
            profile_photo: firstRecord.student_photo_url || null,
            results,
            subjects,
            attendance: [],
            fees: {
              expected: firstRecord.fees_expected || 0,
              paid: firstRecord.fees_paid || 0,
              balance: firstRecord.fees_balance || 0,
            },
            comments: {
              class_teacher_text: firstRecord.class_teacher_comment || '',
              headteacher_text: firstRecord.headteacher_comment || '',
              head_teacher_text: firstRecord.headteacher_comment || '',
            },
            summary: {
              totalMarks: studentData.reduce((s: number, d: any) => s + (d.marks_obtained || 0), 0),
              totalPossibleMarks: studentData.reduce((s: number, d: any) => s + (d.total_marks || 100), 0),
              average: firstRecord.average_percentage ?? null,
              aggregate: firstRecord.aggregate ?? null,
              division: firstRecord.division ?? null,
              attendancePercentage: firstRecord.attendance_percentage ?? null,
              classPosition: firstRecord.position ?? null,
              totalStudents: frozenData.total_students_in_class ?? null,
              performanceRemark: firstRecord.division || 'N/A',
            },
          },
        ],
      };
      const { data, error } = await supabase
        .from('generated_reports')
        .insert({
          snapshot_id: snapshotId,
          student_id: studentId,
          template_id: templateId ?? null,
          report_data: reportData,
          template_version: '1.0',
        })
        .select()
        .single();
      if (error) throw error;
      return data?.id;
    });
    const batchResults = await Promise.all(inserts);
    generatedCount += batchResults.filter(Boolean).length;
  }

  const duration = Math.floor((Date.now() - startTime) / 1000);
  await supabase
    .from('report_snapshots')
    .update({
      generation_completed_at: new Date().toISOString(),
      generation_duration_seconds: duration,
    })
    .eq('id', snapshotId);

  return { success: true, generatedCount, totalStudents: uniqueStudentIds.length };
  } catch (err: any) {
    return {
      success: false,
      generatedCount: 0,
      totalStudents: uniqueStudentIds.length,
      error: err.message || 'Bulk generation failed',
    };
  }
}
