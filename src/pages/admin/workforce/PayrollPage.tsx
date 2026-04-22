import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { fetchPayrollPageData, fetchPayrollPayslips, type PayslipRow } from '@/pages/admin/workforce/workforceApi';
import { workforceQueryKeys } from '@/pages/admin/workforce/workforceQueryKeys';

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
  const [err, setErr] = useState<string | null>(null);

  const [newLabel, setNewLabel] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  const [pKind, setPKind] = useState<'teacher' | 'other_staff'>('teacher');
  const [pStaff, setPStaff] = useState('');
  const [gross, setGross] = useState('0');
  const [net, setNet] = useState('0');

  const payslipsQ = useQuery({
    queryKey: workforceQueryKeys.payrollPayslips(selPeriod),
    queryFn: () => fetchPayrollPayslips(selPeriod),
    enabled: !!selPeriod,
  });
  const payslips = payslipsQ.data ?? [];

  if (!user) return null;

  if (payrollQ.isError) {
    return (
      <AdminPageWrapper title="Payroll" subtitle="Pay runs and payslips">
        <div className={`${adminCardClass} text-red-200/90 text-sm`} role="alert">
          {payrollQ.error instanceof Error ? payrollQ.error.message : 'Failed to load'}
        </div>
      </AdminPageWrapper>
    );
  }
  if (loading) {
    return (
      <AdminPageWrapper title="Payroll" subtitle="Loading…">
        <div className="ac-text-secondary text-sm">Loading…</div>
      </AdminPageWrapper>
    );
  }
  if (!canPay) {
    return (
      <AdminPageWrapper title="Payroll" subtitle="Pay runs and payslips">
        <div className={adminCardClass + ' text-amber-200/90 text-sm'}>
          You need the <strong>Payroll</strong> (or <strong>Workforce &amp; HR</strong>) permission to manage payroll.
        </div>
      </AdminPageWrapper>
    );
  }

  const createPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !newLabel || !newStart || !newEnd || !user?.id) return;
    setErr(null);
    const { error } = await supabase.from('hr_payroll_periods').insert({
      school_id: schoolId,
      label: newLabel,
      period_start: newStart,
      period_end: newEnd,
      status: 'draft',
    });
    if (error) {
      setErr(error.message);
      return;
    }
    setNewLabel('');
    setNewStart('');
    setNewEnd('');
    void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.payroll(user.id) });
  };

  const addPayslip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !selPeriod || !pStaff) return;
    const g = parseFloat(gross) || 0;
    const n = parseFloat(net) || 0;
    setErr(null);
    const { error } = await supabase.from('hr_payslips').insert({
      school_id: schoolId,
      payroll_period_id: selPeriod,
      staff_kind: pKind,
      staff_id: pStaff,
      gross: g,
      net: n,
      allowances: [] as const,
      deductions: [] as const,
      currency: 'UGX',
    });
    if (error) {
      setErr(error.message);
      return;
    }
    setGross('0');
    setNet('0');
    void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.payrollPayslips(selPeriod) });
  };

  const staffName = (row: PayslipRow) => {
    if (row.staff_kind === 'teacher') {
      return tList.find((t) => t.teacher_id === row.staff_id)?.name || row.staff_id;
    }
    return oList.find((o) => o.id === row.staff_id)?.full_name || row.staff_id;
  };

  return (
    <AdminPageWrapper
      title="Payroll"
      subtitle="Create pay periods and payslips. Totals and statutory lines can be extended later; amounts are in UGX by default."
    >
      {err && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
          {err}
        </div>
      )}
      {payslipsQ.isError && selPeriod && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
          {payslipsQ.error instanceof Error ? payslipsQ.error.message : 'Failed to load payslips'}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={adminCardClass}>
          <h2 className="text-base font-semibold text-slate-100 mb-3">New pay period</h2>
          <form onSubmit={createPeriod} className="space-y-2">
            <input
              className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-slate-100"
              placeholder="Label (e.g. April 2026)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
              />
              <input
                type="date"
                className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Create period
            </button>
          </form>
        </div>

        <div className={adminCardClass}>
          <h2 className="text-base font-semibold text-slate-100 mb-3">Payslips in period</h2>
          <select
            className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-slate-100 mb-2"
            value={selPeriod}
            onChange={(e) => setSelPeriod(e.target.value)}
          >
            <option value="">Select a period</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.status})
              </option>
            ))}
          </select>
          {!!selPeriod && (
            <form onSubmit={addPayslip} className="space-y-2 border-t border-white/10 pt-3">
              <select
                className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
                value={pKind}
                onChange={(e) => {
                  setPKind(e.target.value as 'teacher' | 'other_staff');
                  setPStaff('');
                }}
              >
                <option value="teacher">Teacher</option>
                <option value="other_staff">Other staff</option>
              </select>
              <select
                className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
                value={pStaff}
                onChange={(e) => setPStaff(e.target.value)}
                required
              >
                <option value="">Person</option>
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500">Gross</label>
                  <input
                    className="w-full rounded border border-white/15 bg-white/5 px-2 py-1 text-sm"
                    value={gross}
                    onChange={(e) => setGross(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Net</label>
                  <input
                    className="w-full rounded border border-white/15 bg-white/5 px-2 py-1 text-sm"
                    value={net}
                    onChange={(e) => setNet(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white">
                Add or update line
              </button>
            </form>
          )}
        </div>
      </div>

      {payslips.length > 0 && (
        <div className={adminCardClass}>
          <h2 className="text-base font-semibold text-slate-100 mb-2">Payslips</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-200">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400 text-xs">
                  <th className="py-2">Person</th>
                  <th className="py-2">Gross</th>
                  <th className="py-2">Net</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((p) => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="py-1.5">{staffName(p)}</td>
                    <td className="py-1.5">
                      {p.gross.toLocaleString()} {p.currency}
                    </td>
                    <td className="py-1.5">
                      {p.net.toLocaleString()} {p.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminPageWrapper>
  );
}
