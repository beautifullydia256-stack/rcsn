'use strict';

// CommonJS — package.json has no "type":"module" so .ts ESM output breaks Node.js

const { createClient } = require('@supabase/supabase-js');

const MANAGER_ROLES = ['admin', 'owner', 'head_teacher', 'dos', 'secretary'];
const MAX_ATTEMPTS = 5;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
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

    const { teacherId, code } = req.body || {};
    if (!teacherId || !code) {
      return res.status(400).json({ error: 'teacherId and code are required' });
    }

    const { data: teacher, error: teacherErr } = await supabase
      .from('teachers')
      .select('teacher_id, school_id')
      .eq('teacher_id', teacherId)
      .single();
    if (teacherErr || !teacher || String(teacher.school_id) !== String(callerProfile.school_id)) {
      return res.status(404).json({ error: 'Teacher not found in your school.' });
    }

    const { data: pending, error: pendingErr } = await supabase
      .from('teacher_phone_change_requests')
      .select('id, new_phone, code, expires_at, attempts')
      .eq('teacher_id', teacherId)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingErr || !pending) {
      return res.status(400).json({ error: 'No pending phone change request. Request a new code.' });
    }
    if (new Date(pending.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This code has expired. Request a new one.' });
    }
    if (pending.attempts >= MAX_ATTEMPTS) {
      return res.status(400).json({ error: 'Too many incorrect attempts. Request a new code.' });
    }

    if (String(code).trim() !== pending.code) {
      await supabase
        .from('teacher_phone_change_requests')
        .update({ attempts: pending.attempts + 1 })
        .eq('id', pending.id);
      return res.status(400).json({ error: 'Incorrect code.' });
    }

    // Atomic claim — prevents two concurrent verify calls from both succeeding on the same code.
    const { data: claimed, error: claimErr } = await supabase
      .from('teacher_phone_change_requests')
      .update({ used_at: new Date().toISOString() })
      .eq('id', pending.id)
      .is('used_at', null)
      .select('id, new_phone')
      .maybeSingle();
    if (claimErr) return res.status(500).json({ error: claimErr.message });
    if (!claimed) return res.status(400).json({ error: 'This code was already used. Request a new one.' });

    const newPhone = claimed.new_phone;

    const { error: teacherUpdateErr } = await supabase
      .from('teachers')
      .update({ phone: newPhone })
      .eq('teacher_id', teacherId)
      .eq('school_id', callerProfile.school_id);
    if (teacherUpdateErr) return res.status(500).json({ error: teacherUpdateErr.message });

    await supabase
      .from('users')
      .update({ phone: newPhone })
      .eq('linked_teacher_id', teacherId)
      .eq('school_id', callerProfile.school_id);

    return res.status(200).json({ success: true, phone: newPhone });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to verify phone change';
    return res.status(500).json({ error: msg });
  }
};
