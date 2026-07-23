'use strict';

// CommonJS — package.json has no "type":"module" so .ts ESM output breaks Node.js

// Lets the frontend confirm a code is correct BEFORE showing the new-password fields, instead
// of only finding out when the whole form (code + password) is submitted together. Shares the
// same attempt-limiting as the real _verify-phone-reset.js via checkPhoneResetCode — this
// endpoint never marks the code used, so the same code still has to be submitted again to
// _verify-phone-reset.js to actually change the password.

const { createClient } = require('@supabase/supabase-js');
const { normalizePhone, isUgandaNumber } = require('../../lib/sms');
const { checkPhoneResetCode } = require('../../lib/phoneVerification');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const phoneInput = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!phoneInput || !code) return res.status(400).json({ error: 'Phone number and code are required.' });

  const normalized = normalizePhone(phoneInput);
  if (!isUgandaNumber(normalized)) return res.status(400).json({ error: 'Enter a valid Uganda phone number.' });

  try {
    const supabase = getSupabase();
    const checked = await checkPhoneResetCode(supabase, { phone: normalized, code });
    if (!checked.valid) return res.status(400).json({ error: checked.error });
    return res.status(200).json({ valid: true });
  } catch (err) {
    console.error('[phone-reset] check-code error', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
