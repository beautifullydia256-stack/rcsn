'use strict';

// CommonJS — package.json has no "type":"module" so .ts ESM output breaks Node.js

// SchoolPickerPage needs to show school NAMES for every school the caller has any
// relationship with (active membership, or still-pending invite) — but `schools` RLS only
// allows seeing a school you're the *primary* member of, its admin_id, or an owner. It never
// consults `user_school_memberships`, so a client-side query can't resolve the name of a
// second/third school, active or pending. This endpoint uses the service-role key to resolve
// exactly the safe fields needed (school_id, name) regardless of that RLS gap.

const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabase();
    const authHeader = req.headers?.['authorization'] ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) return res.status(401).json({ error: 'Unauthorized' });

    const { data: primary } = await supabase
      .from('users')
      .select('role, extra_roles, school_id, is_active, name')
      .eq('user_id', caller.id)
      .maybeSingle();

    const { data: memberships } = await supabase
      .from('user_school_memberships')
      .select('id, role, extra_roles, school_id, is_active')
      .eq('user_id', caller.id);

    const primaryValid = primary && primary.is_active !== false && primary.school_id;
    const activeMemberships = (memberships || []).filter((m) => m.is_active);
    const pendingMemberships = (memberships || []).filter((m) => !m.is_active);

    const allSchoolIds = [
      ...(primaryValid ? [String(primary.school_id)] : []),
      ...activeMemberships.map((m) => String(m.school_id)),
      ...pendingMemberships.map((m) => String(m.school_id)),
    ];

    const nameMap = {};
    if (allSchoolIds.length > 0) {
      const { data: schoolRows } = await supabase
        .from('schools')
        .select('school_id, name')
        .in('school_id', Array.from(new Set(allSchoolIds)));
      for (const s of schoolRows || []) nameMap[String(s.school_id)] = String(s.name || 'School');
    }

    // Dedupe by school_id — once a school has been "activated" at least once, it's mirrored by
    // BOTH the primary users row AND its own membership row, so build a map keyed by school_id
    // instead of concatenating both lists (which would show the same school twice).
    const activeBySchool = new Map();
    for (const m of activeMemberships) {
      activeBySchool.set(String(m.school_id), {
        school_id: String(m.school_id),
        school_name: nameMap[String(m.school_id)] || 'School',
        role: String(m.role || ''),
        extra_roles: m.extra_roles || [],
      });
    }
    if (primaryValid) {
      const sid = String(primary.school_id);
      if (activeBySchool.has(sid)) {
        // Both users (primary) and user_school_memberships have this school — merge roles so
        // neither source's extra_roles are silently discarded.
        const existing = activeBySchool.get(sid);
        const primaryRole = String(primary.role || '');
        const primaryExtras = Array.isArray(primary.extra_roles) ? primary.extra_roles : [];
        const allRoles = Array.from(
          new Set([existing.role, ...existing.extra_roles, primaryRole, ...primaryExtras].filter(Boolean))
        );
        existing.extra_roles = allRoles.filter((r) => r !== existing.role);
      } else {
        activeBySchool.set(sid, {
          school_id: sid,
          school_name: nameMap[sid] || 'School',
          role: String(primary.role || ''),
          extra_roles: primary.extra_roles || [],
        });
      }
    }
    const active = Array.from(activeBySchool.values());

    const pending = pendingMemberships.map((m) => ({
      membership_id: String(m.id),
      school_id: String(m.school_id),
      school_name: nameMap[String(m.school_id)] || 'School',
      role: String(m.role || ''),
    }));

    return res.status(200).json({ success: true, firstName: primary?.name ? String(primary.name).split(' ')[0] : '', active, pending });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to list school memberships';
    return res.status(500).json({ error: msg });
  }
};
