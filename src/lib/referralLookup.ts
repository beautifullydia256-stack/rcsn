import type { SupabaseClient } from '@supabase/supabase-js';

// Fixed TypeScript error - added type field to ReferralRowDb
export const REFERRAL_INVALID_MESSAGE =
  'Invalid or inactive referral code. Please contact support.';

export function normalizeReferralCodeInput(raw: string): string {
  return raw.trim().toUpperCase();
}

export type ValidatedReferral = {
  id: string;
  affiliate_id: string | null;
  type: string;
  registeringUnder: string | null;
};

type AffiliateEmbed = { name: string | null; status: string };

type ReferralRowDb = {
  id: string;
  affiliate_id: string | null;
  type: string | null;
  discount_type: string;
  is_active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  /** Supabase may return a single row or an array for embedded FKs. */
  affiliates: AffiliateEmbed | AffiliateEmbed[] | null;
};

function affiliateFromRow(embed: ReferralRowDb['affiliates']): AffiliateEmbed | null {
  if (embed == null) return null;
  return Array.isArray(embed) ? embed[0] ?? null : embed;
}

function validateReferralRow(r: ReferralRowDb): ValidatedReferral | null {
  if (!r.is_active) return null;

  if (r.expires_at) {
    const exp = new Date(r.expires_at).getTime();
    if (Number.isFinite(exp) && exp < Date.now()) return null;
  }

  if (r.max_uses != null && r.current_uses >= r.max_uses) return null;

  const affiliates = affiliateFromRow(r.affiliates);

  // Use the type field (ADMIN/AFFILIATE) for validation logic, not discount_type
  const codeType = r.type || 'ADMIN'; // Default to ADMIN if type is null
  
  if (codeType === 'AFFILIATE') {
    if (!r.affiliate_id) return null;
    if (!affiliates || affiliates.status !== 'ACTIVE') return null;
  } else if (codeType === 'ADMIN') {
    // Admin codes can have affiliate_id null, that's fine
  } else {
    return null;
  }

  const registeringUnder =
    codeType === 'AFFILIATE' && affiliates?.name ? affiliates.name.trim() : null;

  return {
    id: r.id,
    affiliate_id: r.affiliate_id,
    type: codeType,
    registeringUnder,
  };
}

const referralSelect = `
  id,
  affiliate_id,
  type,
  discount_type,
  is_active,
  expires_at,
  max_uses,
  current_uses,
  affiliates ( name, status )
`;

/** Load referral by primary key and apply the same rules as verify + register. */
export async function validateReferralById(
  admin: SupabaseClient,
  referralCodeId: string
): Promise<ValidatedReferral | null> {
  const { data: row, error } = await admin
    .from('referral_codes')
    .select(referralSelect)
    .eq('id', referralCodeId)
    .maybeSingle();

  if (error || !row) return null;
  return validateReferralRow(row as ReferralRowDb);
}

/** Lookup by normalized code string (stored uppercase). */
export async function findReferralByCode(
  admin: SupabaseClient,
  normalizedCode: string
): Promise<ValidatedReferral | null> {
  const { data: row, error } = await admin
    .from('referral_codes')
    .select(referralSelect)
    .eq('code', normalizedCode)
    .maybeSingle();

  if (error || !row) return null;
  return validateReferralRow(row as ReferralRowDb);
}
