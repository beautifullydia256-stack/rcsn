import { supabase } from '../lib/supabase';
import { fetchAllReportSnapshotDataRows } from '../lib/fetchAllReportSnapshotDataPaged';
import { isDesktopApp } from '../lib/isDesktopApp';
import { getFunctionInvokeErrorDetail } from '../lib/supabaseFunctionInvokeError';
import { buildReportAttendanceDetails } from '../lib/reportAttendanceDetails';
import { transformSnapshotToReportFormat } from './reportDataTransformer';
import { calculatePrimaryGrade } from '../lib/reportUtils';

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
 * Trigger bulk report generation via Edge Function (generate-reports-final).
 * Prefer this over client-side generateReportsBulkClient. Preview uses generate-report-preview (read-only).
 */
export async function triggerBulkGeneration(
  snapshotId: string,
  templateId?: string,
  classNames?: string[],
  studentIds?: string[]
): Promise<{ success: boolean; generatedCount?: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-reports-final', {
      body: {
        snapshotId,
        templateId,
        classNames,
        studentIds,
      },
      ...(isDesktopApp ? { signal: AbortSignal.timeout(15 * 60 * 1000) } : {}),
    });

    if (error) throw new Error(await getFunctionInvokeErrorDetail(error));

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
 * 
 * OPTIMIZED: Parallel batch processing with caching for school/exam data.
 */
