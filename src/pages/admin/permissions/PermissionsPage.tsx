import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
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
  const authUser = useAuthStore((s) => s.user);
  const schoolIdStore = useAuthStore((s) => s.schoolId);
  const setSchoolIdStore = useAuthStore((s) => s.setSchoolId);
  const [schoolId, setSchoolId] = useState<string | null>(() => schoolIdStore ?? null);
  const setPermissions = useAuthStore((s) => s.setPermissions);

  useEffect(() => {
    if (schoolIdStore) {
      setSchoolId(schoolIdStore);
      return;
    }
    const run = async () => {
      if (!authUser?.id) return;
      const { data } = await supabase.from('users').select('school_id').eq('user_id', authUser.id).single();
      const sid = data?.school_id ?? null;
      setSchoolId(sid);
      if (sid) setSchoolIdStore(sid);
    };
    run();
  }, [authUser?.id, schoolIdStore, setSchoolIdStore]);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localKeys, setLocalKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'permissions-users', authUser?.id],
    queryFn: () => fetchSchoolUsers(authUser!.id),
    enabled: !!authUser?.id,
    staleTime: STALE_MS,
  });

  const selectedUser = useMemo(() => users.find((u) => u.user_id === selectedId) ?? null, [users, selectedId]);

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

  if (!schoolId) {
    return (
      <AdminPageWrapper title="Access & permissions">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">No school linked.</div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      title="Access & permissions"
      subtitle="Grant extra capabilities (e.g. teacher can enrol students, or act as accountant). Primary role stays the same; this adds delegated access."
    >
      <div className={`${adminCardClass} space-y-6 max-w-3xl`}>
        <p className="text-sm ac-text-secondary">
          Keys: <code className="text-xs bg-black/5 px-1 rounded">{PERMISSION_KEYS.studentsManage}</code>,{' '}
          <code className="text-xs bg-black/5 px-1 rounded">{PERMISSION_KEYS.accountingFull}</code>. Admins and head teachers can
          manage these for any user in the school.
        </p>

        {isLoading ? (
          <div className="ac-text-muted py-8">Loading users…</div>
        ) : (
          <div>
            <label className="block text-sm font-medium ac-text-secondary mb-2">Select user</label>
            <select
              className="ac-input w-full max-w-md rounded-xl px-3 py-2 text-sm"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value || null)}
            >
              <option value="">— Choose a user —</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.name || u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedUser && (
          <div className="space-y-4 border-t border-[var(--ac-border)] pt-4">
            <p className="text-sm ac-text-primary font-medium">
              {selectedUser.name} <span className="ac-text-secondary font-normal">· {selectedUser.email}</span>
            </p>
            {loadingPerms ? (
              <div className="ac-text-muted text-sm">Loading permissions…</div>
            ) : (
              <ul className="space-y-3">
                {PERMISSION_CATALOG.map((item) => (
                  <li key={item.key} className="flex gap-3 items-start">
                    <input
                      type="checkbox"
                      id={`perm-${item.key}`}
                      checked={localKeys.has(item.key)}
                      onChange={() => toggleKey(item.key)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600"
                    />
                    <label htmlFor={`perm-${item.key}`} className="cursor-pointer">
                      <span className="font-medium ac-text-primary">{item.label}</span>
                      <span className="block text-sm ac-text-secondary">{item.description}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              disabled={saving || !dirty}
              onClick={() => void handleSave()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
