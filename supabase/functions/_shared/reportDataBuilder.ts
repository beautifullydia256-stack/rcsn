/**
 * Shared report data builder for Edge Functions.
 * - buildReportDataFromScope: fetch + compute with FULL CLASS scope for ranking; return report_data[] and snapshot rows (no DB writes).
 * - buildReportDataFromSnapshotRows: build report_data[] from already-persisted snapshot rows (for generate-reports-final after lock).
 * Position calculation always uses full class; studentIds filter only which report_data to return.
 */

import { calculatePrimaryGrade, calculateDivision, calculateAggregate } from './reportUtils.ts';

export interface BuildReportPayload {
  schoolId: string;
  term: number;
  year: number;
  examSetId: string;
  classNames?: string[];
  studentIds?: string[];
}

export interface SnapshotRowForPersist {
  student_id: string;
  class_name: string;
  subject: string;
  marks_obtained: number;
  total_marks: number;
  grade: string;
  remarks?: string;
  teacher_initials?: string;
  teacher_comment?: string;
  class_teacher_comment?: string;
  headteacher_comment?: string;
  attendance_percentage?: number;
  position?: number;
  aggregate?: number;
  average_percentage?: number;
  division?: string;
  fees_balance?: number;
  fees_paid?: number;
  fees_expected?: number;
  student_photo_url?: string | null;
  school_logo_url?: string | null;
  exam_set_name?: string;
  exam_set_term?: number;
  exam_set_year?: number;
  frozen_data?: Record<string, unknown>;
}

export interface BuildReportResult {
  reportDataList: unknown[];
  snapshotRowsForPersist: SnapshotRowForPersist[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

function isMidTermName(name: string | null | undefined): boolean {
  const n = String(name || '').trim().toLowerCase();
  return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
}

/**
 * Fetch all data and compute with FULL CLASS scope. Apply studentIds filter only when building reportDataList.
 * So single-student preview still gets correct class position and totalStudents.
 */
export async function buildReportDataFromScope(
  supabase: SupabaseClient,
  payload: BuildReportPayload
): Promise<BuildReportResult> {
  const { schoolId, term, year, examSetId, classNames = [], studentIds } = payload;

  const { data: examSetsForTerm, error: examSetsError } = await supabase
    .from('exam_sets')
    .select('id, name, term, year')
    .eq('school_id', schoolId)
    .eq('term', term)
    .eq('year', year);
  if (examSetsError) throw new Error(examSetsError.message);
  const baseExamSet = (examSetsForTerm || []).find((es: { id: string }) => es.id === examSetId);
  if (!baseExamSet) throw new Error('Exam set not found');

  const examSetIdsToInclude: string[] =
    isMidTermName(baseExamSet.name) && examSetsForTerm?.length
      ? [examSetId]
      : (examSetsForTerm || []).map((es: { id: string }) => es.id).filter(Boolean);
  if (examSetIdsToInclude.length === 0) examSetIdsToInclude.push(examSetId);

  let examResultsQuery = supabase
    .from('exam_results')
    .select(
      `*,
      students!inner(student_id, name, current_class, admission_number, expected_fee_amount),
      exam_sets!inner(id, name, term, year)`
    )
    .eq('school_id', schoolId)
    .in('exam_set_id', examSetIdsToInclude);
  if (classNames.length > 0) {
    examResultsQuery = examResultsQuery.in('class_name', classNames);
  }
  const { data: examResults, error: resultsError } = await examResultsQuery;
  if (resultsError) throw new Error(resultsError.message);

  const allStudentIdsInClass = [...new Set((examResults || []).map((r: { student_id: string }) => r.student_id))];
  const classNamesFromResults = [...new Set((examResults || []).map((r: { class_name: string }) => r.class_name))];

  const processedByStudent: Record<string, { aggregate?: number; division?: string; class_position?: number }> = {};
  const { data: processedRows } = await supabase
    .from('processed_primary_exam_results')
    .select('student_id, aggregate, division, class_position')
    .eq('school_id', schoolId)
    .in('exam_set_id', examSetIdsToInclude)
    .in('student_id', allStudentIdsInClass);
  (processedRows || []).forEach((row: { student_id: string; aggregate?: number; division?: string; class_position?: number }) => {
    if (row.student_id && !processedByStudent[row.student_id]) {
      processedByStudent[row.student_id] = {
        aggregate: row.aggregate != null ? Number(row.aggregate) : undefined,
        division: row.division && String(row.division).trim() ? row.division : undefined,
        class_position: row.class_position != null ? Number(row.class_position) : undefined,
      };
    }
  });

  let commentSettingsQuery = supabase
    .from('class_teacher_comments_settings')
    .select('*')
    .eq('school_id', schoolId);
  if (classNamesFromResults.length > 0) {
    commentSettingsQuery = commentSettingsQuery.in('class_name', classNamesFromResults);
  }
  const [
    { data: students },
    { data: attendanceData },
    { data: studentPayments },
    { data: studentPhotos },
    { data: schoolInfo },
    { data: commentSettings },
  ] = await Promise.all([
    supabase.from('students').select('*').eq('school_id', schoolId).in('student_id', allStudentIdsInClass),
    supabase.from('student_attendance').select('*').eq('school_id', schoolId).in('student_id', allStudentIdsInClass),
    supabase.from('student_payments').select('*').eq('school_id', schoolId).in('student_id', allStudentIdsInClass),
    supabase.from('student_photos').select('*').eq('school_id', schoolId).in('student_id', allStudentIdsInClass),
    supabase.from('schools').select('*').eq('school_id', schoolId).single(),
    commentSettingsQuery,
  ]);

  let studentComments: { student_id: string; class_teacher_text?: string; headteacher_text?: string }[] = [];
  const { data: reportCommentsRows } = await supabase
    .from('report_comments')
    .select('student_id, comment_type, comment_text')
    .eq('school_id', schoolId)
    .eq('term', term)
    .eq('year', year)
    .in('student_id', allStudentIdsInClass);
  if (reportCommentsRows?.length) {
    const byStudent = new Map<string, { class_teacher_text?: string; headteacher_text?: string }>();
    for (const row of reportCommentsRows) {
      const r = row as { student_id: string; comment_type?: string; comment_text?: string };
      const t = String(r.comment_type || '').toLowerCase().replace(/\s+/g, '_');
      const text = String(r.comment_text || '');
      if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, {});
      const entry = byStudent.get(r.student_id)!;
      if (t === 'class_teacher' || t === 'class_teacher_comment') entry.class_teacher_text = text;
      else if (t === 'headteacher' || t === 'head_teacher' || t === 'headteacher_comment') entry.headteacher_text = text;
    }
    studentComments = Array.from(byStudent.entries()).map(([student_id, v]) => ({ student_id, ...v }));
  }

  const paidByStudent: Record<string, number> = {};
  (studentPayments || []).forEach((p: { student_id: string; amount_paid?: number }) => {
    paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount_paid || 0);
  });

