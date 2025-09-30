import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const className = url.searchParams.get('class') || '';
    const minBalance = parseFloat(url.searchParams.get('minBalance') || '0');

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

    let query = supabase.from('v_accountant_balances').select('*').eq('school_id', school_id);
    if (className) query = query.eq('current_class', className);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data || []).filter((r: any) => (Number(r.balance) || 0) >= (minBalance || 0));
    const header = ['student_id', 'name', 'class', 'expected', 'paid', 'balance'];
    const csv = [header.join(',')]
      .concat(rows.map((r: any) => [r.student_id, r.name || '', r.current_class || '', r.expected_amount || 0, r.total_paid || 0, r.balance || 0]
        .map(v => String(v).replaceAll('"', '""')).map(v => /[,\n"]/.test(v) ? `"${v}"` : v).join(',')))
      .join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="balances.csv"'
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


