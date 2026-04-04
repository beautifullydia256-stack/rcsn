import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { isValidRealEmail } from '@/lib/realEmail';

export const runtime = 'nodejs';

function normalizeStaffRole(role: unknown): string {
  return String(role ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

const STUDENT_MANAGE_ROLES = ['admin', 'owner', 'head_teacher', 'accountant'];

async function callerCanManageStudentsForSchool(
  supabaseAdmin: ReturnType<typeof createClient>,
  adminUserId: string,
  schoolId: string,
  adminRow: { role?: string | null }
): Promise<boolean> {
  const key = normalizeStaffRole(adminRow.role);
  if (STUDENT_MANAGE_ROLES.includes(key)) return true;
  const { data: perm } = await supabaseAdmin
    .from('user_school_permissions')
    .select('id')
    .eq('user_id', adminUserId)
    .eq('school_id', schoolId)
    .eq('permission_key', 'students.manage')
    .maybeSingle();
  return !!perm;
}

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

    if (!supabaseUrl || !supabaseAnon || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error. Please contact support.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    });

    let adminUser = null;
    const fromCookie = await supabase.auth.getUser();
    if (fromCookie.data?.user && !fromCookie.error) {
      adminUser = fromCookie.data.user;
    } else {
      const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
      const bearer =
        authHeader && /^Bearer\s+\S+/i.test(authHeader) ? authHeader.replace(/^Bearer\s+/i, '').trim() : null;
      if (bearer) {
        const fromJwt = await supabase.auth.getUser(bearer);
        if (fromJwt.data?.user && !fromJwt.error) {
          adminUser = fromJwt.data.user;
        }
      }
    }
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Match create-user-account: load staff row with service role so RLS never blocks the admin lookup.
    const { data: adminRow } = await supabaseAdmin
      .from('users')
      .select('school_id, role')
      .eq('user_id', adminUser.id)
      .maybeSingle();

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

    if (!adminRow) {
      return NextResponse.json(
        {
          error:
            'No staff profile was found for your login. Ensure public.users has a row for your account with the correct school_id.',
        },
        { status: 403 }
      );
    }
    if (!adminRow.school_id) {
      return NextResponse.json(
        {
          error:
            'Your account has no school assigned in public.users. Set school_id on your user before linking parents.',
        },
        { status: 403 }
      );
    }
    if (String(adminRow.school_id) !== String(school_id)) {
      return NextResponse.json(
        {
          error:
            'The school in this request does not match your account school. Refresh the page or sign out and back in (stale school can happen after switching users).',
        },
        { status: 403 }
      );
    }

    const canManage = await callerCanManageStudentsForSchool(
      supabaseAdmin,
      adminUser.id,
      String(school_id),
      adminRow
    );
    if (!canManage) {
      return NextResponse.json(
        {
          error:
            'You do not have permission to link parents for students. Your role must be admin, owner, head teacher, or accountant, or you need the students.manage permission for this school.',
        },
        { status: 403 }
      );
    }

    const { data: studentRow } = await supabaseAdmin
      .from('students')
      .select('student_id, school_id')
      .eq('student_id', student_id)
      .maybeSingle();
    if (!studentRow || String(studentRow.school_id) !== String(school_id)) {
      return NextResponse.json(
        {
          error:
            'That student is not enrolled in your school. You can only link parents to students at your school.',
        },
        { status: 403 }
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
      const newAuthUser = createData?.user;
      const newId = newAuthUser?.id;
      if (!newId) {
        return NextResponse.json(
          { error: 'Auth did not return a user id. Parent account was not created.' },
          { status: 502 }
        );
      }
      parentUserId = newId;
      const { error: profileErr } = await supabaseAdmin.from('users').insert({
        user_id: parentUserId,
        email: authEmail,
        role: 'parent',
        name: parentName,
        school_id,
        phone: parentPhone || null,
      });
      if (profileErr) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(parentUserId);
        } catch {
          /* best-effort */
        }
        return NextResponse.json(
          { error: profileErr.message || 'Could not save parent profile.' },
          { status: 400 }
        );
      }
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
