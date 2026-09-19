import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getRoleTitle } from '@/lib/roleTerminology';
import PwParentsDirectoryShell from '@/components/admin/PwParentsDirectoryShell';
import PwDirectoryUserCard from '@/components/admin/PwDirectoryUserCard';
import { pwDirGrad, pwDirInitials, pwRoleToChipTone } from '@/components/admin/pwDirectoryUtils';
import { PERMISSION_CATALOG, PERMISSION_KEYS, type PermissionKey } from '@/lib/permissions';
import { useToast } from '@/components/Toast';
import { refreshPermissionsForSession } from '@/lib/refreshPermissions';
const STALE_MS = 60 * 1000;

type SchoolUser = {
  user_id: string;
  email: string;
  name: string;
  role: string;
};

export async function fetchSchoolUsers(adminUserId: string): Promise<SchoolUser[]> {
  const { data: me } = await supabase.from('users').select('school_id, role').eq('user_id', adminUserId).single();
  if (!me?.school_id || !['admin', 'owner', 'head_teacher'].includes(me.role ?? '')) return [];
  const { data, error } = await supabase
    .from('users')
    .select('user_id, email, name, role')
    .eq('school_id', me.school_id)
    .order('name');
  if (error) throw error;
  return (data || []) as SchoolUser[];
}

function labelRole(role: string, schoolType?: string | null) {
  return getRoleTitle(role, schoolType);
}

async function fetchPermissionsForUser(userId: string, schoolId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('user_school_permissions')
    .select('permission_key')
    .eq('user_id', userId)
    .eq('school_id', schoolId);
  if (error) throw error;
  return new Set((data || []).map((r: { permission_key: string }) => r.permission_key));
}

