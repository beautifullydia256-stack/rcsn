import { NextRequest, NextResponse } from 'next/server';
import { getOwnerContext } from '@/lib/ownerServer';

export async function GET(request: NextRequest) {
  const ctx = await getOwnerContext(request);
  if ('error' in ctx) return ctx.error;

  const { data, error } = await ctx.admin
    .from('referral_codes')
    .select(
      `
      id,
      code,
      discount_type,
      is_active,
      affiliate_id,
      max_uses,
      expires_at,
      current_uses,
      created_at,
      affiliates ( name, email, status )
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ referral_codes: data || [] });
}

export async function PATCH(request: NextRequest) {
  const ctx = await getOwnerContext(request);
  if ('error' in ctx) return ctx.error;

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  if (typeof body.is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active boolean is required' }, { status: 400 });
  }

  const { data, error } = await ctx.admin
    .from('referral_codes')
    .update({ is_active: body.is_active })
    .eq('id', id)
    .select('id, code, discount_type, is_active, affiliate_id, current_uses, max_uses, expires_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ referral_code: data });
}
