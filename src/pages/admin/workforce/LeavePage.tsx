import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
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
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { GovPageLoader, GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

export default function LeavePage() {
  const user = useAuthStore((s) => s.user);
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

  // New leave type form
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDays, setNewTypeDays] = useState(21);
  const [savingType, setSavingType] = useState(false);

  const selfId = useMemo(() => {
    if (meTeacher) return { kind: 'teacher' as const, id: meTeacher };
    if (meOtherStaff) return { kind: 'other_staff' as const, id: meOtherStaff };
    return null;
  }, [meTeacher, meOtherStaff]);

  useEffect(() => {
    if (!canManage && selfId) {
      setFormKind(selfId.kind);
      setFormStaffId(selfId.id);
    }
  }, [canManage, selfId]);

  const nameForStaff = useCallback(
    (kind: string, id: string) => {
      if (kind === 'teacher') {
        const t = teachers.find((x) => x.teacher_id === id);
        return t?.name || 'Academic Faculty';
      }
      const o = otherStaff.find((x) => x.id === id);
      return o?.full_name || 'Support Staff';
    },
    [teachers, otherStaff]
  );

  const getLeaveTypeName = useCallback(
    (typeId: string | null) => {
      if (!typeId) return 'General Leave';
      const lt = leaveTypes.find((x) => x.id === typeId);
      return lt?.name || 'General Leave';
    },
    [leaveTypes]
  );

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);
  const approved = useMemo(() => requests.filter((r) => r.status === 'approved'), [requests]);
  const rejected = useMemo(() => requests.filter((r) => r.status === 'rejected'), [requests]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!schoolId) {
      setErr('No school linked to account.');
      return;
    }
    const staffId = canManage ? formStaffId : selfId?.id;
    const staffKind = canManage ? formKind : selfId?.kind;
    if (!staffId || !staffKind) {
      setErr('Select who this leave request is for.');
      return;
    }
    if (!formTypeId || !formStart || !formEnd) {
      setErr('Leave policy, start date, and end date are required.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('hr_leave_requests').insert({
      school_id: schoolId,
      staff_kind: staffKind,
      staff_id: staffId,
      leave_type_id: formTypeId,
      start_date: formStart,
      end_date: formEnd,
      half_day_part: formHalf || null,
      reason: formReason.trim() || null,
      status: 'pending',
    });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setFormReason('');
    setFormStart('');
    setFormEnd('');
    setFormHalf('');
    if (canManage) setFormStaffId('');
    await queryClient.invalidateQueries({ queryKey: workforceQueryKeys.leave(user?.id ?? '') });
  };

  const addLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !newTypeName.trim()) return;
    setSavingType(true);
    const { error } = await supabase.from('hr_leave_types').insert({
      school_id: schoolId,
      name: newTypeName.trim(),
      default_days_per_year: Number(newTypeDays) || 0,
      requires_approval: true,
      paid: true,
    });
    setSavingType(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setNewTypeName('');
    setNewTypeDays(21);
    await queryClient.invalidateQueries({ queryKey: workforceQueryKeys.leave(user?.id ?? '') });
  };

  const setRequestStatus = async (id: string, status: 'approved' | 'rejected') => {
    setErr(null);
    const { error } = await supabase
      .from('hr_leave_requests')
      .update({
        status,
        decided_by: user?.id ?? null,
        decided_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) setErr(error.message);
    else await queryClient.invalidateQueries({ queryKey: workforceQueryKeys.leave(user?.id ?? '') });
  };

  const filteredRequests = useMemo(() => {
    if (activeTab === 'pending') return pending;
    if (activeTab === 'approved') return approved;
    if (activeTab === 'rejected') return rejected;
    return requests;
  }, [activeTab, requests, pending, approved, rejected]);

  if (!user) return null;
  if (leaveQuery.isError) {
    return (
      <div className="admin-terminal-page space-y-4 p-4">
        <div className="gov-card p-4 border-l-4 border-l-rose-600 bg-rose-50 text-xs font-mono text-rose-800">
          {leaveQuery.error instanceof Error ? leaveQuery.error.message : 'Failed to load leave data'}
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="admin-terminal-page space-y-4 p-4">
        <GovPageLoader message="LOADING STAFF LEAVE REGISTRY & QUOTAS..." minHeight="min-h-[40vh]" />
      </div>
    );
  }

  if (!canManage && !selfId) {
    return (
      <div className="admin-terminal-page space-y-4 p-4">
        <div className="gov-card p-6 text-xs font-mono space-y-2 border-l-4 border-l-amber-500 bg-amber-50 text-amber-900">
          <p className="font-bold uppercase">UNLINKED STAFF PROFILE NOTICE</p>
          <p>
            Your current system user account is not linked to an active faculty or support staff dossier. Contact HR administration to register or link your employee record.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-terminal-page space-y-4 p-4">
      {/* ── 1. OFFICIAL INSTITUTIONAL MASTHEAD ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            INSTITUTIONAL STAFF LEAVE &amp; PERMITS REGISTRY
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            STATUTORY TIME-OFF, CLEARANCE WORKFLOWS &amp; ANNUAL QUOTAS • REPUBLIC OF UGANDA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/admin/workforce"
            className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5 font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>WORKFORCE HUB</span>
          </Link>
          <button
            type="button"
            onClick={() => void leaveQuery.refetch()}
            className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {err && (
        <div className="gov-card p-3 border-l-4 border-l-rose-600 bg-rose-50 flex items-center justify-between text-xs font-mono text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-700 shrink-0" />
            <span>{err}</span>
          </div>
          <button type="button" onClick={() => setErr(null)} className="text-rose-700 font-bold">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── 2. MONOCHROME KPI SUMMARY STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            TOTAL REQUESTS
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {requests.length}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            CUMULATIVE SUBMISSIONS
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            PENDING REVIEW
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${
            pending.length > 0 ? 'text-amber-700' : 'text-[#111111]'
          }`}>
            {pending.length}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            AWAITING CLEARANCE
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            CLEARED LEAVE
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {approved.length}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            AUTHORIZED TIME OFF
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            DECLINED REQUESTS
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
            {rejected.length}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            DISAPPROVED DOSSIERS
          </div>
        </div>
      </div>

      {/* ── 3. OPERATIONAL ACTION GRID: REQUEST FORM + LEAVE TYPES ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Submit Request Card */}
        <div className="gov-card p-4 bg-white border border-[#CCCCCC] space-y-4">
          <div className="border-b border-[#CCCCCC] pb-2">
            <h2 className="text-xs font-mono font-bold uppercase text-[#111111]">
              SUBMIT OFFICIAL LEAVE APPLICATION
            </h2>
            <p className="text-[11px] font-mono text-[#555555] mt-0.5">
              File a statutory or medical absence request for administrative authorization.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3 font-mono text-xs">
            {canManage && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-[#555555]">
                    STAFF CATEGORY
                  </label>
                  <select
                    value={formKind}
                    onChange={(e) => {
                      setFormKind(e.target.value as 'teacher' | 'other_staff');
                      setFormStaffId('');
                    }}
                    className="gov-input w-full text-xs"
                  >
                    <option value="teacher">Academic Faculty (Tutor)</option>
                    <option value="other_staff">Administrative / Clinical Staff</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-[#555555]">
                    EMPLOYEE SELECTION
                  </label>
                  <select
                    value={formStaffId}
                    onChange={(e) => setFormStaffId(e.target.value)}
                    className="gov-input w-full text-xs"
                  >
                    <option value="">-- SELECT EMPLOYEE --</option>
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
              <div className="text-xs text-[#555555] p-2 bg-[#F9F9FB] border border-[#CCCCCC]">
                SUBMITTING ON BEHALF OF:{' '}
                <span className="font-bold text-[#111111]">{nameForStaff(selfId.kind, selfId.id)}</span>
              </div>
            )}

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-[#555555]">
                LEAVE CATEGORY POLICY
              </label>
              <select
                value={formTypeId}
                onChange={(e) => setFormTypeId(e.target.value)}
                className="gov-input w-full text-xs"
                required
              >
                <option value="">-- SELECT LEAVE POLICY --</option>
                {leaveTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.default_days_per_year} DAYS/YR)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-[#555555]">
                  COMMENCEMENT DATE
                </label>
                <input
                  type="date"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  className="gov-input w-full text-xs"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-[#555555]">
                  RESUMPTION / END DATE
                </label>
                <input
                  type="date"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  className="gov-input w-full text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-[#555555]">
                SESSION DURATION
              </label>
              <select
                value={formHalf}
                onChange={(e) => setFormHalf((e.target.value as 'am' | 'pm' | '') || '')}
                className="gov-input w-full text-xs"
              >
                <option value="">Full Working Day(s)</option>
                <option value="am">Morning Session Only (AM)</option>
                <option value="pm">Afternoon Session Only (PM)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-[#555555]">
                HANDOVER MEMO / ABSENCE REASON
              </label>
              <textarea
                placeholder="Specify duties handover notes, medical grounds, or statutory justification…"
                rows={2}
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                className="gov-input w-full text-xs"
              />
            </div>

            {(canManage || selfId) && (
              <button
                type="submit"
                disabled={saving || !leaveTypes.length || (canManage && !formStaffId)}
                className="gov-btn gov-btn-primary gov-btn-md w-full flex items-center justify-center gap-1.5 font-mono"
              >
                {saving ? <GovRollingBox size="xs" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{saving ? 'RECORDING APPLICATION…' : 'SUBMIT OFFICIAL LEAVE REQUEST'}</span>
              </button>
            )}
          </form>
        </div>

        {/* Right Column: Pending Approvals & Leave Policy Setup */}
        <div className="space-y-4">
          {canManage && (
            <div className="gov-card p-4 bg-white border border-[#CCCCCC] space-y-3">
              <div className="border-b border-[#CCCCCC] pb-2">
                <h2 className="text-xs font-mono font-bold uppercase text-[#111111]">
                  CONFIGURE INSTITUTIONAL LEAVE TYPE
                </h2>
                <p className="text-[11px] font-mono text-[#555555] mt-0.5">
                  Establish statutory allowances (Annual, Maternity, Sick, Study).
                </p>
              </div>

              <form onSubmit={addLeaveType} className="flex flex-wrap items-end gap-2 font-mono text-xs">
                <div className="flex-1 min-w-[160px]">
                  <label className="mb-1 block text-[10px] uppercase text-[#555555]">LEAVE TITLE</label>
                  <input
                    className="gov-input w-full text-xs"
                    placeholder="e.g. Compassionate Leave"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    required
                  />
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-[10px] uppercase text-[#555555]">DAYS / YR</label>
                  <input
                    type="number"
                    className="gov-input w-full text-xs"
                    value={newTypeDays}
                    onChange={(e) => setNewTypeDays(Number(e.target.value))}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingType || !newTypeName.trim()}
                  className="gov-btn gov-btn-secondary gov-btn-sm font-mono h-[34px]"
                >
                  {savingType ? <GovRollingBox size="xs" /> : <span>ADD POLICY</span>}
                </button>
              </form>
            </div>
          )}

          {canManage && (
            <div className="gov-card p-4 bg-white border border-[#CCCCCC] space-y-3">
              <div className="flex items-center justify-between border-b border-[#CCCCCC] pb-2">
                <h2 className="text-xs font-mono font-bold uppercase text-[#111111]">
                  PENDING CLEARANCE QUEUE ({pending.length})
                </h2>
                <span className="text-[10px] font-mono text-[#777777]">
                  ADMINISTRATIVE ACTION REQUIRED
                </span>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 font-mono text-xs">
                {pending.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#777777]">
                    NO PENDING LEAVE REQUESTS AWAITING CLEARANCE.
                  </div>
                ) : (
                  pending.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 border border-[#CCCCCC] bg-[#F9F9FB] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-[#111111]">
                          {nameForStaff(req.staff_kind, req.staff_id)}
                        </div>
                        <div className="text-[11px] text-[#555555] font-semibold mt-0.5">
                          {getLeaveTypeName(req.leave_type_id)}
                        </div>
                        <div className="text-[10px] text-[#777777] mt-0.5">
                          {req.start_date} → {req.end_date} {req.reason ? `· "${req.reason}"` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void setRequestStatus(req.id, 'approved')}
                          className="gov-btn gov-btn-primary gov-btn-xs font-mono"
                          title="Authorize leave request"
                        >
                          <Check className="w-3 h-3" />
                          <span>APPROVE</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void setRequestStatus(req.id, 'rejected')}
                          className="gov-btn gov-btn-secondary gov-btn-xs text-rose-700 font-mono hover:bg-rose-50 hover:border-rose-300"
                          title="Decline leave request"
                        >
                          <X className="w-3 h-3" />
                          <span>REJECT</span>
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

      {/* ── 4. STAFF LEAVE LEDGER TABLE ── */}
      <div className="gov-card p-4 bg-white border border-[#CCCCCC] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#CCCCCC] pb-3">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase text-[#111111]">
              OFFICIAL STAFF LEAVE LEDGER
            </h3>
            <p className="text-[11px] font-mono text-[#555555] mt-0.5">
              Comprehensive institutional record of all employee leave applications.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center border border-[#CCCCCC]">
            {(['all', 'pending', 'approved', 'rejected'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-colors ${
                  activeTab === tab
                    ? 'bg-[#111111] text-white'
                    : 'bg-white text-[#555555] hover:bg-[#F9F9FB]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="gov-table-container border border-[#CCCCCC] bg-white">
          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-[#777777]">
              NO LEAVE RECORDS MATCH THE ACTIVE "{activeTab.toUpperCase()}" FILTER.
            </div>
          ) : (
            <table className="gov-table w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EAEAEA] border-b border-[#CCCCCC]">
                  <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">EMPLOYEE</th>
                  <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">CATEGORY</th>
                  <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">LEAVE POLICY</th>
                  <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">DURATION / DATES</th>
                  <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111] text-center">STATUS</th>
                  <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">REASON / NOTES</th>
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
                      className="border-b border-[#E5E7EB] hover:bg-[#F9F9FB] transition-colors"
                    >
                      <td className="py-2.5 px-3 text-xs font-mono font-bold text-[#111111]">
                        {nameForStaff(req.staff_kind, req.staff_id)}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono text-[#555555]">
                        {req.staff_kind === 'teacher' ? 'Academic Faculty' : 'Support / Operations'}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono text-[#111111] font-semibold">
                        {getLeaveTypeName(req.leave_type_id)}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono text-[#111111]">
                        {req.start_date} → {req.end_date}
                        {req.half_day_part && ` (${req.half_day_part.toUpperCase()})`}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${
                            isApp
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isPend
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          {req.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono text-[#555555]">
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
  );
}
