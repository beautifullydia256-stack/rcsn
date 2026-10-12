'use strict';

const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function parseEmailAndName(raw) {
  if (!raw || typeof raw !== 'string') return { name: '', email: '' };
  const match = raw.match(/^(.*?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].replace(/["']/g, '').trim(), email: match[2].trim().toLowerCase() };
  }
  return { name: '', email: raw.trim().toLowerCase() };
}

module.exports = async function handler(req, res) {
  // Allow HEAD or GET for webhook verification ping
  if (req.method === 'GET' || req.method === 'HEAD') {
    return res.status(200).json({ status: 'ok', service: 'RCSN Resend Inbound Webhook' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body || {};
    const eventType = payload.type || 'email.received';

    // Resend payload structure: either nested under data or top level
    const emailData = payload.data || payload;

    const rawFrom = emailData.from || '';
    const { name: fromName, email: fromEmail } = parseEmailAndName(rawFrom);

    let toEmail = '';
    if (Array.isArray(emailData.to)) {
      toEmail = emailData.to[0] || '';
    } else if (typeof emailData.to === 'string') {
      toEmail = emailData.to;
    }
    toEmail = toEmail.toLowerCase().trim();

    let subject = emailData.subject || '(No Subject)';
    let bodyText = emailData.text || '';
    let bodyHtml = emailData.html || '';
    const resendId = emailData.email_id || emailData.id || null;

    // Resend email.received webhook sends metadata only. Retrieve body via API:
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if ((!bodyText && !bodyHtml) && resendId && resendApiKey) {
      try {
        const receivedRes = await fetch(`https://api.resend.com/emails/receiving/${resendId}`, {
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
          },
        });
        if (receivedRes.ok) {
          const detail = await receivedRes.json();
          bodyText = detail.text || bodyText;
          bodyHtml = detail.html || bodyHtml;
          if (detail.subject) subject = detail.subject;
        }
      } catch (err) {
        console.warn('[resend-inbound] Error fetching email body from Resend API:', err);
      }
    }

    if (!bodyHtml && bodyText) {
      bodyHtml = `<p>${bodyText.replace(/\n/g, '<br/>')}</p>`;
    }

    if (!fromEmail && !toEmail) {
      console.warn('[resend-inbound] Received webhook without from/to email:', payload);
      return res.status(200).json({ received: true, ignored: true });
    }

    const supabase = getSupabase();

    // Look up school_id if available (defaulting to the active institution)
    const { data: schoolRow } = await supabase
      .from('schools')
      .select('school_id')
      .limit(1)
      .maybeSingle();

    const schoolId = schoolRow?.school_id || null;

    // 1. Insert into institutional_emails
    const { data: insertedEmail, error: insertError } = await supabase
      .from('institutional_emails')
      .insert({
        school_id: schoolId,
        resend_id: resendId,
        direction: 'inbound',
        from_email: fromEmail || rawFrom,
        from_name: fromName || fromEmail,
        to_email: toEmail || 'info@rcsn.ac.ug',
        subject: subject,
        body_text: bodyText,
        body_html: bodyHtml,
        is_read: false,
        is_archived: false,
        metadata: {
          headers: emailData.headers || {},
          attachments: emailData.attachments || [],
          event_type: eventType,
          received_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[resend-inbound] Insert error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    console.log('[resend-inbound] Inbound email stored successfully. ID:', insertedEmail?.id);

    // 2. Dispatch in-app notification to administrators
    try {
      await supabase.from('notifications').insert({
        school_id: schoolId,
        title: `New Email: ${fromName || fromEmail}`,
        message: `${subject.slice(0, 100)} — sent to ${toEmail}`,
        type: 'email_inbound',
        metadata: {
          email_id: insertedEmail?.id,
          from: fromEmail,
          to: toEmail,
          subject,
        },
      });
    } catch (notifErr) {
      console.warn('[resend-inbound] Non-fatal notification error:', notifErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Inbound email received and saved',
      id: insertedEmail?.id,
    });
  } catch (err) {
    console.error('[resend-inbound] Exception:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
