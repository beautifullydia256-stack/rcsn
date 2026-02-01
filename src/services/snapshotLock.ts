import { supabase } from '../lib/supabase';
import { getSnapshotData, insertSnapshotData, lockSnapshot } from './snapshotService';
import type { SnapshotData } from './snapshotService';
import { calculateGrade, calculateDivision, calculateAggregate } from '../lib/reportUtils';

/**
 * Create a complete snapshot by locking ALL current academic data
 * This extracts and pre-calculates EVERYTHING needed for reports
 */
export async function createSnapshotFromExamSet(
  schoolId: string,
  examSetId: string,
  term: number,
  year: number
): Promise<string> {
  // 1. Create snapshot record
  const { data: snapshot, error: snapshotError } = await supabase
    .from('report_snapshots')
    .insert({
      school_id: schoolId,
      term,
      year,
      exam_set_id: examSetId,
      status: 'draft',
    })
    .select()
    .single();

  if (snapshotError) throw snapshotError;
  if (!snapshot) throw new Error('Failed to create snapshot');

  // 2. Fetch ALL exam results for this exam set (all students, all subjects)
  const { data: examResults, error: resultsError } = await supabase
    .from('exam_results')
    .select(`
      *,
      students!inner(student_id, name, current_class, admission_number, expected_fee_amount),
      exam_sets!inner(id, name, term, year)
    `)
    .eq('school_id', schoolId)
    .eq('exam_set_id', examSetId);

  if (resultsError) throw resultsError;

  // 3. Get all unique student IDs and classes
  const studentIds = [...new Set(examResults?.map((r: any) => r.student_id) || [])];
  const classNames = [...new Set(examResults?.map((r: any) => r.class_name) || [])];

  // 4. Fetch ALL additional data needed for reports
  const [
    { data: students },
    { data: attendanceData },
    { data: feesData },
    { data: studentPayments },
    { data: studentPhotos },
    { data: schoolInfo },
    { data: examSetInfo },
    { data: commentRules },
    { data: classTeacherCommentSettings },
    { data: headTeacherCommentSettings },
  ] = await Promise.all([
    supabase.from('students').select('*').eq('school_id', schoolId).in('student_id', studentIds),
    supabase.from('student_attendance').select('*').eq('school_id', schoolId).in('student_id', studentIds),
    supabase.from('student_fees').select('*').eq('school_id', schoolId).in('student_id', studentIds),
    supabase.from('student_payments').select('*').eq('school_id', schoolId).in('student_id', studentIds),
    supabase.from('student_photos').select('*').eq('school_id', schoolId).in('student_id', studentIds),
    supabase.from('schools').select('*').eq('school_id', schoolId).single(),
    supabase.from('exam_sets').select('*').eq('id', examSetId).single(),
    supabase.from('teacher_comment_rules').select('*').eq('school_id', schoolId),
    supabase.from('class_teacher_comments_settings').select('*').eq('school_id', schoolId),
    supabase.from('class_teacher_comments_settings').select('*').eq('school_id', schoolId), // Head teacher uses same table
  ]);

  // Per-student comments from report_comments (comment_type + comment_text) for this term/year
  let studentComments: Array<{ student_id: string; class_teacher_text?: string; headteacher_text?: string }> = [];
  const { data: reportCommentsRows, error: reportCommentsError } = await supabase
    .from('report_comments')
    .select('student_id, comment_type, comment_text')
    .eq('school_id', schoolId)
    .eq('term', term)
    .eq('year', year)
    .in('student_id', studentIds);
  if (!reportCommentsError && reportCommentsRows?.length) {
    const byStudent = new Map<string, { class_teacher_text?: string; headteacher_text?: string }>();
    for (const row of reportCommentsRows) {
      const t = (row.comment_type || '').toLowerCase().replace(/\s+/g, '_');
      const text = row.comment_text || '';
      if (!byStudent.has(row.student_id)) byStudent.set(row.student_id, {});
      const entry = byStudent.get(row.student_id)!;
      if (t === 'class_teacher' || t === 'class_teacher_comment') entry.class_teacher_text = text;
      else if (t === 'headteacher' || t === 'head_teacher' || t === 'headteacher_comment') entry.headteacher_text = text;
    }
    studentComments = Array.from(byStudent.entries()).map(([student_id, v]) => ({ student_id, ...v }));
  }

  // 5. Calculate fees balances (pre-calculated)
  const paidByStudent: Record<string, number> = {};
  studentPayments?.forEach((payment: any) => {
    paidByStudent[payment.student_id] = (paidByStudent[payment.student_id] || 0) + Number(payment.amount_paid || 0);
  });

  // 6. Group results by student and class for position calculation
  const studentResultsByClass: Record<string, Record<string, any[]>> = {};
  examResults?.forEach((result: any) => {
    const className = result.class_name || result.students?.current_class;
    const studentId = result.student_id;
    if (!studentResultsByClass[className]) {
      studentResultsByClass[className] = {};
    }
    if (!studentResultsByClass[className][studentId]) {
      studentResultsByClass[className][studentId] = [];
    }
    studentResultsByClass[className][studentId].push(result);
  });

  // 7. Calculate positions for each class (pre-calculated)
  const studentPositions: Record<string, number> = {};
  const studentAverages: Record<string, number> = {};
  const studentAggregates: Record<string, number> = {};

  Object.entries(studentResultsByClass).forEach(([className, classStudents]) => {
    // Calculate average for each student
    const studentAveragesList: Array<{ studentId: string; average: number; aggregate: number }> = [];
    
    Object.entries(classStudents).forEach(([studentId, results]) => {
      const validResults = results.filter((r: any) => r.marks_obtained !== null && r.total_marks !== null);
      if (validResults.length === 0) {
        studentAverages[studentId] = 0;
        studentAggregates[studentId] = 0;
        return;
      }

      const totalMarks = validResults.reduce((sum: number, r: any) => sum + Number(r.marks_obtained || 0), 0);
      const totalPossible = validResults.reduce((sum: number, r: any) => sum + Number(r.total_marks || 100), 0);
      const average = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
      
      // Calculate aggregate using reportUtils
      const aggregate = calculateAggregate(validResults.map((r: any) => ({
        marks_obtained: Number(r.marks_obtained || 0),
        total_marks: Number(r.total_marks || 100),
      })));

      studentAverages[studentId] = average;
      studentAggregates[studentId] = aggregate;
      
      studentAveragesList.push({ studentId, average, aggregate });
    });

    // Sort by average descending and assign positions
    studentAveragesList.sort((a, b) => b.average - a.average);
    studentAveragesList.forEach((item, index) => {
      studentPositions[item.studentId] = index + 1;
    });
  });

  // 8. Calculate attendance percentages (pre-calculated)
  const attendanceByStudent: Record<string, any> = {};
  attendanceData?.forEach((att: any) => {
    if (!attendanceByStudent[att.student_id]) {
      attendanceByStudent[att.student_id] = {
        presentDays: 0,
        absentDays: 0,
        totalDays: 0,
        percentage: 0,
      };
    }
    if (att.present) {
      attendanceByStudent[att.student_id].presentDays++;
    } else {
      attendanceByStudent[att.student_id].absentDays++;
    }
    attendanceByStudent[att.student_id].totalDays++;
  });

  Object.keys(attendanceByStudent).forEach((studentId) => {
    const att = attendanceByStudent[studentId];
    att.percentage = att.totalDays > 0 ? Math.round((att.presentDays / att.totalDays) * 100) : 0;
  });

  // 9. Resolve comments (pre-calculated)
  const resolvedComments: Record<string, { classTeacher: string; headTeacher: string }> = {};
  
  students?.forEach((student: any) => {
    const studentId = student.student_id;
    const average = studentAverages[studentId] || 0;
    const boundedAverage = Math.max(0, Math.min(100, average));

    // Class teacher comment
    let classTeacherComment = '';
    const classTeacherSetting = classTeacherCommentSettings?.find((s: any) =>
      s.class_name === student.current_class &&
      boundedAverage >= Number(s.min_percent) &&
      boundedAverage <= Number(s.max_percent)
    );
    if (classTeacherSetting?.comment_text) {
      classTeacherComment = classTeacherSetting.comment_text;
    } else {
      const studentComment = studentComments?.find((c: any) => c.student_id === studentId);
      if (studentComment?.class_teacher_text) {
        classTeacherComment = studentComment.class_teacher_text;
      } else if (studentComment?.class_teacher_comment) {
        classTeacherComment = studentComment.class_teacher_comment;
      }
    }

    // Head teacher comment
    let headTeacherComment = '';
    const headTeacherSetting = headTeacherCommentSettings?.find((s: any) =>
      s.class_name === student.current_class &&
      boundedAverage >= Number(s.min_percent) &&
      boundedAverage <= Number(s.max_percent)
    );
    if (headTeacherSetting?.comment_text) {
      headTeacherComment = headTeacherSetting.comment_text;
    } else {
      const studentComment = studentComments?.find((c: any) => c.student_id === studentId);
      if (studentComment?.headteacher_text) {
        headTeacherComment = studentComment.headteacher_text;
      } else if (studentComment?.headteacher_comment) {
        headTeacherComment = studentComment.headteacher_comment;
      }
    }

    resolvedComments[studentId] = {
      classTeacher: classTeacherComment,
      headTeacher: headTeacherComment,
    };
  });

  // 10. Transform and freeze ALL data
  const snapshotData: Omit<SnapshotData, 'id' | 'snapshot_id' | 'created_at'>[] = [];

  examResults?.forEach((result: any) => {
    const student = students?.find((s: any) => s.student_id === result.student_id);
    const attendance = attendanceByStudent[result.student_id];
    const studentPhoto = studentPhotos?.find((p: any) => p.student_id === result.student_id);
    const expectedFee = Number(student?.expected_fee_amount || 0);
    const totalPaid = paidByStudent[result.student_id] || 0;
    const feesBalance = Math.max(0, expectedFee - totalPaid);

    // Calculate grade and division (pre-calculated)
    const gradeInfo = calculateGrade(Number(result.marks_obtained || 0), Number(result.total_marks || 100));
    const average = studentAverages[result.student_id] || 0;
    const division = calculateDivision(average);

    snapshotData.push({
      student_id: result.student_id,
      class_name: result.class_name || student?.current_class || '',
      subject: result.subject,
      marks_obtained: Number(result.marks_obtained || 0),
      total_marks: Number(result.total_marks || 100),
      grade: gradeInfo.grade,
      remarks: result.remarks || gradeInfo.remark,
      teacher_initials: result.teacher_initials || '',
      teacher_comment: result.teacher_comment || '',
      class_teacher_comment: resolvedComments[result.student_id]?.classTeacher || '',
      headteacher_comment: resolvedComments[result.student_id]?.headTeacher || '',
      attendance_percentage: attendance?.percentage ?? undefined,
      position: studentPositions[result.student_id] ?? undefined,
      aggregate: studentAggregates[result.student_id] ?? undefined,
      average_percentage: average,
      division: division,
      fees_balance: feesBalance,
      fees_paid: totalPaid,
      fees_expected: expectedFee,
      student_photo_url: studentPhoto?.photo_url || null,
      school_logo_url: schoolInfo?.logo_url || null,
      exam_set_name: result.exam_sets?.name || examSetInfo?.name || '',
      exam_set_term: result.exam_sets?.term || examSetInfo?.term || term,
      exam_set_year: result.exam_sets?.year || examSetInfo?.year || year,
      frozen_data: {
        student_name: student?.name || '',
        admission_number: student?.admission_number || '',
        school_name: schoolInfo?.name || '',
        school_address: schoolInfo?.address || schoolInfo?.location || '',
        school_phone: schoolInfo?.phone || schoolInfo?.contact_phone || '',
        school_email: schoolInfo?.email || schoolInfo?.contact_email || '',
        school_motto: schoolInfo?.motto || '',
        total_students_in_class: Object.keys(studentResultsByClass[result.class_name] || {}).length,
        // Store all other metadata needed for templates
      },
    });
  });

  // 11. Insert ALL frozen data
  await insertSnapshotData(snapshot.id, snapshotData);

  // 12. Update snapshot with metadata
  await supabase
    .from('report_snapshots')
    .update({
      student_count: studentIds.length,
      class_count: classNames.length,
      metadata: {
        exam_set_name: examSetInfo?.name,
        total_subjects: [...new Set(examResults?.map((r: any) => r.subject) || [])].length,
      },
    })
    .eq('id', snapshot.id);

  // 13. Lock the snapshot (make it immutable)
  await lockSnapshot(snapshot.id);

  return snapshot.id;
}
