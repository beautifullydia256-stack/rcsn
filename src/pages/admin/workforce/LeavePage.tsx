import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import { fetchLeavePageData } from '@/pages/admin/workforce/workforceApi';
import { workforceQueryKeys } from '@/pages/admin/workforce/workforceQueryKeys';
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Filter,
  User,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

export default function LeavePage() {
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const canManage = usePermission(PERMISSION_KEYS.hrManage);
  const queryClient = useQueryClient();
  const leaveQuery = useQuery({
    queryKey: workforceQueryKeys.leave(user?.id ?? ''),
    queryFn: () => fetchLeavePageData(user!.id),
    enabled: !!user?.id,
  });

  const schoolId = leaveQuery.data?.schoolId ?? null;
  const meTeacher = leaveQuery.data?.meTeacher ?? null;
  const meOtherStaff = leaveQuery.data?.meOtherStaff ?? null;
  const teachers = leaveQuery.data?.teachers ?? [];
  const otherStaff = leaveQuery.data?.otherStaff ?? [];
  const leaveTypes = leaveQuery.data?.leaveTypes ?? [];
  const requests = leaveQuery.data?.requests ?? [];
  const loading = leaveQuery.isPending;

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [err, setErr] = useState<string | null>(null);

  // Form states
  const [formKind, setFormKind] = useState<'teacher' | 'other_staff'>('teacher');
  const [formStaffId, setFormStaffId] = useState('');
  const [formTypeId, setFormTypeId] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formHalf, setFormHalf] = useState<'am' | 'pm' | ''>('');
  const [formReason, setFormReason] = useState('');
  const [saving, setSaving] = useState(false);

  // New leave type
  const [newTypeName, setNewTypeName] = useState('Annual leave');
  const [typeDays, setTypeDays] = useState('21');
  const [addingType, setAddingType] = useState(false);

  const selfId = meTeacher
    ? ({ kind: 'teacher' as const, id: meTeacher })
    : meOtherStaff
      ? { kind: 'other_staff' as const, id: meOtherStaff }
      : null;

  const getLeaveTypeName = useCallback(
    (id: string) => leaveTypes.find((item) => item.id === id)?.name || 'Standard Leave',
    [leaveTypes]
  );

  const nameForStaff = useCallback(
    (kind: string, id: string) => {
      if (kind === 'teacher') {
        return teachers.find((item) => item.teacher_id === id)?.name || id.slice(0, 8);
      }
      return otherStaff.find((item) => item.id === id)?.full_name || id.slice(0, 8);
    },
    [teachers, otherStaff]
  );

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
    const staffId = canManage ? formStaffId : selfId?.id;
    if (!staffId) {
      setErr('Please select a staff member.');
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
      if (user?.id) void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.leave(user.id) });
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
    if (user?.id) void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.leave(user.id) });
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
      if (user?.id) void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.leave(user.id) });
    }
    setAddingType(false);
  };

  const seedDefaults = async () => {
    if (!schoolId) return;
    setAddingType(true);
    const defaults: { name: string; days: number }[] = [
      { name: 'Annual leave', days: 21 },
      { name: 'Sick leave', days: 7 },
      { name: 'Maternity/Paternity leave', days: 60 },
      { name: 'Compassionate leave', days: 5 },
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
    if (user?.id) void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.leave(user.id) });
    setAddingType(false);
  };

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);
  const approved = useMemo(() => requests.filter((r) => r.status === 'approved'), [requests]);
  const rejected = useMemo(() => requests.filter((r) => r.status === 'rejected'), [requests]);

  const filteredRequests = useMemo(() => {
    if (activeTab === 'pending') return pending;
    if (activeTab === 'approved') return approved;
    if (activeTab === 'rejected') return rejected;
    return requests;
  }, [activeTab, requests, pending, approved, rejected]);

  if (!user) return null;
  if (leaveQuery.isError) {
    return (
      <AdminPageWrapper title="Leave" subtitle="Time off">
        <div className="rounded-[20px] p-4 text-sm" style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, color: '#fca5a5' }} role="alert">
          {leaveQuery.error instanceof Error ? leaveQuery.error.message : 'Failed to load leave data'}
        </div>
      </AdminPageWrapper>
    );
  }
  if (loading) {
    return (
      <AdminPageWrapper title="Leave" subtitle="Loading…">
        <div className="text-sm" style={{ color: t.textLow }}>Loading…</div>
      </AdminPageWrapper>
    );
  }

  if (!canManage && !selfId) {
    return (
      <AdminPageWrapper title="Leave" subtitle="Time off for staff at your school.">
        <div className="rounded-[20px] p-4 text-sm" style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, color: t.gold }}>
          Your user account is not linked to a teacher or other staff record. Link an account from Staff or Teachers, or ask
          an administrator to manage leave on your behalf.
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      eyebrow="Human Resources"
      title="Staff Leave & Time Off"
      subtitle="Manage leave categories, review incoming staff requests, authorize leaves, and maintain annual quotas."
    >
      <div className="w-full space-y-6">
        {err && (
          <div
            className="flex items-center gap-2 rounded-xl p-3 text-sm"
            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5' }}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{err}</span>
          </div>
        )}

        {/* 4-Card Summary Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div
            className="rounded-[18px] p-4"
            style={{ background: cardGrad(t), border: `1px solid ${t.stroke}` }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: t.textLow }}>
              <span>Total Requests</span>
              <CalendarDays className="h-4 w-4" style={{ color: t.brand }} />
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
              {requests.length}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: t.textLow }}>All time submissions</div>
          </div>

          <div
            className="rounded-[18px] p-4"
            style={{ background: cardGrad(t), border: `1px solid ${pending.length > 0 ? t.gold : t.stroke}` }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: t.textLow }}>
              <span>Pending Review</span>
              <Clock className="h-4 w-4" style={{ color: t.gold }} />
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: pending.length > 0 ? t.gold : t.textHi, fontFamily: SORA }}>
              {pending.length}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: t.gold }}>Requires approval</div>
          </div>

          <div
            className="rounded-[18px] p-4"
            style={{ background: cardGrad(t), border: `1px solid ${t.stroke}` }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: t.textLow }}>
              <span>Approved</span>
              <CheckCircle2 className="h-4 w-4" style={{ color: t.mint }} />
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: t.mint, fontFamily: SORA }}>
              {approved.length}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: t.mint }}>Cleared time off</div>
          </div>

          <div
            className="rounded-[18px] p-4"
            style={{ background: cardGrad(t), border: `1px solid ${t.stroke}` }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: t.textLow }}>
              <span>Rejected</span>
              <XCircle className="h-4 w-4" style={{ color: '#f87171' }} />
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
              {rejected.length}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: t.textLow }}>Declined requests</div>
          </div>
        </div>

        {/* Action Grid: Request Form + Leave Types */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Submit Request Card */}
          <div
            className="rounded-[20px] p-5"
            style={{ background: cardGrad(t), border: `1px solid ${t.stroke}` }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: t.stroke }}>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: `${t.mint}15`, border: `1px solid ${t.mint}30` }}
                >
                  <Plus className="h-4 w-4" style={{ color: t.mint }} />
                </div>
                <h2 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
                  Submit Leave Request
                </h2>
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              {canManage && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold" style={{ color: t.textLow }}>
                      Staff Category
                    </label>
                    <select
                      value={formKind}
                      onChange={(e) => {
                        setFormKind(e.target.value as 'teacher' | 'other_staff');
                        setFormStaffId('');
                      }}
                      className="w-full rounded-xl px-3 py-2 text-xs font-medium"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                        border: `1px solid ${t.stroke}`,
                        color: t.textHi,
                      }}
                    >
                      <option value="teacher">Academic Staff (Teacher)</option>
                      <option value="other_staff">Support / Admin Staff</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold" style={{ color: t.textLow }}>
                      Select Person
                    </label>
                    <select
                      value={formStaffId}
                      onChange={(e) => setFormStaffId(e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-xs font-medium"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                        border: `1px solid ${t.stroke}`,
                        color: t.textHi,
                      }}
                    >
                      <option value="">— Select Employee —</option>
                      {formKind === 'teacher'
                        ? teachers.map((item) => (
                            <option key={item.teacher_id} value={item.teacher_id}>
                              {item.name || 'Unnamed Teacher'}
                            </option>
                          ))
                        : otherStaff.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.full_name || 'Unnamed Staff'}
                            </option>
                          ))}
                    </select>
                  </div>
                </div>
              )}

              {!canManage && selfId && (
                <div className="text-xs" style={{ color: t.textLow }}>
                  Submitting for: <span className="font-semibold" style={{ color: t.textHi }}>{nameForStaff(selfId.kind, selfId.id)}</span>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: t.textLow }}>
                  Leave Type
                </label>
                <select
                  value={formTypeId}
                  onChange={(e) => setFormTypeId(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs font-medium"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    border: `1px solid ${t.stroke}`,
                    color: t.textHi,
                  }}
                  required
                >
                  <option value="">— Select Leave Policy —</option>
                  {leaveTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.default_days_per_year} days/yr)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: t.textLow }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-xs"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                      border: `1px solid ${t.stroke}`,
                      color: t.textHi,
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: t.textLow }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-xs"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                      border: `1px solid ${t.stroke}`,
                      color: t.textHi,
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: t.textLow }}>
                  Half day (optional)
                </label>
                <select
                  value={formHalf}
                  onChange={(e) => setFormHalf((e.target.value as 'am' | 'pm' | '') || '')}
                  className="w-full rounded-xl px-3 py-2 text-xs font-medium"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    border: `1px solid ${t.stroke}`,
                    color: t.textHi,
                  }}
                >
                  <option value="">Full days</option>
                  <option value="am">Morning (AM)</option>
                  <option value="pm">Afternoon (PM)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: t.textLow }}>
                  Optional Reason / Handover Notes
                </label>
                <textarea
                  placeholder="Medical reason, family obligations, etc."
                  rows={2}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    border: `1px solid ${t.stroke}`,
                    color: t.textHi,
                  }}
                />
              </div>

              {(canManage || selfId) && (
                <button
                  type="submit"
                  disabled={saving || !leaveTypes.length || (canManage && !formStaffId)}
                  className="w-full rounded-xl py-2.5 text-xs font-semibold transition-all disabled:opacity-50"
                  style={{
                    background: t.mint,
                    color: '#042f24',
                    boxShadow: '0 2px 10px rgba(16, 217, 168, 0.3)',
                  }}
                >
                  {saving ? 'Recording Request…' : '+ Submit Official Leave Request'}
                </button>
              )}
            </form>
          </div>

          {/* Pending Approval Queue / Leave Types Management */}
          <div className="space-y-6">
            {canManage && (
              <div
                className="rounded-[20px] p-5"
                style={{ background: cardGrad(t), border: `1px solid ${t.stroke}` }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: t.stroke }}>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ background: `${t.brand}15`, border: `1px solid ${t.brand}30` }}
                    >
                      <Plus className="h-4 w-4" style={{ color: t.brand }} />
                    </div>
                    <h2 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
                      Add Leave Type
                    </h2>
                  </div>
                </div>

                <form onSubmit={addLeaveType} className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[140px]">
                    <label className="mb-1 block text-xs font-semibold" style={{ color: t.textLow }}>Name</label>
                    <input
                      className="w-full rounded-xl px-3 py-2 text-xs"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                        border: `1px solid ${t.stroke}`,
                        color: t.textHi,
                      }}
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                    />
                  </div>
                  <div className="w-28">
                    <label className="mb-1 block text-xs font-semibold" style={{ color: t.textLow }}>Days / year</label>
                    <input
                      type="number"
                      className="w-full rounded-xl px-3 py-2 text-xs"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                        border: `1px solid ${t.stroke}`,
                        color: t.textHi,
                      }}
                      value={typeDays}
                      onChange={(e) => setTypeDays(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={addingType}
                    className="rounded-xl px-4 py-2 text-xs font-semibold transition-all disabled:opacity-50"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1',
                      color: t.textHi,
                    }}
                  >
                    Save type
                  </button>
                </form>

                {leaveTypes.length === 0 && (
                  <div className="mt-4">
                    <p className="text-xs mb-2" style={{ color: t.textLow }}>No leave types yet. Add a type or use defaults to get started.</p>
                    <button
                      type="button"
                      onClick={() => void seedDefaults()}
                      disabled={addingType}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: t.mint, color: '#042f24' }}
                    >
                      Create school defaults
                    </button>
                  </div>
                )}
              </div>
            )}

            {canManage && (
              <div
                className="rounded-[20px] p-5"
                style={{ background: cardGrad(t), border: `1px solid ${t.stroke}` }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: t.stroke }}>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ background: `${t.gold}15`, border: `1px solid ${t.gold}30` }}
                    >
                      <Clock className="h-4 w-4" style={{ color: t.gold }} />
                    </div>
                    <h2 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
                      Pending Authorization Queue ({pending.length})
                    </h2>
                  </div>
                </div>

                <div className="mt-4 space-y-3 max-h-[240px] overflow-y-auto pr-1">
                  {pending.length === 0 ? (
                    <div className="py-6 text-center text-xs" style={{ color: t.textLow }}>
                      No pending leave requests awaiting approval.
                    </div>
                  ) : (
                    pending.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between rounded-xl p-3 transition-colors"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                          border: `1px solid ${t.stroke}`,
                        }}
                      >
                        <div>
                          <div className="text-xs font-bold" style={{ color: t.textHi }}>
                            {nameForStaff(req.staff_kind, req.staff_id)}
                          </div>
                          <div className="mt-0.5 text-[11px]" style={{ color: t.gold }}>
                            {getLeaveTypeName(req.leave_type_id)}
                          </div>
                          <div className="mt-1 text-[10px]" style={{ color: t.textLow }}>
                            {req.start_date} → {req.end_date} {req.reason ? `· "${req.reason}"` : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void setRequestStatus(req.id, 'approved')}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all"
                            style={{
                              background: `${t.mint}20`,
                              border: `1px solid ${t.mint}40`,
                              color: t.mint,
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void setRequestStatus(req.id, 'rejected')}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all"
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leave Requests Directory Table */}
        <div
          className="rounded-[20px] p-5"
          style={{ background: cardGrad(t), border: `1px solid ${t.stroke}` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: t.stroke }}>
            <div>
              <h3 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
                Staff Leave Ledger
              </h3>
              <p className="mt-0.5 text-xs" style={{ color: t.textLow }}>
                Complete historical record of authorized and submitted employee leaves.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex rounded-xl overflow-hidden p-0.5" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }}>
              {(['all', 'pending', 'approved', 'rejected'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="rounded-lg px-3 py-1 text-xs font-semibold capitalize transition-all"
                  style={{
                    background: activeTab === tab ? t.mint : 'transparent',
                    color: activeTab === tab ? '#042f24' : t.textLow,
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            {filteredRequests.length === 0 ? (
              <PosEmptyState
                icon={<CalendarDays className="h-8 w-8 text-teal-400" />}
                title="No Leave Records"
                description={`No leave requests match the active "${activeTab}" filter.`}
                accentColor="mint"
              />
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: t.stroke, color: t.textLow }}>
                    <th className="py-2.5 pr-3 font-semibold">Staff Member</th>
                    <th className="py-2.5 pr-3 font-semibold">Category</th>
                    <th className="py-2.5 pr-3 font-semibold">Leave Type</th>
                    <th className="py-2.5 pr-3 font-semibold">Duration / Dates</th>
                    <th className="py-2.5 pr-3 font-semibold">Status</th>
                    <th className="py-2.5 pr-3 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => {
                    const isApp = req.status === 'approved';
                    const isRej = req.status === 'rejected';
                    const isPend = req.status === 'pending';
                    return (
                      <tr
                        key={req.id}
                        className="border-b transition-colors"
                        style={{ borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                      >
                        <td className="py-3 pr-3 font-bold" style={{ color: t.textHi }}>
                          {nameForStaff(req.staff_kind, req.staff_id)}
                        </td>
                        <td className="py-3 pr-3" style={{ color: t.textLow }}>
                          {req.staff_kind === 'teacher' ? 'Academic Staff' : 'Support / Operations'}
                        </td>
                        <td className="py-3 pr-3 font-medium" style={{ color: t.mint }}>
                          {getLeaveTypeName(req.leave_type_id)}
                        </td>
                        <td className="py-3 pr-3" style={{ color: t.textHi }}>
                          {req.start_date} → {req.end_date}
                          {req.half_day_part && ` (${req.half_day_part.toUpperCase()})`}
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              background: isApp ? `${t.mint}20` : isPend ? `${t.gold}20` : 'rgba(239, 68, 68, 0.15)',
                              color: isApp ? t.mint : isPend ? t.gold : '#f87171',
                              border: `1px solid ${isApp ? t.mint : isPend ? t.gold : '#f87171'}40`,
                            }}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 pr-3" style={{ color: t.textLow }}>
                          {req.reason || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
