/**
 * Shapes report payload for secondary O/A-Level HTML (`renderTemplateHTML`).
 * Mirrors primary preview merge for comments/attendance but does not apply D1–F9 coercion.
 */
import { buildReportAttendanceDetails } from '../../lib/reportAttendanceDetails';

export function buildSecondaryShapedStudent(reportData: { students?: any[]; school?: unknown; examSet?: unknown }): Record<string, unknown> {
  const raw = reportData.students?.[0];
  if (!raw) throw new Error('No student in report data');

  const comments = raw.comments ?? {};
  const rawResults = raw.results ?? [];
  const results = rawResults.map((r: any) => {
    const remark = r.overall_remark || r.teacher_remark || r.remarks || r.teacher_comment || '';
    return {
      ...r,
      final_score: r.final_score ?? r.marks_obtained,
      overall_remark: remark,
      remark: remark,
      teacher_remark: remark,
    };
  });

  const subjects =
    raw.subjects && Array.isArray(raw.subjects) && raw.subjects.length > 0
      ? raw.subjects
      : (() => {
          const bySubject = new Map<
            string,
            {
              subject_name: string;
              eot_marks: unknown;
              mot_marks: unknown;
              bot_marks: unknown;
              eot_grade: string;
              mot_grade: string;
              bot_grade: string;
              total_marks: number;
              teacher_comment: string;
              teacher_name: string;
            }
          >();
          for (const r of results) {
            const sub = r.subject ?? '';
            if (!sub) continue;
            const marks = r.marks_obtained ?? r.final_score ?? '';
            const total = Number(r.total_marks ?? 100);
            const teacherComment = r.teacher_comment || r.remarks || r.overall_remark || r.teacher_remark || '';
            const teacherName = r.teacher_initials ?? '';
            const grade = (r.grade ?? '').toString().trim();
            if (!bySubject.has(sub)) {
              bySubject.set(sub, {
                subject_name: sub,
                eot_marks: marks,
                mot_marks: marks,
                bot_marks: '',
                eot_grade: grade,
                mot_grade: grade,
                bot_grade: '',
                total_marks: total,
                teacher_comment: teacherComment,
                teacher_name: teacherName,
              });
            } else {
              const existing = bySubject.get(sub)!;
              if (teacherComment) existing.teacher_comment = teacherComment;
              if (teacherName) existing.teacher_name = teacherName;
            }
          }
          return Array.from(bySubject.values());
        })();

  const att = raw.attendance as
    | { presentDays?: number | null; absentDays?: number | null; totalSchoolDays?: number | null; percentage?: number | null }
    | undefined;
  const summaryAtt = raw.summary as Record<string, unknown> | undefined;
  const pctRaw =
    summaryAtt?.attendancePercentage ?? summaryAtt?.attendance_percentage ?? att?.percentage;
  const inlineFrozen: Record<string, unknown> = {
    present_days: att?.presentDays ?? summaryAtt?.presentDays ?? summaryAtt?.days_present,
    absent_days: att?.absentDays ?? summaryAtt?.absentDays ?? summaryAtt?.days_absent,
    total_school_days: att?.totalSchoolDays ?? summaryAtt?.totalSchoolDays ?? summaryAtt?.total_days,
  };
  const existingDetails = summaryAtt?.attendanceDetails as Record<string, unknown> | undefined;
  const hasStoredDetails =
    existingDetails &&
    typeof existingDetails === 'object' &&
    (existingDetails.presentDays != null ||
      existingDetails.totalSchoolDays != null ||
      existingDetails.percentage != null);
  const attendanceDetails = hasStoredDetails
    ? existingDetails
    : buildReportAttendanceDetails(pctRaw as number | null | undefined, inlineFrozen);

  return {
    ...raw,
    results,
    subjects,
    summary: {
      ...(raw.summary ?? {}),
      attendanceDetails,
      attendancePercentage: pctRaw ?? (raw.summary as any)?.attendancePercentage,
    },
    attendance: attendanceDetails,
    comments: {
      ...comments,
      head_teacher_text: comments.head_teacher_text ?? comments.headteacher_text ?? '',
      class_teacher_text: comments.class_teacher_text ?? comments.class_teacher_comment ?? '',
    },
    feesBalance: raw.fees?.balance ?? raw.feesBalance ?? 0,
  };
}

/** Alias matching plan naming (shaped student is merged into `reportData` for `renderTemplateHTML`). */
export const buildSecondaryShapedReportData = buildSecondaryShapedStudent;
