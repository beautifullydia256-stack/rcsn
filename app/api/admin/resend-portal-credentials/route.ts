import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { generateOneTimePassword } from '../../../../lib/passwordPolicy';
import { isValidRealEmail } from '@/lib/realEmail';

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

function normalizeManagerRole(role: unknown): string {
  return String(role ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

const MANAGER_ROLES = ['admin', 'owner', 'head_teacher'];
const CRED_ROLES = new Set(['parent', 'teacher']);

/** Mirrors api/admin/resend-portal-credentials.js — new OTP + email for parent/teacher portal. */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (!supabaseUrl || !supabaseAnon || !supabaseServiceKey) {
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
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminData, error: adminRowErr } = await supabaseAdmin
      .from('users')
      .select('school_id, role')
      .eq('user_id', adminUser.id)
      .maybeSingle();

    const adminRoleKey = normalizeManagerRole(adminData?.role);
    if (adminRowErr || !adminData || !MANAGER_ROLES.includes(adminRoleKey)) {
      return withCors(NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 }));
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return withCors(NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }));
    }

    const targetUserId = body.userId != null ? String(body.userId).trim() : '';
    const emailOverride = body.email != null ? String(body.email).trim() : '';

    if (!targetUserId) {
      return withCors(NextResponse.json({ error: 'userId is required.' }, { status: 400 }));
    }

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('users')
      .select('user_id, email, name, role, school_id, linked_teacher_id')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (profErr || !profile) {
      return withCors(NextResponse.json({ error: 'User profile not found.' }, { status: 400 }));
    }
    if (String(profile.school_id) !== String(adminData.school_id)) {
      return withCors(NextResponse.json({ error: 'That account is not in your school.' }, { status: 403 }));
    }

    const roleKey = normalizeManagerRole((profile as { role?: string }).role);
    if (!CRED_ROLES.has(roleKey)) {
      return withCors(
        NextResponse.json(
          { error: 'Only parent or teacher accounts can receive a portal password email from here.' },
          { status: 400 }
        )
      );
    }

    let deliverEmail = (profile as { email?: string }).email ? String((profile as { email?: string }).email).trim() : '';
    if (emailOverride) {
      if (!isValidRealEmail(emailOverride)) {
        return withCors(NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 }));
      }
      const { data: clash } = await supabaseAdmin
        .from('users')
        .select('user_id')
        .eq('email', emailOverride)
        .neq('user_id', targetUserId)
        .maybeSingle();
      if (clash?.user_id) {
        return withCors(
          NextResponse.json({ error: 'That email is already used by another account.' }, { status: 400 })
        );
      }
      deliverEmail = emailOverride;
    }

    if (!deliverEmail || !isValidRealEmail(deliverEmail)) {
      return withCors(
        NextResponse.json(
          {
            error:
              'This account has no email on file. Add a valid email in the form, then send again — we will save it before mailing.',
          },
          { status: 400 }
        )
      );
    }

    const oneTimePassword = generateOneTimePassword();
    const { data: authUserData, error: getAuthErr } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (getAuthErr || !authUserData?.user) {
      return withCors(
        NextResponse.json({ error: 'No authentication record for this user. Contact support.' }, { status: 400 })
      );
    }

    const prevMeta = authUserData.user.user_metadata || {};
    const nextMeta = {
      ...prevMeta,
      must_change_password: true,
      role: roleKey,
      name: (profile as { name?: string }).name || (prevMeta as { name?: string }).name,
      school_id: adminData.school_id,
    };

    const updatePayload: {
      password: string;
      user_metadata: Record<string, unknown>;
      email?: string;
    } = {
      password: oneTimePassword,
      user_metadata: nextMeta,
    };
    if (deliverEmail !== authUserData.user.email) {
      updatePayload.email = deliverEmail;
    }

    const { error: updAuthErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, updatePayload);
    if (updAuthErr) {
      return withCors(
        NextResponse.json(
          { error: updAuthErr.message || 'Could not update sign-in credentials.' },
          { status: 400 }
        )
      );
    }

    const { error: updProfErr } = await supabaseAdmin
      .from('users')
      .update({ email: deliverEmail })
      .eq('user_id', targetUserId);
    if (updProfErr) {
      console.error('[resend-portal-credentials] users email sync:', updProfErr);
    }

    const prof = profile as { linked_teacher_id?: string | null };
    if (roleKey === 'parent') {
      try {
        await supabaseAdmin
          .from('parents')
          .update({ email: deliverEmail })
          .eq('school_id', adminData.school_id)
          .eq('parent_id', targetUserId);
      } catch (e) {
        console.warn('[resend-portal-credentials] parents email sync:', e);
      }
    } else if (roleKey === 'teacher' && prof.linked_teacher_id) {
      try {
        await supabaseAdmin
          .from('teachers')
          .update({ email: deliverEmail })
          .eq('school_id', adminData.school_id)
          .eq('teacher_id', prof.linked_teacher_id);
      } catch (e) {
        console.warn('[resend-portal-credentials] teachers email sync:', e);
      }
    }

    const rawName =
      String((profile as { name?: string }).name || '').trim() ||
      deliverEmail.split('@')[0] ||
      'there';
    const { getPublicSiteOrigin } = require('../../../../lib/emailHtml');
    const loginUrl = `${getPublicSiteOrigin()}/login?email=${encodeURIComponent(String(deliverEmail))}&first_login=1`;

    try {
      const { sendResendInnerHtml } = require('../../../../lib/resendSend');
      const { buildCredentialInnerHtml, buildCredentialEmailSubject } = require('../../../../lib/credentialInnerHtml');
      const mailResult = await sendResendInnerHtml({
        to: String(deliverEmail),
        subject: buildCredentialEmailSubject(roleKey, '', { isPasswordReset: true }),
        innerHtml: buildCredentialInnerHtml({
          recipientName: rawName,
          email: String(deliverEmail),
          password: oneTimePassword,
          role: roleKey,
          roleLabel: roleKey,
          loginUrl,
          firstLoginEnforced: true,
          isPasswordReset: true,
        }),
      });
      if (!mailResult || mailResult.success !== true) {
        console.error('[resend-portal-credentials] email failed:', mailResult?.error);
        return withCors(
          NextResponse.json(
            {
              error:
                mailResult?.error ||
                'The password was reset but the email could not be sent. Try again, or check RESEND_API_KEY.',
            },
            { status: 502 }
          )
        );
      }
    } catch (mailErr) {
      console.error('[resend-portal-credentials] email exception:', mailErr);
      return withCors(
        NextResponse.json(
          {
            error:
              'The password was reset but the email could not be sent. Try Send again, or check email configuration.',
          },
          { status: 502 }
        )
      );
    }

    return withCors(
      NextResponse.json({
        success: true,
        message:
          'A new one-time password was emailed. They should sign in with it once, then set a new password.',
      })
    );
  } catch (error: unknown) {
    console.error('[resend-portal-credentials]', error);
    const msg = error instanceof Error ? error.message : 'Internal error';
    return withCors(NextResponse.json({ error: msg }, { status: 500 }));
  }
}
