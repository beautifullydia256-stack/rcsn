'use strict';

const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const SIGNED_URL_EXPIRY = 3600; // 1 hour

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabase();
    const logId = Array.isArray(req.query.logId) ? req.query.logId[0] : req.query.logId;
    const schoolId = Array.isArray(req.query.schoolId) ? req.query.schoolId[0] : req.query.schoolId;

    if (!logId || !schoolId) return res.status(400).json({ error: 'logId and schoolId required' });

    const { data: log, error: fetchErr } = await supabase
      .from('lesson_logs')
      .select('school_id, start_photo_path, end_photo_path, status')
      .eq('log_id', logId)
      .maybeSingle();

    if (fetchErr || !log) return res.status(404).json({ error: 'Not found' });
    if (log.school_id !== schoolId) return res.status(403).json({ error: 'Unauthorized' });

    async function signedUrl(path) {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from('lesson-evidence')
        .createSignedUrl(path, SIGNED_URL_EXPIRY);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    }

    const [startUrl, endUrl] = await Promise.all([
      signedUrl(log.start_photo_path),
      signedUrl(log.end_photo_path),
    ]);

    return res.status(200).json({ startUrl, endUrl, status: log.status });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
};
