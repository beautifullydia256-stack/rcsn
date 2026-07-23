'use strict';

// CommonJS — package.json has no "type":"module" so .ts ESM output breaks Node.js

// The picker UIs (SchoolPickerPage, RolePickerPage, the sidebar "Switch role" button) only
// used to update client-side Zustand state and a side table (user_active_schools) that most
// RLS policies never consult — they read `public.users.school_id`/`role` directly via a plain
// subquery. This endpoint makes a picked school/role authoritative by writing it straight into
// the caller's own `users` row (which every RLS policy already trusts), so the picked context
// takes effect everywhere, not just in UI routing.

const { createClient } = require('@supabase/supabase-js');

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

    const { schoolId, role } = req.body || {};

    const { data: primary, error: primaryErr } = await supabase
      .from('users')
      .select('user_id, role, extra_roles, school_id, linked_teacher_id')
      .eq('user_id', caller.id)
      .single();
    if (primaryErr || !primary) return res.status(404).json({ error: 'Account not found.' });

    if (schoolId) {
      // ── Activate a school (resets to that membership's own primary role) ──
      let source;
      if (String(primary.school_id ?? '') === String(schoolId)) {
        source = { role: primary.role, extra_roles: primary.extra_roles || [], linked_teacher_id: primary.linked_teacher_id };
      } else {
        const { data: membership } = await supabase
          .from('user_school_memberships')
          .select('role, extra_roles, linked_teacher_id, is_active')
          .eq('user_id', caller.id)
          .eq('school_id', schoolId)
          .maybeSingle();
        if (!membership?.is_active) {
          return res.status(403).json({ error: 'You are not an active member of that school.' });
        }
        source = { role: membership.role, extra_roles: membership.extra_roles || [], linked_teacher_id: membership.linked_teacher_id };

        // `users.school_id`/`role` is about to be overwritten with a DIFFERENT school's
        // context — before that happens, make sure the school it currently points to has its
        // own durable membership row, or that school (and the account's access to it) would
        // be lost the moment it's no longer mirrored by the primary row.
        if (primary.school_id) {
          const { data: existingHome } = await supabase
            .from('user_school_memberships')
            .select('id')
            .eq('user_id', caller.id)
            .eq('school_id', primary.school_id)
            .maybeSingle();
          if (!existingHome) {
            await supabase.from('user_school_memberships').insert({
              user_id: caller.id,
              school_id: primary.school_id,
              role: primary.role,
              extra_roles: primary.extra_roles || [],
              linked_teacher_id: primary.linked_teacher_id,
              is_active: true,
            });
          }
        }
      }

      const { error: updateErr } = await supabase
        .from('users')
        .update({
          school_id: schoolId,
          role: source.role,
          extra_roles: source.extra_roles,
          linked_teacher_id: source.linked_teacher_id,
        })
        .eq('user_id', caller.id);
      if (updateErr) return res.status(500).json({ error: updateErr.message });

      await supabase
        .from('user_active_schools')
        .upsert({ user_id: caller.id, school_id: schoolId, role: source.role, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

      return res.status(200).json({ success: true, schoolId, role: source.role, extraRoles: source.extra_roles });
    }

    if (role) {
      // ── Switch role within the currently active school ──
      const currentRole = String(primary.role || '');
      const currentExtras = Array.isArray(primary.extra_roles) ? primary.extra_roles : [];
      if (role !== currentRole && !currentExtras.includes(role)) {
        return res.status(403).json({ error: 'That role is not available to you at your current school.' });
      }

      const { error: updateErr } = await supabase.from('users').update({ role }).eq('user_id', caller.id);
      if (updateErr) return res.status(500).json({ error: updateErr.message });

      if (primary.school_id) {
        await supabase
          .from('user_active_schools')
          .upsert({ user_id: caller.id, school_id: primary.school_id, role, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      }

      return res.status(200).json({ success: true, role });
    }

    return res.status(400).json({ error: 'schoolId or role is required' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to activate context';
    return res.status(500).json({ error: msg });
  }
};
