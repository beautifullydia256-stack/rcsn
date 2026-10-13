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

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

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

    const rawId = req.query?.id || body.id || body.emailId;
    const rawIds = body.ids || (rawId ? [rawId] : []);

    if (!rawIds.length) {
      return sendJson(res, 400, { error: 'Missing email id to delete' });
    }

    const supabase = getSupabase();

    // 1. Delete associated child/replies or nullify in_reply_to_id if necessary
    await supabase
      .from('institutional_emails')
      .update({ in_reply_to_id: null })
      .in('in_reply_to_id', rawIds);

    // 2. Delete the specified emails
    const { error: deleteErr } = await supabase
      .from('institutional_emails')
      .delete()
      .in('id', rawIds);

    if (deleteErr) {
      console.error('[delete-email] Database delete error:', deleteErr);
      return sendJson(res, 500, { error: deleteErr.message });
    }

    return sendJson(res, 200, {
      success: true,
      message: 'Email deleted successfully',
      deletedIds: rawIds,
      deletedCount: rawIds.length,
    });
  } catch (err) {
    console.error('[delete-email] Exception:', err);
    return sendJson(res, 500, { error: err.message || 'Internal server error' });
  }
};
