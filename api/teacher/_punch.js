'use strict';

// CommonJS — package.json has no "type":"module" so .ts ESM output breaks Node.js

const { createClient } = require('@supabase/supabase-js');
const { createHash } = require('crypto');

/** Same algorithm as src/lib/attendanceCode.ts — must stay in sync. */
function serverGenerateCode(schoolId, windowOffset) {
  const w = Math.floor(Date.now() / 30_000) + (windowOffset || 0);
  const hash = createHash('sha256').update(`pweza:${schoolId}:${w}`).digest();
  const num = hash.readUInt32BE(0) % 1_000_000;
  return String(num).padStart(6, '0');
}

function validateAttendanceCode(schoolId, entered) {
  const clean = String(entered || '').replace(/\s/g, '');
  if (clean.length !== 6) return false;
  const cur = serverGenerateCode(schoolId, 0);
  const prev = serverGenerateCode(schoolId, -1);
  return clean === cur || clean === prev;
}

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

// Uganda is UTC+3 (Africa/Kampala), no DST.
// Vercel servers run UTC — always derive Ugandan date/time explicitly.
function ugandaNow() {
  const utc = Date.now();
  return new Date(utc + 3 * 60 * 60 * 1000); // shift to EAT
}
function ugandaDateStr() {
  return ugandaNow().toISOString().split('T')[0];
}

// Actual teacher_attendance_logs columns (verified from DB schema):
// log_id, school_id, teacher_id, attendance_date, check_in_time, check_out_time, status, remarks, created_at

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const supabase = getSupabase();
      const teacherId = str(req.query?.teacherId);
      const schoolId = str(req.query?.schoolId);

      if (!teacherId || !schoolId) {
        return res.status(400).json({ error: 'teacherId and schoolId required' });
      }

      const today = ugandaDateStr();
      const { data, error: qErr } = await supabase
        .from('teacher_attendance_logs')
        .select('check_in_time, check_out_time, status')
        .eq('teacher_id', teacherId)
        .eq('attendance_date', today)
        .maybeSingle();

      if (qErr) return res.status(500).json({ error: qErr.message });

      // Map DB column names to the field names the frontend PunchState type expects
      const today_data = data
        ? { punch_in_time: data.check_in_time, punch_out_time: data.check_out_time, status: data.status }
        : null;

      return res.status(200).json({ today: today_data });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: msg });
    }
  }

  if (req.method === 'POST') {
    try {
      const supabase = getSupabase();
      const body = req.body ?? {};
      const { action, schoolId, teacherId, latitude, longitude, accuracy, attendanceCode } = body;

      if (!action || !schoolId || !teacherId) {
        return res.status(400).json({ error: 'action, schoolId, and teacherId are required' });
      }
      if (action !== 'in' && action !== 'out') {
        return res.status(400).json({ error: 'action must be "in" or "out"' });
      }

      // Declared here so both GPS and code paths can reference them in the response.
      let distance = null;
      let gpsAccuracySkipped = false;

      // ── Attendance-code path (bypasses GPS) ──────────────────────────────────
      if (attendanceCode) {
        if (!validateAttendanceCode(schoolId, attendanceCode)) {
          return res.status(200).json({
            success: false,
            error: 'Invalid attendance code. Ask the secretary or administrator for the current code.',
            codeInvalid: true,
          });
        }
        // Code valid — fall through to record attendance below.
      } else {
        // ── GPS path ─────────────────────────────────────────────────────────────
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

        if (latitude != null && longitude != null) {
          distance = haversineMeters(
            school.location_latitude,
            school.location_longitude,
            latitude,
            longitude
          );
          const gpsAccuracy = typeof accuracy === 'number' && accuracy > 0 ? accuracy : null;
          if (gpsAccuracy !== null && gpsAccuracy > radius && gpsAccuracy > 200) {
            isAtSchool = true;
            gpsAccuracySkipped = true;
          } else {
            isAtSchool = distance <= radius;
          }
        }

        if (!isAtSchool) {
          const distanceText =
            distance != null
              ? ` (you are ${Math.round(distance)}m away, limit is ${radius}m)`
              : '';
          return res.status(200).json({
            success: false,
            error: `You must be at school to punch ${action}${distanceText}. Please ensure location access is enabled.`,
            distance,
            radius,
            isAtSchool: false,
          });
        }
      }

      const today = ugandaDateStr();
      const nowTs = new Date().toISOString();

      const { data: existing } = await supabase
        .from('teacher_attendance_logs')
        .select('log_id, check_in_time, check_out_time')
        .eq('teacher_id', teacherId)
        .eq('attendance_date', today)
        .maybeSingle();

      if (action === 'in') {
        if (existing?.check_in_time) {
          return res.status(409).json({
            error: 'You have already punched in today.',
            punchInTime: existing.check_in_time,
          });
        }

        const eat = ugandaNow();
        const hour = eat.getUTCHours();
        const minute = eat.getUTCMinutes();
        const isLate = hour > 7 || (hour === 7 && minute > 30);
        const status = isLate ? 'late' : 'present';

        const inLoc = {
          check_in_lat: latitude ?? null,
          check_in_lng: longitude ?? null,
          check_in_accuracy_m: accuracy != null ? Math.round(accuracy) : null,
          check_in_distance_m: distance != null ? Math.round(distance) : null,
        };

        if (existing) {
          const { error: updErr } = await supabase
            .from('teacher_attendance_logs')
            .update({ check_in_time: nowTs, status, ...inLoc })
            .eq('log_id', existing.log_id);
          if (updErr) return res.status(400).json({ error: updErr.message });
        } else {
          const { error: insErr } = await supabase
            .from('teacher_attendance_logs')
            .insert({
              school_id: schoolId,
              teacher_id: teacherId,
              attendance_date: today,
              check_in_time: nowTs,
              status,
              ...inLoc,
            });
          if (insErr) return res.status(400).json({ error: insErr.message });
        }

        return res.status(200).json({
          success: true,
          action: 'in',
          punchTime: nowTs,
          status,
          distance: Math.round(distance ?? 0),
          gpsAccuracySkipped,
        });
      }

      // action === 'out'
      if (!existing?.check_in_time) {
        return res.status(409).json({ error: 'You must punch in before you can punch out.' });
      }
      if (existing?.check_out_time) {
        return res.status(409).json({
          error: 'You have already punched out today.',
          punchOutTime: existing.check_out_time,
        });
      }

      const { error: outErr } = await supabase
        .from('teacher_attendance_logs')
        .update({
          check_out_time: nowTs,
          check_out_lat: latitude ?? null,
          check_out_lng: longitude ?? null,
          check_out_accuracy_m: accuracy != null ? Math.round(accuracy) : null,
          check_out_distance_m: distance != null ? Math.round(distance) : null,
        })
        .eq('log_id', existing.log_id);
      if (outErr) return res.status(400).json({ error: outErr.message });

      return res.status(200).json({
        success: true,
        action: 'out',
        punchTime: nowTs,
        distance: Math.round(distance ?? 0),
        gpsAccuracySkipped,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: msg });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
