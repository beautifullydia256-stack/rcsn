import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useSnapshot } from '../../../hooks/useSnapshot';
import NativeModal from '../../../components/NativeModal';
import { formatAverageWhole } from '../../../lib/reportUtils';
import { pdfDownloadFilenameFromResponse } from '../../../lib/pdfAttachmentFilename';
import { isElectronDesktop } from '../../../lib/desktopPdf';
import { pdfApiHttpErrorMessage } from '../../../lib/pdfApiErrorMessage';
import { generatePdfBlobFromCachedGeneratedReport } from '../../../lib/generatePdfFromCachedReportRow';
import { Download, Search, Eye, ArrowLeft, RefreshCw, FileText } from 'lucide-react';
import { GovPageLoader, GovRollingBox, GovTableLoader } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchGeneratedReports(snapshotId: string) {
  const { data, error } = await supabase
    .from('generated_reports')
    .select('*, students(student_id, name, current_class, admission_number)')
    .eq('snapshot_id', snapshotId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export default function ReportViewer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const snapshotId = searchParams.get('snapshot') || '';
  const { snapshot, loading: snapshotLoading } = useSnapshot(snapshotId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [viewingReport, setViewingReport] = useState<any | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: generatedReports = [], isLoading: reportsLoading, refetch } = useQuery({
    queryKey: ['admin', 'reportViewer', snapshotId],
    queryFn: () => fetchGeneratedReports(snapshotId),
    enabled: !!snapshotId,
    staleTime: STALE_TIME_MS,
  });

  const classes = [...new Set(generatedReports.map((r: any) => r.students?.current_class).filter(Boolean))] as string[];

  const filteredReports = generatedReports.filter((report: any) => {
    const student = report.students;
    const matchesSearch = !searchQuery || 
      student?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student?.admission_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = !selectedClass || student?.current_class === selectedClass;
    return matchesSearch && matchesClass;
  });

  const handleViewReport = (report: any) => {
    setViewingReport({
      ...report,
      reportData: report.report_data,
    });
  };

  const handleDownloadPDF = async (report: any) => {
    setDownloadingId(report.id);
    try {
      if (report.pdf_url) {
        window.open(report.pdf_url, '_blank');
        return;
      }

      /** Desktop: same HTML → local Puppeteer as report generator; no Vercel `/api/pdf/generate`. */
      if (isElectronDesktop()) {
        const { blob, filename } = await generatePdfBlobFromCachedGeneratedReport({
          report_data: report.report_data,
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_PDF_API_URL || ''}/api/pdf/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            snapshotId,
            studentIds: [report.student_id],
            templateId: report.template_id,
          }),
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = String(report.students?.name || 'report').replace(/\s+/g, '_').slice(0, 80);
        a.download = pdfDownloadFilenameFromResponse(response, `${safeName}.pdf`);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        let errBody: { error?: string } = {};
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
          errBody = await response.json().catch(() => ({}));
        } else {
          await response.text();
        }
        const msg = pdfApiHttpErrorMessage(response.status, {
          serverErrorText: typeof errBody?.error === 'string' ? errBody.error : undefined,
        });
        console.error('PDF API error:', msg);
        alert(msg);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error downloading PDF:', err);
      alert(message || 'Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const loading = (snapshotLoading && !snapshot) || (reportsLoading && generatedReports.length === 0);

  if (loading) {
    return (
      <div className="admin-terminal-page space-y-5 p-4">
        <GovPageLoader message="RETRIEVING OFFICIAL GENERATED REPORTS REGISTRY..." minHeight="min-h-[40vh]" />
      </div>
    );
  }

  return (
    <div className="admin-terminal-page space-y-5 p-4">
      {/* ── 1. TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            OFFICIAL RESULT SLIPS & TRANSCRIPTS ARCHIVE
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            {snapshot ? `CYCLE: TERM ${snapshot.term} ${snapshot.year}` : 'ACADEMIC REPOSITORY'} • REPUBLIC OF UGANDA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REFRESH</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/reports/generate')}
            className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN TO HUB</span>
          </button>
        </div>
      </div>

      {/* ── 2. MONOCHROME KPI SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            TOTAL COMPILED
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {generatedReports.length.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            REPORTS IN REPOSITORY
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            MATCHED RECORDS
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {filteredReports.length.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            ACTIVE FILTER MATCHES
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            CAMPUS COHORTS
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {classes.length}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            CLASSES REPRESENTED
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            SNAPSHOT STATUS
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1 uppercase">
            {snapshot?.status || 'COMPILED'}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            ARCHIVE INTEGRITY OK
          </div>
        </div>
      </div>

      {/* ── 3. HIGH DENSITY CONTROL BAR ── */}
      <div className="gov-control-bar flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#CCCCCC]">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-[#777777]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate name or admission number…"
            className="gov-input text-xs font-mono w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase text-[#555555]">CLASS:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="gov-input text-xs font-mono"
          >
            <option value="">ALL COHORTS ({generatedReports.length})</option>
            {classes.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 4. HIGH DENSITY DATA GRID ── */}
      <div className="gov-table-container border border-[#CCCCCC] bg-white">
        <table className="gov-table w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#EAEAEA] border-b border-[#CCCCCC]">
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">#</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">CANDIDATE NAME</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">ADMISSION NO</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">COHORT / CLASS</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111] text-right">AVERAGE</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111] text-center">POS</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111] text-center">DIV</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111]">GENERATED</th>
              <th className="py-2.5 px-3 text-[11px] font-mono uppercase font-bold text-[#111111] text-right">OFFICIAL ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((report: any, idx: number) => {
              const student = report.students;
              const reportData = report.report_data;
              const summary = reportData?.students?.[0]?.summary;
              const isDownloading = downloadingId === report.id;

              return (
                <tr
                  key={report.id}
                  className="border-b border-[#E5E7EB] hover:bg-[#F9F9FB] transition-colors"
                >
                  <td className="py-2.5 px-3 text-xs font-mono text-[#777777]">{idx + 1}</td>
                  <td className="py-2.5 px-3 text-xs font-mono font-bold text-[#111111]">
                    {student?.name || 'UNKNOWN CANDIDATE'}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-mono text-[#555555]">
                    {student?.admission_number || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-mono text-[#111111]">
                    {student?.current_class || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-mono font-bold text-right text-[#111111]">
                    {summary?.average != null && summary?.average !== ''
                      ? `${formatAverageWhole(summary.average)}%`
                      : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-mono text-center text-[#555555]">
                    {summary?.classPosition || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-mono text-center font-bold text-[#111111]">
                    {summary?.division || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-[#555555]">
                    {new Date(report.generated_at).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleViewReport(report)}
                        className="gov-btn gov-btn-secondary gov-btn-xs flex items-center gap-1 font-mono"
                      >
                        <Eye className="w-3 h-3" />
                        <span>VIEW</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPDF(report)}
                        disabled={isDownloading}
                        className="gov-btn gov-btn-primary gov-btn-xs flex items-center gap-1 font-mono"
                      >
                        {isDownloading ? (
                          <GovRollingBox size="xs" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        <span>PDF</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredReports.length === 0 && (
          <div className="p-8 text-center text-xs font-mono text-[#777777]">
            {generatedReports.length === 0
              ? 'NO OFFICIAL REPORTS RECORDED IN THIS SNAPSHOT ARCHIVE.'
              : 'NO RECORDS MATCHED THE CURRENT SEARCH CRITERIA.'}
          </div>
        )}
      </div>

      {/* ── 5. CLEAN GOVERNMENT PREVIEW MODAL ── */}
      {viewingReport && (
        <NativeModal
          isOpen={!!viewingReport}
          onClose={() => setViewingReport(null)}
          title={`OFFICIAL REPORT RECORD: ${viewingReport.students?.name || 'STUDENT'}`}
          size="lg"
        >
          <div className="space-y-4 font-mono text-xs text-[#111111]">
            <div className="gov-card p-3 bg-[#F9F9FB] border border-[#CCCCCC]">
              <div className="text-[11px] font-bold uppercase text-[#555555] mb-2 border-b border-[#CCCCCC] pb-1">
                ACADEMIC PERFORMANCE SUMMARY
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <span className="text-[#555555]">AVERAGE:</span>{' '}
                  <span className="font-bold">
                    {(() => {
                      const a = viewingReport.reportData?.students?.[0]?.summary?.average;
                      if (a == null || a === '') return 'N/A';
                      return `${formatAverageWhole(a)}%`;
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-[#555555]">POSITION:</span>{' '}
                  <span className="font-bold">{viewingReport.reportData?.students?.[0]?.summary?.classPosition || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#555555]">DIVISION:</span>{' '}
                  <span className="font-bold">{viewingReport.reportData?.students?.[0]?.summary?.division || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#555555]">AGGREGATE:</span>{' '}
                  <span className="font-bold">{viewingReport.reportData?.students?.[0]?.summary?.aggregate?.toFixed(2) || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="gov-card p-3 border border-[#CCCCCC]">
              <div className="text-[11px] font-bold uppercase text-[#555555] mb-2 border-b border-[#CCCCCC] pb-1">
                COURSE UNITS &amp; SUBJECT RESULTS
              </div>
              <table className="gov-table w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#EAEAEA] border-b border-[#CCCCCC]">
                    <th className="py-1.5 px-2 text-[10px] uppercase font-bold">SUBJECT</th>
                    <th className="py-1.5 px-2 text-[10px] uppercase font-bold text-right">MARKS</th>
                    <th className="py-1.5 px-2 text-[10px] uppercase font-bold text-center">GRADE</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingReport.reportData?.students?.[0]?.results?.map((result: any, idx: number) => (
                    <tr key={idx} className="border-b border-[#E5E7EB]">
                      <td className="py-1.5 px-2 font-medium">{result.subject}</td>
                      <td className="py-1.5 px-2 text-right font-bold">
                        {result.marks_obtained} / {result.total_marks}
                      </td>
                      <td className="py-1.5 px-2 text-center font-bold">{result.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#CCCCCC]">
              <button
                type="button"
                onClick={() => handleDownloadPDF(viewingReport)}
                className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD OFFICIAL PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingReport(null)}
                className="gov-btn gov-btn-secondary gov-btn-sm"
              >
                CLOSE
              </button>
            </div>
          </div>
        </NativeModal>
      )}
    </div>
  );
}
