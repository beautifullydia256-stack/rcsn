'use strict';

const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional bearer token authorization if CRON_SECRET is set
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized cron request' });
  }

  try {
    const supabase = getSupabase();

    // Call stored procedure to expire tenures across all schools
    const { data, error } = await supabase.rpc('check_and_expire_guild_tenures', {
      p_school_id: null
    });

    if (error) {
      console.error('[expire-guild-tenures] RPC error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      data,
      executed_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('[expire-guild-tenures] Server error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
};
