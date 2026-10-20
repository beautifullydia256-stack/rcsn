'use strict';

const { createClient } = require('@supabase/supabase-js');
const { sendEgoSms, normalizePhone, isUgandaNumber } = require('../../lib/sms.js');

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://npqjrtspgxhuwrljbemz.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcWpydHNwZ3hodXdybGpiZW16Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDk2ODA0NywiZXhwIjoyMTA2NTQ0MDQ3fQ.bFnL4JRn1xDRrlclj8vka2Ww5rFcGTH37NuCijz7PA0';
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function sendJson(res, status, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(data);
  }
  res.statusCode = status;
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json');
  }
  return res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return sendJson(res, 401, { error: 'Unauthorized: missing authorization token' });
  }

  const supabase = getSupabase();

  // Validate requester identity
  const { data: { user: requesterAuth }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !requesterAuth) {
    return sendJson(res, 401, { error: 'Invalid or expired session token' });
  }

  const { data: requesterProfile, error: profileErr } = await supabase
    .from('users')
    .select('user_id, role, school_id')
    .eq('user_id', requesterAuth.id)
    .single();

  if (profileErr || !requesterProfile) {
    return sendJson(res, 403, { error: 'Requester user profile not found' });
  }

  const requesterRole = String(requesterProfile.role || '').toLowerCase();
  const ALLOWED_OPERATORS = ['ict', 'admin', 'owner', 'lab_technician'];
  if (!ALLOWED_OPERATORS.includes(requesterRole)) {
    return sendJson(res, 403, { error: 'Unauthorized: only ICT Officers or Administrators can perform instant resets.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  body = body || {};

  const targetUserId = String(body.targetUserId || '').trim();
  const newPassword = String(body.newPassword || '').trim();
  const notifySms = Boolean(body.notifySms);

  if (!targetUserId) {
    return sendJson(res, 400, { error: 'Target user ID is required.' });
  }

  if (!newPassword || newPassword.length < 6) {
    return sendJson(res, 400, { error: 'Password must be at least 6 characters.' });
  }

  // Lookup target user
  const { data: targetUser, error: targetErr } = await supabase
    .from('users')
    .select('user_id, email, name, role, extra_roles, phone, school_id')
    .eq('user_id', targetUserId)
    .single();

  if (targetErr || !targetUser) {
    return sendJson(res, 404, { error: 'Target user account not found.' });
  }

  // Security guardrail: ICT cannot reset Admin, Owner, Academic Registrar, or Bursar passwords!
  const FORBIDDEN_ROLES = ['admin', 'owner', 'head_teacher', 'accountant', 'bursar', 'academic_registrar', 'principal'];
  const targetRole = String(targetUser.role || '').toLowerCase();
  const targetExtras = Array.isArray(targetUser.extra_roles) ? targetUser.extra_roles.map((r) => String(r).toLowerCase()) : [];

  if (requesterRole === 'ict' || requesterRole === 'lab_technician') {
    if (FORBIDDEN_ROLES.includes(targetRole) || targetExtras.some((r) => FORBIDDEN_ROLES.includes(r))) {
      return sendJson(res, 403, {
        error: 'Permission denied: ICT Officers are not authorized to reset passwords for Administrators, Registrars, or Finance Officers.'
      });
    }
  }

  // Fetch auth user metadata
  const { data: authUserData, error: getAuthErr } = await supabase.auth.admin.getUserById(targetUserId);
  if (getAuthErr || !authUserData?.user) {
    return sendJson(res, 404, { error: 'Authentication record not found for this user.' });
  }

  const prevMeta = authUserData.user.user_metadata || {};
  const nextMeta = {
    ...prevMeta,
    must_change_password: true,
  };

  const { error: updateErr } = await supabase.auth.admin.updateUserById(targetUserId, {
    password: newPassword,
    user_metadata: nextMeta,
  });

  if (updateErr) {
    return sendJson(res, 500, { error: `Failed to update password: ${updateErr.message}` });
  }

  // If SMS requested and phone exists
  let smsSent = false;
  if (notifySms && targetUser.phone) {
    const normalized = normalizePhone(targetUser.phone);
    if (isUgandaNumber(normalized)) {
      try {
        await sendEgoSms(
          normalized,
          `Hello ${targetUser.name || 'Student/Staff'}, your RCSN portal password has been reset by ICT. Your temporary password is: ${newPassword} - Please log in and change it.`,
          { priority: '1' }
        );
        smsSent = true;
      } catch (smsErr) {
        console.warn('[ict-password-reset] SMS notification failed:', smsErr);
      }
    }
  }

  return sendJson(res, 200, {
    success: true,
    message: `Password for ${targetUser.name || targetUser.email} has been updated successfully.`,
    smsSent,
    targetUserId,
  });
};
