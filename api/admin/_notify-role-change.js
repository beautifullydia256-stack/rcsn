'use strict';

const { createClient } = require('@supabase/supabase-js');
const { sendResendInnerHtml } = require('../../lib/resendSend');
const { getPublicSiteOrigin } = require('../../lib/emailHtml');

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const ROLE_LABELS = {
  admin: 'School Admin',
  head_teacher: 'Head Teacher',
  deputy_head_teacher: 'Deputy Head Teacher',
  dos: 'Director of Studies',
  deputy_dos: 'Deputy Director of Studies',
  teacher: 'Teacher',
  accountant: 'Accountant',
  secretary: 'Secretary',
  librarian: 'Librarian',
  lab_technician: 'Lab Technician',
  clinician: 'School Clinician',
  parent: 'Parent',
  student: 'Student',
};

function roleLabel(r) {
  return ROLE_LABELS[r] || r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function roleListHtml(roles) {
  return roles
    .map(r => `<li style="margin:4px 0;padding:6px 12px;background:#f1f5f9;border-radius:6px;font-weight:600;color:#1e293b;">${roleLabel(r)}</li>`)
    .join('');
}

function buildRoleChangeInnerHtml({ name, schoolName, addedRoles, removedRoles, loginUrl }) {
  const firstName = name ? name.split(' ')[0] : 'there';
  const school = schoolName || 'your school';

  let sections = '';

  if (addedRoles && addedRoles.length > 0) {
    const isSingle = addedRoles.length === 1;
    sections += `
<p>You have been assigned the following ${isSingle ? 'role' : 'roles'} at <strong>${school}</strong>:</p>
<ul style="list-style:none;margin:12px 0 20px 0;padding:0;">
  ${roleListHtml(addedRoles)}
</ul>
<p>You can log in to your PwezaCore dashboard to access your ${isSingle ? 'new role' : 'new roles'}.</p>
<div style="text-align:center;margin:24px 0 8px 0;">
  <a href="${loginUrl}" style="display:inline-block;padding:11px 28px;background:#1a73e8;color:#ffffff;border-radius:6px;font-weight:600;font-size:15px;text-decoration:none;letter-spacing:-0.01em;">Go to Dashboard</a>
</div>`;
  }

  if (removedRoles && removedRoles.length > 0) {
    const isSingle = removedRoles.length === 1;
    sections += `
<p style="margin-top:${addedRoles && addedRoles.length ? '24px' : '0'};">Your access as <strong>${removedRoles.map(roleLabel).join(', ')}</strong> at <strong>${school}</strong> has been removed.</p>
<p>You will no longer see the ${isSingle ? 'dashboard associated with this role' : 'dashboards associated with these roles'} when you log in. If you believe this was done in error, please contact your school administrator.</p>`;
  }

  return `
<h2 style="margin:0 0 16px 0;">Hi ${firstName},</h2>
${sections}
<p style="margin-top:20px;color:#5f6368;font-size:13px;">This notification was sent automatically by PwezaCore when your account permissions were changed by a school administrator.</p>`;
}

function buildRoleChangeSubject({ addedRoles, removedRoles, schoolName }) {
  const school = schoolName || 'your school';
  if (addedRoles && addedRoles.length > 0 && removedRoles && removedRoles.length > 0) {
    return `Your roles at ${school} have been updated`;
  }
  if (addedRoles && addedRoles.length > 0) {
    return addedRoles.length === 1
      ? `You've been assigned the ${roleLabel(addedRoles[0])} role at ${school}`
      : `New roles assigned to you at ${school}`;
  }
  if (removedRoles && removedRoles.length > 0) {
    return removedRoles.length === 1
      ? `Your ${roleLabel(removedRoles[0])} access at ${school} has been removed`
      : `Some of your roles at ${school} have been removed`;
  }
  return `Your account permissions at ${school} have been updated`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, name, schoolName: schoolNameIn, schoolId, addedRoles, removedRoles } = req.body || {};

  if (!to) {
    return res.status(400).json({ error: 'Missing required field: to' });
  }
  if ((!addedRoles || addedRoles.length === 0) && (!removedRoles || removedRoles.length === 0)) {
    return res.status(400).json({ error: 'No role changes to notify about' });
  }

  // Resolve school name: use provided value, or look up from DB
  let schoolName = schoolNameIn || null;
  if (!schoolName && schoolId) {
    try {
      const admin = getSupabaseAdmin();
      if (admin) {
        const { data } = await admin.from('schools').select('name').eq('school_id', schoolId).maybeSingle();
        schoolName = data?.name || null;
      }
    } catch (e) {
      console.warn('[notify-role-change] Could not fetch school name:', e);
    }
  }

  const loginUrl = `${getPublicSiteOrigin()}/login`;
  const subject = buildRoleChangeSubject({ addedRoles: addedRoles || [], removedRoles: removedRoles || [], schoolName });
  const innerHtml = buildRoleChangeInnerHtml({ name, schoolName, addedRoles: addedRoles || [], removedRoles: removedRoles || [], loginUrl });

  const result = await sendResendInnerHtml({ to, subject, innerHtml });

  if (!result.success) {
    console.error('[notify-role-change] Email failed:', result.error);
    return res.status(500).json({ error: result.error || 'Failed to send email' });
  }

  return res.status(200).json({ success: true, id: result.id });
};
