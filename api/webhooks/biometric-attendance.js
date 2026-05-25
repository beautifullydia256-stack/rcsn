'use strict';

/**
 * POST /api/webhooks/biometric-attendance
 *
 * Called by the biometric sync server (biometric.stag.hgivers.online) when a
 * student scans their fingerprint on a registered terminal.
 *
 * Auth: Authorization: Bearer <device.webhook_token>
 *       OR ?t=<device.webhook_token> query param
 *
 * Body:
 *   device_id      – biometric_devices.id (UUID)
 *   device_user_id – the user ID stored on the physical device, e.g. "104"
 *   scan_time      – ISO 8601 timestamp of the scan (optional; defaults to now())
 *   event_type     – "arrival" | "departure" (optional; falls back to device.scan_type)
 */

const { createClient } = require('@supabase/supabase-js');

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function normalizePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  // Default to Uganda (+256) for 9-digit numbers
  if (digits.length === 9 && !digits.startsWith('256') && !digits.startsWith('254')) {
    digits = '256' + digits;
  }
  return digits ? `+${digits}` : null;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Server configuration error' }));
    return;
  }

  // Extract Bearer token
  const authHeader = req.headers['authorization'] || '';
  const token =
    authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() :
    (req.query?.t ?? '');

  const { device_id, device_user_id, scan_time, event_type } = req.body || {};

  if (!device_id || !device_user_id) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'device_id and device_user_id are required' }));
    return;
  }

  try {
    // ── 1. Load and authenticate device ───────────────────────────────────────
    const { data: device, error: devErr } = await admin
      .from('biometric_devices')
      .select('id, school_id, device_name, location, scan_type, webhook_token, is_active')
      .eq('id', device_id)
      .maybeSingle();

    if (devErr || !device) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Device not found' }));
      return;
    }

    if (!device.is_active) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Device is disabled' }));
      return;
    }

    if (token !== device.webhook_token) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid webhook token' }));
      return;
    }

    const schoolId = device.school_id;
    const scanTime = scan_time ? new Date(scan_time).toISOString() : new Date().toISOString();

    // Determine event type: payload overrides device default, but device.scan_type
    // controls what the device is configured to detect.
    // If device is 'both', payload event_type must specify which direction.
    // If device is 'arrival' or 'departure', ignore payload event_type.
    let direction = device.scan_type === 'both'
      ? (event_type === 'departure' ? 'departure' : 'arrival')
      : device.scan_type;

    // ── 2. Resolve student from device_user_id ────────────────────────────────
    const { data: mapping } = await admin
      .from('biometric_device_users')
      .select('person_id, person_type')
      .eq('school_id', schoolId)
      .eq('device_user_id', String(device_user_id))
      .eq('active', true)
      .maybeSingle();

    if (!mapping || mapping.person_type !== 'student') {
      // Update device sync status even for unknown scans
      await admin.from('biometric_devices').update({
        last_sync_at: scanTime,
        sync_status: 'ok',
        sync_message: `Scan received (user ${device_user_id} not mapped or not a student)`,
      }).eq('id', device_id);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, recorded: false, reason: 'user not mapped' }));
      return;
    }

    const studentId = mapping.person_id;
    const today = scanTime.slice(0, 10); // YYYY-MM-DD

    // ── 3. Fetch student info ─────────────────────────────────────────────────
    const { data: student } = await admin
      .from('students')
      .select('student_id, name, current_class, boarding_type')
      .eq('student_id', studentId)
      .eq('school_id', schoolId)
      .maybeSingle();

    // ── 4. Upsert attendance row ──────────────────────────────────────────────
    const attendanceUpdate = {
      status: 'present',
      biometric_scan: true,
    };

    if (direction === 'arrival') {
      attendanceUpdate.arrival_time = scanTime;
    } else {
      attendanceUpdate.departure_time = scanTime;
    }

    // Try to find existing attendance row for today
    const { data: existingRow } = await admin
      .from('student_attendance')
      .select('id, status')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .eq('date', today)
      .maybeSingle();

    if (existingRow) {
      await admin
        .from('student_attendance')
        .update({ ...attendanceUpdate, updated_at: new Date().toISOString() })
        .eq('id', existingRow.id);
    } else {
      await admin
        .from('student_attendance')
        .insert({
          school_id: schoolId,
          student_id: studentId,
          date: today,
          ...attendanceUpdate,
        });
    }

    // ── 5. Update device last_sync ────────────────────────────────────────────
    await admin.from('biometric_devices').update({
      last_sync_at: scanTime,
      sync_status: 'ok',
      sync_message: `${direction} scan for student ${student?.name ?? studentId}`,
    }).eq('id', device_id);

    // ── 6. Check notification settings ───────────────────────────────────────
    const { data: school } = await admin
      .from('schools')
      .select('name, biometric_notify_arrival, biometric_notify_departure')
      .eq('school_id', schoolId)
      .maybeSingle();

    const shouldNotify =
      (direction === 'arrival' && school?.biometric_notify_arrival) ||
      (direction === 'departure' && school?.biometric_notify_departure);

    if (shouldNotify && student) {
      // ── 7. Fetch parent(s) for this student ────────────────────────────────
      const { data: parents } = await admin
        .from('parents')
        .select('parent_id, name, phone')
        .eq('school_id', schoolId)
        .eq('student_id', studentId);

      const schoolName = school?.name || 'school';
      const studentName = student.name || 'your child';
      const scanTimeLocal = new Date(scanTime).toLocaleTimeString('en-UG', {
        timeZone: 'Africa/Kampala',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const dateStr = new Date(scanTime).toLocaleDateString('en-UG', {
        timeZone: 'Africa/Kampala',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

      let message;
      if (direction === 'arrival') {
        message = `✅ Hello! *${studentName}* has arrived at *${schoolName}* at *${scanTimeLocal}* on ${dateStr}. Have a great day!`;
      } else {
        message = `👋 Hello! *${studentName}* has left *${schoolName}* at *${scanTimeLocal}* on ${dateStr} and is on their way home. Stay safe!`;
      }

      const notifRows = [];
      for (const parent of parents || []) {
        const phone = normalizePhone(parent.phone);
        if (!phone) continue;
        notifRows.push({
          school_id: schoolId,
          notification_type: 'whatsapp',
          recipient: phone,
          message,
          category: 'attendance',
          status: 'pending',
        });
      }

      if (notifRows.length > 0) {
        await admin.from('notification_logs').insert(notifRows);
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      recorded: true,
      direction,
      student_id: studentId,
      student_name: student?.name ?? null,
      notified: shouldNotify ? (school != null) : false,
    }));

  } catch (err) {
    console.error('[biometric-attendance]', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: String(err) }));
  }
};
