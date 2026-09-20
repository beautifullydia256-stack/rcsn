import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import { fetchPayrollPageData, fetchPayrollPayslips, type PayslipRow } from '@/pages/admin/workforce/workforceApi';
import { workforceQueryKeys } from '@/pages/admin/workforce/workforceQueryKeys';
import {
  CreditCard,
  DollarSign,
  Calendar,
  Users,
  CheckCircle2,
  Printer,
  Plus,
  Clock,
  AlertCircle,
  X,
  FileText,
  Building2,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

export default function PayrollPage() {
  const canPay = usePermission(PERMISSION_KEYS.hrPayroll);
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const queryClient = useQueryClient();

  const payrollQ = useQuery({
    queryKey: workforceQueryKeys.payroll(user?.id ?? ''),
    queryFn: () => fetchPayrollPageData(user!.id),
    enabled: !!user?.id,
  });

  const schoolId = payrollQ.data?.schoolId ?? null;
  const periods = payrollQ.data?.periods ?? [];
  const tList = payrollQ.data?.tList ?? [];
  const oList = payrollQ.data?.oList ?? [];
  const loading = payrollQ.isPending;

  const [selPeriod, setSelPeriod] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New period form state
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
  const [newLabel, setNewLabel] = useState(
    new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  );
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [savingPeriod, setSavingPeriod] = useState(false);

  // New payslip form state
  const [showNewPayslipModal, setShowNewPayslipModal] = useState(false);
  const [pKind, setPKind] = useState<'teacher' | 'other_staff'>('teacher');
  const [pStaff, setPStaff] = useState('');
  const [gross, setGross] = useState('');
  const [net, setNet] = useState('');
  const [pNotes, setPNotes] = useState('');
  const [savingPayslip, setSavingPayslip] = useState(false);

  // Filter
  const [kindFilter, setKindFilter] = useState<'all' | 'teacher' | 'other_staff'>('all');

  // Selected voucher for print preview
  const [selectedVoucher, setSelectedVoucher] = useState<PayslipRow | null>(null);

  // Auto-select first period if available
  React.useEffect(() => {
    if (periods.length > 0 && !selPeriod) {
      setSelPeriod(periods[0].id);
    }
  }, [periods, selPeriod]);

  const activePeriodObj = useMemo(
    () => periods.find((p) => p.id === selPeriod) || periods[0] || null,
    [periods, selPeriod]
  );

  const payslipsQ = useQuery({
    queryKey: workforceQueryKeys.payrollPayslips(activePeriodObj?.id ?? ''),
    queryFn: () => fetchPayrollPayslips(activePeriodObj!.id),
    enabled: !!activePeriodObj?.id,
  });

  const payslips = useMemo(() => payslipsQ.data ?? [], [payslipsQ.data]);

  const filteredPayslips = useMemo(() => {
    if (kindFilter === 'all') return payslips;
    return payslips.filter((p) => p.staff_kind === kindFilter);
  }, [payslips, kindFilter]);

  const staffName = useCallback(
    (row: PayslipRow) => {
      if (row.staff_kind === 'teacher') {
        return tList.find((t) => t.teacher_id === row.staff_id)?.name || 'Teaching Staff';
      }
      return oList.find((o) => o.id === row.staff_id)?.full_name || 'Support Staff';
    },
    [tList, oList]
  );

  // Financial aggregates
  const totals = useMemo(() => {
    const totalGross = payslips.reduce((acc, p) => acc + (Number(p.gross) || 0), 0);
    const totalNet = payslips.reduce((acc, p) => acc + (Number(p.net) || 0), 0);
    const totalDeductions = totalGross - totalNet;
    const staffCount = payslips.length;
    return {
      totalGross,
      totalNet,
      totalDeductions,
      staffCount,
    };
  }, [payslips]);

  const createPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !newLabel || !newStart || !newEnd || !user?.id) return;
    setErr(null);
    setSavingPeriod(true);
    const { error } = await supabase.from('hr_payroll_periods').insert({
      school_id: schoolId,
      label: newLabel.trim(),
      period_start: newStart,
      period_end: newEnd,
      status: 'draft',
    });
    setSavingPeriod(false);
    if (error) {
      setErr(error.message);
    } else {
      setSuccessMsg(`Payroll run "${newLabel}" created successfully.`);
      setShowNewPeriodModal(false);
      setNewLabel(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
      setNewStart('');
      setNewEnd('');
      void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.payroll(user.id) });
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const addPayslip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !activePeriodObj?.id || !pStaff) return;
    const g = parseFloat(gross) || 0;
    const n = parseFloat(net) || 0;
    setErr(null);
    setSavingPayslip(true);
    const { error } = await supabase.from('hr_payslips').insert({
      school_id: schoolId,
      payroll_period_id: activePeriodObj.id,
      staff_kind: pKind,
      staff_id: pStaff,
      gross: g,
      net: n,
      allowances: [] as const,
      deductions: [] as const,
      currency: 'UGX',
      notes: pNotes.trim() || null,
    });
    setSavingPayslip(false);
    if (error) {
      setErr(error.message);
    } else {
      setSuccessMsg('Staff payslip line saved successfully.');
      setShowNewPayslipModal(false);
      setPStaff('');
      setGross('');
      setNet('');
      setPNotes('');
      void queryClient.invalidateQueries({
        queryKey: workforceQueryKeys.payrollPayslips(activePeriodObj.id),
      });
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const updatePeriodStatus = async (newStatus: string) => {
    if (!schoolId || !activePeriodObj?.id || !user?.id) return;
    const { error } = await supabase
      .from('hr_payroll_periods')
      .update({ status: newStatus })
      .eq('id', activePeriodObj.id);
    if (error) {
      setErr(error.message);
    } else {
      setSuccessMsg(`Period status updated to ${newStatus}.`);
      void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.payroll(user.id) });
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  if (!user) return null;

  if (payrollQ.isError) {
    return (
      <AdminPageWrapper title="Payroll & Disbursements" subtitle="Pay runs, employee earnings, and vouchers">
        <div className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{payrollQ.error instanceof Error ? payrollQ.error.message : 'Failed to load payroll data'}</span>
          </div>
        </div>
      </AdminPageWrapper>
    );
  }

  if (loading) {
    return (
      <AdminPageWrapper title="Payroll & Disbursements" subtitle="Loading pay runs…">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      </AdminPageWrapper>
    );
  }

  if (!canPay) {
    return (
      <AdminPageWrapper title="Payroll & Disbursements" subtitle="Pay runs, employee earnings, and vouchers">
        <div className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-200">
          Workforce &amp; HR (or Payroll) permission required to view and disburse payroll.
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      title="Payroll & Disbursements"
      subtitle="Manage pay periods, compute gross-to-net earnings in UGX, and issue disbursement vouchers."
    >
      <div className="w-full space-y-6">
        {/* Toast / Notifications */}
        {err && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{err}</span>
            </div>
            <button type="button" onClick={() => setErr(null)} className="text-red-400 hover:text-red-200">
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

        {/* 4-Card KPI Strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'blue'),
              border: `1px solid ${t.border}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Total Gross Pay
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-100 truncate" style={{ fontFamily: SORA }}>
              UGX {totals.totalGross.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-blue-400/90 font-medium">
              Gross payroll obligation
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'emerald'),
              border: `1px solid ${t.border}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Net Disbursement
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-100 truncate" style={{ fontFamily: SORA }}>
              UGX {totals.totalNet.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-emerald-400/90 font-medium">
              Total payable to staff
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'amber'),
              border: `1px solid ${t.border}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Deductions
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-100 truncate" style={{ fontFamily: SORA }}>
              UGX {totals.totalDeductions.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-amber-400/90 font-medium">
              Tax, NSSF &amp; withholdings
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'purple'),
              border: `1px solid ${t.border}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Staff on Payroll
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {totals.staffCount}
            </p>
            <p className="mt-1 text-xs text-purple-400/90 font-medium">
              Payslips registered
            </p>
          </div>
        </div>

        {/* Pay Period Selector & Action Toolbar */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"
          style={{
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-100" style={{ fontFamily: SORA }}>
                  Pay Period: {activePeriodObj?.label || 'None Selected'}
                </h2>
                {activePeriodObj && (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      activePeriodObj.status === 'approved' || activePeriodObj.status === 'disbursed'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {activePeriodObj.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {activePeriodObj
                  ? `${activePeriodObj.period_start} to ${activePeriodObj.period_end}`
                  : 'Select or create a pay period'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {periods.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Period:</span>
                <select
                  value={selPeriod}
                  onChange={(e) => setSelPeriod(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: t.surfaceSubtle,
                    borderColor: t.border,
                    color: t.textPrimary,
                  }}
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activePeriodObj && activePeriodObj.status === 'draft' && (
              <button
                type="button"
                onClick={() => updatePeriodStatus('approved')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/25"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve Run
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowNewPeriodModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/15 px-3.5 py-2 text-xs font-semibold text-teal-300 transition-all hover:bg-teal-500/25"
            >
              <Plus className="h-3.5 w-3.5" />
              New Pay Period
            </button>

            <button
              type="button"
              onClick={() => setShowNewPayslipModal(true)}
              disabled={!activePeriodObj}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Add Payslip Line
            </button>
          </div>
        </div>

        {/* Payslips Register Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
          }}
        >
          {/* Table Toolbar / Role Filter */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b p-4"
            style={{ borderColor: t.border }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200" style={{ fontFamily: SORA }}>
                Payslips Register
              </span>
              <span className="text-xs text-slate-400">({filteredPayslips.length} staff records)</span>
            </div>

            <div
              className="inline-flex rounded-xl p-1"
              style={{ backgroundColor: t.surfaceSubtle }}
            >
              {(['all', 'teacher', 'other_staff'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setKindFilter(tab)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-all ${
                    kindFilter === tab
                      ? 'bg-teal-500/20 text-teal-300 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'all' ? 'All Staff' : tab === 'teacher' ? 'Teaching' : 'Support'}
                </button>
              ))}
            </div>
          </div>

          {/* Table Contents */}
          {payslipsQ.isPending ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            </div>
          ) : filteredPayslips.length === 0 ? (
            <div className="p-8">
              <PosEmptyState
                icon={<CreditCard className="w-8 h-8 text-teal-400" />}
                title="No Payslips Recorded"
                description={
                  activePeriodObj
                    ? `No payslips generated for ${activePeriodObj.label}. Add staff pay lines to disburse salaries.`
                    : 'Create or select a pay period above to manage payslips.'
                }
                accentColor="mint"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-200">
                <thead
                  className="border-b text-xs font-semibold uppercase tracking-wider text-slate-400"
                  style={{
                    backgroundColor: t.surfaceSubtle,
                    borderColor: t.border,
                  }}
                >
                  <tr>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Gross Pay</th>
                    <th className="px-4 py-3 text-right">Deductions</th>
                    <th className="px-4 py-3 text-right">Net Payable</th>
                    <th className="px-4 py-3 text-center">Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: t.border }}>
                  {filteredPayslips.map((p) => {
                    const name = staffName(p);
                    const isTeacher = p.staff_kind === 'teacher';
                    const grossNum = Number(p.gross) || 0;
                    const netNum = Number(p.net) || 0;
                    const dedNum = grossNum - netNum;

                    return (
                      <tr
                        key={p.id}
                        className="transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-xs font-bold text-teal-400">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-100">{name}</p>
                              <p className="text-xs text-slate-400 font-mono">ID: {p.staff_id?.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${
                              isTeacher
                                ? 'bg-blue-500/15 text-blue-300'
                                : 'bg-purple-500/15 text-purple-300'
                            }`}
                          >
                            {isTeacher ? 'Teaching Staff' : 'Support Staff'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right font-medium text-slate-200">
                          {grossNum.toLocaleString()} {p.currency}
                        </td>

                        <td className="px-4 py-3.5 text-right font-medium text-amber-400/90">
                          {dedNum > 0 ? `-${dedNum.toLocaleString()} ${p.currency}` : '0 UGX'}
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold text-emerald-400">
                          {netNum.toLocaleString()} {p.currency}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedVoucher(p)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                          >
                            <Printer className="h-3.5 w-3.5 text-teal-400" />
                            Voucher
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Voucher Preview Modal */}
        {selectedVoucher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm print:p-0">
            <div
              className="w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4"
              style={{
                backgroundColor: t.surface,
                border: `1px solid ${t.border}`,
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: t.border }}>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100" style={{ fontFamily: SORA }}>
                      Staff Payment Voucher
                    </h3>
                    <p className="text-xs text-slate-400">{activePeriodObj?.label}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVoucher(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-white/10 py-2">
                  <span className="text-slate-400">Employee Name:</span>
                  <span className="font-semibold text-slate-100">{staffName(selectedVoucher)}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 py-2">
                  <span className="text-slate-400">Category:</span>
                  <span className="capitalize text-slate-200">{selectedVoucher.staff_kind.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 py-2">
                  <span className="text-slate-400">Gross Earnings:</span>
                  <span className="font-semibold text-slate-100">
                    UGX {Number(selectedVoucher.gross).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 py-2">
                  <span className="text-slate-400">Total Deductions:</span>
                  <span className="text-amber-400">
                    UGX {(Number(selectedVoucher.gross) - Number(selectedVoucher.net)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between rounded-xl bg-emerald-500/10 p-3">
                  <span className="font-semibold text-emerald-300">Net Disbursable:</span>
                  <span className="text-base font-bold text-emerald-400" style={{ fontFamily: SORA }}>
                    UGX {Number(selectedVoucher.net).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Voucher
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVoucher(null)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: New Pay Period */}
        {showNewPeriodModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div
              className="w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
              style={{
                backgroundColor: t.surface,
                border: `1px solid ${t.border}`,
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: t.border }}>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-100" style={{ fontFamily: SORA }}>
                    New Payroll Period
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewPeriodModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={createPeriod} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-300">Period Label</label>
                  <input
                    type="text"
                    required
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. October 2026"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                    style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Period Start</label>
                    <input
                      type="date"
                      required
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                      style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Period End</label>
                    <input
                      type="date"
                      required
                      value={newEnd}
                      onChange={(e) => setNewEnd(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                      style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewPeriodModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPeriod}
                    className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
                  >
                    {savingPeriod ? 'Creating…' : 'Create Period'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Payslip Line */}
        {showNewPayslipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div
              className="w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
              style={{
                backgroundColor: t.surface,
                border: `1px solid ${t.border}`,
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: t.border }}>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-100" style={{ fontFamily: SORA }}>
                    Add Payslip Record
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewPayslipModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={addPayslip} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-300">Staff Category</label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPKind('teacher');
                        setPStaff('');
                      }}
                      className={`rounded-xl border py-2 text-xs font-medium transition-all ${
                        pKind === 'teacher'
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      Teaching Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPKind('other_staff');
                        setPStaff('');
                      }}
                      className={`rounded-xl border py-2 text-xs font-medium transition-all ${
                        pKind === 'other_staff'
                          ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      Support Staff
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Staff Member</label>
                  <select
                    required
                    value={pStaff}
                    onChange={(e) => setPStaff(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                    style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                  >
                    <option value="">Choose a staff member…</option>
                    {pKind === 'teacher'
                      ? tList.map((t) => (
                          <option key={t.teacher_id} value={t.teacher_id}>
                            {t.name}
                          </option>
                        ))
                      : oList.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.full_name}
                          </option>
                        ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Gross Pay (UGX)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 1500000"
                      value={gross}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGross(val);
                        if (!net) setNet(val);
                      }}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                      style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Net Pay (UGX)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 1350000"
                      value={net}
                      onChange={(e) => setNet(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                      style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Remarks / Breakdown Notes</label>
                  <input
                    type="text"
                    value={pNotes}
                    onChange={(e) => setPNotes(e.target.value)}
                    placeholder="e.g. Base salary + transport allowance"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                    style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewPayslipModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPayslip}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {savingPayslip ? 'Saving…' : 'Record Payslip'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
