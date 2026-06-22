'use strict';

const { createClient } = require('@supabase/supabase-js');

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_ANON_KEY || '';
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
    // 1. Change the auth account email — bypasses old-email confirmation entirely
    const { error: authErr } = await supabase.auth.admin.updateUserById(authUserId, {
      email,
      email_confirm: true,
    });
    if (authErr) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: authErr.message }));
    }

    // 2. Keep the public users table in sync
    await supabase.from('users').update({ email }).eq('user_id', authUserId);

    // 3. Keep the teachers table in sync
    if (teacherId) {
      await supabase.from('teachers').update({ email }).eq('teacher_id', teacherId);
    } else if (schoolId) {
      await supabase.from('teachers').update({ email }).eq('school_id', schoolId).eq('teacher_id', authUserId);
    }

    // 4. Send a password-reset email directly to the NEW address so the teacher
    //    can set their password and log in. Uses Supabase's built-in email delivery.
    const anonSupabase = getAnonSupabase();
    const { error: resetErr } = await anonSupabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.pwezacore.com/dashboard/teacher',
    });

    if (resetErr) {
      // Email was changed successfully in the DB — warn but don't fail
      return res.end(JSON.stringify({
        success: true,
        warning: `Email updated but the access email could not be sent automatically: ${resetErr.message}. Ask the teacher to use "Forgot Password" on the login page with their new email.`,
      }));
    }

    return res.end(JSON.stringify({ success: true }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to change email';
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: msg }));
  }
};
