// Read-only report preview: returns report_data[] without touching report_snapshots, report_snapshot_data, or generated_reports.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildReportDataFromScope } from '../_shared/reportDataBuilder.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

/** Default cap (web); desktop app sends `largeClassPreview: true` for a higher cap. */
const PREVIEW_RESPONSE_LIMIT_DEFAULT = 100;
const PREVIEW_RESPONSE_LIMIT_DESKTOP = 2000;

interface PreviewRequest {
  schoolId: string;
  term: number;
  year: number;
  examSetId: string;
  className: string;
  studentId?: string;
  /** Set by Electron desktop build — allows full-class preview for 500+ students (still capped server-side). */
  largeClassPreview?: boolean;
}

const REPORT_GENERATION_ROLES = ['admin', 'owner', 'head_teacher', 'headteacher'];

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

    const body = (await req.json()) as PreviewRequest;
    const { schoolId, term, year, examSetId, className, studentId, largeClassPreview } = body;
    const previewCap =
      largeClassPreview === true
        ? PREVIEW_RESPONSE_LIMIT_DESKTOP
        : PREVIEW_RESPONSE_LIMIT_DEFAULT;

    if (!schoolId || term == null || year == null || !examSetId || !className) {
      return new Response(
        JSON.stringify({ error: 'schoolId, term, year, examSetId, and className are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: user profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userSchoolId = profile.school_id;
    if (!userSchoolId || userSchoolId !== schoolId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: access to this school not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const role = (profile.role || '').toLowerCase().replace(/\s+/g, '_');
    const allowed = REPORT_GENERATION_ROLES.some((r) => role === r.replace(/\s+/g, '_'));
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: role does not allow report generation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = {
      schoolId,
      term: Number(term),
      year: Number(year),
      examSetId,
      classNames: [className],
      studentIds: studentId ? [studentId] : undefined,
    };

    const { reportDataList } = await buildReportDataFromScope(supabase, payload);
    const reports = Array.isArray(reportDataList) ? reportDataList : [];

    let limited = reports;
    if (reports.length > previewCap) {
      limited = reports.slice(0, previewCap);
    }

    const durationMs = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        reports: limited,
        totalCount: reports.length,
        returnedCount: limited.length,
        truncated: reports.length > previewCap,
        previewCap,
        durationMs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Preview failed';
    const durationMs = Date.now() - startTime;
    return new Response(
      JSON.stringify({ error: message, durationMs }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
