'use strict';

const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Uganda is UTC+3
function ugandaNow() {
  return new Date(Date.now() + 3 * 60 * 60 * 1000);
}
function ugandaDateStr() {
  return ugandaNow().toISOString().split('T')[0];
}
function hhmmNow() {
  const n = ugandaNow();
  return `${String(n.getUTCHours()).padStart(2, '0')}:${String(n.getUTCMinutes()).padStart(2, '0')}`;
}
function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabase();
    const {
      schoolId, teacherId, periodId, className, subject,
      scheduledStart, scheduledEnd, photoBase64,
    } = req.body ?? {};

    if (!schoolId || !teacherId || !periodId || !className || !subject || !scheduledStart || !scheduledEnd || !photoBase64) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Reject oversized images (3 MB limit on base64 = ~4 MB encoded)
    if (Buffer.byteLength(photoBase64, 'base64') > 3 * 1024 * 1024) {
      return res.status(413).json({ error: 'Photo exceeds 3 MB limit. Please retake.' });
    }

    // Time window check: start_time - 5 min to start_time + 30 min
    const now = hhmmNow();
    const windowOpen = addMinutes(scheduledStart, -5);
    const windowClose = addMinutes(scheduledStart, 30);
    if (now < windowOpen || now > windowClose) {
      return res.status(422).json({
        error: `Lesson can only be started between ${windowOpen} and ${windowClose}. Current time: ${now}.`,
      });
    }

    const lessonDate = ugandaDateStr();

    // Check if already started today
    const { data: existing } = await supabase
      .from('lesson_logs')
      .select('log_id, status')
      .eq('teacher_id', teacherId)
      .eq('timetable_period_id', periodId)
      .eq('lesson_date', lessonDate)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Lesson already started for this slot today.', logId: existing.log_id });
    }

    // Generate log_id client-side by inserting and getting it back
    const { data: inserted, error: insErr } = await supabase
      .from('lesson_logs')
      .insert({
        school_id: schoolId,
        teacher_id: teacherId,
        timetable_period_id: periodId,
        class_name: className,
        subject,
        lesson_date: lessonDate,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        started_at: new Date().toISOString(),
        status: 'started',
      })
      .select('log_id')
      .single();

    if (insErr) return res.status(500).json({ error: insErr.message });

    const logId = inserted.log_id;

    // Upload start photo to storage
    const imgBuffer = Buffer.from(photoBase64, 'base64');
    const storagePath = `${schoolId}/${logId}/start.jpg`;
    const { error: storErr } = await supabase.storage
      .from('lesson-evidence')
      .upload(storagePath, imgBuffer, { contentType: 'image/jpeg', upsert: false });

    if (storErr) {
      // Roll back the insert
      await supabase.from('lesson_logs').delete().eq('log_id', logId);
      return res.status(500).json({ error: `Photo upload failed: ${storErr.message}` });
    }

    // Save photo path to record
    await supabase.from('lesson_logs').update({ start_photo_path: storagePath }).eq('log_id', logId);

    return res.status(200).json({ success: true, logId });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' });
  }
};
