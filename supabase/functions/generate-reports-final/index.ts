/**
 * Generate reports final: create snapshot, insert snapshot data, lock, build report_data from locked snapshot, chunked bulk insert into generated_reports.
 * Supports full payload (schoolId, term, year, examSetId, classNames?, studentIds?) or backward-compat snapshotId-only (existing locked snapshot).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildReportDataFromScope,
  buildReportDataFromSnapshotRows,
  buildExpectedOlevelSubjectsByStudentIdForReports,
  expandOlevelClassNamesForSubjectsQuery,
  type BuildReportPayload,
  type SnapshotRowForPersist,
} from '../_shared/reportDataBuilder.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

const BULK_INSERT_CHUNK_SIZE = 400;

interface FinalRequestFull {
  schoolId: string;
  term: number;
  year: number;
  examSetId: string;
  classNames?: string[];
  studentIds?: string[];
}

interface FinalRequestLegacy {
  snapshotId: string;
  templateId?: string;
  classNames?: string[];
  studentIds?: string[];
}

const REPORT_GENERATION_ROLES = ['admin', 'owner', 'head_teacher', 'headteacher'];

/** Nested in frozen_data so senior secondary line fields round-trip without new DB columns. */
const SNAPSHOT_ROW_EXTENSIONS_KEY = '__snapshot_row_extensions';

function mapSnapshotRowToDb(row: SnapshotRowForPersist, snapshotId: string) {
  const frozenIn = { ...(row.frozen_data ?? {}) } as Record<string, unknown>;
  const ext: Record<string, unknown> = {
    activity_score: row.activity_score,
    formative_score: row.formative_score,
    exam_score: row.exam_score,
    final_score: row.final_score,
    descriptor: row.descriptor,
    paper_code: row.paper_code,
    paper_number: row.paper_number,
    topic: row.topic,
    continuous_c1: row.continuous_c1,
    continuous_c2: row.continuous_c2,
    exam_set_id: row.exam_set_id,
    exam_set_created_at: row.exam_set_created_at,
  };
  const extClean = Object.fromEntries(
    Object.entries(ext).filter(([, v]) => v !== undefined && v !== null)
  );
  if (Object.keys(extClean).length > 0) {
    frozenIn[SNAPSHOT_ROW_EXTENSIONS_KEY] = extClean;
  }

  return {
    snapshot_id: snapshotId,
    student_id: row.student_id,
    class_name: row.class_name,
    subject: row.subject,
    marks_obtained: row.marks_obtained,
    total_marks: row.total_marks,
    grade: row.grade,
    remarks: row.remarks ?? null,
    teacher_initials: row.teacher_initials ?? null,
    teacher_comment: row.teacher_comment ?? null,
    class_teacher_comment: row.class_teacher_comment ?? null,
    headteacher_comment: row.headteacher_comment ?? null,
    attendance_percentage: row.attendance_percentage ?? null,
    position: row.position ?? null,
    position_in_class: row.position ?? null,
    aggregate: row.aggregate ?? null,
    average_percentage: row.average_percentage ?? null,
    division: row.division ?? null,
    fees_balance: row.fees_balance ?? null,
    fees_paid: row.fees_paid ?? null,
    fees_expected: row.fees_expected ?? null,
    exam_set_name: row.exam_set_name ?? null,
    exam_set_term: row.exam_set_term ?? null,
    exam_set_year: row.exam_set_year ?? null,
    student_photo_url: row.student_photo_url ?? null,
    school_logo_url: row.school_logo_url ?? null,
    nursery_skill_performance: row.nursery_skill_performance ?? null,
    frozen_data: frozenIn,
  };
}