  const studentResultsByClass: Record<string, Record<string, unknown[]>> = {};
  (examResults || []).forEach((result: { class_name?: string; students?: { current_class?: string }; student_id: string }) => {
    const className = result.class_name || result.students?.current_class;
    const studentId = result.student_id;
    if (!studentResultsByClass[className as string]) studentResultsByClass[className as string] = {};
    if (!studentResultsByClass[className as string][studentId]) studentResultsByClass[className as string][studentId] = [];
    studentResultsByClass[className as string][studentId].push(result);
  });

  const studentPositions: Record<string, number> = {};
  const studentAverages: Record<string, number> = {};
  const studentAggregates: Record<string, number> = {};

  Object.entries(studentResultsByClass).forEach(([, classStudents]) => {
    const studentAveragesList: { studentId: string; average: number; aggregate: number }[] = [];
    Object.entries(classStudents).forEach(([studentId, results]) => {
      const fromDb = processedByStudent[studentId];
      const validResults = (results as { marks_obtained?: number; total_marks?: number }[]).filter(
        (r) => r.marks_obtained != null && r.total_marks != null
      );
      if (validResults.length === 0) {
        studentAverages[studentId] = 0;
        studentAggregates[studentId] = fromDb?.aggregate ?? 0;
        if (fromDb?.class_position != null) studentPositions[studentId] = fromDb.class_position;
        return;
      }
      const totalMarks = validResults.reduce((s, r) => s + Number(r.marks_obtained || 0), 0);
      const totalPossible = validResults.reduce((s, r) => s + Number(r.total_marks || 100), 0);
      const average = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
      studentAverages[studentId] = average;
      studentAggregates[studentId] =
        fromDb?.aggregate ??
        calculateAggregate(validResults.map((r) => ({ marks_obtained: Number(r.marks_obtained || 0), total_marks: Number(r.total_marks || 100) })));
      if (fromDb?.class_position != null) studentPositions[studentId] = fromDb.class_position;
      studentAveragesList.push({ studentId, average, aggregate: studentAggregates[studentId] });
    });
    studentAveragesList.sort((a, b) => b.average - a.average);
    studentAveragesList.forEach((item, index) => {
      if (studentPositions[item.studentId] == null) studentPositions[item.studentId] = index + 1;
    });
  });

