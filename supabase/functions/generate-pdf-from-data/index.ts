/**
 * PDF-from-data: returns report_data[] for the client to render and print (Print → Save as PDF).
 * For heavy PDF generation (50+ reports), use VITE_PDF_API_URL (Node/Puppeteer) instead.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

const MAX_REPORTS_PDF_DATA = 100;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as { reports?: unknown[] };
    const reports = Array.isArray(body?.reports) ? body.reports : [];
    if (reports.length === 0) {
      return new Response(
        JSON.stringify({ error: 'reports array is required and must be non-empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (reports.length > MAX_REPORTS_PDF_DATA) {
      return new Response(
        JSON.stringify({
          error: `Too many reports (max ${MAX_REPORTS_PDF_DATA}). Use VITE_PDF_API_URL or pagination.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({
        reports,
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
