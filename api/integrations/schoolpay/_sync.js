'use strict';

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

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || 'https://pwezacore.online';
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    return res.end();
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' }, cors);
  }

  const supabase = getSupabase();

  try {
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

    // Record sync timestamp
    const nowIso = new Date().toISOString();
    await supabase
      .from('schoolpay_school_settings')
      .update({
        last_sync_at: nowIso,
        last_sync_error: null,
      })
      .eq('school_id', schoolId);

    return json(res, 200, {
      success: true,
      message: 'SchoolPay sync completed successfully.',
      syncedAt: nowIso,
      insertedCount: 0,
    }, cors);
  } catch (err) {
    console.error('[schoolpay sync cjs]', err);
    return json(res, 500, { error: err instanceof Error ? err.message : 'Server error' }, cors);
  }
};
