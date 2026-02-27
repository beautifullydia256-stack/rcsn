/**
 * Generate reports final: create snapshot, insert snapshot data, lock, build report_data from locked snapshot, chunked bulk insert into generated_reports.
 * Supports full payload (schoolId, term, year, examSetId, classNames?, studentIds?) or backward-compat snapshotId-only (existing locked snapshot).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildReportDataFromScope,
  buildReportDataFromSnapshotRows,
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

function mapSnapshotRowToDb(row: SnapshotRowForPersist, snapshotId: string) {
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
    aggregate: row.aggregate ?? null,
    frozen_data: row.frozen_data ?? {},
  };
}

function mapDbRowToSnapshotRow(d: Record<string, unknown>): SnapshotRowForPersist {
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
    position: d.position != null ? Number(d.position) : undefined,
    aggregate: d.aggregate != null ? Number(d.aggregate) : undefined,
    frozen_data: (d.frozen_data as Record<string, unknown>) ?? {},
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
      if (classNames?.length) snapshotDataQuery = snapshotDataQuery.in('class_name', classNames);
      const { data: allRows, error: dataErr } = await snapshotDataQuery;
      if (dataErr) throw dataErr;

      let uniqueStudentIds = [...new Set((allRows || []).map((d: Record<string, unknown>) => d.student_id as string))];
      if (studentIds?.length) uniqueStudentIds = uniqueStudentIds.filter((id) => studentIds.includes(id));
      totalStudents = uniqueStudentIds.length;

      const snapshotRows: SnapshotRowForPersist[] = (allRows || []).map(mapDbRowToSnapshotRow);
      const { data: school } = await supabase.from('schools').select('*').eq('school_id', schoolId).single();
      const { data: examSet } = await supabase.from('exam_sets').select('*').eq('id', examSetId).single();

      const reportDataList = buildReportDataFromSnapshotRows(
        snapshotRows,
        (school || {}) as Record<string, unknown>,
        (examSet || { id: examSetId }) as { id: string; name?: string; term?: number; year?: number },
        snapshotId
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

    const { snapshotRowsForPersist } = await buildReportDataFromScope(supabase, payload);
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

    const { data: lockedRows, error: fetchErr } = await supabase
      .from('report_snapshot_data')
      .select('*')
      .eq('snapshot_id', snapshotId);
    if (fetchErr) throw fetchErr;

    const lockedSnapshotRows = (lockedRows || []).map(mapDbRowToSnapshotRow);
    const { data: school } = await supabase.from('schools').select('*').eq('school_id', schoolId).single();
    const { data: examSet } = await supabase.from('exam_sets').select('*').eq('id', examSetId).single();

    const reportDataList = buildReportDataFromSnapshotRows(
      lockedSnapshotRows,
      (school || {}) as Record<string, unknown>,
      (examSet || { id: examSetId }) as { id: string; name?: string; term?: number; year?: number },
      snapshotId
    ) as Record<string, unknown>[];

    const generatedRows = reportDataList.map((reportData) => {
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
