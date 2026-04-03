import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// CORS: allow frontend at www.pwezacore.com (and optional CORS_ORIGIN env) when API is on api.pwezacore.com
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

function withCors(res: NextResponse): NextResponse {
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/** Vercel: allow long-running invite/create flows */
export const maxDuration = 60;

/** Handle CORS preflight so browser allows POST from www.pwezacore.com */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/** Mirrors api/admin/create-user-account.ts (Vercel) — roster invites, head_teacher managers, teacher/otherStaff linking. */
export async function POST(request: NextRequest) {
  let adminSchoolId: string | null | undefined;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (!supabaseUrl || !supabaseAnon || !supabaseServiceKey) {
      console.error('Missing Supabase env: URL, anon key, or service role key');
      return withCors(
        NextResponse.json({ error: 'Server configuration error. Please contact support.' }, { status: 500 })
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    });

    const {
      data: { user: adminUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !adminUser) {
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    const { data: adminData } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', adminUser.id)
      .single();

    adminSchoolId = adminData?.school_id;

    const MANAGER_ROLES = ['admin', 'owner', 'head_teacher'];
    if (!adminData || !MANAGER_ROLES.includes(String(adminData.role ?? ''))) {
      return withCors(NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 }));
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return withCors(NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }));
    }

    let emailIn = body.email != null ? String(body.email).trim() : '';
    let firstName = body.firstName != null ? String(body.firstName) : '';
    let lastName = body.lastName != null ? String(body.lastName) : '';
    let roleOut = body.role != null ? String(body.role) : 'teacher';
    const { phone, password, department, position } = body as Record<string, unknown>;
    let sendEmailInvite = Boolean(body.sendEmailInvite);

    const teacherId = body.teacherId != null ? String(body.teacherId).trim() : '';
    const otherStaffId = body.otherStaffId != null ? String(body.otherStaffId).trim() : '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (teacherId || otherStaffId) {
      sendEmailInvite = true;
      if (body.password != null && String(body.password).trim() !== '') {
        return withCors(
          NextResponse.json({ error: 'Roster invites use email only — remove password from the request.' }, { status: 400 })
        );
      }
    }

    const { validatePasswordLength } = require('../../../../lib/passwordPolicy') as {
      validatePasswordLength: (p: unknown) => string | null;
    };
    if (!sendEmailInvite) {
      const pwdErr = validatePasswordLength(password);
      if (pwdErr) {
        return withCors(NextResponse.json({ error: pwdErr }, { status: 400 }));
      }
    }

    if (teacherId) {
      const { data: t, error: tErr } = await supabaseAdmin
        .from('teachers')
        .select('teacher_id, school_id, name, email, phone')
        .eq('teacher_id', teacherId)
        .single();
      if (tErr || !t || String(t.school_id) !== String(adminData.school_id)) {
        return withCors(NextResponse.json({ error: 'Teacher not found or not in your school.' }, { status: 400 }));
      }
      roleOut = 'teacher';
      const full = String((t as { name?: string }).name || '').trim();
      const parts = full.split(/\s+/).filter(Boolean);
      firstName = parts[0] || 'Teacher';
      lastName = parts.slice(1).join(' ') || '';
      if (!emailIn) emailIn = (t as { email?: string }).email ? String((t as { email?: string }).email).trim() : '';
      if (!emailIn) {
        return withCors(
          NextResponse.json(
            { error: 'This teacher has no email. Add an email in the invitation form, then send again.' },
            { status: 400 }
          )
        );
      }
      const { data: existingT } = await supabaseAdmin
        .from('users')
        .select('user_id')
        .eq('school_id', adminData.school_id)
        .eq('role', 'teacher')
        .ilike('email', emailIn)
        .maybeSingle();
      if (existingT?.user_id) {
        return withCors(
          NextResponse.json({ error: 'A teacher account with this email already exists for your school.' }, { status: 400 })
        );
      }
    } else if (otherStaffId) {
      const { data: o, error: oErr } = await supabaseAdmin
        .from('other_staff_members')
        .select('id, school_id, full_name, email, staff_role, linked_user_id')
        .eq('id', otherStaffId)
        .single();
      if (oErr || !o || String(o.school_id) !== String(adminData.school_id)) {
        return withCors(NextResponse.json({ error: 'Staff member not found or not in your school.' }, { status: 400 }));
      }
      if ((o as { linked_user_id?: string }).linked_user_id) {
        return withCors(NextResponse.json({ error: 'This person already has a login linked.' }, { status: 400 }));
      }
      const sr = String((o as { staff_role?: string }).staff_role || '').trim();
      if (!sr) {
        return withCors(
          NextResponse.json({ error: 'Set a dashboard role (Staff role) on the Staff page before inviting.' }, { status: 400 })
        );
      }
      roleOut = sr;
      const full = String((o as { full_name?: string }).full_name || '').trim();
      const parts = full.split(/\s+/).filter(Boolean);
      firstName = parts[0] || 'Staff';
      lastName = parts.slice(1).join(' ') || '';
      if (!emailIn) emailIn = (o as { email?: string }).email ? String((o as { email?: string }).email).trim() : '';
      if (!emailIn) {
        return withCors(
          NextResponse.json(
            { error: 'This person has no email. Add an email in the invitation form, then send again.' },
            { status: 400 }
          )
        );
      }
    }

    const email = emailIn;
    const name = `${firstName || ''} ${lastName || ''}`.toString().trim() || email;

    const { data: existingUserByEmail } = await supabaseAdmin.from('users').select('user_id').eq('email', email).maybeSingle();

    if (existingUserByEmail) {
      return withCors(NextResponse.json({ error: 'A user with this email address has already been registered' }, { status: 400 }));
    }

    let authUserId: string | null = null;
    const meta: Record<string, unknown> = {
      name,
      role: roleOut,
      school_id: adminData.school_id,
      department: department ?? null,
      position: position ?? null,
      phone: phone != null ? String(phone) : null,
    };
    if (teacherId) meta.teacher_id = teacherId;
    if (otherStaffId) meta.other_staff_id = otherStaffId;

    if (sendEmailInvite) {
      const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(String(email), { data: meta });
      if (inviteError) {
        if (inviteError.message?.toLowerCase().includes('already') || inviteError.message?.toLowerCase().includes('registered')) {
          return withCors(NextResponse.json({ error: 'A user with this email address has already been registered' }, { status: 400 }));
        }
        return withCors(NextResponse.json({ error: inviteError.message }, { status: 400 }));
      }
      authUserId = data?.user?.id ?? null;
    } else {
      const { data, error: signupError } = await supabaseAdmin.auth.admin.createUser({
        email: String(email),
        password: String(password),
        email_confirm: true,
        user_metadata: meta,
      });
      if (signupError) {
        if (signupError.message?.toLowerCase().includes('already') || signupError.message?.toLowerCase().includes('registered')) {
          return withCors(NextResponse.json({ error: 'A user with this email address has already been registered' }, { status: 400 }));
        }
        return withCors(NextResponse.json({ error: signupError.message }, { status: 400 }));
      }
      authUserId = data?.user?.id ?? null;
    }

    if (!adminData.school_id) {
      if (authUserId) await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return withCors(NextResponse.json({ error: 'Admin user does not have a school_id. Please contact support.' }, { status: 400 }));
    }

    const { data: schoolCheck, error: schoolCheckError } = await supabaseAdmin
      .from('schools')
      .select('school_id')
      .eq('school_id', adminData.school_id)
      .single();
    if (schoolCheckError || !schoolCheck) {
      if (authUserId) await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return withCors(
        NextResponse.json(
          { error: `The school_id does not exist in the schools table.`, details: schoolCheckError?.message },
          { status: 400 }
        )
      );
    }

    try {
      const { error: userInsertError } = await supabaseAdmin
        .from('users')
        .upsert(
          {
            user_id: authUserId,
            email: String(email),
            name,
            role: String(roleOut ?? 'teacher'),
            school_id: adminData.school_id,
            phone: phone != null ? String(phone) : null,
            department: department != null ? String(department) : null,
            position: position != null ? String(position) : null,
            ...(teacherId ? { linked_teacher_id: teacherId } : {}),
          },
          { onConflict: 'user_id' }
        );

      if (userInsertError) {
        console.warn('Failed to create user record:', userInsertError.message);
      }
    } catch (userErr: unknown) {
      console.warn('Error creating user record:', userErr);
    }

    if (authUserId && teacherId) {
      try {
        await supabaseAdmin
          .from('teachers')
          .update({ email: String(email) })
          .eq('teacher_id', teacherId)
          .eq('school_id', adminData.school_id);
      } catch (e) {
        console.warn('Could not sync teacher email:', e);
      }
    }
    if (authUserId && otherStaffId) {
      try {
        await supabaseAdmin
          .from('other_staff_members')
          .update({ email: String(email), linked_user_id: authUserId })
          .eq('id', otherStaffId);
      } catch (e) {
        console.warn('Could not link other_staff:', e);
      }
    }

    if (!sendEmailInvite && password) {
      try {
        const { sendResendInnerHtml } = require('../../../../lib/resendSend');
        const { buildCredentialInnerHtml, buildCredentialEmailSubject } = require('../../../../lib/credentialInnerHtml');
        const { getPublicSiteOrigin } = require('../../../../lib/emailHtml');
        const loginUrl = `${getPublicSiteOrigin()}/login`;
        await sendResendInnerHtml({
          to: String(email),
          subject: buildCredentialEmailSubject(String(roleOut ?? ''), ''),
          innerHtml: buildCredentialInnerHtml({
            recipientName: name || String(firstName ?? '') || 'there',
            email: String(email),
            password: String(password),
            role: String(roleOut ?? ''),
            roleLabel: String(roleOut ?? ''),
            loginUrl,
          }),
        });
      } catch (mailErr) {
        console.warn('Could not send credential email:', mailErr);
      }
    }

    return withCors(
      NextResponse.json({
        success: true,
        message: sendEmailInvite
          ? 'User invited successfully! They will receive an email to set up their account.'
          : 'User created successfully! They can now log in with their credentials.',
      })
    );
  } catch (error: unknown) {
    console.error('Error creating user:', error);
    const err = error as { message?: string; code?: string };
    let errorMessage = err?.message || 'Failed to create user';
    if (err?.message?.includes('relation') && err?.message?.includes('does not exist')) {
      errorMessage = `Database schema error: ${err.message}. Please ensure all required tables exist.`;
    } else if (err?.code === '23503') {
      errorMessage = `Foreign key constraint violation: The school_id (${adminSchoolId}) does not exist in the schools table.`;
    } else if (err?.code === '23505') {
      errorMessage = 'A user with this email address already exists.';
    }
    return withCors(
      NextResponse.json(
        { error: errorMessage, details: process.env.NODE_ENV === 'development' ? err?.message : undefined },
        { status: 500 }
      )
    );
  }
}
