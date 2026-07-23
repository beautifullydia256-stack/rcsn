'use strict';

// CommonJS — package.json has no "type":"module" so .ts ESM output breaks Node.js

const { createClient } = require('@supabase/supabase-js');
const { normalizePhone, isUgandaNumber } = require('../../lib/sms');
const { validatePasswordLength } = require('../../lib/passwordPolicy');

const MAX_ATTEMPTS = 5;

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
  const newPassword = typeof req.body?.new_password === 'string' ? req.body.new_password : '';

  if (!phoneInput || !code) return res.status(400).json({ error: 'Phone number and code are required.' });

  const normalized = normalizePhone(phoneInput);
  if (!isUgandaNumber(normalized)) return res.status(400).json({ error: 'Enter a valid Uganda phone number.' });

  const passwordError = validatePasswordLength(newPassword);
  if (passwordError) return res.status(400).json({ error: passwordError });

  try {
    const supabase = getSupabase();

    const { data: pending, error: fetchErr } = await supabase
      .from('phone_reset_codes')
      .select('id, user_id, code, expires_at, attempts')
      .eq('phone', normalized)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr || !pending) return res.status(400).json({ error: 'Invalid or expired code. Request a new one.' });
    if (new Date(pending.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This code has expired. Request a new one.' });
    }
    if (pending.attempts >= MAX_ATTEMPTS) {
      return res.status(400).json({ error: 'Too many attempts. Request a new code.' });
    }

    if (pending.code !== code) {
      await supabase.from('phone_reset_codes').update({ attempts: pending.attempts + 1 }).eq('id', pending.id);
      return res.status(400).json({ error: 'Incorrect code.' });
    }

    // Code verified — mark used immediately (single-use) before touching the account.
    await supabase.from('phone_reset_codes').update({ used_at: new Date().toISOString() }).eq('id', pending.id);

    const { data: authUser, error: getUserErr } = await supabase.auth.admin.getUserById(pending.user_id);
    if (getUserErr || !authUser?.user) return res.status(400).json({ error: 'Account not found.' });

    const prevMeta = authUser.user.user_metadata || {};
    const { error: updateErr } = await supabase.auth.admin.updateUserById(pending.user_id, {
      password: newPassword,
      user_metadata: { ...prevMeta, must_change_password: false },
    });
    if (updateErr) return res.status(400).json({ error: updateErr.message || 'Could not update password.' });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[phone-reset] verify error', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