  const attendanceByStudent: Record<string, { presentDays: number; totalDays: number; percentage: number }> = {};
  (attendanceData || []).forEach((att: { student_id: string; present?: boolean }) => {
    if (!attendanceByStudent[att.student_id]) {
      attendanceByStudent[att.student_id] = { presentDays: 0, totalDays: 0, percentage: 0 };
    }
    if (att.present) attendanceByStudent[att.student_id].presentDays++;
    attendanceByStudent[att.student_id].totalDays++;
  });
  Object.keys(attendanceByStudent).forEach((sid) => {
    const a = attendanceByStudent[sid];
    a.percentage = a.totalDays > 0 ? Math.round((a.presentDays / a.totalDays) * 100) : 0;
  });

  const resolvedComments: Record<string, { classTeacher: string; headTeacher: string }> = {};
  (students || []).forEach((student: { student_id: string; current_class?: string }) => {
    const average = studentAverages[student.student_id] || 0;
    const bounded = Math.max(0, Math.min(100, average));
    const classSetting = (commentSettings || []).find(
      (s: { class_name?: string; min_percent?: number; max_percent?: number; comment_text?: string }) =>
        s.class_name === student.current_class && bounded >= Number(s.min_percent || 0) && bounded <= Number(s.max_percent || 100)
    );
    const studentComment = studentComments.find((c) => c.student_id === student.student_id);
    resolvedComments[student.student_id] = {
      classTeacher: classSetting?.comment_text || studentComment?.class_teacher_text || '',
      headTeacher: classSetting?.comment_text || studentComment?.headteacher_text || '',
    };
  });

  const snapshotData: SnapshotRowForPersist[] = [];
  (examResults || []).forEach((result: Record<string, unknown> & { student_id: string; class_name?: string; subject?: string; marks_obtained?: number; total_marks?: number; grade?: string; remarks?: string; teacher_initials?: string; teacher_comment?: string; students?: { current_class?: string; name?: string; admission_number?: string; expected_fee_amount?: number }; exam_sets?: { name?: string; term?: number; year?: number } }) => {
    const student = (students || []).find((s: { student_id: string }) => s.student_id === result.student_id) as { expected_fee_amount?: number } | undefined;
    const attendance = attendanceByStudent[result.student_id];
    const studentPhoto = (studentPhotos || []).find((p: { student_id: string }) => p.student_id === result.student_id) as { photo_url?: string } | undefined;
    const expectedFee = Number(student?.expected_fee_amount || 0);
    const totalPaid = paidByStudent[result.student_id] || 0;
    const feesBalance = Math.max(0, expectedFee - totalPaid);
    const dbGrade = result.grade && String(result.grade).trim();
    const isOldFormat = dbGrade && ['A', 'B', 'C', 'D', 'E', 'F'].includes(String(dbGrade).toUpperCase());
    const gradeInfo =
      dbGrade && !isOldFormat
        ? { grade: String(dbGrade), remark: String(result.remarks || '') }
        : calculatePrimaryGrade(Number(result.marks_obtained || 0), Number(result.total_marks || 100));
    const average = studentAverages[result.student_id] || 0;
    const fromDb = processedByStudent[result.student_id];
    const division = fromDb?.division ?? calculateDivision(average);
    const className = (result.class_name || (result.students as { current_class?: string })?.current_class) as string;
    snapshotData.push({
      student_id: result.student_id,
      class_name: className || '',
      subject: String(result.subject || ''),
      marks_obtained: Number(result.marks_obtained || 0),
      total_marks: Number(result.total_marks || 100),
      grade: gradeInfo.grade,
      remarks: result.remarks as string | undefined,
      teacher_initials: result.teacher_initials as string | undefined,
      teacher_comment:
        (result.teacher_comment && String(result.teacher_comment).trim())
          ? String(result.teacher_comment)
          : String(result.remarks || gradeInfo.remark || ''),
      class_teacher_comment: resolvedComments[result.student_id]?.classTeacher || '',
      headteacher_comment: resolvedComments[result.student_id]?.headTeacher || '',
      attendance_percentage: attendance?.percentage,
      position: processedByStudent[result.student_id]?.class_position ?? studentPositions[result.student_id],
      aggregate: processedByStudent[result.student_id]?.aggregate ?? studentAggregates[result.student_id],
      average_percentage: average,
      division,
      fees_balance: feesBalance,
      fees_paid: totalPaid,
      fees_expected: expectedFee,
      student_photo_url: studentPhoto?.photo_url || null,
      school_logo_url: (schoolInfo as { logo_url?: string })?.logo_url || null,
      exam_set_name: (result.exam_sets as { name?: string })?.name || baseExamSet?.name || '',
      exam_set_term: (result.exam_sets as { term?: number })?.term ?? baseExamSet?.term ?? term,
      exam_set_year: (result.exam_sets as { year?: number })?.year ?? baseExamSet?.year ?? year,
      frozen_data: {
        student_name: (result.students as { name?: string })?.name || '',
        admission_number: (result.students as { admission_number?: string })?.admission_number || '',
        school_name: (schoolInfo as { name?: string })?.name || '',
        school_address: (schoolInfo as { address?: string; location?: string })?.address || (schoolInfo as { location?: string })?.location || '',
        school_phone: (schoolInfo as { phone?: string; contact_phone?: string })?.phone || '',
        school_email: (schoolInfo as { email?: string; contact_email?: string })?.email || '',
        school_motto: (schoolInfo as { motto?: string })?.motto || '',
        total_students_in_class: Object.keys(studentResultsByClass[className] || {}).length,
      },
    });
  });

