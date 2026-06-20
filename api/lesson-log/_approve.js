'use strict';

const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabase();
    const { logId, schoolId, approvedBy } = req.body ?? {};

    if (!logId || !schoolId || !approvedBy) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: log, error: fetchErr } = await supabase
      .from('lesson_logs')
      .select('log_id, status, school_id, start_photo_path, end_photo_path')
      .eq('log_id', logId)
      .maybeSingle();

    if (fetchErr || !log) return res.status(404).json({ error: 'Lesson log not found' });
    if (log.school_id !== schoolId) return res.status(403).json({ error: 'Unauthorized' });
    if (log.status === 'approved') return res.status(409).json({ error: 'Already approved' });

    // Delete photos from storage
    const pathsToDelete = [log.start_photo_path, log.end_photo_path].filter(Boolean);
    if (pathsToDelete.length > 0) {
      await supabase.storage.from('lesson-evidence').remove(pathsToDelete);
    }

    // Mark approved
    const { error: updErr } = await supabase
      .from('lesson_logs')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        start_photo_path: null,
        end_photo_path: null,
      })
      .eq('log_id', logId);

    if (updErr) return res.status(500).json({ error: updErr.message });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
};