export default function PermissionsPage() {
  const { schoolType } = useSchoolType();
  const authUser = useAuthStore((s) => s.user);
  const schoolIdStore = useAuthStore((s) => s.schoolId);
  const setSchoolIdStore = useAuthStore((s) => s.setSchoolId);
  const [schoolId, setSchoolId] = useState<string | null>(() => schoolIdStore ?? null);
  /** False until store + DB have been checked (avoids flashing “No school linked” during hydration). */
  const [schoolResolved, setSchoolResolved] = useState(false);
  const setPermissions = useAuthStore((s) => s.setPermissions);

  useEffect(() => {
    if (schoolIdStore) {
      setSchoolId(schoolIdStore);
      setSchoolResolved(true);
      return;
    }
    const run = async () => {
      if (!authUser?.id) {
        setSchoolResolved(true);
        return;
      }
      const { data } = await supabase.from('users').select('school_id').eq('user_id', authUser.id).single();
      const sid = (data?.school_id as string | undefined) ?? null;
      setSchoolId(sid);
      if (sid) setSchoolIdStore(sid);
      setSchoolResolved(true);
    };
    void run();
  }, [authUser?.id, schoolIdStore, setSchoolIdStore]);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localKeys, setLocalKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'permissions-users', authUser?.id],
    queryFn: () => fetchSchoolUsers(authUser!.id),
    enabled: !!authUser?.id,
    staleTime: STALE_MS,
  });

  const selectedUser = useMemo(() => users.find((u) => u.user_id === selectedId) ?? null, [users, selectedId]);

  const filteredPickerUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      const rolePretty = labelRole(u.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q) || rolePretty.includes(q);
    });
  }, [users, userSearch]);

  const { data: serverKeys, isLoading: loadingPerms } = useQuery({
    queryKey: ['admin', 'user-permissions', selectedId, schoolId],
    queryFn: async () => {
      if (!selectedId || !schoolId) return new Set<string>();
      return fetchPermissionsForUser(selectedId, schoolId);
    },
    enabled: !!selectedId && !!schoolId,
    staleTime: STALE_MS,
  });

  useEffect(() => {
    setLocalKeys(new Set());
  }, [selectedId]);

  useEffect(() => {
    if (serverKeys) setLocalKeys(new Set(serverKeys));
  }, [serverKeys]);

  const toggleKey = (key: PermissionKey) => {
    setLocalKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedUser || !schoolId || !authUser?.id) return;
    if (['admin', 'owner'].includes(selectedUser.role)) {
      toast.info('Super roles already have full access; extra toggles are optional.');
    }
    setSaving(true);
    try {
      const want = new Set(localKeys);
      const had = serverKeys ?? new Set<string>();
      const toAdd = [...want].filter((k) => !had.has(k));
      const toRemove = [...had].filter((k) => !want.has(k));

      for (const key of toRemove) {
        const { error } = await supabase
          .from('user_school_permissions')
          .delete()
          .eq('user_id', selectedUser.user_id)
          .eq('school_id', schoolId)
          .eq('permission_key', key);
        if (error) throw error;
      }

      for (const key of toAdd) {
        const { error } = await supabase.from('user_school_permissions').insert({
          user_id: selectedUser.user_id,
          school_id: schoolId,
          permission_key: key,
          granted_by: authUser.id,
        });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['admin', 'user-permissions', selectedId, schoolId] });
      if (selectedUser.user_id === authUser.id) {
        await refreshPermissionsForSession(supabase, setPermissions);
      }
      toast.success('Permissions updated.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const dirty = useMemo(() => {
    if (!serverKeys) return false;
    if (localKeys.size !== serverKeys.size) return true;
    for (const k of localKeys) if (!serverKeys.has(k)) return true;
    for (const k of serverKeys) if (!localKeys.has(k)) return true;
    return false;
  }, [localKeys, serverKeys]);

  if (!schoolResolved) {
    return (
      <PwParentsDirectoryShell>
        <div className="par-empty">
          <div className="par-empty-title">Loading your school context…</div>
        </div>
      </PwParentsDirectoryShell>
    );
  }

  if (!schoolId) {
    return (
      <PwParentsDirectoryShell>
        <div className="par-empty">
          <div className="par-empty-title">No school linked</div>
          <div className="par-empty-sub">
            If you are an admin, ask support to set your user&apos;s <code style={{ fontSize: 12 }}>school_id</code>.
          </div>
        </div>
      </PwParentsDirectoryShell>
    );
  }

  return (
    <PwParentsDirectoryShell>
      <div className="par-header par-fu">
        <div>
          <div className="par-eyebrow">User management</div>
          <h1 className="par-title">Access &amp; permissions</h1>
          <p className="par-sub">
            Same card layout as Parents. Pick someone, then toggle extras like{' '}
            <strong style={{ color: 'var(--violet)' }}>{PERMISSION_KEYS.studentsManage}</strong> or{' '}
            <strong style={{ color: 'var(--violet)' }}>{PERMISSION_KEYS.accountingFull}</strong> on top of their main role.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="par-empty par-fu par-d1">
          <div className="par-empty-title">Loading users…</div>
        </div>
      ) : users.length === 0 ? (
        <div className="par-empty par-fu par-d1">
          <div className="par-empty-title">No users found</div>
          <div className="par-empty-sub">Check access or try again in a moment.</div>
        </div>
      ) : (
        <>
          <div className="par-toolbar par-fu par-d1">
            <div className="par-search" style={{ flex: '1 1 260px', maxWidth: '520px' }}>
              <span style={{ opacity: 0.75, display: 'inline-flex', alignItems: 'center' }} aria-hidden>
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="search"
                placeholder="Search name, email, role…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                autoComplete="off"
              />
            </div>
            {selectedUser ? (
              <button type="button" className="par-btn par-btn-sm par-btn-ghost" onClick={() => setSelectedId(null)}>
                Clear selection
              </button>
            ) : null}
            {userSearch.trim() ? (
              <button type="button" className="par-btn par-btn-sm par-btn-ghost" onClick={() => setUserSearch('')}>
                Clear search
              </button>
            ) : null}
          </div>

          <p className="par-sub par-fu par-d1" style={{ marginBottom: 12 }}>
            {filteredPickerUsers.length === users.length
              ? `${users.length} people — tap a card to edit permissions`
              : `${filteredPickerUsers.length} match${filteredPickerUsers.length === 1 ? '' : 'es'}`}
          </p>

          {filteredPickerUsers.length === 0 ? (
            <div className="par-empty par-fu par-d2">
              <div className="par-empty-sub">No names match that search.</div>
            </div>
          ) : (
            <div className="par-card-grid par-fu par-d2">
              {filteredPickerUsers.map((u, i) => (
                <PwDirectoryUserCard
                  key={u.user_id}
                  name={u.name?.trim() || u.email || 'Unnamed'}
                  subtitle={labelRole(u.role, schoolType)}
                  cornerTone={pwRoleToChipTone(u.role)}
                  cornerLabel={labelRole(u.role, schoolType)}
                  initials={pwDirInitials(u.name || u.email || '?')}
                  avatarBackground={pwDirGrad(i)}
                  statusDotActive
                  rows={[
                    {
                      label: 'Email',
                      value: u.email ? (
                        <span style={{ color: 'var(--blue)', fontSize: 12.5 }}>{u.email}</span>
                      ) : (
                        <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>—</span>
                      ),
                    },
                  ]}
                  onCardClick={() => setSelectedId(u.user_id)}
                  selected={selectedId === u.user_id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {selectedUser ? (
        <div
          className="par-pcard par-fu par-d3"
          style={{ cursor: 'default', marginTop: 24 }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="par-pcard-top">
            <div className="par-pcard-name">Delegated access</div>
            <div className="par-pcard-rel">
              {selectedUser.name || selectedUser.email} · {labelRole(selectedUser.role, schoolType)}
            </div>
          </div>
          <div className="par-pcard-body" style={{ paddingTop: 4 }}>
            {loadingPerms ? (
              <div style={{ color: 'var(--t3)', fontSize: 13 }}>Loading permissions…</div>
            ) : (
              PERMISSION_CATALOG.map((item) => (
                <div
                  key={item.key}
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <label
                    htmlFor={`perm-${item.key}`}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`perm-${item.key}`}
                      checked={localKeys.has(item.key)}
                      onChange={() => toggleKey(item.key)}
                      style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: 'var(--violet)' }}
                    />
                    <span>
                      <span style={{ color: 'var(--t1)', fontWeight: 600, fontSize: 13 }}>{item.label}</span>
                      <span style={{ display: 'block', color: 'var(--t2)', fontSize: 12.5, marginTop: 4 }}>
                        {item.description}
                      </span>
                    </span>
                  </label>
                </div>
              ))
            )}
          </div>
          <div className="par-pcard-foot">
            <button
              type="button"
              className="par-crd-btn par-crd-primary"
              disabled={saving || !dirty}
              onClick={() => void handleSave()}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      ) : null}
    </PwParentsDirectoryShell>
  );
}
