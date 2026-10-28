import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, ShieldCheck, UserCheck, ArrowLeft, RefreshCw, Check, X, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getRoleTitle } from '@/lib/roleTerminology';
import { PERMISSION_CATALOG, PERMISSION_KEYS, type PermissionKey } from '@/lib/permissions';
import { useToast } from '@/components/Toast';
import { refreshPermissionsForSession } from '@/lib/refreshPermissions';
import { GovPageLoader, GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

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

  const { data: users = [], isLoading, refetch } = useQuery({
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
      <div className="admin-terminal-page space-y-5 p-4">
        <GovPageLoader message="LOADING INSTITUTIONAL SECURITY CONTEXT..." minHeight="min-h-[40vh]" />
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="admin-terminal-page space-y-5 p-4">
        <div className="gov-card p-8 text-center space-y-2">
          <p className="font-mono text-sm font-bold uppercase text-[#111111]">NO INSTITUTIONAL SCHOOL IDENTIFIER LINKED</p>
          <p className="font-mono text-xs text-[#555555]">
            Administrative permissions require an active school_id association. Contact institutional support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-terminal-page space-y-5 p-4">
      {/* ── 1. OFFICIAL INSTITUTIONAL MASTHEAD ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            ROLE-BASED ACCESS CONTROL &amp; PERMISSIONS MATRIX
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            GRANULAR PRIVILEGE OVERLAYS &amp; DELEGATED CAPABILITIES • REPUBLIC OF UGANDA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/admin/accounts"
            className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN TO USER ACCOUNTS</span>
          </Link>
          <button
            type="button"
            onClick={() => void refetch()}
            className="gov-btn gov-btn-secondary gov-btn-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 2. MONOCHROME KPI SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            CAMPUS USERS
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {users.length.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            ACTIVE CREDENTIALS
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            PRIVILEGE MODULES
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {PERMISSION_CATALOG.length}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            DELEGABLE CONTROLS
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            SELECTED IDENTITY
          </div>
          <div className="text-sm font-bold font-mono text-[#111111] mt-2 truncate uppercase">
            {selectedUser ? (selectedUser.name || selectedUser.email) : 'NO USER SELECTED'}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            {selectedUser ? labelRole(selectedUser.role, schoolType) : 'SELECT BELOW'}
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            ACTIVE OVERLAYS
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {localKeys.size}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            GRANTED PRIVILEGES
          </div>
        </div>
      </div>

      {/* ── 3. DUAL-PANE WORKSPACE: USER SELECTION & PRIVILEGE MATRIX ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Pane: Staff Roster Selector */}
        <div className="lg:col-span-5 space-y-3">
          <div className="gov-card p-3 bg-white border border-[#CCCCCC]">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#CCCCCC]">
              <span className="text-xs font-mono font-bold uppercase text-[#111111]">
                1. SELECT STAFF IDENTITY
              </span>
              <span className="text-[10px] font-mono text-[#555555]">
                {filteredPickerUsers.length} MATCHES
              </span>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#777777]" />
              <input
                type="search"
                placeholder="Search staff by name, email, or role…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="gov-input pl-8 text-xs font-mono w-full"
              />
            </div>

            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {filteredPickerUsers.map((u) => {
                const isSelected = selectedId === u.user_id;
                return (
                  <button
                    key={u.user_id}
                    type="button"
                    onClick={() => setSelectedId(u.user_id)}
                    className={`w-full text-left p-2.5 border transition-colors flex items-start justify-between gap-2 font-mono ${
                      isSelected
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-white text-[#111111] border-[#E5E7EB] hover:bg-[#F9F9FB]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">
                        {u.name?.trim() || u.email}
                      </div>
                      <div className={`text-[10px] truncate ${isSelected ? 'text-[#CCCCCC]' : 'text-[#777777]'}`}>
                        {u.email}
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 border uppercase shrink-0 ${
                      isSelected
                        ? 'bg-[#222222] text-white border-[#444444]'
                        : 'bg-[#F1F3F5] text-[#111111] border-[#CCCCCC]'
                    }`}>
                      {labelRole(u.role, schoolType)}
                    </span>
                  </button>
                );
              })}

              {filteredPickerUsers.length === 0 && (
                <div className="p-6 text-center text-xs font-mono text-[#777777]">
                  No staff members match that search query.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Granular Capability Matrix */}
        <div className="lg:col-span-7">
          <div className="gov-card p-4 bg-white border border-[#CCCCCC]">
            <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-[#CCCCCC] gap-2">
              <div>
                <h2 className="text-xs font-mono font-bold uppercase text-[#111111]">
                  2. GRANULAR PRIVILEGE OVERLAYS
                </h2>
                {selectedUser && (
                  <p className="text-[11px] font-mono text-[#555555] mt-0.5">
                    DELEGATING FOR: <span className="font-bold text-[#111111]">{selectedUser.name || selectedUser.email}</span> ({labelRole(selectedUser.role, schoolType)})
                  </p>
                )}
              </div>

              {selectedUser && (
                <button
                  type="button"
                  disabled={saving || !dirty}
                  onClick={() => void handleSave()}
                  className="gov-btn gov-btn-primary gov-btn-sm font-mono flex items-center gap-1.5"
                >
                  {saving ? <GovRollingBox size="xs" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>{saving ? 'APPLYING...' : dirty ? 'SAVE PRIVILEGE OVERLAYS' : 'CHANGES SAVED'}</span>
                </button>
              )}
            </div>

            {!selectedUser ? (
              <div className="p-12 text-center space-y-2">
                <Lock className="w-8 h-8 mx-auto text-[#777777]" />
                <p className="font-mono text-xs uppercase text-[#111111] font-bold">
                  NO STAFF MEMBER CURRENTLY SELECTED
                </p>
                <p className="font-mono text-xs text-[#555555]">
                  Select an identity from the staff roster on the left to configure explicit operational permissions.
                </p>
              </div>
            ) : loadingPerms ? (
              <div className="p-12 text-center space-y-2">
                <GovRollingBox size="sm" />
                <p className="font-mono text-xs text-[#555555]">LOADING USER PERMISSION RECORDS...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {PERMISSION_CATALOG.map((item) => {
                  const isChecked = localKeys.has(item.key);
                  return (
                    <label
                      key={item.key}
                      htmlFor={`perm-${item.key}`}
                      className={`p-3 border flex items-start gap-3 cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-[#F9F9FB] border-[#111111]'
                          : 'bg-white border-[#E5E7EB] hover:bg-[#F9F9FB]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        id={`perm-${item.key}`}
                        checked={isChecked}
                        onChange={() => toggleKey(item.key)}
                        className="rounded-none border-[#000000] text-[#111111] focus:ring-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#111111]">
                            {item.label}
                          </span>
                          <span className="font-mono text-[9px] bg-[#F1F3F5] text-[#555555] px-1 border border-[#CCCCCC]">
                            {item.key}
                          </span>
                        </div>
                        <p className="font-mono text-[11px] text-[#555555] mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
