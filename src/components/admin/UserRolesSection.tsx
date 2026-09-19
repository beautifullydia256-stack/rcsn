import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getRoleTitle } from '@/lib/roleTerminology';

type Props = {
  /** The user_id of the person whose roles to manage */
  userId: string | null | undefined;
  /** User email — used to send role-change notification emails */
  userEmail?: string | null;
  /** School ID — used to look up school name in the notification email */
  schoolId?: string | null;
};

export default function UserRolesSection({ userId, userEmail, schoolId }: Props) {
  const { schoolType } = useSchoolType();
  const currentUserRole = useAuthStore(s => s.role);
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owner';

  const [primaryRole, setPrimaryRole] = useState<string | null>(null);
  const [extraRoles, setExtraRoles] = useState<string[]>([]);
  const [fetchedName, setFetchedName] = useState<string | null>(null);
  const [fetchedEmail, setFetchedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from('users')
      .select('role, extra_roles, name, email')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err || !data) { setLoading(false); return; }
        setPrimaryRole(String(data.role || ''));
        setExtraRoles(Array.isArray(data.extra_roles) ? (data.extra_roles as string[]).filter(Boolean) : []);
        setFetchedName((data as Record<string, unknown>).name as string ?? null);
        setFetchedEmail((data as Record<string, unknown>).email as string ?? null);
        setLoading(false);
      });
  }, [userId]);

  const removeRole = async (role: string) => {
    if (!userId || !isAdmin) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    let newPrimary = primaryRole;
    let newExtras = extraRoles.filter(r => r !== role);

    if (role === primaryRole) {
      if (newExtras.length > 0) {
        newPrimary = newExtras[0];
        newExtras = newExtras.slice(1);
      } else {
        setError('Cannot remove the only role. Assign a different role first.');
        setSaving(false);
        return;
      }
    }

    try {
      const { error: dbErr } = await supabase
        .from('users')
        .update({ role: newPrimary, extra_roles: newExtras })
        .eq('user_id', userId);
      if (dbErr) throw dbErr;
      setPrimaryRole(newPrimary);
      setExtraRoles(newExtras);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);

      // Send email notification (fire and forget)
      const emailTo = userEmail ?? fetchedEmail;
      if (emailTo) {
        void fetch(registerApiUrl('/api/admin/notify-role-change'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: emailTo,
            name: fetchedName,
            schoolId: schoolId ?? null,
            addedRoles: [],
            removedRoles: [role],
          }),
        }).catch(() => { /* best-effort */ });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update roles');
    } finally {
      setSaving(false);
    }
  };

  if (!userId) return null;

  const allRoles = primaryRole
    ? [primaryRole, ...extraRoles.filter(r => r !== primaryRole)]
    : extraRoles;

  return (
    <div style={{
      margin: '0 auto',
      maxWidth: 860,
      padding: '20px 24px',
      borderTop: '1px solid var(--border, rgba(255,255,255,0.1))',
    }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1, #f1f5f9)', margin: 0 }}>
          System Roles
        </h3>
        <p style={{ fontSize: 12, color: 'var(--t3, #94a3b8)', marginTop: 4, marginBottom: 0 }}>
          {isAdmin
            ? 'All roles assigned to this person. Click × to remove a role. The primary role is shown first.'
            : 'Roles assigned to this person in the system.'}
        </p>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--t3, #94a3b8)' }}>Loading roles…</p>
      ) : allRoles.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--t3, #94a3b8)' }}>No system account linked.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {allRoles.map((r, i) => (
            <span key={r} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              background: i === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.12)',
              color: i === 0 ? '#34d399' : '#a78bfa',
              border: `1px solid ${i === 0 ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.25)'}`,
            }}>
              {i === 0 && <span style={{ fontSize: 10, opacity: 0.7 }}>PRIMARY</span>}
              {getRoleTitle(r, schoolType)}
              {isAdmin && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void removeRole(r)}
                  title={`Remove "${getRoleTitle(r, schoolType)}" role`}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'inherit', opacity: 0.6, fontSize: 15, lineHeight: 1,
                    padding: '0 2px', marginLeft: 2,
                  }}
                >×</button>
              )}
            </span>
          ))}
        </div>
      )}

      {error && (
        <p style={{ marginTop: 10, fontSize: 12, color: '#f87171' }}>{error}</p>
      )}
      {success && (
        <p style={{ marginTop: 10, fontSize: 12, color: '#34d399' }}>Roles updated.</p>
      )}
    </div>
  );
}
