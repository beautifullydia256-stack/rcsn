import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useSnapshot } from '../../../hooks/useSnapshot';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { GlassModal } from '../../../components/Glass/GlassModal';
import { formatAverageWhole } from '../../../lib/reportUtils';
import { pdfDownloadFilenameFromResponse } from '../../../lib/pdfAttachmentFilename';
import { isElectronDesktop } from '../../../lib/desktopPdf';
import { pdfApiHttpErrorMessage } from '../../../lib/pdfApiErrorMessage';
import { generatePdfBlobFromCachedGeneratedReport } from '../../../lib/generatePdfFromCachedReportRow';
import { Download, Search, Eye } from 'lucide-react';

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
  const snapshotId = searchParams.get('snapshot') || '';
  const { snapshot, loading: snapshotLoading } = useSnapshot(snapshotId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [viewingReport, setViewingReport] = useState<any | null>(null);

  const { data: generatedReports = [], isLoading: reportsLoading } = useQuery({
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

  const handleViewReport = async (report: any) => {
    try {
      // Get cached report data (instant, < 1 second)
      // Use report_data from database (already cached)
      setViewingReport({
        ...report,
        reportData: report.report_data,
      });
    } catch (err) {
      console.error('Error loading report:', err);
    }
  };

  const handleDownloadPDF = async (report: any) => {
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
    }
  };

  const loading = (snapshotLoading && !snapshot) || (reportsLoading && generatedReports.length === 0);
  const showSpinner = loading && !snapshot && generatedReports.length === 0;

  if (showSpinner) {
    return (
      <AdminPageWrapper title="Generated Reports">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-white"></div>
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      title="Generated Reports"
      subtitle={snapshot ? `Term ${snapshot.term} ${snapshot.year} - ${generatedReports.length} reports` : undefined}
    >
      {/* Filters */}
      <div className={`${adminCardClass}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/85 mb-2">Search</label>
            <div className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-white/70" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or admission number..."
                className="bg-transparent border-none outline-none flex-1 text-white placeholder-white/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/85 mb-2">Filter by Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReports.map((report: any) => {
          const student = report.students;
          const reportData = report.report_data;
          const summary = reportData?.students?.[0]?.summary;

          return (
            <div key={report.id} className={`${adminCardClass} space-y-3`}>
              <h3 className="text-lg font-semibold text-white">{student?.name || 'Unknown Student'}</h3>
              <p className="text-sm text-white/70">{student?.current_class || ''} - {student?.admission_number || ''}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Average:</span>
                  <span className="font-semibold text-white">
                    {summary?.average != null && summary?.average !== ''
                      ? `${formatAverageWhole(summary.average)}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Position:</span>
                  <span className="font-semibold text-white">
                    {summary?.classPosition || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Division:</span>
                  <span className="font-semibold text-white">
                    {summary?.division || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Generated:</span>
                  <span className="text-sm text-white/85">
                    {new Date(report.generated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-white/20">
                <button
                  onClick={() => handleViewReport(report)}
                  className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 flex items-center justify-center gap-2 backdrop-blur-xl"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => handleDownloadPDF(report)}
                  className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 flex items-center justify-center gap-2 backdrop-blur-xl"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredReports.length === 0 && (
        <div className={`${adminCardClass} text-center py-12`}>
          <p className="text-white/85">
            {generatedReports.length === 0
              ? 'No reports generated yet. Generate reports first.'
              : 'No reports match your filters.'}
          </p>
        </div>
      )}

      {/* Report Preview Modal */}
      {viewingReport && (
        <GlassModal
          isOpen={!!viewingReport}
          onClose={() => setViewingReport(null)}
          title={`Report: ${viewingReport.students?.name || 'Student'}`}
          size="xl"
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-4">
              <h3 className="font-semibold text-white mb-2">Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-white/85">
                <div>
                  <span className="text-white/70">Average:</span>{' '}
                  {(() => {
                    const a = viewingReport.reportData?.students?.[0]?.summary?.average;
                    if (a == null || a === '') return 'N/A';
                    return `${formatAverageWhole(a)}%`;
                  })()}
                </div>
                <div><span className="text-white/70">Position:</span> {viewingReport.reportData?.students?.[0]?.summary?.classPosition || 'N/A'}</div>
                <div><span className="text-white/70">Division:</span> {viewingReport.reportData?.students?.[0]?.summary?.division || 'N/A'}</div>
                <div><span className="text-white/70">Aggregate:</span> {viewingReport.reportData?.students?.[0]?.summary?.aggregate?.toFixed(2) || 'N/A'}</div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-4">
              <h3 className="font-semibold text-white mb-2">Subjects</h3>
              <div className="space-y-2">
                {viewingReport.reportData?.students?.[0]?.results?.map((result: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm text-white/85">
                    <span>{result.subject}</span>
                    <span className="font-semibold text-white">{result.marks_obtained} / {result.total_marks} ({result.grade})</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => handleDownloadPDF(viewingReport)}
                className="flex-1 rounded-xl border border-blue-500/50 bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
              <button
                onClick={() => setViewingReport(null)}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-medium text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        </GlassModal>
      )}
    </AdminPageWrapper>
  );
}

