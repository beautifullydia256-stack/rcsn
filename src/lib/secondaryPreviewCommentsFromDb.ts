/**
 * Shared secondary preview comment resolution (O-Level + A-Level).
 * Mirrors `reportDataBuilder` / snapshot: saved `report_comments` override template bands.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isALevelClass } from '../components/reports/templates/helpers';
import { uaceGradeAndPointsFromMarks } from './uaceGradeBands';

export async function resolveSecondaryCommentsForPreviewAverage(
  supabase: SupabaseClient,
  schoolId: string,
  studentId: string,
  currentClass: string,
  term: number,
  year: number,
  averagePercent: number,
): Promise<{ class_teacher_text: string; head_teacher_text: string }> {
  const bounded = Math.max(0, Math.min(100, averagePercent));
  try {
    const [ctRes, htRes, rcRes] = await Promise.all([
      supabase
        .from('class_teacher_comments_settings')
        .select('min_percent,max_percent,comment_text')
        .eq('school_id', schoolId)
        .eq('class_name', currentClass)
        .order('min_percent', { ascending: true }),
      supabase
        .from('headteacher_comments_settings')
        .select('min_percent,max_percent,comment_text')
        .eq('school_id', schoolId)
        .order('min_percent', { ascending: true }),
      supabase
        .from('report_comments')
        .select('comment_type,comment_text')
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .eq('term', term)
        .eq('year', year),
    ]);

    let savedCt = '';
    let savedHt = '';
    for (const row of rcRes.data || []) {
      const r = row as { comment_type?: string; comment_text?: string };
      const t = String(r.comment_type || '')
        .toLowerCase()
        .replace(/\s+/g, '_');
      const text = String(r.comment_text || '');
      if (t === 'class_teacher' || t === 'class_teacher_comment') savedCt = text;
      else if (t === 'headteacher' || t === 'head_teacher' || t === 'headteacher_comment') savedHt = text;
    }

    const ctRows = (ctRes.data || []) as { min_percent?: number; max_percent?: number; comment_text?: string }[];
    const htRows = (htRes.data || []) as { min_percent?: number; max_percent?: number; comment_text?: string }[];
    const classMatch = ctRows.find(
      (s) => bounded >= Number(s.min_percent ?? 0) && bounded <= Number(s.max_percent ?? 100),
    );
    const headMatch = htRows.find(
      (s) => bounded >= Number(s.min_percent ?? 0) && bounded <= Number(s.max_percent ?? 100),
    );
    let bandClassTeacher = String(classMatch?.comment_text || '').trim();
    const bandHeadTeacher = String(headMatch?.comment_text || '').trim();

    // For A-Level classes: if class_teacher_comments_settings has no rows for this class,
    // fall back to teacher_exam_class_prefs.grade_remarks_alevel (keyed by grade letter).
    if (!bandClassTeacher && isALevelClass(currentClass)) {
      try {
        const { data: prefRows } = await supabase
          .from('teacher_exam_class_prefs')
          .select('grade_remarks_alevel')
          .eq('school_id', schoolId)
          .eq('class_name', currentClass)
          .maybeSingle();
        const gra = (prefRows as { grade_remarks_alevel?: unknown } | null)?.grade_remarks_alevel;
        if (gra && typeof gra === 'object' && !Array.isArray(gra)) {
          const gradeRemarks = gra as Record<string, string>;
          const grade = uaceGradeAndPointsFromMarks(bounded, 100).grade;
          bandClassTeacher = String(gradeRemarks[grade] || '').trim();
        }
      } catch {
        // ignore — leave bandClassTeacher empty
      }
    }

    const ct = String(savedCt).trim() || bandClassTeacher;
    const ht = String(savedHt).trim() || bandHeadTeacher;
    return { class_teacher_text: ct, head_teacher_text: ht };
  } catch (e) {
    console.warn('[secondaryPreviewCommentsFromDb] comment resolve failed', e);
    return { class_teacher_text: '', head_teacher_text: '' };
  }
}

/** Class teacher from `class_teachers` → `teachers`; head teacher from `users` role head_teacher. */
export async function fetchReportSignatureTeacherNames(
  supabase: SupabaseClient,
  schoolId: string,
  className: string,
): Promise<{ class_teacher_name: string; head_teacher_name: string }> {
  const cn = String(className || '').trim();
  try {
    const [ctRes, htRes] = await Promise.all([
      cn
        ? supabase
            .from('class_teachers')
            .select('teachers(name)')
            .eq('school_id', schoolId)
            .eq('class_name', cn)
            .maybeSingle()
        : Promise.resolve({ data: null as { teachers?: { name?: string } | { name?: string }[] } | null }),
      supabase
        .from('users')
        .select('name')
        .eq('school_id', schoolId)
        .eq('role', 'head_teacher')
        .limit(1)
        .maybeSingle(),
    ]);
    let classTeacherName = '';
    const ctRow = ctRes.data as { teachers?: { name?: string } | { name?: string }[] | null } | null;
    if (ctRow?.teachers) {
      const t = ctRow.teachers;
      if (Array.isArray(t) && t[0]?.name != null) classTeacherName = String(t[0].name).trim();
      else if (t && typeof t === 'object' && 'name' in t)
        classTeacherName = String((t as { name?: string }).name || '').trim();
    }
    const headName = String((htRes.data as { name?: string } | null)?.name || '').trim();
    return { class_teacher_name: classTeacherName, head_teacher_name: headName };
  } catch {
    return { class_teacher_name: '', head_teacher_name: '' };
  }
}
