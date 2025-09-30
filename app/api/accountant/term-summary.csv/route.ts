import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const className = url.searchParams.get('class') || '';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set() {},
        remove() {},
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
    const school_id = u?.school_id as string | undefined;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    let query = supabase.from('v_accountant_term_summary').select('*').eq('school_id', school_id);
    if (start) query = query.gte('date', start);
    if (end) query = query.lte('date', end);
    if (className) query = query.eq('current_class', className);

    const { data, error } = await query.order('date', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data || [];
    const header = ['date', 'class', 'expected_total', 'collected_total', 'outstanding_total'];
    const csv = [header.join(',')]
      .concat(rows.map((r: any) => [r.date, r.current_class || '', r.expected_total || 0, r.collected_total || 0, r.outstanding_total || 0]
        .map(v => String(v).replaceAll('"', '""')).map(v => /[,\n"]/.test(v) ? `"${v}"` : v).join(',')))
      .join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="term-summary.csv"'
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


