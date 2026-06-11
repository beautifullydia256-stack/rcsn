'use strict';
/**
 * GET /api/owner/schools/detail?schoolId=<uuid>
 * Returns school info + all portal users (non-students) for a given school.
 * Requires the caller to be an authenticated owner.
 */
const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');

function getCookieString(req) {
  const h = req.headers;
  if (!h) return undefined;
  if (typeof h.cookie === 'string') return h.cookie;
  if (typeof h.get === 'function') return h.get('cookie') ?? undefined;
  return undefined;
}

function parseCookies(cookieHeader) {
  const map = new Map();
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const [key, ...v] = part.trim().split('=');
      if (key) map.set(key.trim(), decodeURIComponent((v.join('=') || '').trim()));
    }
  }
  return (name) => map.get(name);
}

function getBearerToken(req) {
  try {
    const h = req.headers;
    if (!h) return null;
    let raw;
    if (typeof h.get === 'function') {
      raw = h.get('authorization') || h.get('Authorization');
    } else {
      raw = h['authorization'] || h['Authorization'];
    }
    if (!raw) return null;
    const parts = String(raw).trim().split(/\s+/);
    return parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : null;
  } catch {
    return null;
  }
}

const ROLE_ORDER = [
  'owner', 'admin', 'head_teacher', 'deputy_head_teacher',
  'dos', 'deputy_dos', 'teacher',
  'accountant', 'secretary', 'librarian', 'lab_technician', 'clinician',
  'parent',
];

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'School Admin',
  head_teacher: 'Head Teacher',
  deputy_head_teacher: 'Deputy Head Teacher',
  dos: 'Director of Studies',
  deputy_dos: 'Deputy DOS',
  teacher: 'Teacher',
  accountant: 'Accountant',
  secretary: 'Secretary',
  librarian: 'Librarian',
  lab_technician: 'Lab Technician',
  clinician: 'Clinician',
  parent: 'Parent',
};

module.exports = async (req, res) => {
  // CORS
  const origin = req.headers.origin || req.headers.Origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnon || !supabaseServiceKey) {
    res.status(500).json({ error: 'Server configuration error' }); return;
  }

  // Authenticate the caller
  const cookieStr = getCookieString(req);
  const getCookie = parseCookies(cookieStr);
  const supabaseClient = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: { get: (name) => getCookie(name) ?? undefined, set: () => {}, remove: () => {} },
  });

  let callerUser = null;
  const fromCookie = await supabaseClient.auth.getUser();
  if (fromCookie.data?.user && !fromCookie.error) {
    callerUser = fromCookie.data.user;
  } else {
    const bearer = getBearerToken(req);
    if (bearer) {
      const fromJwt = await supabaseClient.auth.getUser(bearer);
      if (fromJwt.data?.user && !fromJwt.error) callerUser = fromJwt.data.user;
    }
  }

  if (!callerUser) { res.status(401).json({ error: 'Unauthorized' }); return; }

  // Verify caller is an owner
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: callerRow } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('user_id', callerUser.id)
    .maybeSingle();

  if (!callerRow || callerRow.role !== 'owner') {
    res.status(403).json({ error: 'Owner access required' }); return;
  }

  const schoolId = req.query?.schoolId;
  if (!schoolId || typeof schoolId !== 'string') {
    res.status(400).json({ error: 'schoolId is required' }); return;
  }

  // Fetch school info
  const { data: school, error: schoolErr } = await supabaseAdmin
    .from('schools')
    .select('school_id, name, email, phone, address, city, country, subscription_plan, subscription_status, created_at')
    .eq('school_id', schoolId)
    .maybeSingle();

  if (schoolErr || !school) {
    res.status(404).json({ error: 'School not found' }); return;
  }

  // Fetch all non-student portal users from primary users table
  const { data: primaryUsers } = await supabaseAdmin
    .from('users')
    .select('user_id, name, email, role, extra_roles, is_active')
    .eq('school_id', schoolId)
    .neq('role', 'student')
    .not('email', 'is', null)
    .order('name');

  // Fetch any cross-school members whose primary school is elsewhere
  const { data: membershipUsers } = await supabaseAdmin
    .from('user_school_memberships')
    .select('user_id, role, is_active')
    .eq('school_id', schoolId)
    .neq('role', 'student')
    .eq('is_active', true);

  // Resolve names + emails for membership users
  let extraUsers = [];
  if (membershipUsers && membershipUsers.length > 0) {
    const memberUids = membershipUsers.map((m) => m.user_id);
    const { data: memberDetails } = await supabaseAdmin
      .from('users')
      .select('user_id, name, email')
      .in('user_id', memberUids)
      .not('email', 'is', null);

    const detailMap = {};
    for (const d of memberDetails ?? []) detailMap[d.user_id] = d;

    // Only include if not already in primaryUsers
    const primaryIds = new Set((primaryUsers ?? []).map((u) => u.user_id));
    extraUsers = membershipUsers
      .filter((m) => !primaryIds.has(m.user_id) && detailMap[m.user_id])
      .map((m) => ({
        user_id: m.user_id,
        name: detailMap[m.user_id]?.name ?? null,
        email: detailMap[m.user_id]?.email ?? null,
        role: m.role,
        extra_roles: [],
        is_active: m.is_active,
      }));
  }

  const allUsers = [...(primaryUsers ?? []), ...extraUsers]
    .filter((u) => u.email); // must have an email (portal login)

  // Group by role
  const grouped = {};
  for (const u of allUsers) {
    const role = u.role || 'other';
    if (!grouped[role]) grouped[role] = [];
    grouped[role].push({
      user_id: u.user_id,
      name: u.name || null,
      email: u.email,
      is_active: u.is_active !== false,
      extra_roles: u.extra_roles || [],
    });
  }

  // Sort each group by name/email
  for (const role of Object.keys(grouped)) {
    grouped[role].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  }

  // Build ordered sections
  const sections = [];
  const seen = new Set();
  for (const role of ROLE_ORDER) {
    if (grouped[role]) {
      sections.push({ role, label: ROLE_LABELS[role] || role, users: grouped[role] });
      seen.add(role);
    }
  }
  // Any roles not in ROLE_ORDER
  for (const role of Object.keys(grouped)) {
    if (!seen.has(role)) {
      sections.push({ role, label: ROLE_LABELS[role] || role, users: grouped[role] });
    }
  }

  const totalPortalUsers = allUsers.length;
  const activePortalUsers = allUsers.filter((u) => u.is_active !== false).length;

  res.status(200).json({
    school,
    sections,
    totalPortalUsers,
    activePortalUsers,
  });
};
