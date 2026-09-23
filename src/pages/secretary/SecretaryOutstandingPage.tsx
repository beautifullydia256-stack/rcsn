import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Phone,
  Copy,
  Check,
  Building2,
  Users,
  CreditCard,
  FileText,
  Calendar,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { fetchDebtors, OUTSTANDING_QUERY_KEY, type OutstandingRow } from '@/pages/accountant/api/outstanding';
import { getTokens, cardGrad, fmtUGX, SORA, INTER } from '@/styles/posThemeTokens';
import { useSchoolName } from '@/lib/useSchoolName';

export default function SecretaryOutstandingPage() {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;
  const schoolName = useSchoolName();

  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'MODERATE' | 'LOW'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: rawDebtors = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: [...OUTSTANDING_QUERY_KEY, schoolId],
    queryFn: () => (schoolId ? fetchDebtors(schoolId) : Promise.resolve([])),
    enabled: !!schoolId,
    staleTime: 60_000,
  });

  // Extract distinct classes
  const classList = useMemo(() => {
    const set = new Set<string>();
    rawDebtors.forEach((d) => {
      if (d.current_class) set.add(d.current_class);
    });
    return Array.from(set).sort();
  }, [rawDebtors]);

  // Filtered rows
  const filteredDebtors = useMemo(() => {
    return rawDebtors.filter((d) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        d.student_name.toLowerCase().includes(q) ||
        (d.parent_name && d.parent_name.toLowerCase().includes(q)) ||
        (d.parent_phone && d.parent_phone.includes(q)) ||
        (d.invoice_number && d.invoice_number.toLowerCase().includes(q));

      const matchClass = selectedClass === 'ALL' || d.current_class === selectedClass;

      let matchSeverity = true;
      if (severityFilter === 'CRITICAL') matchSeverity = d.balance >= 500_000;
      else if (severityFilter === 'MODERATE') matchSeverity = d.balance >= 200_000 && d.balance < 500_000;
      else if (severityFilter === 'LOW') matchSeverity = d.balance < 200_000;

      return matchSearch && matchClass && matchSeverity;
    });
  }, [rawDebtors, search, selectedClass, severityFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalOutstanding = rawDebtors.reduce((sum, d) => sum + (d.balance || 0), 0);
    const criticalCount = rawDebtors.filter((d) => d.balance >= 500_000).length;
    const count = rawDebtors.length;
    return { totalOutstanding, count, criticalCount };
  }, [rawDebtors]);

  const copySmsReminder = (debtor: OutstandingRow) => {
    const student = debtor.student_name;
    const bal = debtor.balance.toLocaleString();
    const term = debtor.term_label || 'this term';
    const text = `Dear Parent/Guardian, this is a kind reminder from ${schoolName || 'the school office'} regarding the outstanding school fees of ${bal} UGX for ${student} (${term}). Kindly clear through our official payment channels. For assistance, contact the office. Thank you.`;
    navigator.clipboard.writeText(text);
    setCopiedId(debtor.student_id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-none"
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
        fontFamily: INTER,
      }}
    >
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
              style={{
                backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                color: t.mint,
                fontFamily: SORA,
              }}
            >
              Secretary Front Desk
            </span>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(225,29,72,0.08)',
                color: t.red,
              }}
            >
              Read-Only Inquiry
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
            style={{ fontFamily: SORA, color: t.textHi }}
          >
            Outstanding Balances
          </h1>
          <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
            Lookup student fee balances for parent consultations and admissions. Fee payments are recorded exclusively by Accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start md:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm"
          style={{
            backgroundColor: t.panel,
            border: `1px solid ${t.stroke}`,
            color: t.textHi,
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} style={{ color: t.mint }} />
          <span>{isFetching ? 'Refreshing...' : 'Refresh Records'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Outstanding */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: t.textLow }}>
              Total Outstanding
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(225,29,72,0.1)',
                color: t.red,
              }}
            >
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {isLoading ? '...' : `${stats.totalOutstanding.toLocaleString()} UGX`}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Across {stats.count} students with unpaid fees
          </div>
        </div>

        {/* Total Students with Arrears */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: t.textLow }}>
              Students In Arrears
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(217,119,6,0.1)',
                color: t.gold,
              }}
            >
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {isLoading ? '...' : stats.count}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Requiring fee clearance follow-up
          </div>
        </div>

        {/* Critical Balance Count */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: t.textLow }}>
              Critical Balances (≥ 500k)
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(147,51,234,0.1)',
                color: '#a855f7',
              }}
            >
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {isLoading ? '...' : stats.criticalCount}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            High priority follow-ups
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.textLow }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, parent, or phone..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm transition-all outline-none"
            style={{
              backgroundColor: t.fieldBg,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
          />
        </div>

        {/* Filter Pill Selectors */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Class selector */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold outline-none cursor-pointer transition-all"
            style={{
              backgroundColor: t.fieldBg,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
          >
            <option value="ALL">All Classes ({classList.length})</option>
            {classList.map((c) => (
              <option key={c} value={c}>
                Class: {c}
              </option>
            ))}
          </select>

          {/* Severity selector */}
          <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}` }}>
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'CRITICAL', label: '≥ 500k' },
                { id: 'MODERATE', label: '200k–500k' },
                { id: 'LOW', label: '< 200k' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSeverityFilter(s.id)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: severityFilter === s.id ? (isDark ? 'rgba(255,255,255,0.12)' : '#ffffff') : 'transparent',
                  color: severityFilter === s.id ? t.textHi : t.textLow,
                  boxShadow: severityFilter === s.id && !isDark ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Debtors List Table */}
      <div
        className="rounded-2xl overflow-hidden shadow-sm"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
              Student Balances Directory
            </span>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: t.textMid,
              }}
            >
              {filteredDebtors.length} records
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm font-medium" style={{ color: t.textLow }}>
            Loading student fee balances...
          </div>
        ) : filteredDebtors.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            <div className="font-semibold text-sm" style={{ color: t.textHi }}>
              No outstanding balances found
            </div>
            <p className="text-xs mt-1" style={{ color: t.textLow }}>
              All matching students have cleared their fees or no criteria matched.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    borderBottom: `1px solid ${t.divider}`,
                    color: t.textLow,
                  }}
                >
                  <th className="py-3 px-4 font-semibold">Student Name</th>
                  <th className="py-3 px-4 font-semibold">Class</th>
                  <th className="py-3 px-4 font-semibold">Term</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Fees</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount Paid</th>
                  <th className="py-3 px-4 font-semibold text-right">Balance Due</th>
                  <th className="py-3 px-4 font-semibold">Parent / Contact</th>
                  <th className="py-3 px-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: t.divider }}>
                {filteredDebtors.map((d) => {
                  const isCritical = d.balance >= 500_000;
                  const isCopied = copiedId === d.student_id;

                  return (
                    <tr
                      key={`${d.student_id}-${d.term_id}`}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      {/* Student Name */}
                      <td className="py-3 px-4 font-semibold" style={{ color: t.textHi }}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px]"
                            style={{
                              backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                              color: t.mint,
                            }}
                          >
                            {(d.student_name || '?').charAt(0)}
                          </div>
                          <div>
                            <div>{d.student_name}</div>
                            {d.invoice_number && (
                              <div className="text-[10px]" style={{ color: t.textLow }}>
                                Inv: #{d.invoice_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-semibold"
                          style={{
                            backgroundColor: isDark ? 'rgba(79,142,247,0.12)' : 'rgba(37,99,235,0.08)',
                            color: t.blue,
                          }}
                        >
                          {d.current_class || '—'}
                        </span>
                      </td>

                      {/* Term */}
                      <td className="py-3 px-4 text-[11px]" style={{ color: t.textMid }}>
                        {d.term_label || 'Term'}
                      </td>

                      {/* Total Fees */}
                      <td className="py-3 px-4 text-right font-medium" style={{ color: t.textMid }}>
                        {(d.total_fees || 0).toLocaleString()} UGX
                      </td>

                      {/* Amount Paid */}
                      <td className="py-3 px-4 text-right font-medium text-emerald-500">
                        {(d.amount_paid || 0).toLocaleString()} UGX
                      </td>

                      {/* Balance Due */}
                      <td className="py-3 px-4 text-right font-bold" style={{ fontFamily: SORA }}>
                        <span
                          className="inline-block px-2.5 py-1 rounded-lg"
                          style={{
                            backgroundColor: isCritical
                              ? isDark
                                ? 'rgba(239,68,68,0.15)'
                                : 'rgba(225,29,72,0.1)'
                              : isDark
                              ? 'rgba(245,158,11,0.15)'
                              : 'rgba(217,119,6,0.1)',
                            color: isCritical ? t.red : t.gold,
                          }}
                        >
                          {d.balance.toLocaleString()} UGX
                        </span>
                      </td>

                      {/* Parent Phone */}
                      <td className="py-3 px-4">
                        {d.parent_phone ? (
                          <div className="flex items-center gap-1 text-[11px]" style={{ color: t.textHi }}>
                            <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>{d.parent_phone}</span>
                            {d.parent_name && (
                              <span className="text-[10px] truncate max-w-[100px]" style={{ color: t.textLow }}>
                                ({d.parent_name})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px]" style={{ color: t.textLow }}>
                            No phone recorded
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => copySmsReminder(d)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                          style={{
                            backgroundColor: isCopied
                              ? isDark
                                ? 'rgba(16,217,168,0.2)'
                                : 'rgba(16,185,129,0.15)'
                              : isDark
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(0,0,0,0.04)',
                            color: isCopied ? t.mint : t.textHi,
                            border: `1px solid ${isCopied ? t.mint : t.stroke}`,
                          }}
                          title="Copy friendly reminder SMS message"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy SMS</span>
                            </>
                          )}
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
    </div>
  );
}
