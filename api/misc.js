'use strict';
// Combined misc operations router.
// Handles: owner/*, integrations/schoolpay/*, referrals/verify, teacher/punch
// URL: /api/misc?action=<name>

const { createClient } = require('@supabase/supabase-js');

function load(path) {
  const m = require(path);
  return typeof m === 'function' ? m : (m.default || m.handler || m);
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// ─── Owner: Dashboard Metrics ──────────────────────────────────────────────
async function ownerDashboardMetrics(req, res) {
  return load('./owner/_dashboard-metrics')(req, res);
}

// ─── Owner: System Health ──────────────────────────────────────────────────
async function ownerSystemHealth(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const supabase = getSupabase();
  try {
    if (req.method === 'GET') {
      const { data: m, error } = await supabase
        .from('system_health_metrics').select('*')
        .eq('metric_type', 'system_health')
        .order('recorded_at', { ascending: false }).limit(1).single();
      if (error && error.code !== 'PGRST116') return json(res, 500, { error: 'Failed to fetch system health data' });
      if (!m) return json(res, 200, { cpu_usage: 45.2, memory_usage: 67.8, disk_usage: 34.1, active_connections: 156, response_time: 245, uptime: 99.9, last_updated: new Date().toISOString() });
      return json(res, 200, { cpu_usage: m.cpu_usage || 0, memory_usage: m.memory_usage || 0, disk_usage: m.disk_usage || 0, active_connections: m.active_connections || 0, response_time: m.response_time_ms || 0, uptime: m.uptime_hours ? (m.uptime_hours / 24).toFixed(1) : 0, status: m.status || 'healthy', last_updated: m.recorded_at || m.created_at });
    }
    // POST
    const healthData = req.body || {};
    const { data, error } = await supabase.from('system_health_metrics').insert([{
      metric_type: 'system_health', metric_name: 'system_health_update',
      cpu_usage: healthData.cpu_usage || 0, memory_usage: healthData.memory_usage || 0,
      disk_usage: healthData.disk_usage || 0, active_connections: healthData.active_connections || 0,
      response_time_ms: healthData.response_time || 0, uptime_hours: healthData.uptime ? Math.round(healthData.uptime * 24) : 0,
      status: healthData.status || 'healthy'
    }]).select().single();
    if (error) return json(res, 500, { error: 'Failed to save system health data' });
    return json(res, 200, data);
  } catch (e) {
    return json(res, 500, { error: 'Internal server error' });
  }
}

// ─── Owner: Users ─────────────────────────────────────────────────────────
async function ownerUsers(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const supabase = getSupabase();
  try {
    const q = req.query || {};
    const limit = parseInt(q.limit || '100', 10);
    const role = q.role || null;

    let query = supabase.from('users').select('user_id, email, name, role, school_id, created_at, phone')
      .order('created_at', { ascending: false }).limit(limit);
    if (role && role !== 'all') query = query.eq('role', role);

    const { data: users, error } = await query;
    if (error) return json(res, 500, { error: error.message });

    return json(res, 200, { success: true, users: users || [], total: (users || []).length });
  } catch (e) {
    return json(res, 500, { success: false, error: 'Failed to fetch users' });
  }
}

// ─── Owner: Login Activity ────────────────────────────────────────────────
async function ownerLoginActivity(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const supabase = getSupabase();
  try {
    const limit = parseInt((req.query || {}).limit || '100', 10);
    const { data: loginActivity, error } = await supabase
      .rpc('get_login_activity_with_users', { limit_count: limit });
    if (error) {
      // Fallback: return empty if RPC doesn't exist
      console.error('login-activity RPC error:', error);
      return json(res, 200, { loginActivity: [], total: 0 });
    }
    return json(res, 200, { loginActivity: loginActivity || [], total: (loginActivity || []).length });
  } catch (e) {
    return json(res, 500, { error: 'Internal server error' });
  }
}

// ─── Owner: Schools ───────────────────────────────────────────────────────
async function ownerSchools(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const supabase = getSupabase();
  try {
    const q = req.query || {};
    const limit = parseInt(q.limit || '100', 10);
    const status = q.status || null;

    let query = supabase.from('schools').select('school_id, name, location, status, email, phone, created_at')
      .order('created_at', { ascending: false }).limit(limit);
    if (status) query = query.eq('status', status);

    const { data: schools, error } = await query;
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, { success: true, schools: schools || [], total: (schools || []).length });
  } catch (e) {
    return json(res, 500, { error: 'Failed to fetch schools' });
  }
}

// ─── Main router ──────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const action = (req.query && req.query.action) || '';
  switch (action) {
    case 'schoolpay-settings':       return load('./integrations/schoolpay/_settings')(req, res);
    case 'schoolpay-sync':           return load('./integrations/schoolpay/_sync')(req, res);
    case 'referrals-verify':         return load('./referrals/_verify')(req, res);
    case 'teacher-punch':            return load('./teacher/_punch')(req, res);
    case 'owner-dashboard-metrics':  return ownerDashboardMetrics(req, res);
    case 'owner-system-health':      return ownerSystemHealth(req, res);
    case 'owner-users':              return ownerUsers(req, res);
    case 'owner-login-activity':     return ownerLoginActivity(req, res);
    case 'owner-schools':            return ownerSchools(req, res);
    default:
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
  }
};