function optNumNull(v: unknown): number | null | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function mapDbRowToSnapshotRow(d: Record<string, unknown>): SnapshotRowForPersist {
  const frozen = { ...((d.frozen_data as Record<string, unknown>) ?? {}) };
  const ext = (frozen[SNAPSHOT_ROW_EXTENSIONS_KEY] as Record<string, unknown>) ?? {};
  const pos = d.position != null ? Number(d.position) : d.position_in_class != null ? Number(d.position_in_class) : undefined;
  const agg = d.aggregate != null ? Number(d.aggregate) : d.aggregate_score != null ? Number(d.aggregate_score) : undefined;

  return {
    student_id: d.student_id as string,
    class_name: d.class_name as string,
    subject: d.subject as string,
    marks_obtained: Number(d.marks_obtained ?? 0),
    total_marks: Number(d.total_marks ?? 100),
    grade: String(d.grade ?? ''),
    remarks: d.remarks as string | undefined,
    teacher_initials: d.teacher_initials as string | undefined,
    teacher_comment: d.teacher_comment as string | undefined,
    class_teacher_comment: d.class_teacher_comment as string | undefined,
    headteacher_comment: d.headteacher_comment as string | undefined,
    attendance_percentage: d.attendance_percentage != null ? Number(d.attendance_percentage) : undefined,
    position: pos,
    aggregate: agg,
    average_percentage: d.average_percentage != null ? Number(d.average_percentage) : undefined,
    division: (d.division as string | undefined) ?? undefined,
    fees_balance: d.fees_balance != null ? Number(d.fees_balance) : undefined,
    fees_paid: d.fees_paid != null ? Number(d.fees_paid) : undefined,
    fees_expected: d.fees_expected != null ? Number(d.fees_expected) : undefined,
    frozen_data: frozen,
    exam_set_name: (d.exam_set_name as string | undefined) ?? undefined,
    exam_set_id: ext.exam_set_id !== undefined ? (ext.exam_set_id != null ? String(ext.exam_set_id) : undefined) : undefined,
    exam_set_created_at:
      ext.exam_set_created_at !== undefined
        ? ext.exam_set_created_at != null
          ? String(ext.exam_set_created_at)
          : null
        : undefined,
    exam_set_term: d.exam_set_term != null ? Number(d.exam_set_term) : undefined,
    exam_set_year: d.exam_set_year != null ? Number(d.exam_set_year) : undefined,
    student_photo_url: (d.student_photo_url as string | null | undefined) ?? null,
    school_logo_url: (d.school_logo_url as string | null | undefined) ?? null,
    nursery_skill_performance:
      d.nursery_skill_performance != null &&
      typeof d.nursery_skill_performance === 'object' &&
      !Array.isArray(d.nursery_skill_performance)
        ? (d.nursery_skill_performance as Record<string, unknown>)
        : undefined,
    activity_score: ext.activity_score !== undefined ? optNumNull(ext.activity_score) ?? null : undefined,
    formative_score: ext.formative_score !== undefined ? optNumNull(ext.formative_score) ?? null : undefined,
    exam_score: ext.exam_score !== undefined ? optNumNull(ext.exam_score) ?? null : undefined,
    final_score: ext.final_score !== undefined ? optNumNull(ext.final_score) ?? null : undefined,
    descriptor: ext.descriptor !== undefined ? (ext.descriptor != null ? String(ext.descriptor) : null) : undefined,
    paper_code: ext.paper_code !== undefined ? (ext.paper_code != null ? String(ext.paper_code) : null) : undefined,
    paper_number: ext.paper_number !== undefined ? (ext.paper_number != null ? String(ext.paper_number) : null) : undefined,
    topic: ext.topic !== undefined ? (ext.topic != null ? String(ext.topic) : null) : undefined,
    continuous_c1: ext.continuous_c1 !== undefined ? optNumNull(ext.continuous_c1) ?? null : undefined,
    continuous_c2: ext.continuous_c2 !== undefined ? optNumNull(ext.continuous_c2) ?? null : undefined,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = (await req.json()) as FinalRequestFull | FinalRequestLegacy;
    const hasSnapshotId = 'snapshotId' in body && body.snapshotId;

    let snapshotId: string;
    let schoolId: string;
    let examSetId: string;
    let totalStudents: number;

    if (hasSnapshotId) {
      const { snapshotId: sid, classNames, studentIds } = body as FinalRequestLegacy;
      snapshotId = sid;

      const { data: snapshot, error: snapErr } = await supabase
        .from('report_snapshots')
        .select('id, school_id, exam_set_id, status')
        .eq('id', snapshotId)
        .single();

      if (snapErr || !snapshot) {
        return new Response(
          JSON.stringify({ error: 'Snapshot not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (snapshot.status !== 'locked' && snapshot.status !== 'generated') {
        return new Response(
          JSON.stringify({ error: 'Snapshot must be locked before generation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      schoolId = snapshot.school_id;
      examSetId = snapshot.exam_set_id;

      const { data: profile } = await supabase
        .from('users')
        .select('school_id, role')
        .eq('user_id', user.id)
        .single();
      if (!profile || profile.school_id !== schoolId) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: access to this school not allowed' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const role = (profile.role || '').toLowerCase().replace(/\s+/g, '_');
      if (!REPORT_GENERATION_ROLES.some((r) => role === r.replace(/\s+/g, '_'))) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: role does not allow report generation' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let snapshotDataQuery = supabase
        .from('report_snapshot_data')
        .select('*')
        .eq('snapshot_id', snapshotId);
      if (classNames?.length) {
        const expanded = [...new Set(expandOlevelClassNamesForSubjectsQuery(classNames))];
        snapshotDataQuery = snapshotDataQuery.in('class_name', expanded);
      }
      const { data: allRows, error: dataErr } = await snapshotDataQuery;
      if (dataErr) throw dataErr;

      let uniqueStudentIds = [...new Set((allRows || []).map((d: Record<string, unknown>) => d.student_id as string))];
      if (studentIds?.length) uniqueStudentIds = uniqueStudentIds.filter((id) => studentIds.includes(id));
      totalStudents = uniqueStudentIds.length;

      const snapshotRows: SnapshotRowForPersist[] = (allRows || []).map(mapDbRowToSnapshotRow);
      const { data: school } = await supabase.from('schools').select('*').eq('school_id', schoolId).single();
      const { data: examSet } = await supabase.from('exam_sets').select('*').eq('id', examSetId).single();

      const { data: stuRowsForSubjects } = await supabase
        .from('students')
        .select('student_id, current_class')
        .eq('school_id', schoolId)
        .in('student_id', uniqueStudentIds);
      const reportClassByStudentId: Record<string, string> = {};
      for (const row of snapshotRows) {
        const sid = row.student_id;
        const cn = String(row.class_name || '').trim();
        if (!sid || !cn) continue;
        if (!reportClassByStudentId[sid]) reportClassByStudentId[sid] = cn;
      }
      let expectedOlevelSubjectsByStudentId: Record<string, string[]> = {};
      if (uniqueStudentIds.length > 0) {
        const [{ data: csRows }, { data: olRows }] = await Promise.all([
          supabase.from('class_subjects').select('class_name, subject').eq('school_id', schoolId).order('subject'),
          supabase
            .from('student_olevel_subjects')
            .select('student_id, subject_name')
            .eq('school_id', schoolId)
            .in('student_id', uniqueStudentIds)
            .order('subject_name'),
        ]);
        expectedOlevelSubjectsByStudentId = buildExpectedOlevelSubjectsByStudentIdForReports(
          (stuRowsForSubjects || []).map((s: { student_id: string; current_class?: string | null }) => ({
            student_id: s.student_id,
            current_class: reportClassByStudentId[s.student_id] ?? s.current_class,
          })) as { student_id: string; current_class?: string | null }[],
          (csRows || []) as { class_name: string; subject: string }[],
          (olRows || []) as { student_id: string; subject_name: string }[],
        );
      }

      const reportDataList = buildReportDataFromSnapshotRows(
        snapshotRows,
        (school || {}) as Record<string, unknown>,
        (examSet || { id: examSetId }) as { id: string; name?: string; term?: number; year?: number },
        snapshotId,
        expectedOlevelSubjectsByStudentId,
      ) as Record<string, unknown>[];

      const toInsert = reportDataList
        .filter((r) => {
          const sid = (r.students as { student_id?: string }[])?.[0]?.student_id;
          return sid && uniqueStudentIds.includes(sid);
        })
        .map((reportData) => {
          const studentId = (reportData.students as { student_id?: string }[])?.[0]?.student_id!;
          return {
            snapshot_id: snapshotId,
            student_id: studentId,
            template_id: (body as FinalRequestLegacy).templateId ?? null,
            report_data: reportData,
            template_version: '1.0',
          };
        });

      for (let i = 0; i < toInsert.length; i += BULK_INSERT_CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + BULK_INSERT_CHUNK_SIZE);
        const { error: insertErr } = await supabase.from('generated_reports').insert(chunk);
        if (insertErr) throw insertErr;
      }

      const durationMs = Date.now() - startTime;
      return new Response(
        JSON.stringify({
          success: true,
          snapshotId,
          generatedCount: toInsert.length,
          totalStudents,
          durationMs,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const full = body as FinalRequestFull;
    const { schoolId: reqSchoolId, term, year, examSetId: reqExamSetId, classNames = [], studentIds } = full;

    if (!reqSchoolId || term == null || year == null || !reqExamSetId) {
      return new Response(
        JSON.stringify({ error: 'schoolId, term, year, and examSetId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', user.id)
      .single();
    if (!profile || profile.school_id !== reqSchoolId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: access to this school not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const role = (profile.role || '').toLowerCase().replace(/\s+/g, '_');
    if (!REPORT_GENERATION_ROLES.some((r) => role === r.replace(/\s+/g, '_'))) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: role does not allow report generation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    schoolId = reqSchoolId;
    examSetId = reqExamSetId;

    const payload: BuildReportPayload = {
      schoolId,
      term: Number(term),
      year: Number(year),
      examSetId,
      classNames: classNames.length ? classNames : undefined,
      studentIds: studentIds?.length ? studentIds : undefined,
    };

    const { reportDataList, snapshotRowsForPersist } = await buildReportDataFromScope(supabase, payload);
    const uniqueStudents = [...new Set(snapshotRowsForPersist.map((r) => r.student_id))];
    totalStudents = uniqueStudents.length;

    const { data: newSnapshot, error: createErr } = await supabase
      .from('report_snapshots')
      .insert({
        school_id: schoolId,
        term: Number(term),
        year: Number(year),
        exam_set_id: examSetId,
        status: 'draft',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (createErr || !newSnapshot) throw createErr || new Error('Failed to create snapshot');
    snapshotId = newSnapshot.id;

    const rowsToInsert = snapshotRowsForPersist.map((row) => mapSnapshotRowToDb(row, snapshotId));
    for (let i = 0; i < rowsToInsert.length; i += BULK_INSERT_CHUNK_SIZE) {
      const chunk = rowsToInsert.slice(i, i + BULK_INSERT_CHUNK_SIZE);
      const { error: insertErr } = await supabase.from('report_snapshot_data').insert(chunk);
      if (insertErr) throw insertErr;
    }

    await supabase
      .from('report_snapshots')
      .update({
        student_count: totalStudents,
        class_count: new Set(snapshotRowsForPersist.map((r) => r.class_name)).size,
      })
      .eq('id', snapshotId);

    const { error: lockErr } = await supabase.rpc('lock_report_snapshot', { p_snapshot_id: snapshotId });
    if (lockErr) throw lockErr;

    const reportDataListForInsert = (reportDataList || []) as Record<string, unknown>[];
    const generatedRows = reportDataListForInsert.map((reportData) => {
      const studentId = (reportData.students as { student_id?: string }[])?.[0]?.student_id!;
      return {
        snapshot_id: snapshotId,
        student_id: studentId,
        template_id: null,
        report_data: reportData,
        template_version: '1.0',
      };
    });

    for (let i = 0; i < generatedRows.length; i += BULK_INSERT_CHUNK_SIZE) {
      const chunk = generatedRows.slice(i, i + BULK_INSERT_CHUNK_SIZE);
      const { error: insertErr } = await supabase.from('generated_reports').insert(chunk);
      if (insertErr) throw insertErr;
    }

    await supabase
      .from('report_snapshots')
      .update({
        status: 'generated',
        generation_started_at: new Date().toISOString(),
        generation_completed_at: new Date().toISOString(),
        generation_duration_seconds: Math.floor((Date.now() - startTime) / 1000),
      })
      .eq('id', snapshotId);

    const durationMs = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        success: true,
        snapshotId,
        generatedCount: generatedRows.length,
        totalStudents,
        durationMs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    const durationMs = Date.now() - startTime;
    return new Response(
      JSON.stringify({ error: message, durationMs }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
