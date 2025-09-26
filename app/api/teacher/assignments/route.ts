import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

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

    // Create a service role client to bypass RLS for this specific query
    const supabaseService = createServerClient(supabaseUrl, supabaseServiceKey, {
      cookies: {
        get() { return ''; },
        set() {},
        remove() {},
      },
    });

    // 1. Get session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Get user info
    const { data: userRow } = await supabase
      .from('users')
      .select('school_id,email,name')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!userRow?.school_id) return NextResponse.json({ error: 'User not linked to a school' }, { status: 400 });

    // 3. Resolve teacher_id
    let resolvedTeacherId: string | null = null;
    const metaTeacherId = session.user.user_metadata?.teacher_id;
    if (metaTeacherId) resolvedTeacherId = metaTeacherId;

    if (!resolvedTeacherId) {
      const { data: t } = await supabase
        .from('teachers')
        .select('teacher_id')
        .eq('school_id', userRow.school_id)
        .ilike('email', userRow.email || '')
        .maybeSingle();
      if (t) resolvedTeacherId = t.teacher_id;
    }

    if (!resolvedTeacherId) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

    // 4. Get assignments using service role to bypass RLS
    const { data: assignments, error: assignErr } = await supabaseService
      .from('teacher_class_subjects')
      .select('class_name, subject')
      .eq('school_id', userRow.school_id)
      .eq('teacher_id', resolvedTeacherId);

    console.log('Teacher assignments API debug:', {
      userRow,
      resolvedTeacherId,
      assignments,
      assignErr
    });

    if (assignErr) {
      return NextResponse.json({ error: assignErr.message }, { status: 500 });
    }

    return NextResponse.json({ assignments: assignments || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}