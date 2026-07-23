'use strict';

// CommonJS — package.json has no "type":"module" so .ts ESM output breaks Node.js

const { createClient } = require('@supabase/supabase-js');
const { sendEgoSms, normalizePhone, isUgandaNumber, candidatePhoneFormats } = require('../../lib/sms');

const MANAGER_ROLES = ['admin', 'owner', 'head_teacher', 'dos', 'secretary'];
const COOLDOWN_MS = 60 * 1000; // 1 request per new number per minute
const DAILY_LIMIT = 5; // max requests per new number per rolling 24h
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function generateCode() {
  const n = Math.floor(Math.random() * 10 ** 6);
  return String(n).padStart(6, '0');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

    if (!callerProfile?.school_id || !MANAGER_ROLES.includes(callerProfile.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { teacherId, newPhone } = req.body || {};
    if (!teacherId || !newPhone) {
      return res.status(400).json({ error: 'teacherId and newPhone are required' });
    }

    const { data: teacher, error: teacherErr } = await supabase
      .from('teachers')
      .select('teacher_id, name, phone, school_id')
      .eq('teacher_id', teacherId)
      .single();
    if (teacherErr || !teacher || String(teacher.school_id) !== String(callerProfile.school_id)) {
      return res.status(404).json({ error: 'Teacher not found in your school.' });
    }

    const normalized = normalizePhone(String(newPhone).trim());
    if (!isUgandaNumber(normalized)) {
      return res.status(400).json({ error: 'Enter a valid Uganda phone number.' });
    }

    const candidates = candidatePhoneFormats(normalized);

    // A teacher's own linked login account (if any) is excluded from the collision check —
    // everyone else's account/teacher record is not.
    const { data: linkedUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('linked_teacher_id', teacherId)
      .maybeSingle();

    const { data: userClash } = await supabase
      .from('users')
      .select('user_id')
      .in('phone', candidates)
      .neq('user_id', linkedUser?.user_id || '00000000-0000-0000-0000-000000000000')
      .maybeSingle();
    if (userClash) {
      return res.status(400).json({ error: 'This phone number is already in use by another account.' });
    }

    const { data: teacherClash } = await supabase
      .from('teachers')
      .select('teacher_id')
      .in('phone', candidates)
      .neq('teacher_id', teacherId)
      .maybeSingle();
    if (teacherClash) {
      return res.status(400).json({ error: 'This phone number is already in use by another teacher.' });
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('teacher_phone_change_requests')
      .select('id, created_at')
      .eq('new_phone', normalized)
      .gte('created_at', since24h)
      .order('created_at', { ascending: false });

    if ((recent || []).length >= DAILY_LIMIT) {
      return res.status(429).json({ error: 'Too many change attempts for this number today. Try again tomorrow.' });
    }
    if (recent && recent[0] && Date.now() - new Date(recent[0].created_at).getTime() < COOLDOWN_MS) {
      return res.status(429).json({ error: 'A code was just sent to this number. Please wait a minute before retrying.' });
    }

    // Invalidate any still-usable prior pending requests for this teacher.
    await supabase
      .from('teacher_phone_change_requests')
      .update({ used_at: new Date().toISOString() })
      .eq('teacher_id', teacherId)
      .is('used_at', null);

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    const { error: insertErr } = await supabase.from('teacher_phone_change_requests').insert({
      teacher_id: teacherId,
      admin_user_id: caller.id,
      old_phone: teacher.phone || null,
      new_phone: normalized,
      code,
      expires_at: expiresAt,
    });
    if (insertErr) return res.status(500).json({ error: insertErr.message });

    const smsResult = await sendEgoSms(
      normalized,
      `Your PwezaCore phone verification code is ${code}. It expires in 10 minutes.\n\nA school administrator is updating this number on your teacher account. If this wasn't expected, contact your school.`,
      { priority: '0' }
    );
    if (!smsResult.success) {
      return res.status(502).json({ error: `Could not send the verification SMS: ${smsResult.error || 'Unknown error'}` });
    }

    return res.status(200).json({ success: true, message: 'Verification code sent to the new number.' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to request phone change';
    return res.status(500).json({ error: msg });
  }
};
