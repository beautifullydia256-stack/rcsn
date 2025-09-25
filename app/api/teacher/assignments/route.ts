// app/api/teacher/assignments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'no-store');

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

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get user info (email, school_id)
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('school_id,email')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (userErr || !userRow?.school_id) {
      return NextResponse.json({ error: 'User not linked to a school' }, { status: 400 });
    }

    // Try to resolve teacher_id from raw_user_meta_data
    let teacherId: string | null = session.user.user_metadata?.teacher_id ?? null;

    // Fallback: resolve teacher_id by email if not present in metadata
    if (!teacherId && userRow.email) {
      const { data: t } = await supabase
        .from('teachers')
        .select('teacher_id')
        .eq('school_id', userRow.school_id)
        .ilike('email', userRow.email.trim())
        .maybeSingle();
      if (t) teacherId = t.teacher_id;
    }

    if (!teacherId) return NextResponse.json({ assignments: [] });

    // Fetch teacher's classes and subjects
    const { data: rows, error: tcsErr } = await supabase
      .from('teacher_class_subjects')
      .select('class_name,subject')
      .eq('school_id', userRow.school_id)
      .eq('teacher_id', teacherId);

    if (tcsErr) return NextResponse.json({ error: tcsErr.message }, { status: 500 });

    return NextResponse.json({ assignments: rows || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
