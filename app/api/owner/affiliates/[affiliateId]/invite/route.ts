import { NextRequest, NextResponse } from 'next/server';
import { getOwnerContext } from '@/lib/ownerServer';

export async function POST(
  request: NextRequest,
  { params }: { params: { affiliateId: string } }
) {
  const ctx = await getOwnerContext(request);
  if ('error' in ctx) return ctx.error;

  const { affiliateId } = params;

  // Fetch the affiliate
  const { data: affiliate, error: fetchErr } = await ctx.admin
    .from('affiliates')
    .select('affiliate_id, name, email, status')
    .eq('affiliate_id', affiliateId)
    .single();

  if (fetchErr || !affiliate) {
    return NextResponse.json({ error: 'Affiliate not found.' }, { status: 404 });
  }

  const email = (affiliate as { email: string }).email;
  const name = (affiliate as { name: string }).name;

  // Send Supabase auth invite — this emails the affiliate a magic link to set their password
  const { error: inviteErr } = await ctx.admin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: name,
      role: 'affiliate',
      affiliate_id: affiliateId,
    },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.pwezacore.com'}/affiliate-portal`,
  });

  if (inviteErr) {
    // If user already exists, that's acceptable — they can still log in
    if (!inviteErr.message?.includes('already been registered')) {
      return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    }
  }

  // Mark affiliate as ACTIVE once invited
  await ctx.admin
    .from('affiliates')
    .update({ status: 'ACTIVE' })
    .eq('affiliate_id', affiliateId);

  return NextResponse.json({ success: true });
}
