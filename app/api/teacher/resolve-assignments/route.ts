export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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

    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user info
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('school_id,email,name')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (userErr || !userRow?.school_id) {
      return NextResponse.json({ error: 'User not linked to a school' }, { status: 400 });
    }

    // Resolve teacher_id
    let resolvedTeacherId: string | null = null;

    const metaTeacherId = session.user.user_metadata?.teacher_id as string | undefined;
    if (metaTeacherId) {
      const { data: tMeta } = await supabase
        .from('teachers')
        .select('teacher_id')
        .eq('school_id', userRow.school_id)
        .eq('teacher_id', metaTeacherId)
        .maybeSingle();
      if (tMeta) resolvedTeacherId = tMeta.teacher_id;
    }

    if (!resolvedTeacherId && userRow.email) {
      const { data: tEmail } = await supabase
        .from('teachers')
        .select('teacher_id')
        .eq('school_id', userRow.school_id)
        .ilike('email', userRow.email.trim())
        .maybeSingle();
      if (tEmail) resolvedTeacherId = tEmail.teacher_id;
    }

    if (!resolvedTeacherId && userRow.name) {
      const { data: tName } = await supabase
        .from('teachers')
        .select('teacher_id')
        .eq('school_id', userRow.school_id)
        .ilike('name', userRow.name.trim())
        .maybeSingle();
      if (tName) resolvedTeacherId = tName.teacher_id;
    }

    if (!resolvedTeacherId) {
      return NextResponse.json({ assignments: [], resolved_teacher_id: null });
    }

    // Get teacher assignments
    const { data: assignments, error: assignErr } = await supabase
      .from('teacher_class_subjects')
      .select('class_name, subject')
      .eq('school_id', userRow.school_id)
      .eq('teacher_id', resolvedTeacherId);

    if (assignErr) {
      return NextResponse.json({ error: assignErr.message }, { status: 500 });
    }

    // Return assignments in the format expected by the frontend
    return NextResponse.json({
      assignments: assignments || [],
      resolved_teacher_id: resolvedTeacherId
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
