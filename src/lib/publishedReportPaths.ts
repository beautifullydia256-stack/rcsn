/** Deterministic storage paths for published-reports bucket (must match replace_published_reports_for_scope / patch_published_reports_for_students). */

export function getStudentIdFromPreviewReportData(rd: Record<string, unknown>): string | null {
  const st = rd.students;
  if (!Array.isArray(st) || st.length === 0) return null;
  const sid = (st[0] as { student_id?: string }).student_id;
  return typeof sid === 'string' && sid.length > 0 ? sid : null;
}

export function buildPublishedStudentReportStoragePath(params: {
  schoolId: string;
  classId: string;
  term: number;
  year: number;
  examSetId: string;
  studentId: string;
}): string {
  return `reports/${params.schoolId}/${params.classId}/${params.term}_${params.year}/${params.examSetId}/students/${params.studentId}.pdf`;
}

export function buildPublishedClassBundleStoragePath(params: {
  schoolId: string;
  classId: string;
  term: number;
  year: number;
  examSetId: string;
}): string {
  return `reports/${params.schoolId}/${params.classId}/${params.term}_${params.year}/${params.examSetId}/class_bundle.zip`;
}
