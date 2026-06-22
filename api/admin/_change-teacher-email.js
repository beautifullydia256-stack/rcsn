'use strict';

const { createClient } = require('@supabase/supabase-js');

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const { authUserId, teacherId, newEmail, schoolId } = req.body || {};

  if (!authUserId || !newEmail) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'authUserId and newEmail are required' }));
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(newEmail).trim())) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Invalid email address' }));
  }

  const email = String(newEmail).trim().toLowerCase();
  const supabase = getAdminSupabase();

  try {
    // 1. Change email on the auth account — bypass old-email confirmation entirely
    const { error: authErr } = await supabase.auth.admin.updateUserById(authUserId, {
      email,
      email_confirm: true,
    });
    if (authErr) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: authErr.message }));
    }

    // 2. Keep users table in sync
    await supabase.from('users').update({ email }).eq('user_id', authUserId);

    // 3. Keep teachers table in sync (best-effort)
    if (teacherId) {
      await supabase.from('teachers').update({ email }).eq('teacher_id', teacherId);
    } else if (schoolId) {
      await supabase.from('teachers').update({ email }).eq('school_id', schoolId).eq('email', email);
    }

    // 4. Generate a password-reset / "set up access" link for the NEW email.
    //    The teacher clicks this to set their password and land on the dashboard.
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (linkErr || !linkData?.properties?.action_link) {
      // Email was changed successfully; link generation failed — still a success but warn
      return res.end(JSON.stringify({
        success: true,
        warning: 'Email changed but access link could not be generated: ' + (linkErr?.message ?? 'unknown'),
      }));
    }

    return res.end(JSON.stringify({
      success: true,
      recoveryLink: linkData.properties.action_link,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to change email';
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: msg }));
  }
};
