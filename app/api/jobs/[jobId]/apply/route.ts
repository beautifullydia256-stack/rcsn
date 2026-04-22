import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/src/lib/supabaseServiceRole';

type Body = {
  full_name?: string;
  email?: string;
  phone?: string;
  cover_letter?: string;
  cv_url?: string;
};

const OPEN = new Set(['open', 'draft', 'Pending', 'pending']);

/**
 * Public job application (bypasses RLS via service role). School is resolved from the job record.
 * Rate limiting can be added at the edge; do not log PII in production.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    if (!jobId || !/^[0-9a-f-]{36}$/i.test(jobId)) {
      return NextResponse.json({ error: 'Invalid job' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('job_id, school_id, status, title')
      .eq('job_id', jobId)
      .maybeSingle();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const st = (job as { status?: string }).status;
    if (st && !OPEN.has(String(st))) {
      return NextResponse.json({ error: 'This vacancy is not accepting applications' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Body;
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!fullName || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const schoolId = (job as { school_id: string }).school_id;
    const phone = typeof body.phone === 'string' ? body.phone.trim() : null;
    const cover_letter = typeof body.cover_letter === 'string' ? body.cover_letter : null;
    const cv_url = typeof body.cv_url === 'string' ? body.cv_url : null;

    const { data: ins, error: insError } = await supabase
      .from('hr_job_applications')
      .insert({
        job_id: jobId,
        school_id: schoolId,
        full_name: fullName,
        email,
        phone,
        cover_letter,
        cv_url,
        status: 'new',
      })
      .select('id')
      .single();

    if (insError) {
      return NextResponse.json({ error: insError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: (ins as { id: string }).id });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
