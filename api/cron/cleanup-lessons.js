'use strict';

const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

module.exports = async function handler(req, res) {
  // Allow cron invocations or manual GET for testing
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabase();

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Find all lesson_logs older than 30 days that are not yet approved
    const { data: stale, error: fetchErr } = await supabase
      .from('lesson_logs')
      .select('log_id, start_photo_path, end_photo_path')
      .in('status', ['started', 'completed'])
      .lt('created_at', cutoff);

    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (!stale || stale.length === 0) {
      return res.status(200).json({ cleaned: 0, message: 'Nothing to clean up' });
    }

    // Collect all storage paths to delete
    const paths = [];
    for (const row of stale) {
      if (row.start_photo_path) paths.push(row.start_photo_path);
      if (row.end_photo_path) paths.push(row.end_photo_path);
    }

    if (paths.length > 0) {
      await supabase.storage.from('lesson-evidence').remove(paths);
    }

    // Mark records as auto_expired
    const ids = stale.map((r) => r.log_id);
    await supabase
      .from('lesson_logs')
      .update({ status: 'auto_expired', start_photo_path: null, end_photo_path: null })
      .in('log_id', ids);

    return res.status(200).json({ cleaned: stale.length, photosDeleted: paths.length });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
};
