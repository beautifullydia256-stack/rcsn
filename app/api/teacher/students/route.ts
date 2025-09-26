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

    // Get class parameter
    const { searchParams } = new URL(req.url);
    const className = searchParams.get('class');

    if (!className) {
      return NextResponse.json({ error: 'Class parameter is required' }, { status: 400 });
    }

    // Get students using service role to bypass RLS
    let students: any[] = [];
    let studentsError: any = null;

    if (supabaseServiceKey) {
      const supabaseService = createServerClient(supabaseUrl, supabaseServiceKey, {
        cookies: {
          get() { return ''; },
          set() {},
          remove() {},
        },
      });
      
      const result = await supabaseService
        .from('students')
        .select('student_id, name, current_class')
        .eq('school_id', userRow.school_id)
        .eq('current_class', className)
        .order('name');
      
      students = result.data || [];
      studentsError = result.error;
    }

    // Fallback to regular client if service role fails
    if (studentsError || students.length === 0) {
      const result = await supabase
        .from('students')
        .select('student_id, name, current_class')
        .eq('school_id', userRow.school_id)
        .eq('current_class', className)
        .order('name');
      
      students = result.data || [];
      studentsError = result.error;
    }

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    return NextResponse.json({ students });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