export async function generateReportsBulkClient(
  snapshotId: string,
  templateId?: string,
  classNames?: string[],
  studentIds?: string[],
  onProgress?: (current: number, total: number) => void
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

  let allSnapshotData: Record<string, unknown>[] = [];
  try {
    allSnapshotData = await fetchAllReportSnapshotDataRows(supabase, snapshotId, {
      classNames: classNames?.length ? classNames : undefined,
      studentIds: studentIds?.length ? studentIds : undefined,
    });
  } catch (dataError: unknown) {
    const msg = dataError instanceof Error ? dataError.message : String(dataError);
    return { success: false, generatedCount: 0, totalStudents: 0, error: msg };
  }

  let uniqueStudentIds = [...new Set(allSnapshotData?.map((d: any) => d.student_id) || [])];
  if (studentIds?.length) {
    uniqueStudentIds = uniqueStudentIds.filter((id) => studentIds.includes(id));
  }

  // OPTIMIZATION: Cache school and exam data (fetch once, reuse for all students)
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

  // OPTIMIZATION: Increased parallelization (10 concurrent batches instead of sequential 50-student batches)
  const parallelBatches = 10;
  const studentsPerBatch = Math.ceil(uniqueStudentIds.length / parallelBatches);
  let generatedCount = 0;

  try {
    // Helper function to generate report for a single student (reused in parallel batches)
    const generateStudentReport = async (studentId: string) => {
      const studentData = allSnapshotData?.filter((d: any) => d.student_id === studentId) || [];
      if (studentData.length === 0) return null;
      
      const firstRecord = studentData[0];
      const frozenData = (firstRecord.frozen_data ?? {}) as Record<string, unknown>;
      const examSetName = examSet?.name || '';
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
          nursery_skill_performance: d.nursery_skill_performance,
        };
      });
      
      const subjectMap = new Map<string, { subject_name: string; eot_marks: number | ''; mot_marks: number | ''; bot_marks: number | ''; eot_grade: string; mot_grade: string; bot_grade: string; total_marks: number; teacher_comment: string; teacher_name: string }>();
      const isBot = (n: string) => /beginning|bot/i.test(String(n || '').trim());
      const isMid = (n: string) => /mid|midterm|mid-term/i.test(String(n || '').trim());
      const isEot = (n: string) => /end|eot/i.test(String(n || '').trim());
      const toPrimaryGrade = (g: string, m: unknown, t: number): string => {
        const grade = (g ?? '').toString().trim();
        if (grade && !['A', 'B', 'C', 'D', 'E', 'F'].includes(grade.toUpperCase())) return grade;
        const total = t > 0 ? t : 100;
        const marksNum = Number(m);
        if (m !== '' && m != null && !Number.isNaN(marksNum)) return calculatePrimaryGrade(marksNum, total).grade;
        return grade || '';
      };
      
      for (const d of studentData) {
        const row = d as Record<string, unknown>;
        const sub = String(row.subject ?? '').trim();
        if (!sub) continue;
        const existing = subjectMap.get(sub);
        const marks = row.marks_obtained ?? '';
        const total = Number(row.total_marks ?? 100);
        const grade = toPrimaryGrade(String(row.grade ?? ''), marks, total);
        const teacherComment = (row.teacher_comment && String(row.teacher_comment).trim())
          ? String(row.teacher_comment)
          : String(row.remarks ?? '');
        const teacherName = String(row.teacher_initials ?? '');
        const examName = String(row.exam_set_name ?? examSetName);
        
        if (!existing) {
          subjectMap.set(sub, {
            subject_name: sub,
            eot_marks: isEot(examName) ? (marks as number | '') : '',
            mot_marks: isMid(examName) ? (marks as number | '') : '',
            bot_marks: isBot(examName) ? (marks as number | '') : '',
            eot_grade: isEot(examName) ? grade : '',
            mot_grade: isMid(examName) ? grade : '',
            bot_grade: isBot(examName) ? grade : '',
            total_marks: total,
            teacher_comment: teacherComment,
            teacher_name: teacherName,
          });
        } else {
          if (isEot(examName)) {
            existing.eot_marks = marks as number | '';
            existing.eot_grade = grade;
          } else if (isMid(examName)) {
            existing.mot_marks = marks as number | '';
            existing.mot_grade = grade;
          } else if (isBot(examName)) {
            existing.bot_marks = marks as number | '';
            existing.bot_grade = grade;
          }
          if (teacherComment) existing.teacher_comment = teacherComment;
          if (teacherName) existing.teacher_name = teacherName;
        }
      }
      
      const subjects = Array.from(subjectMap.values()).map((s) => {
        if (s.eot_marks === '' && s.mot_marks === '' && s.bot_marks === '') {
          const first = studentData.find((d: any) => (d.subject ?? '') === s.subject_name);
          if (first) {
            const fr = first as Record<string, unknown>;
            const mRaw = fr.marks_obtained;
            const m = (mRaw === '' || mRaw == null ? '' : mRaw) as number | '';
            const t = Number(fr.total_marks ?? 100) || 100;
            const g = toPrimaryGrade(String(fr.grade ?? ''), m, t);
            s.eot_marks = m;
            s.eot_grade = g;
            s.mot_marks = m;
            s.mot_grade = g;
          }
        }
        return s;
      });
      
      const attendanceDetails = buildReportAttendanceDetails(
        firstRecord.attendance_percentage,
        frozenData as Record<string, unknown>
      );
      
      const reportData = {
        school: {
          ...school,
          name: String(frozenData.school_name ?? school?.name ?? ''),
          address: String(frozenData.school_address ?? school?.address ?? ''),
          phone: String(frozenData.school_phone ?? school?.phone ?? ''),
          email: String(frozenData.school_email ?? school?.email ?? ''),
          motto: String(frozenData.school_motto ?? school?.motto ?? ''),
          logo_url: firstRecord.school_logo_url || school?.logo_url || null,
        },
        examSet: {
          id: snapshot.exam_set_id,
          name: examSet?.name || '',
          term: examSet?.term ?? snapshot.term,
          year: examSet?.year ?? snapshot.year,
        },
        students: [
          {
            student_id: studentId,
            name: String(frozenData.student_name ?? ''),
            current_class: firstRecord.class_name,
            admission_number: String(frozenData.admission_number ?? ''),
            profile_photo: firstRecord.student_photo_url || null,
            results,
            subjects,
            attendance: attendanceDetails,
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
              average: (() => {
                const v = firstRecord.average_percentage;
                if (v === null || v === undefined || v === '') return null;
                const n = Number(v);
                return Number.isNaN(n) ? null : Math.round(n);
              })(),
              aggregate: firstRecord.aggregate ?? null,
              division: firstRecord.division ?? null,
              attendancePercentage: firstRecord.attendance_percentage ?? null,
              classPosition: firstRecord.position ?? null,
              totalStudents: (frozenData.total_students_in_class as number | null | undefined) ?? null,
              performanceRemark: firstRecord.division || 'N/A',
              attendanceDetails,
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
    };

    // Process in parallel batches (10 concurrent batches)
    const batchPromises = [];
    for (let batchIdx = 0; batchIdx < parallelBatches; batchIdx++) {
      const start = batchIdx * studentsPerBatch;
      const end = Math.min(start + studentsPerBatch, uniqueStudentIds.length);
      if (start >= uniqueStudentIds.length) break;
      
      const batchStudentIds = uniqueStudentIds.slice(start, end);
      
      const batchPromise = (async () => {
        let batchCount = 0;
        for (const studentId of batchStudentIds) {
          try {
            const result = await generateStudentReport(studentId);
            if (result) batchCount++;
            if (onProgress) {
              onProgress(generatedCount + batchCount, uniqueStudentIds.length);
            }
          } catch (err) {
            console.error(`Failed to generate report for student ${studentId}:`, err);
            throw err;
          }
        }
        return batchCount;
      })();
      
      batchPromises.push(batchPromise);
    }

    // Wait for all batches to complete
    const batchResults = await Promise.all(batchPromises);
    generatedCount = batchResults.reduce((sum, count) => sum + count, 0);

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