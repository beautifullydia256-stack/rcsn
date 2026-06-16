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
    const { logId, schoolId, teacherId, photoBase64 } = req.body ?? {};

    if (!logId || !schoolId || !teacherId || !photoBase64) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Reject oversized images (3 MB limit)
    if (Buffer.byteLength(photoBase64, 'base64') > 3 * 1024 * 1024) {
      return res.status(413).json({ error: 'Photo exceeds 3 MB limit. Please retake.' });
    }

    // Verify ownership and status
    const { data: log, error: fetchErr } = await supabase
      .from('lesson_logs')
      .select('log_id, status, school_id, teacher_id')
      .eq('log_id', logId)
      .maybeSingle();

    if (fetchErr || !log) return res.status(404).json({ error: 'Lesson log not found' });
    if (log.school_id !== schoolId || log.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (log.status !== 'started') {
      return res.status(409).json({ error: `Lesson is already ${log.status}` });
    }

    // Upload end photo
    const imgBuffer = Buffer.from(photoBase64, 'base64');
    const storagePath = `${schoolId}/${logId}/end.jpg`;
    const { error: storErr } = await supabase.storage
      .from('lesson-evidence')
      .upload(storagePath, imgBuffer, { contentType: 'image/jpeg', upsert: false });

    if (storErr) return res.status(500).json({ error: `Photo upload failed: ${storErr.message}` });

    // Mark lesson completed
    const { error: updErr } = await supabase
      .from('lesson_logs')
      .update({
        end_photo_path: storagePath,
        ended_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('log_id', logId);

    if (updErr) return res.status(500).json({ error: updErr.message });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
};
