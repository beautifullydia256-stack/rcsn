import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { fetchFeeCollectionReport, REPORTS_FEE_COLLECTION_QUERY_KEY } from "./api/reports";

const STALE_MS = 2 * 60 * 1000;

export default function ReportsPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [reportType, setReportType] = useState<"fee_collection" | "outstanding">("fee_collection");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: [...REPORTS_FEE_COLLECTION_QUERY_KEY, schoolId],
    queryFn: () => fetchFeeCollectionReport(schoolId!),
    enabled: !!schoolId && reportType === "fee_collection",
    staleTime: STALE_MS,
    refetchOnWindowFocus: true,
  });

  function exportCsv() {
    const headers = ["Class", "Expected", "Collected", "Outstanding"];
    const lines = [headers.join(","), ...rows.map((r) => [r.class_name, r.expected, r.collected, r.outstanding].join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fee-collection-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="ac-page-content mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="ac-text-primary text-2xl font-semibold">Financial Reports</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium">
          Back to Dashboard
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <label className="ac-text-secondary text-sm font-medium">Report type</label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as "fee_collection" | "outstanding")}
          className="ac-input w-auto min-w-[200px]"
        >
          <option value="fee_collection">Fee collection by class</option>
          <option value="outstanding">Outstanding (use Outstanding page for list)</option>
        </select>
        {reportType === "fee_collection" && (
          <button type="button" onClick={exportCsv} className="ac-glass-btn rounded-xl px-4 py-2 text-sm font-medium">
            Export CSV
          </button>
        )}
      </div>

      <div className="ac-glass-card overflow-hidden rounded-[18px]">
        {isLoading ? (
          <div className="ac-text-muted p-8">Loading report…</div>
        ) : (
          <div className="overflow-x-auto ac-table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Collected</th>
                  <th className="px-4 py-3">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center ac-text-muted">No data for current term.</td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.class_name}>
                      <td className="ac-cell-primary px-4 py-3">{r.class_name}</td>
                      <td className="px-4 py-3">{r.expected.toLocaleString()}</td>
                      <td className="px-4 py-3">{r.collected.toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium text-amber-400">{r.outstanding.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="ac-text-muted mt-4 text-sm">More reports (Cash In Statement, Daily Cash, PDF export) coming in Phase 4.</p>
    </div>
  );
}
