'use strict';

// CommonJS — package.json has no "type":"module" so .ts ESM output breaks Node.js

const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const VALID_STATUSES = ['pending', 'sent', 'failed'];

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabase();
    const authHeader = req.headers?.['authorization'] ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) return res.status(401).json({ error: 'Unauthorized' });

    const { data: callerProfile } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', caller.id)
      .single();

    if (!callerProfile?.school_id || !['admin', 'owner', 'head_teacher', 'dos', 'secretary'].includes(callerProfile.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const q = req.query || {};
    const status = typeof q.status === 'string' ? q.status : '';
    const limit = Math.min(parseInt(q.limit, 10) || 100, 200);

    let query = supabase
      .from('notification_logs')
      .select('log_id, recipient, recipient_name, recipient_role, notification_type, category, status, error_message, sent_at, created_at')
      .eq('school_id', callerProfile.school_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (VALID_STATUSES.includes(status)) query = query.eq('status', status);

    const { data: logs, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ success: true, logs: logs || [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch notification history';
    return res.status(500).json({ error: msg });
  }
};
