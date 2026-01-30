import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { useSnapshot } from '../../../hooks/useSnapshot';
import { getCachedReport } from '../../../services/reportCache';
import { GlassCard } from '../../../components/Glass/GlassCard';
import { GlassPanel } from '../../../components/Glass/GlassPanel';
import { Download, Search, Eye } from 'lucide-react';

export default function ReportViewer() {
  const [searchParams] = useSearchParams();
  const snapshotId = searchParams.get('snapshot') || '';
  const { user } = useAuthStore();
  const { snapshot, loading: snapshotLoading } = useSnapshot(snapshotId);

  const [generatedReports, setGeneratedReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [viewingReport, setViewingReport] = useState<any | null>(null);
  const [classes, setClasses] = useState<string[]>([]);

  useEffect(() => {
    if (!snapshotId) return;

    const fetchReports = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('generated_reports')
          .select('*, students(student_id, name, current_class, admission_number)')
          .eq('snapshot_id', snapshotId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          setGeneratedReports(data);
          // Extract unique classes
          const uniqueClasses = [...new Set(
            data
              .map((r: any) => r.students?.current_class)
              .filter(Boolean)
          )];
          setClasses(uniqueClasses);
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [snapshotId]);

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
        // Download from cached PDF URL
        window.open(report.pdf_url, '_blank');
      } else {
        // Generate PDF on demand (should be rare)
        const response = await fetch(`${import.meta.env.VITE_PDF_API_URL || 'http://localhost:3001'}/api/pdf/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            snapshotId,
            studentIds: [report.student_id],
            templateId: report.template_id,
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${report.students?.name || 'report'}_${snapshotId}.pdf`;
          a.click();
        }
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
    }
  };

  if (snapshotLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Generated Reports</h1>
        {snapshot && (
          <span className="text-sm text-muted-foreground">
            Term {snapshot.term} {snapshot.year} - {generatedReports.length} reports
          </span>
        )}
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search</label>
            <div className="glass-subtle glass-rounded px-4 py-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or admission number..."
                className="bg-transparent border-none outline-none flex-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="input-glass w-full"
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
      </GlassCard>

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReports.map((report: any) => {
          const student = report.students;
          const reportData = report.report_data;
          const summary = reportData?.students?.[0]?.summary;

          return (
            <GlassCard
              key={report.id}
              title={student?.name || 'Unknown Student'}
              subtitle={`${student?.current_class || ''} - ${student?.admission_number || ''}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Average:</span>
                  <span className="font-semibold">
                    {summary?.average ? summary.average.toFixed(2) + '%' : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Position:</span>
                  <span className="font-semibold">
                    {summary?.classPosition || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Division:</span>
                  <span className="font-semibold">
                    {summary?.division || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Generated:</span>
                  <span className="text-sm">
                    {new Date(report.generated_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-2 pt-4 border-t border-white/20">
                  <button
                    onClick={() => handleViewReport(report)}
                    className="btn-glass flex-1 flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(report)}
                    className="btn-glass flex-1 flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {filteredReports.length === 0 && (
        <GlassCard className="text-center py-12">
          <p className="text-muted-foreground">
            {generatedReports.length === 0
              ? 'No reports generated yet. Generate reports first.'
              : 'No reports match your filters.'}
          </p>
        </GlassCard>
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
            <div className="glass-subtle glass-rounded p-4">
              <h3 className="font-semibold mb-2">Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Average:</span>{' '}
                  {viewingReport.reportData?.students?.[0]?.summary?.average?.toFixed(2) || 'N/A'}%
                </div>
                <div>
                  <span className="text-muted-foreground">Position:</span>{' '}
                  {viewingReport.reportData?.students?.[0]?.summary?.classPosition || 'N/A'}
                </div>
                <div>
                  <span className="text-muted-foreground">Division:</span>{' '}
                  {viewingReport.reportData?.students?.[0]?.summary?.division || 'N/A'}
                </div>
                <div>
                  <span className="text-muted-foreground">Aggregate:</span>{' '}
                  {viewingReport.reportData?.students?.[0]?.summary?.aggregate?.toFixed(2) || 'N/A'}
                </div>
              </div>
            </div>

            <div className="glass-subtle glass-rounded p-4">
              <h3 className="font-semibold mb-2">Subjects</h3>
              <div className="space-y-2">
                {viewingReport.reportData?.students?.[0]?.results?.map((result: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span>{result.subject}</span>
                    <span className="font-semibold">
                      {result.marks_obtained} / {result.total_marks} ({result.grade})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => handleDownloadPDF(viewingReport)}
                className="btn-glass flex-1 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
              <button
                onClick={() => setViewingReport(null)}
                className="btn-glass flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </GlassModal>
      )}
    </div>
  );
}

