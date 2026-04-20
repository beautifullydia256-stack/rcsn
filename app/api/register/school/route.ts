import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyReferralToken } from '@/lib/referralJwt';
import { validateReferralById, REFERRAL_INVALID_MESSAGE } from '@/lib/referralLookup';

type Body = {
  referralToken?: string;
  email?: string;
  password?: string;
  adminName?: string;
  phone?: string;
  schoolName?: string;
  schoolLocation?: string;
  schoolType?: string;
  schoolCode?: string;
  captchaToken?: string;
};

async function verifyTurnstileIfConfigured(token: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

    const body = (await request.json().catch(() => ({}))) as Body;
    const referralToken = typeof body.referralToken === 'string' ? body.referralToken : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const adminName = typeof body.adminName === 'string' ? body.adminName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const schoolName = typeof body.schoolName === 'string' ? body.schoolName.trim() : '';
    const schoolLocation = typeof body.schoolLocation === 'string' ? body.schoolLocation.trim() : '';
    const schoolType = typeof body.schoolType === 'string' ? body.schoolType.trim() : '';
    const schoolCode = typeof body.schoolCode === 'string' ? body.schoolCode.trim() : '';

    if (!referralToken) {
      return NextResponse.json({ error: REFERRAL_INVALID_MESSAGE }, { status: 401 });
    }

    let referralCodeId: string;
    try {
      ({ referral_code_id: referralCodeId } = await verifyReferralToken(referralToken));
    } catch {
      return NextResponse.json({ error: REFERRAL_INVALID_MESSAGE }, { status: 401 });
    }

    const validated = await validateReferralById(supabaseAdmin, referralCodeId);
    if (!validated) {
      return NextResponse.json({ error: REFERRAL_INVALID_MESSAGE }, { status: 401 });
    }

    const hasTurnstileSite = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (hasTurnstileSite) {
      const ok = await verifyTurnstileIfConfigured(body.captchaToken);
      if (!ok) {
        return NextResponse.json({ error: 'Please complete CAPTCHA verification.' }, { status: 400 });
      }
    }

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: 'Valid email and password (min 6 chars) are required.' }, { status: 400 });
    }
    if (!adminName || !schoolName || !schoolLocation) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
    }
    if (!['Nursery/Primary', 'Secondary'].includes(schoolType)) {
      return NextResponse.json({ error: 'Invalid school type.' }, { status: 400 });
    }

    const adminAuth = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: created, error: createErr } = await adminAuth.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        school_name: schoolName,
        admin_name: adminName,
        phone,
      },
    });

    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message || 'Failed to create account.' },
        { status: 400 }
      );
    }

    const userId = created.user.id;

    const { data: regData, error: regError } = await supabaseAdmin.rpc('register_school_admin_with_referral', {
      p_user_id: userId,
      p_email: email,
      p_name: adminName,
      p_phone: phone,
      p_school_name: schoolName,
      p_school_location: schoolLocation,
      p_school_type: schoolType,
      p_referral_code_id: validated.id,
    });

    if (regError) {
      await adminAuth.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: regError.message || 'Registration failed.' }, { status: 400 });
    }

    const reg = regData as { success?: boolean; school_id?: string; message?: string } | null;
    if (!reg || reg.success === false || !reg.school_id) {
      await adminAuth.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: reg?.message || 'School creation failed.' },
        { status: 400 }
      );
    }

    if (schoolCode) {
      await supabaseAdmin.from('schools').update({ school_code: schoolCode }).eq('school_id', reg.school_id);
    }

    return NextResponse.json({ success: true, school_id: reg.school_id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Registration failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
