'use strict';

// Shared code-generation/rate-limiting core for every flow that sends a phone a 6-digit
// verification code via the `phone_reset_codes` table (self-service password reset, and
// phone-based first-time account setup). Callers own the SMS message text and the actual
// send — this only handles the DB side, so `_verify-phone-reset.js` doesn't need to know or
// care why a given code was issued.

const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const COOLDOWN_MS = 60 * 1000; // 1 request per phone per minute
const DAILY_LIMIT = 5; // max requests per phone per rolling 24h

function generateCode() {
  const n = Math.floor(Math.random() * 10 ** CODE_LENGTH);
  return String(n).padStart(CODE_LENGTH, '0');
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase service-role client
 * @param {{ userId: string, phone: string }} params `phone` must already be normalized E.164
 * @returns {Promise<{ code: string, expiresAt: string } | { rateLimited: true }>}
 */
async function issuePhoneVerificationCode(supabase, { userId, phone }) {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from('phone_reset_codes')
    .select('id, created_at')
    .eq('phone', phone)
    .gte('created_at', since24h)
    .order('created_at', { ascending: false });

  if ((recent || []).length >= DAILY_LIMIT) return { rateLimited: true };
  if (recent && recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < COOLDOWN_MS) {
    return { rateLimited: true };
  }

  // Invalidate any still-usable prior codes for this phone before issuing a new one.
  await supabase.from('phone_reset_codes').update({ used_at: new Date().toISOString() }).eq('phone', phone).is('used_at', null);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const { error: insertErr } = await supabase.from('phone_reset_codes').insert({
    user_id: userId,
    phone,
    code,
    expires_at: expiresAt,
  });
  if (insertErr) throw insertErr;

  return { code, expiresAt };
}

module.exports = { issuePhoneVerificationCode };
