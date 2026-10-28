import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import NativeModal from '@/components/NativeModal';
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
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { GovPageLoader, GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

export default function PayrollPage() {
  const canPay = usePermission(PERMISSION_KEYS.hrPayroll);
  const user = useAuthStore((s) => s.user);
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
  const [kindFilter, setKindFilter] = useState<'all' | 'teacher' | 'other_staff'>('all');
  const [selectedVoucher, setSelectedVoucher] = useState<PayslipRow | null>(null);

  // Modals
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);
  const [newPeriodLabel, setNewPeriodLabel] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState('');
  const [newPeriodEnd, setNewPeriodEnd] = useState('');
  const [creatingPeriod, setCreatingPeriod] = useState(false);

  const [showNewPayslipModal, setShowNewPayslipModal] = useState(false);
  const [newSlipKind, setNewSlipKind] = useState<'teacher' | 'other_staff'>('teacher');
  const [newSlipStaffId, setNewSlipStaffId] = useState('');
  const [newSlipGross, setNewSlipGross] = useState('');
  const [newSlipNet, setNewSlipNet] = useState('');
  const [creatingSlip, setCreatingSlip] = useState(false);

  // Default active period
  React.useEffect(() => {
    if (!selPeriod && periods.length > 0) {
      setSelPeriod(periods[0].id);
    }
  }, [periods, selPeriod]);

  const activePeriodObj = useMemo(() => {
    return periods.find((p) => p.id === selPeriod) || null;
  }, [periods, selPeriod]);

  // Fetch payslips for selected period
  const payslipsQ = useQuery({
    queryKey: workforceQueryKeys.payrollPayslips(selPeriod),
    queryFn: () => fetchPayrollPayslips(selPeriod),
    enabled: !!selPeriod,
  });

  const payslips = payslipsQ.data ?? [];

  const staffName = useCallback(
    (row: PayslipRow) => {
      if (row.staff_kind === 'teacher') {
        const t = tList.find((x) => x.teacher_id === row.staff_id);
        return t?.name || 'Academic Faculty';
      }
      const o = oList.find((x) => x.id === row.staff_id);
      return o?.full_name || 'Support Staff';
    },
    [tList, oList]
  );

  const filteredPayslips = useMemo(() => {
    if (kindFilter === 'all') return payslips;
    return payslips.filter((p) => p.staff_kind === kindFilter);
  }, [payslips, kindFilter]);

  // Summary statistics
  const totals = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    for (const p of payslips) {
      totalGross += Number(p.gross) || 0;
      totalNet += Number(p.net) || 0;
    }
    return {
      totalGross,
      totalNet,
      totalDeductions: totalGross - totalNet,
      staffCount: payslips.length,
    };
  }, [payslips]);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !newPeriodLabel || !newPeriodStart || !newPeriodEnd) return;
    setCreatingPeriod(true);
    const { data, error } = await supabase
      .from('hr_payroll_periods')
      .insert({
        school_id: schoolId,
        label: newPeriodLabel.trim(),
        period_start: newPeriodStart,
        period_end: newPeriodEnd,
        status: 'draft',
      })
      .select('id')
      .single();

    setCreatingPeriod(false);
    if (!error && data) {
      setShowNewPeriodModal(false);
      setNewPeriodLabel('');
      setNewPeriodStart('');
      setNewPeriodEnd('');
      await queryClient.invalidateQueries({ queryKey: workforceQueryKeys.payroll(user?.id ?? '') });
      setSelPeriod(data.id);
    } else if (error) {
      alert(error.message);
    }
  };

  const handleCreatePayslip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !selPeriod || !newSlipStaffId || !newSlipGross || !newSlipNet) return;
    setCreatingSlip(true);
    const { error } = await supabase.from('hr_payslips').insert({
      school_id: schoolId,
      payroll_period_id: selPeriod,
      staff_kind: newSlipKind,
      staff_id: newSlipStaffId,
      gross: Number(newSlipGross),
      net: Number(newSlipNet),
      currency: 'UGX',
      status: 'approved',
    });
    setCreatingSlip(false);
    if (!error) {
      setShowNewPayslipModal(false);
      setNewSlipStaffId('');
      setNewSlipGross('');
      setNewSlipNet('');
      await queryClient.invalidateQueries({ queryKey: workforceQueryKeys.payrollPayslips(selPeriod) });
    } else {
      alert(error.message);
    }
  };

  const updatePeriodStatus = async (status: string) => {
    if (!selPeriod) return;
    const { error } = await supabase
      .from('hr_payroll_periods')
      .update({ status })
      .eq('id', selPeriod);
    if (!error) {
      await queryClient.invalidateQueries({ queryKey: workforceQueryKeys.payroll(user?.id ?? '') });
    } else {
      alert(error.message);
    }
  };

  if (!canPay) {
    return (
      <div className="admin-terminal-page space-y-4 p-4">
        <div className="gov-card p-6 border-l-4 border-l-rose-600 bg-rose-50 text-xs font-mono text-rose-800">
          ACCESS RESTRICTED: Institutional payroll authorization privileges are required to inspect or disburse staff payroll registers.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-terminal-page space-y-4 p-4">
        <GovPageLoader message="COMPILING INSTITUTIONAL PAYROLL PERIODS & DISBURSEMENT LEDGER..." minHeight="min-h-[40vh]" />
      </div>
    );
  }

  return (
    <div className="admin-terminal-page space-y-4 p-4">
      {/* ── 1. OFFICIAL INSTITUTIONAL MASTHEAD ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            INSTITUTIONAL STAFF PAYROLL &amp; DISBURSEMENTS DESK
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            OFFICIAL SALARY COMPUTATION, STATUTORY WITHHOLDINGS &amp; PAYSLIPS • REPUBLIC OF UGANDA
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
            onClick={() => {
              void payrollQ.refetch();
              if (selPeriod) void payslipsQ.refetch();
            }}
            className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 2. MONOCHROME KPI SUMMARY STRIP ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            TOTAL GROSS OBLIGATION
          </div>
          <div className="text-xl font-bold font-mono text-[#111111] mt-1 truncate">
            UGX {totals.totalGross.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            GROSS PAYROLL BUDGET
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            NET DISBURSEMENT
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1 truncate">
            UGX {totals.totalNet.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            PAYABLE TO EMPLOYEE ACCOUNTS
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            STATUTORY DEDUCTIONS
          </div>
          <div className="text-xl font-bold font-mono text-amber-700 mt-1 truncate">
            UGX {totals.totalDeductions.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            PAYE, NSSF &amp; WITHHOLDINGS
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            STAFF ON RUN
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {totals.staffCount}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            VOUCHERS REGISTERED
          </div>
        </div>
      </div>

      {/* ── 3. PAY PERIOD SELECTOR & CONTROL BAR ── */}
      <div className="gov-control-bar flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#CCCCCC]">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-[#777777]" />
          <div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs uppercase text-[#555555]">ACTIVE PERIOD:</span>
              <span className="text-xs font-bold text-[#111111] uppercase bg-[#F1F3F5] px-2 py-0.5 border border-[#CCCCCC]">
                {activePeriodObj?.label || 'NONE SELECTED'}
              </span>
              {activePeriodObj && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 border uppercase ${
                    activePeriodObj.status === 'approved' || activePeriodObj.status === 'disbursed'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-amber-50 text-amber-900 border-amber-300'
                  }`}
                >
                  {activePeriodObj.status}
                </span>
              )}
            </div>
            <p className="text-[10px] font-mono text-[#777777] mt-0.5">
              {activePeriodObj
                ? `${activePeriodObj.period_start} TO ${activePeriodObj.period_end}`
                : 'SELECT OR CONFIGURE A PAYROLL PERIOD'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {periods.length > 0 && (
            <select
              value={selPeriod}
              onChange={(e) => setSelPeriod(e.target.value)}
              className="gov-input text-xs font-mono"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.status.toUpperCase()})
                </option>
              ))}
            </select>
          )}

          {activePeriodObj && activePeriodObj.status === 'draft' && (
            <button
              type="button"
              onClick={() => updatePeriodStatus('approved')}
              className="gov-btn gov-btn-secondary gov-btn-sm font-mono flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>APPROVE RUN</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowNewPeriodModal(true)}
            className="gov-btn gov-btn-secondary gov-btn-sm font-mono flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>NEW PERIOD</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewPayslipModal(true)}
            disabled={!activePeriodObj}
            className="gov-btn gov-btn-primary gov-btn-sm font-mono flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>ADD PAYSLIP LINE</span>
          </button>
        </div>
      </div>

      {/* ── 4. PAYSLIPS REGISTER TABLE ── */}
      <div className="gov-card p-4 bg-white border border-[#CCCCCC] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#CCCCCC] pb-3">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase text-[#111111]">
              INSTITUTIONAL PAYROLL REGISTER
            </h3>
            <p className="text-[11px] font-mono text-[#555555] mt-0.5">
              Verified payslip lines for {activePeriodObj?.label || 'selected period'}.
            </p>
          </div>

          <div className="flex items-center border border-[#CCCCCC]">
            {(['all', 'teacher', 'other_staff'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setKindFilter(tab)}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-colors ${
                  kindFilter === tab
                    ? 'bg-[#111111] text-white'
                    : 'bg-white text-[#555555] hover:bg-[#F9F9FB]'
                }`}
              >
                {tab === 'all' ? 'ALL STAFF' : tab === 'teacher' ? 'ACADEMIC' : 'SUPPORT'}
              </button>
            ))}
          </div>
        </div>

        <div className="gov-table-container border border-[#CCCCCC] bg-white">
          {payslipsQ.isPending ? (
            <div className="p-12 text-center">
              <GovRollingBox size="sm" />
            </div>
          ) : filteredPayslips.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-[#777777]">
              {activePeriodObj
                ? `NO PAYSLIP LINES RECORDED FOR ${activePeriodObj.label.toUpperCase()}.`
                : 'CREATE OR SELECT A PAY PERIOD ABOVE.'}
            </div>
          ) : (
            <table className="gov-table w-full text-left border-collapse font-mono">
              <thead>
                <tr className="bg-[#EAEAEA] border-b border-[#CCCCCC]">
                  <th className="py-2.5 px-3 text-[11px] uppercase font-bold text-[#111111]">STAFF MEMBER</th>
                  <th className="py-2.5 px-3 text-[11px] uppercase font-bold text-[#111111]">CATEGORY</th>
                  <th className="py-2.5 px-3 text-[11px] uppercase font-bold text-[#111111] text-right">GROSS PAY</th>
                  <th className="py-2.5 px-3 text-[11px] uppercase font-bold text-[#111111] text-right">DEDUCTIONS</th>
                  <th className="py-2.5 px-3 text-[11px] uppercase font-bold text-[#111111] text-right">NET PAYABLE</th>
                  <th className="py-2.5 px-3 text-[11px] uppercase font-bold text-[#111111] text-center">OFFICIAL VOUCHER</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayslips.map((p) => {
                  const name = staffName(p);
                  const isTeacher = p.staff_kind === 'teacher';
                  const grossNum = Number(p.gross) || 0;
                  const netNum = Number(p.net) || 0;
                  const dedNum = grossNum - netNum;

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[#E5E7EB] hover:bg-[#F9F9FB] transition-colors"
                    >
                      <td className="py-2.5 px-3 text-xs font-bold text-[#111111]">
                        <div>{name}</div>
                        <div className="text-[10px] text-[#777777]">ID: {p.staff_id?.slice(0, 8)}</div>
                      </td>

                      <td className="py-2.5 px-3 text-xs">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 border uppercase ${
                          isTeacher
                            ? 'bg-[#F1F3F5] text-[#111111] border-[#CCCCCC]'
                            : 'bg-white text-[#555555] border-[#CCCCCC]'
                        }`}>
                          {isTeacher ? 'Academic Faculty' : 'Support Staff'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-xs text-right font-medium text-[#111111]">
                        {grossNum.toLocaleString()} {p.currency}
                      </td>

                      <td className="py-2.5 px-3 text-xs text-right font-medium text-amber-700">
                        {dedNum > 0 ? `-${dedNum.toLocaleString()} ${p.currency}` : '0 UGX'}
                      </td>

                      <td className="py-2.5 px-3 text-xs text-right font-bold text-emerald-700">
                        {netNum.toLocaleString()} {p.currency}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedVoucher(p)}
                          className="gov-btn gov-btn-secondary gov-btn-xs font-mono inline-flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3 text-[#111111]" />
                          <span>VOUCHER</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── 5. MODALS ── */}
      {/* Voucher Preview Modal */}
      {selectedVoucher && (
        <NativeModal
          isOpen={!!selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
          title="OFFICIAL SALARY PAYMENT VOUCHER"
          subtitle={activePeriodObj?.label}
          size="md"
        >
          <div className="space-y-4 font-mono text-xs text-[#111111]">
            <div className="gov-card p-3 bg-[#F9F9FB] border border-[#CCCCCC] space-y-2">
              <div className="flex justify-between border-b border-[#CCCCCC] pb-1.5">
                <span className="text-[#555555]">EMPLOYEE:</span>
                <span className="font-bold">{staffName(selectedVoucher)}</span>
              </div>
              <div className="flex justify-between border-b border-[#CCCCCC] pb-1.5">
                <span className="text-[#555555]">CATEGORY:</span>
                <span className="capitalize">{selectedVoucher.staff_kind.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between border-b border-[#CCCCCC] pb-1.5">
                <span className="text-[#555555]">GROSS SALARY:</span>
                <span className="font-bold">
                  UGX {Number(selectedVoucher.gross).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#CCCCCC] pb-1.5">
                <span className="text-[#555555]">DEDUCTIONS (NSSF/PAYE):</span>
                <span className="text-amber-700 font-bold">
                  UGX {(Number(selectedVoucher.gross) - Number(selectedVoucher.net)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-emerald-50 border border-emerald-300 font-bold text-emerald-900 mt-2">
                <span>NET DISBURSABLE:</span>
                <span className="text-sm">
                  UGX {Number(selectedVoucher.net).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#CCCCCC]">
              <button
                type="button"
                onClick={() => setSelectedVoucher(null)}
                className="gov-btn gov-btn-secondary gov-btn-sm"
              >
                CLOSE
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PRINT VOUCHER</span>
              </button>
            </div>
          </div>
        </NativeModal>
      )}

      {/* New Period Modal */}
      {showNewPeriodModal && (
        <NativeModal
          isOpen={showNewPeriodModal}
          onClose={() => setShowNewPeriodModal(false)}
          title="CONFIGURE NEW PAYROLL CYCLE"
          size="md"
        >
          <form onSubmit={handleCreatePeriod} className="space-y-3 font-mono text-xs">
            <div>
              <label className="mb-1 block font-bold uppercase text-[#555555]">PERIOD TITLE / LABEL</label>
              <input
                className="gov-input w-full text-xs"
                placeholder="e.g. October 2026 Payroll Run"
                value={newPeriodLabel}
                onChange={(e) => setNewPeriodLabel(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-bold uppercase text-[#555555]">START DATE</label>
                <input
                  type="date"
                  className="gov-input w-full text-xs"
                  value={newPeriodStart}
                  onChange={(e) => setNewPeriodStart(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block font-bold uppercase text-[#555555]">END DATE</label>
                <input
                  type="date"
                  className="gov-input w-full text-xs"
                  value={newPeriodEnd}
                  onChange={(e) => setNewPeriodEnd(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#CCCCCC]">
              <button
                type="button"
                onClick={() => setShowNewPeriodModal(false)}
                className="gov-btn gov-btn-secondary gov-btn-sm"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={creatingPeriod}
                className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
              >
                {creatingPeriod ? <GovRollingBox size="xs" /> : <Plus className="w-3.5 h-3.5" />}
                <span>ESTABLISH PERIOD</span>
              </button>
            </div>
          </form>
        </NativeModal>
      )}

      {/* New Payslip Modal */}
      {showNewPayslipModal && (
        <NativeModal
          isOpen={showNewPayslipModal}
          onClose={() => setShowNewPayslipModal(false)}
          title="RECORD STAFF PAYSLIP LINE"
          size="md"
        >
          <form onSubmit={handleCreatePayslip} className="space-y-3 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-bold uppercase text-[#555555]">STAFF CATEGORY</label>
                <select
                  value={newSlipKind}
                  onChange={(e) => {
                    setNewSlipKind(e.target.value as 'teacher' | 'other_staff');
                    setNewSlipStaffId('');
                  }}
                  className="gov-input w-full text-xs"
                >
                  <option value="teacher">Academic Faculty</option>
                  <option value="other_staff">Support Staff</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-bold uppercase text-[#555555]">EMPLOYEE</label>
                <select
                  value={newSlipStaffId}
                  onChange={(e) => setNewSlipStaffId(e.target.value)}
                  className="gov-input w-full text-xs"
                  required
                >
                  <option value="">-- SELECT EMPLOYEE --</option>
                  {newSlipKind === 'teacher'
                    ? tList.map((t) => (
                        <option key={t.teacher_id} value={t.teacher_id}>
                          {t.name || 'Unnamed Teacher'}
                        </option>
                      ))
                    : oList.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.full_name || 'Unnamed Staff'}
                        </option>
                      ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-bold uppercase text-[#555555]">GROSS SALARY (UGX)</label>
                <input
                  type="number"
                  className="gov-input w-full text-xs"
                  placeholder="e.g. 1500000"
                  value={newSlipGross}
                  onChange={(e) => setNewSlipGross(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block font-bold uppercase text-[#555555]">NET PAYABLE (UGX)</label>
                <input
                  type="number"
                  className="gov-input w-full text-xs"
                  placeholder="e.g. 1350000"
                  value={newSlipNet}
                  onChange={(e) => setNewSlipNet(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#CCCCCC]">
              <button
                type="button"
                onClick={() => setShowNewPayslipModal(false)}
                className="gov-btn gov-btn-secondary gov-btn-sm"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={creatingSlip}
                className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
              >
                {creatingSlip ? <GovRollingBox size="xs" /> : <Plus className="w-3.5 h-3.5" />}
                <span>REGISTER PAYSLIP</span>
              </button>
            </div>
          </form>
        </NativeModal>
      )}
    </div>
  );
}
