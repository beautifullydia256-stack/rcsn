import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

async function getSupabase(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const res = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        res.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });
  return { supabase, res };
}

export async function GET(req: NextRequest) {
  try {
    const level = (new URL(req.url).searchParams.get('level') || 'olevel').toLowerCase();
    const { supabase } = await getSupabase(req);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve user's school from metadata
    const userMetadata = (session.user as any).user_metadata || (session.user as any).raw_user_meta_data || {};
    const school_id = userMetadata.school_id;
    if (!school_id) return NextResponse.json({ error: 'User not linked to a school' }, { status: 400 });

    const { data, error } = await supabase
      .from('grade_remarks')
      .select('grade, remark')
      .eq('school_id', userRow.school_id)
      .eq('level', level)
      .order('grade');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ grade_remarks: data || [], level, school_id: userRow.school_id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const level = (body?.level || 'olevel').toLowerCase();
    const items = Array.isArray(body?.items) ? body.items as Array<{ grade: string; remark: string }> : [];
    if (items.length === 0) return NextResponse.json({ error: 'No items provided' }, { status: 400 });

    const { supabase } = await getSupabase(req);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve user's school from metadata
    const userMetadata = (session.user as any).user_metadata || (session.user as any).raw_user_meta_data || {};
    const school_id = userMetadata.school_id;
    if (!school_id) return NextResponse.json({ error: 'User not linked to a school' }, { status: 400 });

    // Upsert per-school remarks
    const payload = items.map(it => ({
      school_id: school_id,
      level,
      grade: (it.grade || '').toUpperCase(),
      remark: String(it.remark || ''),
      updated_by: session.user.id,
    }));

    const { error } = await supabase.from('grade_remarks').upsert(payload, {
      onConflict: 'school_id,level,grade',
      ignoreDuplicates: false,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}


