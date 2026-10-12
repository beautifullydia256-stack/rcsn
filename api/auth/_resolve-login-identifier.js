'use strict';

// CommonJS — package.json has no "type":"module" so .ts ESM output breaks Node.js

// Resolves a login identifier (official school email, personal email, or phone number)
// to the account's primary Supabase Auth email.

const { createClient } = require('@supabase/supabase-js');
const { normalizePhone, isUgandaNumber, candidatePhoneFormats } = require('../../lib/sms');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const input = typeof req.body?.identifier === 'string'
    ? req.body.identifier.trim()
    : typeof req.body?.phone === 'string'
    ? req.body.phone.trim()
    : typeof req.body?.email === 'string'
    ? req.body.email.trim()
    : '';

  if (!input) return res.status(200).json({ email: null });

  try {
    const supabase = getSupabase();

    // 1. Email identifier resolution (checks official_email, personal_email, and primary email)
    if (input.includes('@')) {
      const cleanEmail = input.toLowerCase();
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .or(`email.ilike.${cleanEmail},official_email.ilike.${cleanEmail},personal_email.ilike.${cleanEmail}`)
        .limit(1)
        .maybeSingle();

      return res.status(200).json({ email: user?.email || cleanEmail });
    }

    // 2. Phone identifier resolution
    const normalized = normalizePhone(input);
    if (!isUgandaNumber(normalized)) return res.status(200).json({ email: null });

    const candidates = candidatePhoneFormats(normalized);
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .in('phone', candidates)
      .maybeSingle();

    return res.status(200).json({ email: user?.email || null });
  } catch (err) {
    console.error('[resolve-login-identifier] error', err);
    return res.status(200).json({ email: null });
  }
};
