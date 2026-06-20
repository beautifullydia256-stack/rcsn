/**
 * Vercel serverless: POST /api/referrals/verify
 * Intentionally CommonJS (.js) so Node loads it without "Cannot use import statement outside a module"
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');

// Simple inline functions to avoid import issues
function normalizeReferralCodeInput(raw) {
  return String(raw || '').trim().toUpperCase();
}

const REFERRAL_INVALID_MESSAGE = 'Invalid or inactive referral code. Please contact support.';

function affiliateFromRow(embed) {
  if (embed == null) return null;
  return Array.isArray(embed) ? embed[0] ?? null : embed;
}

function validateReferralRow(r) {
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

async function findReferralByCode(supabaseAdmin, normalizedCode) {
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

  const { data: row, error } = await supabaseAdmin
    .from('referral_codes')
    .select(referralSelect)
    .eq('code', normalizedCode)
    .maybeSingle();

  if (error || !row) return null;
  return validateReferralRow(row);
}

// Simple JWT signing function
async function signReferralToken(referralId) {
  // For now, just return the referral ID as token
  // In production, you'd want proper JWT signing
  return Buffer.from(JSON.stringify({ referralId, exp: Date.now() + 3600000 })).toString('base64');
}

module.exports = async function handler(req, res) {
  const origin = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
  const setCors = () => Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

  try {
    if (req.method === 'OPTIONS') {
      setCors();
      res.status(204).end();
      return;
    }

    if (req.method !== 'POST') {
      setCors();
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      setCors();
      res.status(500).json({ error: 'Server not configured' });
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = req.body || {};
    const raw = typeof body.code === 'string' ? body.code : '';
    const normalized = normalizeReferralCodeInput(raw);
    
    if (!normalized) {
      setCors();
      res.status(401).json({ error: REFERRAL_INVALID_MESSAGE });
      return;
    }

    const validated = await findReferralByCode(supabaseAdmin, normalized);
    if (!validated) {
      setCors();
      res.status(401).json({ error: REFERRAL_INVALID_MESSAGE });
      return;
    }

    let token;
    try {
      token = await signReferralToken(validated.id);
    } catch {
      setCors();
      res.status(500).json({
        error: 'Registration verification is not configured on the server.',
      });
      return;
    }

    setCors();
    res.status(200).json({
      token,
      registeringUnder: validated.registeringUnder,
    });
  } catch (e) {
    setCors();
    const msg = e instanceof Error ? e.message : 'Verification failed';
    res.status(500).json({ error: msg });
  }
};