  const reportDataList = buildReportDataListFromSnapshotRows(
    snapshotData,
    schoolInfo as Record<string, unknown>,
    baseExamSet as { id: string; name?: string; term?: number; year?: number },
    examSetId
  );

  const toReturn = studentIds?.length
    ? reportDataList.filter((r: { students?: { student_id?: string }[] }) => r.students?.[0] && studentIds.includes(r.students[0].student_id as string))
    : reportDataList;

  return { reportDataList: toReturn, snapshotRowsForPersist: snapshotData };
}

/**
 * Build report_data[] from already-persisted snapshot rows (e.g. after lock in generate-reports-final).
 */
export function buildReportDataFromSnapshotRows(
  allSnapshotData: SnapshotRowForPersist[],
  school: Record<string, unknown>,
  examSet: { id: string; name?: string; term?: number; year?: number },
  snapshotId: string
): unknown[] {
  return buildReportDataListFromSnapshotRows(
    allSnapshotData,
    school,
    examSet,
    snapshotId
  );
}

function buildReportDataListFromSnapshotRows(
  snapshotData: SnapshotRowForPersist[],
  school: Record<string, unknown>,
  baseExamSet: { id: string; name?: string; term?: number; year?: number },
  examSetId: string
): unknown[] {
  const uniqueStudentIds = [...new Set(snapshotData.map((d) => d.student_id))];
  const list: unknown[] = [];
  const examSetName = baseExamSet?.name || '';

  for (const studentId of uniqueStudentIds) {
    const studentData = snapshotData.filter((d) => d.student_id === studentId);
    if (studentData.length === 0) continue;
    const reportData = oneReportFromSnapshotRows(studentData, school, baseExamSet, examSetId, examSetName);
    list.push(reportData);
  }
  return list;
}

