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
  res.setHeader('Content-Type', 'application/json');

  const resendApiKey = getResendApiKey();

  if (!resendApiKey) {
    return sendJson(res, 200, {
      success: false,
      missingKey: true,
      error: 'RESEND_API_KEY is not configured in Vercel environment variables with Full Access.',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body || '{}');
      } catch {
        body = {};
      }
    }
    body = body || {};

    const emailId = req.query?.emailId || req.query?.id || body.emailId || body.id;
    const attachmentId = req.query?.attachmentId || body.attachmentId;

    if (!emailId) {
      return sendJson(res, 400, { success: false, error: 'Missing emailId' });
    }

    const supabase = getSupabase();
    const { data: row, error: selectErr } = await supabase
      .from('institutional_emails')
      .select('id, resend_id, metadata')
      .eq('id', emailId)
      .maybeSingle();

    if (selectErr || !row) {
      return sendJson(res, 404, { success: false, error: 'Email record not found' });
    }

    const resendId = row.resend_id;
    if (!resendId) {
      return sendJson(res, 400, { success: false, error: 'Email has no associated Resend receiving ID' });
    }

    // If an attachmentId is specified, fetch its download link
    if (attachmentId) {
      const attachRes = await fetch(
        `https://api.resend.com/emails/receiving/${resendId}/attachments/${attachmentId}`,
        {
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
          },
        }
      );

      if (!attachRes.ok) {
        const errText = await attachRes.text();
        return sendJson(res, 200, {
          success: false,
          error: `Resend API error (${attachRes.status}): ${errText}`,
        });
      }

      const attachData = await attachRes.json();
      return sendJson(res, 200, {
        success: true,
        downloadUrl: attachData.download_url,
        filename: attachData.filename,
        expiresAt: attachData.expires_at,
      });
    }

    // Otherwise, list all attachments for this receiving email
    const listRes = await fetch(`https://api.resend.com/emails/receiving/${resendId}/attachments`, {
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
      },
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      return sendJson(res, 200, {
        success: false,
        error: `Resend API error (${listRes.status}): ${errText}`,
      });
    }

    const listData = await listRes.json();
    const attachments = listData.data || listData || [];

    // Also update institutional_emails metadata with the fresh attachments list
    await supabase
      .from('institutional_emails')
      .update({
        metadata: {
          ...(row.metadata || {}),
          attachments: attachments,
        },
      })
      .eq('id', row.id);

    return sendJson(res, 200, {
      success: true,
      attachments,
    });
  } catch (err) {
    console.error('[_email-attachment] Error:', err);
    return sendJson(res, 500, {
      success: false,
      error: err.message || 'Server error downloading attachment',
    });
  }
};
