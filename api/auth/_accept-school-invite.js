'use strict';

// CommonJS — package.json has no "type":"module" so .ts ESM output breaks Node.js

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

    const { membershipId } = req.body || {};
    if (!membershipId) return res.status(400).json({ error: 'membershipId is required' });

    const { data: membership, error: membershipErr } = await supabase
      .from('user_school_memberships')
      .select('id, user_id, school_id, is_active')
      .eq('id', membershipId)
      .maybeSingle();

    if (membershipErr || !membership) return res.status(404).json({ error: 'Invitation not found.' });

    // Only the person the invitation belongs to can accept it — never trust the request body
    // for who's accepting, only the authenticated session.
    if (String(membership.user_id) !== String(caller.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (membership.is_active) {
      return res.status(200).json({ success: true, alreadyActive: true });
    }

    const { error: updateErr } = await supabase
      .from('user_school_memberships')
      .update({ is_active: true })
      .eq('id', membershipId)
      .eq('user_id', caller.id);

    if (updateErr) return res.status(500).json({ error: updateErr.message });

    return res.status(200).json({ success: true, schoolId: membership.school_id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to accept invitation';
    return res.status(500).json({ error: msg });
  }
};