function oneReportFromSnapshotRows(
  studentData: SnapshotRowForPersist[],
  school: Record<string, unknown>,
  examSet: { id: string; name?: string; term?: number; year?: number },
  _snapshotOrExamSetId: string,
  examSetName: string
): unknown {
  const firstRecord = studentData[0];
  const frozenData = firstRecord.frozen_data || {};
  const effectiveRemark = (d: SnapshotRowForPersist) =>
    (d.teacher_comment && String(d.teacher_comment).trim()) ? d.teacher_comment : (d.remarks || '');
  const results = studentData.map((d) => {
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
  const subjectMap = new Map<
    string,
    {
      subject_name: string;
      eot_marks: number | '';
      mot_marks: number | '';
      bot_marks: number | '';
      eot_grade: string;
      mot_grade: string;
      bot_grade: string;
      total_marks: number;
      teacher_comment: string;
      teacher_name: string;
    }
  >();
  for (const d of studentData) {
    const sub = d.subject ?? '';
    if (!sub) continue;
    const existing = subjectMap.get(sub);
    const marks = d.marks_obtained ?? '';
    const total = Number(d.total_marks ?? 100);
    const grade = toPrimaryGrade(d.grade ?? '', marks, total);
    const teacherComment = (d.teacher_comment && String(d.teacher_comment).trim()) ? d.teacher_comment : (d.remarks || '');
    const teacherName = d.teacher_initials ?? '';
    const examName = d.exam_set_name ?? examSetName;
    if (!existing) {
      subjectMap.set(sub, {
        subject_name: sub,
        eot_marks: isEot(examName) ? marks : '',
        mot_marks: isMid(examName) ? marks : '',
        bot_marks: isBot(examName) ? marks : '',
        eot_grade: isEot(examName) ? grade : '',
        mot_grade: isMid(examName) ? grade : '',
        bot_grade: isBot(examName) ? grade : '',
        total_marks: total,
        teacher_comment: teacherComment,
        teacher_name: teacherName,
      });
    } else {
      if (isEot(examName)) {
        existing.eot_marks = marks;
        existing.eot_grade = grade;
      } else if (isMid(examName)) {
        existing.mot_marks = marks;
        existing.mot_grade = grade;
      } else if (isBot(examName)) {
        existing.bot_marks = marks;
        existing.bot_grade = grade;
      }
      if (teacherComment) existing.teacher_comment = teacherComment;
      if (teacherName) existing.teacher_name = teacherName;
    }
  }
  const subjects = Array.from(subjectMap.values()).map((s) => {
    if (s.eot_marks === '' && s.mot_marks === '' && s.bot_marks === '') {
      const first = studentData.find((d) => (d.subject ?? '') === s.subject_name);
      if (first) {
        const m = first.marks_obtained ?? '';
        const t = Number(first.total_marks ?? 100) || 100;
        const g = toPrimaryGrade(first.grade ?? '', m, t);
        s.eot_marks = m;
        s.eot_grade = g;
        s.mot_marks = m;
        s.mot_grade = g;
      }
    }
    return s;
  });

  return {
    school: {
      ...school,
      name: (frozenData as { school_name?: string }).school_name || (school?.name as string) || '',
      address: (frozenData as { school_address?: string }).school_address || (school?.address as string) || '',
      phone: (frozenData as { school_phone?: string }).school_phone || (school?.phone as string) || '',
      email: (frozenData as { school_email?: string }).school_email || (school?.email as string) || '',
      motto: (frozenData as { school_motto?: string }).school_motto || (school?.motto as string) || '',
      logo_url: firstRecord.school_logo_url ?? (school?.logo_url as string) ?? null,
    },
    examSet: {
      id: examSet.id,
      name: examSet?.name || '',
      term: examSet?.term ?? 0,
      year: examSet?.year ?? 0,
    },
    students: [
      {
        student_id: firstRecord.student_id,
        name: (frozenData as { student_name?: string }).student_name || '',
        current_class: firstRecord.class_name,
        admission_number: (frozenData as { admission_number?: string }).admission_number || '',
        profile_photo: firstRecord.student_photo_url ?? null,
        results,
        subjects,
        attendance: [],
        fees: {
          expected: firstRecord.fees_expected ?? 0,
          paid: firstRecord.fees_paid ?? 0,
          balance: firstRecord.fees_balance ?? 0,
        },
        comments: {
          class_teacher_text: firstRecord.class_teacher_comment || '',
          headteacher_text: firstRecord.headteacher_comment || '',
          head_teacher_text: firstRecord.headteacher_comment || '',
        },
        summary: {
          totalMarks: studentData.reduce((s, d) => s + (d.marks_obtained || 0), 0),
          totalPossibleMarks: studentData.reduce((s, d) => s + (d.total_marks || 100), 0),
          average: firstRecord.average_percentage ?? null,
          aggregate: firstRecord.aggregate ?? null,
          division: firstRecord.division ?? null,
          attendancePercentage: firstRecord.attendance_percentage ?? null,
          classPosition: firstRecord.position ?? null,
          totalStudents: (frozenData as { total_students_in_class?: number }).total_students_in_class ?? null,
          performanceRemark: firstRecord.division || 'N/A',
        },
      },
    ],
  };
}
