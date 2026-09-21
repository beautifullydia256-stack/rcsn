import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import {
  Fingerprint,
  Users,
  GraduationCap,
  Briefcase,
  Search,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  Cpu,
  Layers,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

type EnrolledPerson = {
  person_id: string;
  name: string;
  class_or_role: string;
  device_user_id: string | null;
  device_name: string | null;
  active: boolean;
  mapping_id: string | null;
};

type Tab = 'students' | 'teachers';

export default function BiometricEnrollmentPage() {
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('students');
  const [people, setPeople] = useState<EnrolledPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDeviceUserId, setEditDeviceUserId] = useState('');
  const [editDeviceName, setEditDeviceName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterEnrollment, setFilterEnrollment] = useState<'all' | 'enrolled' | 'unenrolled'>('all');

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setSchoolId(data?.school_id ?? null));
  }, [user?.id]);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    loadPeople(schoolId, tab)
      .then(setPeople)
      .catch(() => setError('Failed to load personnel roster.'))
      .finally(() => setLoading(false));
  }, [schoolId, tab]);

  async function loadPeople(sid: string, currentTab: Tab): Promise<EnrolledPerson[]> {
    const mappings = await supabase
      .from('biometric_device_users')
      .select('id, person_id, device_user_id, device_name, active')
      .eq('school_id', sid)
      .eq('person_type', currentTab === 'students' ? 'student' : 'teacher');

    const mappingMap = new Map<
      string,
      { id: string; device_user_id: string; device_name: string | null; active: boolean }
    >();
    for (const m of mappings.data ?? []) {
      mappingMap.set(m.person_id, {
        id: m.id,
        device_user_id: m.device_user_id,
        device_name: m.device_name,
        active: m.active,
      });
    }

    if (currentTab === 'students') {
      const { data } = await supabase
        .from('students')
        .select('student_id, name, current_class')
        .eq('school_id', sid)
        .eq('status', 'active')
        .order('name');
      return (data ?? []).map((s) => {
        const m = mappingMap.get(s.student_id);
        return {
          person_id: s.student_id,
          name: s.name,
          class_or_role: s.current_class ?? '',
          device_user_id: m?.device_user_id ?? null,
          device_name: m?.device_name ?? null,
          active: m?.active ?? true,
          mapping_id: m?.id ?? null,
        };
      });
    } else {
      const { data } = await supabase
        .from('teachers')
        .select('teacher_id, name, subject')
        .eq('school_id', sid)
        .order('name');
      return (data ?? []).map((tch) => {
        const m = mappingMap.get(tch.teacher_id);
        return {
          person_id: tch.teacher_id,
          name: tch.name,
          class_or_role: tch.subject ?? 'Teacher',
          device_user_id: m?.device_user_id ?? null,
          device_name: m?.device_name ?? null,
          active: m?.active ?? true,
          mapping_id: m?.id ?? null,
        };
      });
    }
  }

  function openEdit(p: EnrolledPerson) {
    setEditId(p.person_id);
    setEditDeviceUserId(p.device_user_id ?? '');
    setEditDeviceName(p.device_name ?? '');
    setError(null);
  }

  async function saveEnrollment() {
    if (!schoolId || !editId) return;
    setSaving(true);
    setError(null);
    const person = people.find((p) => p.person_id === editId)!;
    const deviceId = editDeviceUserId.trim();

    try {
      if (!deviceId) {
        // Remove enrollment
        if (person.mapping_id) {
          const { error: e } = await supabase
            .from('biometric_device_users')
            .delete()
            .eq('id', person.mapping_id);
          if (e) throw e;
        }
      } else if (person.mapping_id) {
        // Update existing
        const { error: e } = await supabase
          .from('biometric_device_users')
          .update({ device_user_id: deviceId, device_name: editDeviceName || null })
          .eq('id', person.mapping_id);
        if (e) throw e;
      } else {
        // New enrollment
        const { error: e } = await supabase.from('biometric_device_users').insert({
          school_id: schoolId,
          device_user_id: deviceId,
          person_type: tab === 'students' ? 'student' : 'teacher',
          person_id: editId,
          device_name: editDeviceName || null,
        });
        if (e) throw e;
      }
      const updated = await loadPeople(schoolId, tab);
      setPeople(updated);
      setEditId(null);
      setSuccessMsg(`Biometric ID mapping updated for ${person.name}.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Save failed';
      setError(
        msg.includes('unique')
          ? 'That Device User ID is already assigned to another registered user.'
          : msg
      );
    } finally {
      setSaving(false);
    }
  }

  // Filter & Search
  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.device_user_id ?? '').includes(search) ||
        p.class_or_role.toLowerCase().includes(search.toLowerCase());
      const matchEnroll =
        filterEnrollment === 'all' ||
        (filterEnrollment === 'enrolled' && !!p.device_user_id) ||
        (filterEnrollment === 'unenrolled' && !p.device_user_id);
      return matchSearch && matchEnroll;
    });
  }, [people, search, filterEnrollment]);

  // Statistics
  const stats = useMemo(() => {
    const total = people.length;
    const enrolledCount = people.filter((p) => !!p.device_user_id).length;
    const unenrolledCount = total - enrolledCount;
    const rate = total > 0 ? Math.round((enrolledCount / total) * 100) : 0;
    return { total, enrolledCount, unenrolledCount, rate };
  }, [people]);

  return (
    <AdminPageWrapper
      title="Biometric Enrollment"
      subtitle="Link students and staff to their hardware terminal User IDs for automated attendance capture."
    >
      <div className="w-full space-y-6">
        {/* Toast / Notifications */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 4-Card Summary Strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'emerald'),
              border: isDark ? `1px solid ${t.stroke}` : '1px solid #e2e8f0',
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontFamily: INTER }}>
                Enrolled
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className={`mt-2 text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: SORA }}>
              {stats.enrolledCount}
            </p>
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Fingerprint IDs mapped
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'amber'),
              border: isDark ? `1px solid ${t.stroke}` : '1px solid #e2e8f0',
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontFamily: INTER }}>
                Unenrolled
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className={`mt-2 text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: SORA }}>
              {stats.unenrolledCount}
            </p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
              Awaiting terminal registration
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'blue'),
              border: isDark ? `1px solid ${t.stroke}` : '1px solid #e2e8f0',
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontFamily: INTER }}>
                Coverage
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <Fingerprint className="h-4 w-4" />
              </div>
            </div>
            <p className={`mt-2 text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: SORA }}>
              {stats.rate}%
            </p>
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
              Active personnel covered
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'purple'),
              border: isDark ? `1px solid ${t.stroke}` : '1px solid #e2e8f0',
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontFamily: INTER }}>
                Total Roster
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className={`mt-2 text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: SORA }}>
              {stats.total}
            </p>
            <p className="mt-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
              {tab === 'students' ? 'Active Students' : 'Teaching Staff'}
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 shadow-sm"
          style={{
            backgroundColor: t.panel,
            border: isDark ? `1px solid ${t.stroke}` : '1px solid #e2e8f0',
          }}
        >
          {/* Main Role Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTab('students');
                setSearch('');
                setEditId(null);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                tab === 'students'
                  ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              Students ({tab === 'students' ? stats.total : '—'})
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('teachers');
                setSearch('');
                setEditId(null);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                tab === 'teachers'
                  ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Teaching Staff ({tab === 'teachers' ? stats.total : '—'})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, class, or ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                style={{
                  backgroundColor: isDark ? t.fieldBg : '#ffffff',
                  borderColor: isDark ? t.stroke : '#cbd5e1',
                }}
              />
            </div>

            {/* Status Filter */}
            <div className="inline-flex rounded-xl p-1 border border-slate-200 dark:border-white/10" style={{ backgroundColor: isDark ? t.fieldBg : '#f1f5f9' }}>
              {(['all', 'enrolled', 'unenrolled'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterEnrollment(mode)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-all ${
                    filterEnrollment === mode
                      ? 'bg-white dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-semibold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enrollment Table */}
        <div
          className="rounded-2xl overflow-hidden shadow-sm"
          style={{
            backgroundColor: t.panel,
            border: isDark ? `1px solid ${t.stroke}` : '1px solid #e2e8f0',
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            </div>
          ) : filteredPeople.length === 0 ? (
            <div className="p-8">
              <PosEmptyState
                icon={<Fingerprint className="w-8 h-8 text-teal-500" />}
                title="No Personnel Found"
                description={
                  search
                    ? 'No records match your search query.'
                    : `No ${tab} records found for enrollment.`
                }
                accentColor="mint"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr
                    className="border-b text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                    style={{
                      backgroundColor: isDark ? t.fieldBg : '#f8fafc',
                      borderColor: isDark ? t.stroke : '#e2e8f0',
                    }}
                  >
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">{tab === 'students' ? 'Class / Stream' : 'Subject / Role'}</th>
                    <th className="py-3 px-4">Device User ID</th>
                    <th className="py-3 px-4">Designated Terminal</th>
                    <th className="py-3 px-4">Enrollment Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredPeople.map((p) => {
                    const isEditing = editId === p.person_id;
                    const isEnrolled = !!p.device_user_id;

                    return (
                      <tr key={p.person_id} className="transition hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/15 text-xs font-bold text-teal-600 dark:text-teal-400">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{p.name}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          <span className="rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {p.class_or_role || 'General'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {isEditing ? (
                            <input
                              type="text"
                              autoFocus
                              placeholder="e.g. 1042"
                              value={editDeviceUserId}
                              onChange={(e) => setEditDeviceUserId(e.target.value)}
                              className="w-28 rounded-lg border px-2 py-1 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-white/5"
                              style={{ borderColor: isDark ? t.stroke : '#cbd5e1' }}
                            />
                          ) : p.device_user_id ? (
                            <span className="font-mono font-bold text-teal-700 dark:text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded-lg border border-teal-500/20">
                              #{p.device_user_id}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="e.g. Main Gate Terminal"
                              value={editDeviceName}
                              onChange={(e) => setEditDeviceName(e.target.value)}
                              className="w-36 rounded-lg border px-2 py-1 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-white/5"
                              style={{ borderColor: isDark ? t.stroke : '#cbd5e1' }}
                            />
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400 font-medium">{p.device_name || 'All Terminals'}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                              isEnrolled
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {isEnrolled ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Enrolled
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3" />
                                Pending
                              </>
                            )}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={saveEnrollment}
                                disabled={saving}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 shadow-sm"
                              >
                                <Save className="h-3 w-3" />
                                {saving ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditId(null)}
                                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition"
                            >
                              <Edit2 className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                              <span>{isEnrolled ? 'Edit ID' : 'Enroll'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminPageWrapper>
  );
}
