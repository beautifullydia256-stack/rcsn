import { NextRequest, NextResponse } from 'next/server';
import { getOwnerContext } from '@/lib/ownerServer';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ affiliateId: string }> }
) {
  const ctx = await getOwnerContext(request);
  if ('error' in ctx) return ctx.error;

  const { affiliateId } = await context.params;
  if (!affiliateId) {
    return NextResponse.json({ error: 'affiliateId required' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === 'string' ? body.status.trim().toUpperCase() : '';

  if (!['ACTIVE', 'DISABLED'].includes(status)) {
    return NextResponse.json({ error: 'status must be ACTIVE or DISABLED' }, { status: 400 });
  }

  const { data, error } = await ctx.admin
    .from('affiliates')
    .update({ status })
    .eq('affiliate_id', affiliateId)
    .select('affiliate_id, name, phone, email, status, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ affiliate: data });
}
