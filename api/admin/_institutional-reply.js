'use strict';

const { createClient } = require('@supabase/supabase-js');

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

function sendJson(res, status, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(data);
  }
  res.statusCode = status;
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json');
  }
  return res.end(JSON.stringify(data));
}

function getResendApiKey() {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
    return process.env.RESEND_API_KEY.trim();
  }
  if (process.env.VITE_RESEND_API_KEY && process.env.VITE_RESEND_API_KEY.trim()) {
    return process.env.VITE_RESEND_API_KEY.trim();
  }
  if (process.env.NEXT_PUBLIC_RESEND_API_KEY && process.env.NEXT_PUBLIC_RESEND_API_KEY.trim()) {
    return process.env.NEXT_PUBLIC_RESEND_API_KEY.trim();
  }
  try {
    const fs = require('fs');
    const path = require('path');
    const candidates = [
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(process.cwd(), '.env'),
      path.resolve(__dirname, '../../.env.local'),
      path.resolve(__dirname, '../../.env'),
    ];
    for (const f of candidates) {
      if (fs.existsSync(f)) {
        const lines = fs.readFileSync(f, 'utf8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('RESEND_API_KEY=')) {
            const val = trimmed.split('=')[1].replace(/^["']|["']$/g, '').trim();
            if (val) {
              process.env.RESEND_API_KEY = val;
              return val;
            }
          }
        }
      }
    }
  } catch (_) {}
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return sendJson(res, 401, { error: 'Unauthorized: missing authorization token' });
  }

  const supabase = getSupabase();

  // Verify caller identity
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return sendJson(res, 401, { error: 'Unauthorized: invalid token' });
  }

  const { inReplyToId, toEmail, subject, textBody, htmlBody, fromAddress } = req.body || {};

  if (!toEmail || !subject || (!textBody && !htmlBody)) {
    return sendJson(res, 400, { error: 'Missing required fields: toEmail, subject, and body' });
  }

  const resendApiKey = getResendApiKey();
  if (!resendApiKey) {
    return sendJson(res, 500, { error: 'RESEND_API_KEY is not configured on the server environment' });
  }

  const selectedFrom = (fromAddress || 'info@rcsn.ac.ug').toLowerCase().trim();
  const validDomainFrom = selectedFrom.endsWith('@rcsn.ac.ug') ? selectedFrom : 'info@rcsn.ac.ug';
  const fromDisplay = `RCSN Institutional Administration <${validDomainFrom}>`;

  const finalHtml = htmlBody || `<p>${String(textBody).replace(/\n/g, '<br/>')}</p>`;
  const finalText = textBody || htmlBody?.replace(/<[^>]+>/g, '') || '';

  try {
    // 1. Send via Resend API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromDisplay,
        to: [toEmail.trim().toLowerCase()],
        subject: subject.trim(),
        html: finalHtml,
        text: finalText,
      }),
    });

    const resendJson = await resendRes.json();
    if (!resendRes.ok) {
      console.error('[institutional-reply] Resend error:', resendJson);
      return sendJson(res, resendRes.status || 500, {
        error: resendJson.message || 'Failed to dispatch email via Resend',
        details: resendJson,
      });
    }

    // 2. Record outbound email in institutional_emails
    const { data: insertedReply, error: insertError } = await supabase
      .from('institutional_emails')
      .insert({
        school_id: userData.user.user_metadata?.school_id || 'e1b10000-0000-4000-a000-000000000001',
        resend_id: resendJson.id || null,
        direction: 'outbound',
        from_email: validDomainFrom,
        from_name: 'RCSN Institutional Administration',
        to_email: toEmail.trim().toLowerCase(),
        subject: subject.trim(),
        body_text: finalText,
        body_html: finalHtml,
        is_read: true,
        in_reply_to_id: inReplyToId || null,
        metadata: {
          resend_id: resendJson.id,
          sent_by_user_id: userData.user.id,
          sent_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    if (insertError) {
      console.warn('[institutional-reply] Could not log outbound email:', insertError);
    }

    // 3. Mark original email as read
    if (inReplyToId) {
      await supabase
        .from('institutional_emails')
        .update({ is_read: true })
        .eq('id', inReplyToId);
    }

    return sendJson(res, 200, {
      success: true,
      message: 'Reply sent successfully',
      resendId: resendJson.id,
      emailId: insertedReply?.id,
    });
  } catch (err) {
    console.error('[institutional-reply] Exception:', err);
    return sendJson(res, 500, { error: err.message || 'Internal server error' });
  }
};
