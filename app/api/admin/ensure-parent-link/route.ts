import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';
import { isValidRealEmail } from '@/src/lib/realEmail';

/**
 * After enrolling a student with guardian info: find existing parent user by email (or create one)
 * and link them to the student via parents table (parent_id = auth user id).
 * Same parent can be linked to multiple students (no duplicate account).
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    });

    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminRow } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', adminUser.id)
      .single();

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { student_id, school_id, name, email, phone, relationship } = body as {
      student_id?: string;
      school_id?: string;
      name?: string;
      email?: string;
      phone?: string;
      relationship?: string;
    };

    if (!student_id || !school_id || !name) {
      return NextResponse.json(
        { error: 'student_id, school_id, and name are required' },
        { status: 400 }
      );
    }

    if (!adminRow?.school_id || String(adminRow.school_id) !== String(school_id)) {
      return NextResponse.json(
        { error: 'You can only manage parents for your own school.' },
        { status: 403 }
      );
    }

    const { data: canManage, error: rpcErr } = await supabase.rpc('current_user_can_manage_students');
    if (rpcErr || !canManage) {
      return NextResponse.json(
        {
          error:
            rpcErr?.message ||
            'You do not have permission to link parents for students. Ensure your role is admin/owner/head_teacher/accountant or you have students.manage permission.',
        },
        { status: 403 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      );
    }

    const parentName = String(name).trim();
    const parentEmailRaw = email && String(email).trim() ? String(email).trim() : '';
    const parentPhone = phone && String(phone).trim() ? String(phone).trim() : null;
    const rel = relationship && String(relationship).trim() ? String(relationship).trim() : null;

    if (!parentEmailRaw || !isValidRealEmail(parentEmailRaw)) {
      return NextResponse.json(
        { error: 'A real parent email address is required (no auto-generated or placeholder addresses).' },
        { status: 400 }
      );
    }
    const parentEmail = parentEmailRaw;
    const authEmail = parentEmail;

    // Find existing parent user by email
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('email', authEmail)
      .eq('role', 'parent')
      .maybeSingle();

    let parentUserId: string;

    if (existingUser?.user_id) {
      parentUserId = existingUser.user_id;
    } else {
      const password = `Parent${Math.random().toString(36).slice(2, 10)}`;
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'parent',
          name: parentName,
          school_id,
          student_id,
        },
      });
      if (createError) {
        return NextResponse.json(
          { error: createError.message },
          { status: 400 }
        );
      }
      parentUserId = createData.user.id;
      await supabaseAdmin.from('users').insert({
        user_id: parentUserId,
        email: authEmail,
        role: 'parent',
        name: parentName,
        school_id,
        phone: parentPhone || null,
      });
    }

    // Link parent to this student (parent_id = auth user id; allow multiple students per parent)
    const { error: linkError } = await supabaseAdmin
      .from('parents')
      .insert({
        parent_id: parentUserId,
        student_id,
        school_id,
        name: parentName,
        email: parentEmail || null,
        phone: parentPhone || null,
        ...(rel ? { relationship: rel } : {}),
      });

    if (linkError) {
      if (linkError.code === '23505') {
        return NextResponse.json({ success: true, message: 'Parent already linked to this student.', parent_id: parentUserId });
      }
      return NextResponse.json(
        { error: linkError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: existingUser ? 'Parent linked to student.' : 'Parent account created and linked.',
      parent_id: parentUserId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[ensure-parent-link]', error);
    return NextResponse.json({ error: msg || 'Internal error' }, { status: 500 });
  }
}
