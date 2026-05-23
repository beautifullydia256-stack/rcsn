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

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function str(v) {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const supabase = getSupabase();
      const teacherId = str(req.query?.teacherId);
      const schoolId = str(req.query?.schoolId);

      if (!teacherId || !schoolId) {
        return res.status(400).json({ error: 'teacherId and schoolId required' });
      }

      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('teacher_attendance_logs')
        .select('punch_in_time, punch_out_time, status')
        .eq('teacher_id', teacherId)
        .eq('date', today)
        .maybeSingle();

      return res.status(200).json({ today: data ?? null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: msg });
    }
  }

  if (req.method === 'POST') {
    try {
      const supabase = getSupabase();
      const body = req.body ?? {};
      const { action, schoolId, teacherId, latitude, longitude } = body;

      if (!action || !schoolId || !teacherId) {
        return res.status(400).json({ error: 'action, schoolId, and teacherId are required' });
      }
      if (action !== 'in' && action !== 'out') {
        return res.status(400).json({ error: 'action must be "in" or "out"' });
      }

      const { data: school, error: schoolErr } = await supabase
        .from('schools')
        .select('location_latitude, location_longitude, location_radius, name')
        .eq('school_id', schoolId)
        .single();

      if (schoolErr || !school) {
        return res.status(404).json({ error: 'School not found' });
      }

      if (!school.location_latitude || !school.location_longitude) {
        return res.status(422).json({
          error: 'School location not configured. Ask your administrator to set the GPS coordinates in Settings → Location.',
        });
      }

      const radius = school.location_radius ?? 100;
      let isAtSchool = false;
      let distance = null;

      if (latitude != null && longitude != null) {
        distance = haversineMeters(
          school.location_latitude,
          school.location_longitude,
          latitude,
          longitude
        );
        isAtSchool = distance <= radius;
      }

      if (!isAtSchool) {
        const distanceText =
          distance != null
            ? ` (you are ${Math.round(distance)}m away, limit is ${radius}m)`
            : '';
        return res.status(403).json({
          error: `You must be at school to punch ${action}${distanceText}. Please ensure location access is enabled.`,
          distance,
          radius,
          isAtSchool: false,
        });
      }

      const today = new Date().toISOString().split('T')[0];
      const nowTs = new Date().toISOString();

      const { data: existing } = await supabase
        .from('teacher_attendance_logs')
        .select('id, punch_in_time, punch_out_time')
        .eq('teacher_id', teacherId)
        .eq('date', today)
        .maybeSingle();

      if (action === 'in') {
        if (existing?.punch_in_time) {
          return res.status(409).json({
            error: 'You have already punched in today.',
            punchInTime: existing.punch_in_time,
          });
        }

        const hour = new Date().getHours();
        const minute = new Date().getMinutes();
        const isLate = hour > 7 || (hour === 7 && minute > 30);
        const status = isLate ? 'late' : 'present';

        if (existing) {
          const { error: updErr } = await supabase
            .from('teacher_attendance_logs')
            .update({ punch_in_time: nowTs, punch_in_lat: latitude, punch_in_lng: longitude, status, updated_at: nowTs })
            .eq('id', existing.id);
          if (updErr) return res.status(400).json({ error: updErr.message });
        } else {
          const { error: insErr } = await supabase
            .from('teacher_attendance_logs')
            .insert({ school_id: schoolId, teacher_id: teacherId, date: today, punch_in_time: nowTs, punch_in_lat: latitude, punch_in_lng: longitude, status });
          if (insErr) return res.status(400).json({ error: insErr.message });
        }

        return res.status(200).json({
          success: true,
          action: 'in',
          punchTime: nowTs,
          status,
          distance: Math.round(distance ?? 0),
        });
      }

      // action === 'out'
      if (!existing?.punch_in_time) {
        return res.status(409).json({ error: 'You must punch in before you can punch out.' });
      }
      if (existing?.punch_out_time) {
        return res.status(409).json({
          error: 'You have already punched out today.',
          punchOutTime: existing.punch_out_time,
        });
      }

      const { error: outErr } = await supabase
        .from('teacher_attendance_logs')
        .update({ punch_out_time: nowTs, punch_out_lat: latitude, punch_out_lng: longitude, updated_at: nowTs })
        .eq('id', existing.id);
      if (outErr) return res.status(400).json({ error: outErr.message });

      return res.status(200).json({
        success: true,
        action: 'out',
        punchTime: nowTs,
        distance: Math.round(distance ?? 0),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: msg });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
