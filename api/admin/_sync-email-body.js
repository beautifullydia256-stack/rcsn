'use strict';

const { createClient } = require('@supabase/supabase-js');

function sendJson(res, status, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(data);
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(data));
}

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://npqjrtspgxhuwrljbemz.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcWpydHNwZ3hodXdybGpiZW16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDk2ODA0NywiZXhwIjoyMTA2NTQ0MDQ3fQ.bFnL4JRn1xDRrlclj8vka2Ww5rFcGTH37NuCijz7PA0';
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const resendApiKey =
    process.env.RESEND_API_KEY?.trim() ||
    process.env.VITE_RESEND_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_RESEND_API_KEY?.trim();

  if (!resendApiKey) {
    return sendJson(res, 200, {
      success: false,
      missingKey: true,
      message: 'RESEND_API_KEY is not configured in Vercel environment variables. Add RESEND_API_KEY in your Vercel project settings.',
      syncedCount: 0,
      updated: [],
    });
  }

  const supabase = getSupabase();

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body || '{}');
      } catch (e) {
        body = {};
      }
    }
    body = body || {};

    const emailId = req.query?.id || body.id || body.emailId;

    let query = supabase
      .from('institutional_emails')
      .select('id, resend_id, body_text, body_html, subject, metadata')
      .not('resend_id', 'is', null);

    if (emailId) {
      query = query.eq('id', emailId);
    } else {
      query = query.or('body_text.eq.,body_text.is.null').limit(20);
    }

    const { data: rows, error: selectErr } = await query;
    if (selectErr) {
      console.error('[sync-email-body] Query error:', selectErr);
      return sendJson(res, 200, { success: false, error: selectErr.message, syncedCount: 0 });
    }

    const updated = [];
    let restrictedKeyDetected = false;

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
                subject: detail.subject || row.subject || undefined,
              })
              .eq('id', row.id);

            updated.push({ id: row.id, resend_id: row.resend_id, textLen: text.length });
          }
        } else {
          const errText = await fetchRes.text();
          console.warn('[sync-email-body] Resend receiving API status:', fetchRes.status, errText);

          if (fetchRes.status === 401 || errText.includes('restricted_api_key')) {
            restrictedKeyDetected = true;
          }
        }
      } catch (err) {
        console.warn('[sync-email-body] Failed fetching for:', row.resend_id, err);
      }
    }

    if (restrictedKeyDetected && updated.length === 0) {
      return sendJson(res, 200, {
        success: false,
        restrictedKey: true,
        message:
          'Resend API key is currently restricted to Sending permissions. To fetch incoming email bodies automatically, update the key in Resend Dashboard to Full Access.',
        syncedCount: 0,
        updated: [],
      });
    }

    return sendJson(res, 200, {
      success: true,
      syncedCount: updated.length,
      updated,
    });
  } catch (err) {
    console.error('[sync-email-body] Error:', err);
    return sendJson(res, 200, {
      success: false,
      error: err.message || 'Server error',
      syncedCount: 0,
    });
  }
};
