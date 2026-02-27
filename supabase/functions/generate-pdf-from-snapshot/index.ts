/**
 * PDF-from-snapshot: fetches report_data[] for a snapshot and returns them for the client to render and print.
 * For heavy PDF (50+ reports), use VITE_PDF_API_URL (Node/Puppeteer) instead.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as { snapshotId?: string };
    const snapshotId = body?.snapshotId;
    if (!snapshotId) {
      return new Response(
        JSON.stringify({ error: 'snapshotId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const { data: snapshot, error: snapErr } = await supabase
      .from('report_snapshots')
      .select('id, school_id')
      .eq('id', snapshotId)
      .single();

    if (snapErr || !snapshot) {
      return new Response(
        JSON.stringify({ error: 'Snapshot not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .single();
    if (!profile || profile.school_id !== snapshot.school_id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: access to this school not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: rows, error: dataErr } = await supabase
      .from('generated_reports')
      .select('report_data')
      .eq('snapshot_id', snapshotId);

    if (dataErr) throw dataErr;

    const reports = (rows || []).map((r: { report_data?: unknown }) => r.report_data).filter(Boolean);

    return new Response(
      JSON.stringify({
        reports,
        snapshotId,
        message: 'Use the report preview area and Print → Save as PDF, or call VITE_PDF_API_URL for server-rendered PDF.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
