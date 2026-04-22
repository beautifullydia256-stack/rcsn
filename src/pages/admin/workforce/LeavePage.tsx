import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

type LeaveType = {
  id: string;
  name: string;
  paid: boolean;
  default_days_per_year: number;
};

type LeaveRequest = {
  id: string;
  school_id: string;
  staff_kind: 'teacher' | 'other_staff';
  staff_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  half_day_part: 'am' | 'pm' | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string | null;
  created_at: string;
};

type TeacherOpt = { teacher_id: string; name: string | null };
type OtherOpt = { id: string; full_name: string | null };

function statusStyle(s: string) {
  switch (s) {
    case 'approved':
      return 'bg-emerald-500/20 text-emerald-200';
    case 'rejected':
      return 'bg-red-500/20 text-red-200';
    case 'cancelled':
      return 'bg-slate-500/20 text-slate-300';
    default:
      return 'bg-amber-500/20 text-amber-200';
  }
}

export default function LeavePage() {
  const user = useAuthStore((s) => s.user);
  const canManage = usePermission(PERMISSION_KEYS.hrManage);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [meTeacher, setMeTeacher] = useState<string | null>(null);
  const [meOtherStaff, setMeOtherStaff] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [otherStaff, setOtherStaff] = useState<OtherOpt[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [formKind, setFormKind] = useState<'teacher' | 'other_staff'>('teacher');
  const [formStaffId, setFormStaffId] = useState('');
  const [formTypeId, setFormTypeId] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formHalf, setFormHalf] = useState<'am' | 'pm' | ''>('');
  const [formReason, setFormReason] = useState('');
  const [saving, setSaving] = useState(false);

  const [newTypeName, setNewTypeName] = useState('Annual leave');
  const [typeDays, setTypeDays] = useState('21');
  const [addingType, setAddingType] = useState(false);

  const selfId = meTeacher
    ? ({ kind: 'teacher' as const, id: meTeacher })
    : meOtherStaff
      ? { kind: 'other_staff' as const, id: meOtherStaff }
      : null;

  const getLeaveTypeName = useCallback(
    (id: string) => leaveTypes.find((t) => t.id === id)?.name || '—',
    [leaveTypes]
  );

  const nameForStaff = useCallback(
    (kind: string, id: string) => {
      if (kind === 'teacher') {
        return teachers.find((t) => t.teacher_id === id)?.name || id.slice(0, 8);
      }
      return otherStaff.find((o) => o.id === id)?.full_name || id.slice(0, 8);
    },
    [teachers, otherStaff]
  );

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setErr(null);
    try {
      const { data: u, error: ue } = await supabase
        .from('users')
        .select('school_id, linked_teacher_id')
        .eq('user_id', user.id)
        .single();
      if (ue || !u?.school_id) {
        setErr('Could not load your school profile.');
        setLoading(false);
        return;
      }
      setSchoolId(u.school_id);
      setMeTeacher(u.linked_teacher_id || null);
      if (!u.linked_teacher_id) {
        const { data: oRow } = await supabase
          .from('other_staff_members')
          .select('id')
          .eq('school_id', u.school_id)
          .eq('linked_user_id', user.id)
          .maybeSingle();
        setMeOtherStaff(oRow?.id ?? null);
      } else {
        setMeOtherStaff(null);
      }

      const [tRes, oRes, ltRes, qRes] = await Promise.all([
        supabase.from('teachers').select('teacher_id, name').eq('school_id', u.school_id).order('name'),
        supabase.from('other_staff_members').select('id, full_name').eq('school_id', u.school_id).order('full_name'),
        supabase.from('hr_leave_types').select('id, name, paid, default_days_per_year').eq('school_id', u.school_id).order('sort_order'),
        supabase
          .from('hr_leave_requests')
          .select('id, school_id, staff_kind, staff_id, leave_type_id, start_date, end_date, half_day_part, status, reason, created_at')
          .eq('school_id', u.school_id)
          .order('start_date', { ascending: false }),
      ]);

      if (tRes.error) throw tRes.error;
      if (oRes.error) throw oRes.error;
      if (ltRes.error) throw ltRes.error;
      if (qRes.error) throw qRes.error;

      setTeachers((tRes.data || []) as TeacherOpt[]);
      setOtherStaff((oRes.data || []) as OtherOpt[]);
      setLeaveTypes((ltRes.data || []) as LeaveType[]);
      setRequests((qRes.data || []) as LeaveRequest[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load leave data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selfId && !canManage) {
      setFormKind(selfId.kind);
      setFormStaffId(selfId.id);
    }
  }, [selfId, canManage]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !formTypeId || !formStart || !formEnd) return;
    setSaving(true);
    setErr(null);
    const staffId =
      canManage
        ? formStaffId
        : selfId?.id;
    if (!staffId) {
      setErr('Select a staff member.');
      setSaving(false);
      return;
    }
    const kind = canManage ? formKind : (selfId?.kind as 'teacher' | 'other_staff');
    const { error } = await supabase.from('hr_leave_requests').insert({
      school_id: schoolId,
      staff_kind: kind,
      staff_id: staffId,
      leave_type_id: formTypeId,
      start_date: formStart,
      end_date: formEnd,
      half_day_part: formHalf || null,
      reason: formReason || null,
    });
    if (error) {
      setErr(error.message);
    } else {
      setFormReason('');
      setFormHalf('');
      void load();
    }
    setSaving(false);
  };

  const setRequestStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase
      .from('hr_leave_requests')
      .update({
        status,
        reviewed_by_user_id: auth.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) {
      setErr(error.message);
      return;
    }
    void load();
  };

  const addLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !newTypeName.trim()) return;
    setAddingType(true);
    const n = parseFloat(typeDays) || 0;
    const { error } = await supabase.from('hr_leave_types').insert({
      school_id: schoolId,
      name: newTypeName.trim(),
      default_days_per_year: n,
      paid: true,
      sort_order: leaveTypes.length,
    });
    if (error) {
      setErr(error.message);
    } else {
      setNewTypeName('Annual leave');
      setTypeDays('21');
      void load();
    }
    setAddingType(false);
  };

  const seedDefaults = async () => {
    if (!schoolId) return;
    setAddingType(true);
    const defaults: { name: string; days: number }[] = [
      { name: 'Annual leave', days: 21 },
      { name: 'Sick leave', days: 7 },
    ];
    for (let i = 0; i < defaults.length; i++) {
      await supabase.from('hr_leave_types').insert({
        school_id: schoolId,
        name: defaults[i].name,
        default_days_per_year: defaults[i].days,
        paid: true,
        sort_order: i,
      });
    }
    void load();
    setAddingType(false);
  };

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);

  if (!user) return null;
  if (loading) {
    return (
      <AdminPageWrapper title="Leave" subtitle="Loading…">
        <div className="ac-text-secondary text-sm">Loading…</div>
      </AdminPageWrapper>
    );
  }

  if (!canManage && !selfId) {
    return (
      <AdminPageWrapper title="Leave" subtitle="Time off for staff at your school.">
        <div className={`${adminCardClass} text-amber-200/90`}>
          Your user account is not linked to a teacher or other staff record. Link an account from Staff or Teachers, or ask
          an administrator to manage leave on your behalf.
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      title="Leave"
      subtitle="Request time off, approve as HR, and review balances (database triggers update balances on approval)."
    >
      {err && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
          {err}
        </div>
      )}

      {canManage && leaveTypes.length === 0 && (
        <div className={adminCardClass}>
          <p className="text-sm text-slate-300 mb-3">No leave types yet. Add a type or use defaults to get started.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void seedDefaults()}
              disabled={addingType}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Create school defaults
            </button>
          </div>
        </div>
      )}

      {canManage && (
        <div className={adminCardClass}>
          <h2 className="text-base font-semibold text-slate-100 mb-3">Add leave type</h2>
          <form onSubmit={addLeaveType} className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Name</label>
              <input
                className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-slate-100"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Default days / year</label>
              <input
                type="number"
                className="w-24 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-slate-100"
                value={typeDays}
                onChange={(e) => setTypeDays(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={addingType}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-slate-100 hover:bg-white/15"
            >
              Save type
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={adminCardClass}>
          <h2 className="text-base font-semibold text-slate-100 mb-3">New request</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            {canManage && (
              <>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Role</label>
                  <select
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-slate-100"
                    value={formKind}
                    onChange={(e) => {
                      setFormKind(e.target.value as 'teacher' | 'other_staff');
                      setFormStaffId('');
                    }}
                  >
                    <option value="teacher">Teacher</option>
                    <option value="other_staff">Other staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Person</label>
                  <select
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-slate-100"
                    value={formStaffId}
                    onChange={(e) => setFormStaffId(e.target.value)}
                    required
                  >
                    <option value="">Select…</option>
                    {formKind === 'teacher'
                      ? teachers.map((t) => (
                          <option key={t.teacher_id} value={t.teacher_id}>
                            {t.name || t.teacher_id}
                          </option>
                        ))
                      : otherStaff.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.full_name || o.id}
                          </option>
                        ))}
                  </select>
                </div>
              </>
            )}

            {!canManage && selfId && (
              <p className="text-sm text-slate-400">Submitting for: {nameForStaff(selfId.kind, selfId.id)}</p>
            )}

            <div>
              <label className="block text-xs text-slate-500 mb-1">Leave type</label>
              <select
                className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-slate-100"
                value={formTypeId}
                onChange={(e) => setFormTypeId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {leaveTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (default {t.default_days_per_year} d/yr)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Start</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-slate-100"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">End</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-slate-100"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Half day (optional)</label>
              <select
                className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-slate-100"
                value={formHalf}
                onChange={(e) => setFormHalf((e.target.value as 'am' | 'pm' | '') || '')}
              >
                <option value="">Full days</option>
                <option value="am">Morning (AM)</option>
                <option value="pm">Afternoon (PM)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Reason (optional)</label>
              <textarea
                className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-slate-100"
                rows={2}
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
              />
            </div>
            {(canManage || selfId) && (
              <button
                type="submit"
                disabled={saving || !leaveTypes.length || (canManage && !formStaffId)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Submitting…' : 'Submit request'}
              </button>
            )}
          </form>
        </div>

        {canManage && (
          <div className={adminCardClass}>
            <h2 className="text-base font-semibold text-slate-100 mb-2">Queue</h2>
            <p className="text-xs text-slate-500 mb-2">{pending.length} pending</p>
            <ul className="space-y-2 max-h-72 overflow-y-auto text-sm">
              {pending.length === 0 && <li className="text-slate-500">No pending requests</li>}
              {pending.map((r) => (
                <li key={r.id} className="flex flex-col gap-1 rounded-lg border border-white/10 p-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-200 font-medium">
                      {nameForStaff(r.staff_kind, r.staff_id)} — {getLeaveTypeName(r.leave_type_id)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {r.start_date} → {r.end_date}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void setRequestStatus(r.id, 'approved')}
                      className="rounded bg-emerald-600/80 px-2 py-0.5 text-xs text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void setRequestStatus(r.id, 'rejected')}
                      className="rounded bg-red-600/60 px-2 py-0.5 text-xs text-white"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={adminCardClass}>
        <h2 className="text-base font-semibold text-slate-100 mb-3">All requests (visible to you under access rules)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-200">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-xs">
                <th className="py-2 pr-2">Person</th>
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 pr-2">Dates</th>
                <th className="py-2 pr-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="py-1.5 pr-2">{nameForStaff(r.staff_kind, r.staff_id)}</td>
                  <td className="py-1.5 pr-2">{getLeaveTypeName(r.leave_type_id)}</td>
                  <td className="py-1.5 pr-2 text-xs">
                    {r.start_date} – {r.end_date}
                    {r.half_day_part ? ` (${r.half_day_part.toUpperCase()})` : ''}
                  </td>
                  <td className="py-1.5 pr-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${statusStyle(r.status)}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">Balances update in the database when a request is approved.</p>
      </div>
    </AdminPageWrapper>
  );
}
