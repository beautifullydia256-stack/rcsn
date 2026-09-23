'use strict';

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ibnyclqobbrnjyxbbfsg.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function json(res, status, data, cors) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  if (cors) {
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  }
  res.end(JSON.stringify(data));
}

function encryptSecret(plaintext) {
  const secretKey = (process.env.SCHOOLPAY_CREDENTIALS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'pwezacore-schoolpay-secret-key-32b').slice(0, 32).padEnd(32, '0');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || 'https://pwezacore.online';
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    return res.end();
  }

  const supabase = getSupabase();

  try {
    // Authenticate user via bearer token
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return json(res, 401, { error: 'Missing authorization token' }, cors);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json(res, 401, { error: 'Invalid or expired session' }, cors);
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userError || !userData?.school_id) {
      return json(res, 403, { error: 'No school associated with this account' }, cors);
    }

    const schoolId = userData.school_id;

    // Fetch or initialize schoolpay_school_settings
    let { data: row } = await supabase
      .from('schoolpay_school_settings')
      .select('*')
      .eq('school_id', schoolId)
      .maybeSingle();

    if (!row) {
      const webhookToken = crypto.randomBytes(16).toString('hex');
      const { data: created, error: createError } = await supabase
        .from('schoolpay_school_settings')
        .insert({
          school_id: schoolId,
          webhook_token: webhookToken,
          enabled: false,
        })
        .select('*')
        .single();

      if (!createError && created) {
        row = created;
      }
    }

    if (req.method === 'GET') {
      const webhookToken = row?.webhook_token || '';
      const publicOrigin = req.headers['x-forwarded-host']
        ? `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host']}`
        : origin;

      const webhookUrl = webhookToken
        ? `${publicOrigin}/api/webhooks/schoolpay/${webhookToken}`
        : '';

      return json(res, 200, {
        enabled: Boolean(row?.enabled),
        schoolpaySchoolCode: row?.schoolpay_school_code || '',
        hasApiPassword: Boolean(row?.api_password_encrypted),
        webhookUrl,
        webhookToken,
        lastSyncAt: row?.last_sync_at || null,
        lastSyncError: row?.last_sync_error || null,
      }, cors);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const updates = {
        updated_at: new Date().toISOString(),
      };

      if (typeof body.enabled === 'boolean') {
        updates.enabled = body.enabled;
      }
      if (typeof body.schoolpaySchoolCode === 'string') {
        updates.schoolpay_school_code = body.schoolpaySchoolCode.trim();
      }
      if (typeof body.apiPassword === 'string' && body.apiPassword.trim().length > 0) {
        updates.api_password_encrypted = encryptSecret(body.apiPassword.trim());
      }
      if (body.regenerateWebhookToken) {
        updates.webhook_token = crypto.randomBytes(16).toString('hex');
      }

      const { data: updated, error: updateError } = await supabase
        .from('schoolpay_school_settings')
        .update(updates)
        .eq('school_id', schoolId)
        .select('*')
        .single();

      if (updateError) {
        return json(res, 500, { error: updateError.message }, cors);
      }

      const publicOrigin = req.headers['x-forwarded-host']
        ? `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host']}`
        : origin;

      const webhookUrl = updated.webhook_token
        ? `${publicOrigin}/api/webhooks/schoolpay/${updated.webhook_token}`
        : '';

      return json(res, 200, {
        enabled: Boolean(updated.enabled),
        schoolpaySchoolCode: updated.schoolpay_school_code || '',
        hasApiPassword: Boolean(updated.api_password_encrypted),
        webhookUrl,
        webhookToken: updated.webhook_token,
        lastSyncAt: updated.last_sync_at || null,
        lastSyncError: updated.last_sync_error || null,
      }, cors);
    }

    return json(res, 405, { error: 'Method not allowed' }, cors);
  } catch (err) {
    console.error('[schoolpay settings cjs]', err);
    return json(res, 500, { error: err instanceof Error ? err.message : 'Server error' }, cors);
  }
};
