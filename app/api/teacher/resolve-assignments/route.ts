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

    // Get user info from metadata
    const userMetadata = (session.user as any).user_metadata || (session.user as any).raw_user_meta_data || {};
    const school_id = userMetadata.school_id;
    const userEmail = session.user.email;
    const userName = userMetadata.name || userMetadata.teacher_name;
    
    if (!school_id) {
      return NextResponse.json({ error: 'User not linked to a school' }, { status: 400 });
    }

    // Resolve teacher_id - try multiple approaches
    let resolvedTeacherId: string | null = null;


    // Try 1: From user metadata
    const metaTeacherId = session.user.user_metadata?.teacher_id as string | undefined;
    if (metaTeacherId) {
      const { data: tMeta } = await supabase
        .from('teachers')
        .select('teacher_id')
        .eq('school_id', school_id)
        .eq('teacher_id', metaTeacherId)
        .maybeSingle();
      if (tMeta) {
        resolvedTeacherId = tMeta.teacher_id;
      }
    }

    // Try 2: By email match
    if (!resolvedTeacherId && userEmail) {
      const { data: tEmail } = await supabase
        .from('teachers')
        .select('teacher_id')
        .eq('school_id', school_id)
        .ilike('email', userEmail.trim())
        .maybeSingle();
      if (tEmail) {
        resolvedTeacherId = tEmail.teacher_id;
      }
    }

    // Try 3: By name match
    if (!resolvedTeacherId && userName) {
      const { data: tName } = await supabase
        .from('teachers')
        .select('teacher_id')
        .eq('school_id', school_id)
        .ilike('name', userName.trim())
        .maybeSingle();
      if (tName) {
        resolvedTeacherId = tName.teacher_id;
      }
    }

    // Try 4: Fallback - check if user is a teacher in the system
    if (!resolvedTeacherId) {
      const { data: allTeachers } = await supabase
        .from('teachers')
        .select('teacher_id, email, name')
        .eq('school_id', school_id);
      
      // Try to match by email or name
      const matchingTeacher = allTeachers?.find(t => 
        t.email?.toLowerCase() === userEmail?.toLowerCase() ||
        t.name?.toLowerCase() === userName?.toLowerCase()
      );
      
      if (matchingTeacher) {
        resolvedTeacherId = matchingTeacher.teacher_id;
      }
    }

    // Try 5: Service role fallback for known working cases
    if (!resolvedTeacherId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseService = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            get() { return ''; },
            set() {},
            remove() {},
          },
        }
      );
      
      const { data: serviceTeachers } = await supabaseService
        .from('teachers')
        .select('teacher_id, email, name')
        .eq('school_id', school_id);
      
      const matchingServiceTeacher = serviceTeachers?.find(t => 
        t.email?.toLowerCase() === userEmail?.toLowerCase() ||
        t.name?.toLowerCase() === userName?.toLowerCase()
      );
      
      if (matchingServiceTeacher) {
        resolvedTeacherId = matchingServiceTeacher.teacher_id;
      }
    }

    if (!resolvedTeacherId) {
      return NextResponse.json({ assignments: [], resolved_teacher_id: null });
    }

    // Get teacher assignments - try with service role to bypass RLS
    let assignments = null;
    let assignErr = null;

    // Try with service role first (bypasses RLS)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseService = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            get() { return ''; },
            set() {},
            remove() {},
          },
        }
      );
      
      const result = await supabaseService
        .from('teacher_class_subjects')
        .select('class_name, subject')
        .eq('school_id', school_id)
        .eq('teacher_id', resolvedTeacherId);
      
      assignments = result.data;
      assignErr = result.error;
    }

    // Fallback to regular client
    if (!assignments || assignErr) {
      const result = await supabase
      .from('teacher_class_subjects')
      .select('class_name, subject')
      .eq('school_id', school_id)
      .eq('teacher_id', resolvedTeacherId);
      
      assignments = result.data;
      assignErr = result.error;
    }

    if (assignErr) {
      return NextResponse.json({ error: assignErr.message }, { status: 500 });
    }


    // Return assignments in the format expected by the frontend
    return NextResponse.json({
      assignments: assignments || [],
      resolved_teacher_id: resolvedTeacherId,
      school_id: school_id,
      user_email: userEmail,
      user_name: userName
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
