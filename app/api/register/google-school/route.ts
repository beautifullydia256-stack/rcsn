import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyReferralToken } from '@/lib/referralJwt';
import { validateReferralById, REFERRAL_INVALID_MESSAGE } from '@/lib/referralLookup';

type Body = {
  referralToken?: string;
  schoolName?: string;
  schoolLocation?: string;
  schoolType?: string;
  schoolCode?: string;
  phone?: string;
  motto?: string;
  address?: string;
  adminName?: string;
};

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
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
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Body;
    const referralToken = typeof body.referralToken === 'string' ? body.referralToken : '';
    const schoolName = typeof body.schoolName === 'string' ? body.schoolName.trim() : '';
    const schoolLocation = typeof body.schoolLocation === 'string' ? body.schoolLocation.trim() : '';
    const schoolType = typeof body.schoolType === 'string' ? body.schoolType.trim() : '';
    const schoolCode = typeof body.schoolCode === 'string' ? body.schoolCode.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const motto = typeof body.motto === 'string' ? body.motto.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const adminName =
      typeof body.adminName === 'string' && body.adminName.trim()
        ? body.adminName.trim()
        : (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          'Admin';

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

    if (!schoolName || !schoolLocation) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
    }
    if (!['Nursery/Primary', 'Secondary'].includes(schoolType)) {
      return NextResponse.json({ error: 'Invalid school type.' }, { status: 400 });
    }

    const { error: upsertErr } = await supabaseAdmin.from('users').upsert(
      {
        user_id: user.id,
        email: user.email,
        name: adminName,
        role: 'admin',
      },
      { onConflict: 'user_id' }
    );

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 400 });
    }

    const { data: regData, error: regError } = await supabaseAdmin.rpc('register_school_admin_with_referral', {
      p_user_id: user.id,
      p_email: user.email,
      p_name: adminName,
      p_phone: phone,
      p_school_name: schoolName,
      p_school_location: schoolLocation,
      p_school_type: schoolType,
      p_referral_code_id: validated.id,
    });

    if (regError) {
      return NextResponse.json({ error: regError.message || 'Failed to create school.' }, { status: 400 });
    }

    const reg = regData as { success?: boolean; school_id?: string; message?: string } | null;
    if (!reg || reg.success === false || !reg.school_id) {
      return NextResponse.json({ error: reg?.message || 'School creation failed.' }, { status: 400 });
    }

    await supabaseAdmin
      .from('schools')
      .update({
        motto: motto || null,
        address: address || null,
        phone: phone || null,
        school_code: schoolCode || null,
      })
      .eq('school_id', reg.school_id);

    // Fire-and-forget welcome email (Google OAuth admins have no credentials to send)
    try {
      const { sendResendInnerHtml } = require('../../../../lib/resendSend');
      const { buildWelcomeSchoolAdminInnerHtml } = require('../../../../lib/credentialInnerHtml');
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://www.pwezacore.com'}/dashboard/admin`;
      const innerHtml = buildWelcomeSchoolAdminInnerHtml({ adminName, schoolName, dashboardUrl });
      sendResendInnerHtml({
        to: user.email,
        subject: `Welcome to PwezaCore — ${schoolName} is ready`,
        innerHtml,
      }).catch(() => {});
    } catch {
      /* email failure must not block registration */
    }

    return NextResponse.json({ success: true, school_id: reg.school_id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Setup failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
