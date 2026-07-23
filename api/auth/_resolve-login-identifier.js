'use strict';

// CommonJS — package.json has no "type":"module" so .ts ESM output breaks Node.js

// Supabase Auth's native `phone` field is never populated in this app — every account is
// email-only at the GoTrue level (see api/auth/_request-phone-reset.js for the same pattern
// applied to password reset). To let someone log in with a phone number, we resolve it
// server-side to the matching account's email first, then the frontend calls the normal
// signInWithPassword({ email, password }) unchanged.

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

  const phoneInput = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
  if (!phoneInput) return res.status(200).json({ email: null });

  const normalized = normalizePhone(phoneInput);
  if (!isUgandaNumber(normalized)) return res.status(200).json({ email: null });

  try {
    const supabase = getSupabase();
    const candidates = candidatePhoneFormats(normalized);

    // .maybeSingle() intentionally errors (falls to the catch below, still returns
    // { email: null }) rather than picking one, if a phone happens to be shared by more
    // than one account — safer than silently logging someone into the wrong account.
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
