import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Search,
  Download,
  FileText,
  RefreshCw,
  Phone,
  ArrowLeft,
  AlertTriangle,
  UserCheck,
  CreditCard,
  Building2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { fetchDebtors, OUTSTANDING_QUERY_KEY, type OutstandingRow } from '@/pages/accountant/api/outstanding';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import { GovTableLoader, GovPageLoader } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

function fmt(n: number): string {
  return `UGX ${Math.round(n).toLocaleString()}`;
}

export type FetchOutstandingResult = {
  schoolId: string;
  rows: OutstandingRow[];
  clearedCount: number;
};

export async function fetchOutstandingData(userId: string): Promise<FetchOutstandingResult | null> {
  const { data: user } = await supabase.from('users').select('school_id').eq('user_id', userId).maybeSingle();
  const schoolId = user?.school_id;
  if (!schoolId) return null;
  const rows = await fetchDebtors(schoolId);
  return {
    schoolId,
    rows,
    clearedCount: 0,
  };
}

export default function DesignOutstandingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [q, setQ] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [ageingFilter, setAgeingFilter] = useState('all'); // all, 0-30, 31-60, 61-90, 90+

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: [...OUTSTANDING_QUERY_KEY, user?.id ?? ''],
    queryFn: () => (user?.id ? fetchOutstandingData(user.id) : null),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const rows = data?.rows ?? [];

  // Derived metrics
  const totalArrears = useMemo(() => rows.reduce((s, r) => s + (r.balance || 0), 0), [rows]);
  const totalPaid = useMemo(() => rows.reduce((s, r) => s + (r.amount_paid || 0), 0), [rows]);
  const totalBilled = totalArrears + totalPaid;
  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
  const criticalDebtors = useMemo(() => rows.filter((r) => r.days_overdue > 90).length, [rows]);

  const classOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.current_class).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (classFilter !== 'all' && r.current_class !== classFilter) return false;
      if (ageingFilter === '0-30' && (r.days_overdue < 0 || r.days_overdue > 30)) return false;
      if (ageingFilter === '31-60' && (r.days_overdue < 31 || r.days_overdue > 60)) return false;
      if (ageingFilter === '61-90' && (r.days_overdue < 61 || r.days_overdue > 90)) return false;
      if (ageingFilter === '90+' && r.days_overdue <= 90) return false;

      if (q.trim()) {
        const query = q.toLowerCase();
        const matchName = r.student_name.toLowerCase().includes(query);
        const matchParent = (r.parent_name || '').toLowerCase().includes(query);
        const matchClass = (r.current_class || '').toLowerCase().includes(query);
        const matchPhone = (r.student_phone || r.guardian_phone || r.parent_phone || '').includes(query);
        if (!matchName && !matchParent && !matchClass && !matchPhone) return false;
      }
      return true;
    });
  }, [rows, classFilter, ageingFilter, q]);

  const handleExportPdf = () => {
    exportToPdf({
      title: 'Tuition & Fee Arrears Audit',
      subtitle: `RCSN Institutional Finance Desk - Generated ${new Date().toLocaleDateString('en-UG')}`,
      columns: [
        { header: 'Candidate', key: 'student_name', width: 2 },
        { header: 'Cohort', key: 'current_class', width: 1.5 },
        { header: 'Billed (UGX)', key: 'total_fees', format: (v) => fmt(Number(v) || 0) },
        { header: 'Paid (UGX)', key: 'amount_paid', format: (v) => fmt(Number(v) || 0) },
        { header: 'Outstanding (UGX)', key: 'balance', format: (v) => fmt(Number(v) || 0) },
        { header: 'Overdue Days', key: 'days_overdue' },
        { header: 'Guardian Contact', key: 'contact' },
      ],
      rows: filteredRows.map((r) => ({
        student_name: r.student_name,
        current_class: r.current_class,
        total_fees: r.total_fees,
        amount_paid: r.amount_paid,
        balance: r.balance,
        days_overdue: `${r.days_overdue} days`,
        contact: r.guardian_phone || r.parent_phone || '—',
      })),
      filename: 'Tuition_Fee_Arrears_Audit',
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: 'Tuition & Fee Arrears Audit',
      subtitle: `RCSN Institutional Finance Desk - Generated ${new Date().toLocaleDateString('en-UG')}`,
      columns: [
        { header: 'Candidate', key: 'student_name' },
        { header: 'Cohort', key: 'current_class' },
        { header: 'Billed (UGX)', key: 'total_fees' },
        { header: 'Paid (UGX)', key: 'amount_paid' },
        { header: 'Outstanding (UGX)', key: 'balance' },
        { header: 'Overdue Days', key: 'days_overdue' },
        { header: 'Guardian Contact', key: 'contact' },
      ],
      rows: filteredRows.map((r) => ({
        student_name: r.student_name,
        current_class: r.current_class,
        total_fees: r.total_fees,
        amount_paid: r.amount_paid,
        balance: r.balance,
        days_overdue: r.days_overdue,
        contact: r.guardian_phone || r.parent_phone || '',
      })),
      filename: 'Tuition_Fee_Arrears_Audit',
    });
  };

  return (
    <div className="admin-terminal-page space-y-5">
      {/* ── 1. TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/finance')}
            className="gov-btn gov-btn-sm"
            title="Back to Finance Hub"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans">
                STUDENT TUITION & FEE ARREARS AUDIT
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
                DEBTORS ROSTER
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="gov-btn gov-btn-sm"
            title="Refresh Debtors List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="gov-btn gov-btn-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>PDF ROSTER</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="gov-btn gov-btn-sm"
          >
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            <span>EXCEL EXPORT</span>
          </button>
        </div>
      </div>

      {/* ── 2. FOUR ELEVATED MONEY-COLORED KPI CARDS WITH PROGRESS BARS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Collections Realized (Emerald) */}
        <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] border-l-4 border-l-emerald-600 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#555555]">
              Realized Collections
            </span>
            <span className="p-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-700 mt-2">
            {fmt(totalPaid)}
          </div>
          <div className="text-[11px] text-[#666666] font-mono mt-0.5">
            Realized tuition across all cohorts
          </div>
          {/* Progress Bar */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] font-mono font-bold text-[#555555] mb-1">
              <span>COLLECTION RATE</span>
              <span className="text-emerald-700">{collectionRate}%</span>
            </div>
            <div className="h-1.5 bg-[#EAEAEA] rounded overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${Math.min(100, collectionRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Total Arrears (Crimson Red) */}
        <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] border-l-4 border-l-red-600 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#555555]">
              Total Overdue Arrears
            </span>
            <span className="p-1 bg-red-50 text-red-700 border border-red-200 rounded">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-red-700 mt-2">
            {fmt(totalArrears)}
          </div>
          <div className="text-[11px] text-[#666666] font-mono mt-0.5">
            Total uncollected student fee balance
          </div>
          {/* Arrears Exposure Meter */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] font-mono font-bold text-[#555555] mb-1">
              <span>UNCOLLECTED DEBT</span>
              <span className="text-red-700">{100 - collectionRate}%</span>
            </div>
            <div className="h-1.5 bg-[#EAEAEA] rounded overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, 100 - collectionRate))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Total Debtors Count */}
        <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] border-l-4 border-l-[#111111] bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#555555]">
              Active Debtor Candidates
            </span>
            <span className="p-1 bg-[#F5F5F5] text-[#111111] border border-[#CCCCCC] rounded">
              <UserCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-[#111111] mt-2">
            {rows.length} Trainees
          </div>
          <div className="text-[11px] text-[#666666] font-mono mt-0.5">
            Showing {filteredRows.length} matching current filter
          </div>
          {/* Active Ledger Status */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] font-mono font-bold text-[#555555] mb-1">
              <span>AVG DEBT PER TRAINEE</span>
              <span>{rows.length > 0 ? fmt(Math.round(totalArrears / rows.length)) : 'UGX 0'}</span>
            </div>
            <div className="h-1.5 bg-[#EAEAEA] rounded overflow-hidden">
              <div className="h-full bg-[#111111]" style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        {/* Card 4: Critical Overdue (>90 Days) */}
        <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] border-l-4 border-l-amber-600 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#555555]">
              Critical Ageing (&gt;90 Days)
            </span>
            <span className="p-1 bg-amber-50 text-amber-700 border border-amber-200 rounded">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-amber-700 mt-2">
            {criticalDebtors} Students
          </div>
          <div className="text-[11px] text-[#666666] font-mono mt-0.5">
            Requires formal clearance before exams
          </div>
          {/* Critical Ratio Bar */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] font-mono font-bold text-[#555555] mb-1">
              <span>CRITICAL SHARE</span>
              <span className="text-amber-700">
                {rows.length > 0 ? Math.round((criticalDebtors / rows.length) * 100) : 0}%
              </span>
            </div>
            <div className="h-1.5 bg-[#EAEAEA] rounded overflow-hidden">
              <div
                className="h-full bg-amber-600 transition-all duration-300"
                style={{
                  width: `${rows.length > 0 ? Math.min(100, Math.round((criticalDebtors / rows.length) * 100)) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. SOLID FRAMED CONTROL BAR ── */}
      <div className="gov-control-bar flex-wrap">
        <div className="gov-control-bar-left flex-wrap gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888888]" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="SEARCH STUDENT, PARENT, PHONE..."
              className="gov-input pl-8 text-xs font-mono w-60"
            />
          </div>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="gov-select text-xs font-mono font-bold w-auto"
          >
            <option value="all">ALL PROGRAMMES / COHORTS</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c.toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={ageingFilter}
            onChange={(e) => setAgeingFilter(e.target.value)}
            className="gov-select text-xs font-mono font-bold w-auto"
          >
            <option value="all">ALL AGEING BUCKETS</option>
            <option value="0-30">CURRENT (0–30 DAYS OVERDUE)</option>
            <option value="31-60">31–60 DAYS OVERDUE</option>
            <option value="61-90">61–90 DAYS OVERDUE</option>
            <option value="90+">90+ DAYS (CRITICAL DEFAULT)</option>
          </select>
        </div>

        <div className="gov-control-bar-right">
          <span className="text-[11px] font-mono font-bold text-[#555555]">
            SHOWING {filteredRows.length} OF {rows.length} RECORDS
          </span>
        </div>
      </div>

      {/* ── 4. HIGH-DENSITY PAPER TABLE (DEBTOR ROSTER) ── */}
      <div className="gov-table-container">
        <table className="gov-table">
          <thead>
            <tr>
              <th>Candidate Name</th>
              <th>Cohort / Programme</th>
              <th className="text-right">Billed Fees (UGX)</th>
              <th className="text-right">Paid to Date (UGX)</th>
              <th className="text-right">Arrears Balance (UGX)</th>
              <th className="text-center">Ageing Bracket</th>
              <th>Parent / Contact Info</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <GovTableLoader colSpan={8} message="AUDITING STUDENT TUITION DEBTORS & LEDGERS..." />
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-xs font-mono text-[#777777]">
                  NO STUDENT DEBTORS MATCHED THE SPECIFIED FILTERS.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => {
                const phone = r.student_phone || r.guardian_phone || r.parent_phone;
                return (
                  <tr key={r.student_id}>
                    {/* 1. Candidate Name */}
                    <td className="font-semibold text-[#111111] text-xs">
                      <div>{r.student_name}</div>
                      <div className="text-[10px] font-mono text-[#888888] font-normal">
                        ID: {r.student_id.slice(0, 8).toUpperCase()}
                      </div>
                    </td>

                    {/* 2. Cohort */}
                    <td className="font-mono text-xs text-[#333333]">
                      {r.current_class}
                    </td>

                    {/* 3. Billed Fees */}
                    <td className="font-mono text-xs text-right text-[#555555]">
                      {fmt(r.total_fees)}
                    </td>

                    {/* 4. Amount Paid */}
                    <td className="font-mono text-xs text-right text-emerald-800 font-semibold">
                      {fmt(r.amount_paid)}
                    </td>

                    {/* 5. Outstanding Arrears */}
                    <td className="font-mono text-xs text-right font-bold text-red-700">
                      {fmt(r.balance)}
                    </td>

                    {/* 6. Ageing Tag */}
                    <td className="text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold rounded ${
                          r.days_overdue > 90
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : r.days_overdue > 60
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : r.days_overdue > 30
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                            : 'bg-[#F4F4F5] text-[#444444] border border-[#CCCCCC]'
                        }`}
                      >
                        {r.days_overdue > 0 ? `${r.days_overdue} DAYS OVERDUE` : 'CURRENT'}
                      </span>
                    </td>

                    {/* 7. Contact */}
                    <td className="font-mono text-[11px] text-[#555555]">
                      {r.parent_name && <div className="text-[#111111] font-sans font-medium">{r.parent_name}</div>}
                      {phone ? (
                        <div className="text-[10px] text-[#666666] flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5 text-[#888888]" />
                          <span>{phone}</span>
                        </div>
                      ) : (
                        <span className="text-[#999999] text-[10px]">NO PHONE RECORDED</span>
                      )}
                    </td>

                    {/* 8. Action Buttons */}
                    <td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                          className="gov-btn gov-btn-sm text-[10px]"
                        >
                          PROFILE
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/accountant?student=${r.student_id}`)}
                          className="gov-btn gov-btn-sm gov-btn-primary text-[10px]"
                        >
                          PAY
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
