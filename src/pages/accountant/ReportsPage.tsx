import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, Download, FileText } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { fetchFeeCollectionReport, REPORTS_FEE_COLLECTION_QUERY_KEY } from "./api/reports";
import { useSort, Th } from "../../lib/useSort";
import { exportToPdf, exportToExcel } from "../../lib/exportUtils";
import { schoolCalendarTodayIso } from "../../lib/schoolCalendarDate";
import { useSchoolName } from "../../lib/useSchoolName";
import { useAcademicPeriod } from "../../lib/academicPeriodTerminology";
import PosEmptyState from "../../components/finance/pos/PosEmptyState";

const STALE_MS = 2 * 60 * 1000;
function fmt(n: number) { return n.toLocaleString("en-US", { maximumFractionDigits: 0 }); }

export default function ReportsPage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const schoolName = useSchoolName();
  const { labels, isTertiary } = useAcademicPeriod();
  const todayIso = schoolCalendarTodayIso();
  const [reportType] = useState<"fee_collection">("fee_collection");

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: [...REPORTS_FEE_COLLECTION_QUERY_KEY, schoolId],
    queryFn: () => fetchFeeCollectionReport(schoolId!),
    enabled: !!schoolId && reportType === "fee_collection",
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
  });

  const { sortKey, sortDir, sorted, toggleSort } = useSort(
    rows as unknown as Record<string, unknown>[],
    "outstanding",
    "desc"
  );

  const totalExpected = rows.reduce((s, r) => s + r.expected, 0);
  const totalCollected = rows.reduce((s, r) => s + r.collected, 0);
  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  function doExportPdf() {
    exportToPdf({
      title: isTertiary ? "Fee Collection Report — by Cohort" : "Fee Collection Report — by Class",
      subtitle: `${labels.currentPeriod} · As of ${todayIso}`,
      schoolName,
      columns: [
        { header: isTertiary ? "Cohort / Class" : "Class", key: "class_name", width: 36 },
        { header: "Expected (UGX)", key: "expected", width: 28, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Collected (UGX)", key: "collected", width: 28, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Outstanding (UGX)", key: "outstanding", width: 28, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Collection %", key: "collected", width: 20, align: "right", format: (v, row) => {
          // custom collection rate per class
          const exp = Number((row as Record<string, unknown>)?.["expected"] ?? 0);
          const col = Number(v || 0);
          return exp > 0 ? `${Math.round((col / exp) * 100)}%` : "—";
        }},
      ],
      rows: sorted as unknown as Record<string, unknown>[],
      filename: `fee-collection-report-${todayIso}`,
      totalsRow: ["TOTAL", fmt(totalExpected) + " UGX", fmt(totalCollected) + " UGX", fmt(totalOutstanding) + " UGX", `${collectionRate}%`],
    });
  }

  function doExportExcel() {
    exportToExcel({
      title: isTertiary ? "Fee Collection Report — by Cohort" : "Fee Collection Report — by Class",
      subtitle: `${labels.currentPeriod} · As of ${todayIso}`,
      schoolName,
      columns: [
        { header: isTertiary ? "Cohort / Class" : "Class", key: "class_name", width: 24 },
        { header: "Expected (UGX)", key: "expected", width: 18, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Collected (UGX)", key: "collected", width: 18, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Outstanding (UGX)", key: "outstanding", width: 20, align: "right", format: (v) => fmt(Number(v || 0)) },
        { header: "Collection %", key: "class_name", width: 14, align: "right", format: (_v, row) => {
          const r = row as Record<string, unknown>;
          const exp = Number(r["expected"] ?? 0);
          const col = Number(r["collected"] ?? 0);
          return exp > 0 ? `${Math.round((col / exp) * 100)}%` : "—";
        }},
      ],
      rows: sorted as unknown as Record<string, unknown>[],
      filename: `fee-collection-report-${todayIso}`,
      totalsRow: ["TOTAL", fmt(totalExpected) + " UGX", fmt(totalCollected) + " UGX", fmt(totalOutstanding) + " UGX", `${collectionRate}%`],
    });
  }

  return (
    <div className="ac-page-content mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="ac-text-primary text-2xl font-semibold">Financial Reports</h1>
          <p className="ac-text-secondary mt-0.5 text-sm">Fee collection summary by {isTertiary ? "cohort" : "class"} for the {labels.currentPeriod.toLowerCase()}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={doExportPdf} className="ac-glass-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
            <Download className="h-4 w-4" />PDF
          </button>
          <button type="button" onClick={doExportExcel} className="ac-glass-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
            <FileText className="h-4 w-4" />Excel
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="ac-glass-card rounded-2xl px-4 py-3">
          <p className="ac-text-muted text-xs font-medium">Expected</p>
          <p className="ac-text-primary mt-1 text-lg font-bold tabular-nums">
            {fmt(totalExpected)}<span className="ac-text-muted ml-1 text-xs font-normal">UGX</span>
          </p>
        </div>
        <div className="ac-glass-card rounded-2xl px-4 py-3">
          <p className="ac-text-muted text-xs font-medium">Collected</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-emerald-500">
            {fmt(totalCollected)}<span className="ml-1 text-xs font-normal text-emerald-400">UGX</span>
          </p>
        </div>
        <div className="ac-glass-card rounded-2xl px-4 py-3">
          <p className="ac-text-muted text-xs font-medium">Outstanding</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-amber-500">
            {fmt(totalOutstanding)}<span className="ml-1 text-xs font-normal text-amber-400">UGX</span>
          </p>
        </div>
        <div className="ac-glass-card rounded-2xl px-4 py-3">
          <div className="flex items-center gap-1.5">
            <BarChart2 className="h-3.5 w-3.5 text-emerald-500" />
            <p className="ac-text-muted text-xs font-medium">Collection rate</p>
          </div>
          <p className="ac-text-primary mt-1 text-lg font-bold tabular-nums">{collectionRate}%</p>
          {/* Progress bar */}
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-emerald-500/10 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, collectionRate)}%` }} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="ac-glass-card overflow-hidden rounded-[18px]">
        {isLoading ? (
          <div className="ac-text-muted p-10 text-center text-sm">Loading report…</div>
        ) : isError ? (
          <div className="ac-text-muted p-10 text-center text-sm">Could not load report.</div>
        ) : sorted.length === 0 ? (
          <PosEmptyState
            icon={<BarChart2 size={28} />}
            title={`No Data for ${labels.currentPeriod}`}
            description={`No fee structures or balances have been posted for the active ${labels.periodNoun.toLowerCase()}. Generate student invoices to begin tracking collections.`}
            accentColor="gold"
            minHeight={260}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="ac-table-header">
                    <Th label={isTertiary ? "Cohort / Class" : "Class"} sortKey="class_name" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                    <Th label="Expected (UGX)" sortKey="expected" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Collected (UGX)" sortKey="collected" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <Th label="Outstanding (UGX)" sortKey="outstanding" currentKey={sortKey} dir={sortDir} onSort={toggleSort} right />
                    <th className="px-4 py-3 text-right font-semibold ac-text-muted whitespace-nowrap">Collection %</th>
                  </tr>
                </thead>
                <tbody className="divide-y ac-table-divider">
                  {sorted.map((row) => {
                    const r = row as unknown as typeof rows[number];
                    const rate = r.expected > 0 ? Math.round((r.collected / r.expected) * 100) : 0;
                    return (
                      <tr key={r.class_name} className="ac-table-row">
                        <td className="ac-cell-primary px-4 py-3 font-medium whitespace-nowrap">{r.class_name}</td>
                        <td className="px-4 py-3 ac-text-secondary text-right tabular-nums whitespace-nowrap">{fmt(r.expected)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(r.collected)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-amber-500 whitespace-nowrap">{fmt(r.outstanding)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <span className="tabular-nums text-xs ac-text-secondary w-10 text-right">{rate}%</span>
                            <div className="h-1.5 w-20 rounded-full bg-emerald-500/10 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, rate)}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t ac-table-divider px-4 py-3">
              <p className="ac-text-muted text-xs">{sorted.length} {isTertiary ? 'cohort' : 'class'}{sorted.length !== 1 ? (isTertiary ? 's' : 'es') : ''}</p>
              <p className="ac-text-primary text-sm font-semibold tabular-nums">
                Total: {fmt(totalCollected)} / {fmt(totalExpected)} UGX ({collectionRate}%)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
