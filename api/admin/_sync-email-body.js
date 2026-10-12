'use strict';

const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY is not configured on the server' });
  }

  const supabase = getSupabase();

  try {
    const emailId = req.query?.id || req.body?.id;

    let query = supabase
      .from('institutional_emails')
      .select('id, resend_id, body_text, body_html')
      .not('resend_id', 'is', null);

    if (emailId) {
      query = query.eq('id', emailId);
    } else {
      query = query.or('body_text.eq.,body_text.is.null').limit(20);
    }

    const { data: rows, error: selectErr } = await query;
    if (selectErr) {
      return res.status(500).json({ error: selectErr.message });
    }

    const updated = [];

    for (const row of rows || []) {
      if (!row.resend_id) continue;
      try {
        const fetchRes = await fetch(`https://api.resend.com/emails/receiving/${row.resend_id}`, {
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
          },
        });

        if (fetchRes.ok) {
          const detail = await fetchRes.json();
          const text = detail.text || '';
          const html = detail.html || (text ? `<p>${text.replace(/\n/g, '<br/>')}</p>` : '');

          if (text || html) {
            await supabase
              .from('institutional_emails')
              .update({
                body_text: text,
                body_html: html,
                subject: detail.subject || undefined,
              })
              .eq('id', row.id);

            updated.push({ id: row.id, resend_id: row.resend_id, textLen: text.length });
          }
        } else {
          console.warn('[sync-email-body] Resend receiving API status:', fetchRes.status, await fetchRes.text());
        }
      } catch (err) {
        console.warn('[sync-email-body] Failed fetching for:', row.resend_id, err);
      }
    }

    return res.status(200).json({
      success: true,
      syncedCount: updated.length,
      updated,
    });
  } catch (err) {
    console.error('[sync-email-body] Error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
