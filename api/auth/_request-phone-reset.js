'use strict';

// CommonJS — package.json has no "type":"module" so .ts ESM output breaks Node.js

const { createClient } = require('@supabase/supabase-js');
const { sendEgoSms, normalizePhone, isUgandaNumber } = require('../../lib/sms');

const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const COOLDOWN_MS = 60 * 1000; // 1 request per phone per minute
const DAILY_LIMIT = 5; // max requests per phone per rolling 24h

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Existing users.phone rows are a mix of local (0xxxxxxxxx) and E.164 (+256xxxxxxxxx) formats. */
function candidatePhoneFormats(normalized) {
  const local = normalized.startsWith('+256') ? `0${normalized.slice(4)}` : normalized;
  return [normalized, local];
}

function generateCode() {
  const n = Math.floor(Math.random() * 10 ** CODE_LENGTH);
  return String(n).padStart(CODE_LENGTH, '0');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const phoneInput = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
  if (!phoneInput) return res.status(400).json({ error: 'Phone number is required.' });

  const normalized = normalizePhone(phoneInput);
  if (!isUgandaNumber(normalized)) {
    return res.status(400).json({ error: 'Enter a valid Uganda phone number.' });
  }

  // Always respond with the same generic message regardless of what's found below — same
  // anti-enumeration principle Supabase's own email-recovery flow already follows, so a
  // caller can't use this endpoint to discover which phone numbers have accounts.
  const genericResponse = { success: true, message: 'If that phone number is registered, a reset code has been sent.' };

  try {
    const supabase = getSupabase();
    const candidates = candidatePhoneFormats(normalized);

    const { data: user } = await supabase
      .from('users')
      .select('user_id, name, phone, school_id')
      .in('phone', candidates)
      .maybeSingle();

    if (!user) return res.status(200).json(genericResponse);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('phone_reset_codes')
      .select('id, created_at')
      .eq('phone', normalized)
      .gte('created_at', since24h)
      .order('created_at', { ascending: false });

    if ((recent || []).length >= DAILY_LIMIT) return res.status(200).json(genericResponse);
    if (recent && recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < COOLDOWN_MS) {
      return res.status(200).json(genericResponse);
    }

    // Invalidate any still-usable prior codes for this phone before issuing a new one.
    await supabase.from('phone_reset_codes').update({ used_at: new Date().toISOString() }).eq('phone', normalized).is('used_at', null);

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    const { error: insertErr } = await supabase.from('phone_reset_codes').insert({
      user_id: user.user_id,
      phone: normalized,
      code,
      expires_at: expiresAt,
    });
    if (insertErr) {
      console.error('[phone-reset] insert failed', insertErr);
      return res.status(200).json(genericResponse);
    }

    // Same convenience as the email flow's "Reset password" button: a tap-through link that
    // lands directly on the enter-new-password screen with phone+code pre-filled, so the code
    // doesn't have to be retyped by hand. Unlike the email link (cryptographically signed by
    // Supabase itself), this is just our own URL carrying the code as a query param — the code
    // is still single-use, 10-minute-lived, and verified server-side when the password is
    // actually submitted, so a code sitting in a link is no more sensitive than the code alone.
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.pwezacore.com').replace(/\/$/, '');
    const resetLink = `${siteUrl}/auth/forgot?mode=phone&phone=${encodeURIComponent(normalized)}&code=${code}`;

    const smsResult = await sendEgoSms(
      normalized,
      `Your PwezaCore password reset code is ${code}. It expires in 10 minutes.\n\nOr tap to reset directly: ${resetLink}\n\nIf you didn't request this, ignore this message.`,
      { priority: '0' }
    );
    if (!smsResult.success) console.warn('[phone-reset] SMS send failed', normalized, smsResult.error);

    // Best-effort audit log — feeds the owner dashboard's failure alerts. Never let a
    // logging problem block the reset flow's own (always-generic) response.
    try {
      await supabase.from('notification_logs').insert({
        school_id: user.school_id,
        notification_type: 'sms',
        category: 'password_reset',
        recipient: normalized,
        recipient_name: user.name,
        status: smsResult.success ? 'sent' : 'failed',
        error_message: smsResult.success ? null : smsResult.error,
        sent_at: smsResult.success ? new Date().toISOString() : null,
      });
    } catch (logErr) {
      console.error('[phone-reset] notification_logs insert failed', logErr);
    }

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error('[phone-reset] request error', err);
    return res.status(200).json(genericResponse);
  }
};
