'use strict';

// CommonJS — package.json has no "type":"module" so .ts ESM output breaks Node.js

const { createClient } = require('@supabase/supabase-js');
const { sendEgoSms, normalizePhone, isUgandaNumber, candidatePhoneFormats } = require('../../lib/sms');
const { issuePhoneVerificationCode } = require('../../lib/phoneVerification');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
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

    let issued;
    try {
      issued = await issuePhoneVerificationCode(supabase, { userId: user.user_id, phone: normalized });
    } catch (issueErr) {
      console.error('[phone-reset] insert failed', issueErr);
      return res.status(200).json(genericResponse);
    }
    if (issued.rateLimited) return res.status(200).json(genericResponse);
    const { code } = issued;

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
