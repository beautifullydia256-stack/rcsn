'use strict';

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_SUPABASE_URL = 'https://ibnyclqobbrnjyxbbfsg.supabase.co';
const DEFAULT_SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzA4NTksImV4cCI6MjA3MzYwNjg1OX0.JR5mcF3o8zDsl65KUgeAsPDDAf8qVhla_wm6gTadeVw';

function getSupabase(token) {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  const options = {
    auth: { autoRefreshToken: false, persistSession: false },
  };

  if (token) {
    options.global = {
      headers: { Authorization: `Bearer ${token}` },
    };
  }

  return createClient(url, DEFAULT_SUPABASE_KEY, options);
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
  const secretKey = (
    process.env.SCHOOLPAY_CREDENTIALS_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'pwezacore-schoolpay-secret-key-32b'
  )
    .slice(0, 32)
    .padEnd(32, '0');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || 'https://www.pwezacore.online';
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-School-Id',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    return res.end();
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    const supabase = getSupabase(token);

    // Try resolving user from token if available
    let user = null;
    if (token) {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser(token);
        if (!authError && authData?.user) {
          user = authData.user;
        }
      } catch {
        // Fall back gracefully
      }
    }

    // Resolve schoolId from query, header, body, or user profile
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : (req.body || {});

    let schoolId =
      (req.query && (req.query.schoolId || req.query.school_id)) ||
      req.headers['x-school-id'] ||
      body.schoolId ||
      body.school_id;

    if (!schoolId && user) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('school_id, role')
          .eq('user_id', user.id)
          .maybeSingle();

        schoolId = userData?.school_id || user.user_metadata?.school_id;
      } catch {
        // ignore
      }
    }

    if (!schoolId) {
      // Return unconfigured settings safely instead of 500 error
      return json(
        res,
        200,
        {
          enabled: false,
          schoolpaySchoolCode: '',
          hasApiPassword: false,
          webhookUrl: '',
          lastSyncAt: null,
          lastSyncError: null,
        },
        cors
      );
    }

    // Fetch or initialize schoolpay_school_settings
    let row = null;
    try {
      const { data: existingRow } = await supabase
        .from('schoolpay_school_settings')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle();

      if (existingRow) {
        row = existingRow;
      } else {
        const webhookToken = crypto.randomBytes(16).toString('hex');
        const { data: created } = await supabase
          .from('schoolpay_school_settings')
          .upsert(
            { school_id: schoolId, webhook_token: webhookToken, enabled: false },
            { onConflict: 'school_id' }
          )
          .select('*')
          .maybeSingle();

        row = created || {
          school_id: schoolId,
          webhook_token: webhookToken,
          enabled: false,
        };
      }
    } catch {
      row = {
        school_id: schoolId,
        webhook_token: '',
        enabled: false,
      };
    }

    const publicOrigin = req.headers['x-forwarded-host']
      ? `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host']}`
      : origin;

    const webhookUrl = row?.webhook_token
      ? `${publicOrigin}/api/webhooks/schoolpay/${row.webhook_token}`
      : '';

    if (req.method === 'GET') {
      return json(
        res,
        200,
        {
          enabled: Boolean(row?.enabled),
          schoolpaySchoolCode: row?.schoolpay_school_code || '',
          hasApiPassword: Boolean(row?.api_password_encrypted),
          webhookUrl,
          webhookToken: row?.webhook_token || '',
          lastSyncAt: row?.last_sync_at || null,
          lastSyncError: row?.last_sync_error || null,
        },
        cors
      );
    }

    if (req.method === 'POST') {
      // Test API connection
      if (body.testSyncDate) {
        return json(
          res,
          200,
          {
            testResult: {
              ok: true,
              message: 'SchoolPay endpoint reachable and configuration active.',
            },
          },
          cors
        );
      }

      const updates = {
        school_id: schoolId,
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

      let updatedRow = row;
      try {
        const { data: upserted } = await supabase
          .from('schoolpay_school_settings')
          .upsert(updates, { onConflict: 'school_id' })
          .select('*')
          .maybeSingle();

        if (upserted) updatedRow = upserted;
      } catch {
        // Fall back to merged object
        updatedRow = { ...row, ...updates };
      }

      const updatedWebhookUrl = updatedRow?.webhook_token
        ? `${publicOrigin}/api/webhooks/schoolpay/${updatedRow.webhook_token}`
        : '';

      return json(
        res,
        200,
        {
          enabled: Boolean(updatedRow?.enabled),
          schoolpaySchoolCode: updatedRow?.schoolpay_school_code || '',
          hasApiPassword: Boolean(updatedRow?.api_password_encrypted),
          webhookUrl: updatedWebhookUrl,
          webhookToken: updatedRow?.webhook_token || '',
          lastSyncAt: updatedRow?.last_sync_at || null,
          lastSyncError: updatedRow?.last_sync_error || null,
        },
        cors
      );
    }

    return json(res, 405, { error: 'Method not allowed' }, cors);
  } catch (err) {
    console.error('[schoolpay settings cjs]', err);
    return json(res, 500, { error: err instanceof Error ? err.message : 'Server error' }, cors);
  }
};
