import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useSnapshot } from '../../../hooks/useSnapshot';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { GlassModal } from '../../../components/Glass/GlassModal';
import { Download, Search, Eye } from 'lucide-react';

export default function ReportViewer() {
  const [searchParams] = useSearchParams();
  const snapshotId = searchParams.get('snapshot') || '';
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
      <AdminPageWrapper title="Generated Reports">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
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
            <label className="block text-sm font-medium text-gray-200 mb-2">Search</label>
            <div className="rounded-lg border border-gray-600 bg-[#0f172a] px-4 py-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or admission number..."
                className="bg-transparent border-none outline-none flex-1 text-white placeholder-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Filter by Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-[#0f172a] px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <p className="text-sm text-gray-400">{student?.current_class || ''} - {student?.admission_number || ''}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Average:</span>
                  <span className="font-semibold text-white">
                    {summary?.average ? summary.average.toFixed(2) + '%' : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Position:</span>
                  <span className="font-semibold text-white">
                    {summary?.classPosition || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Division:</span>
                  <span className="font-semibold text-white">
                    {summary?.division || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Generated:</span>
                  <span className="text-sm text-gray-300">
                    {new Date(report.generated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-gray-600">
                <button
                  onClick={() => handleViewReport(report)}
                  className="flex-1 rounded-lg border border-gray-600 bg-[#1e293b] px-4 py-2 text-sm text-gray-200 hover:bg-white/5 flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => handleDownloadPDF(report)}
                  className="flex-1 rounded-lg border border-gray-600 bg-[#1e293b] px-4 py-2 text-sm text-gray-200 hover:bg-white/5 flex items-center justify-center gap-2"
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
          <p className="text-gray-400">
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
            <div className="rounded-lg border border-gray-600 bg-[#1e293b] p-4">
              <h3 className="font-semibold text-white mb-2">Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-200">
                <div><span className="text-gray-400">Average:</span> {viewingReport.reportData?.students?.[0]?.summary?.average?.toFixed(2) || 'N/A'}%</div>
                <div><span className="text-gray-400">Position:</span> {viewingReport.reportData?.students?.[0]?.summary?.classPosition || 'N/A'}</div>
                <div><span className="text-gray-400">Division:</span> {viewingReport.reportData?.students?.[0]?.summary?.division || 'N/A'}</div>
                <div><span className="text-gray-400">Aggregate:</span> {viewingReport.reportData?.students?.[0]?.summary?.aggregate?.toFixed(2) || 'N/A'}</div>
              </div>
            </div>
            <div className="rounded-lg border border-gray-600 bg-[#1e293b] p-4">
              <h3 className="font-semibold text-white mb-2">Subjects</h3>
              <div className="space-y-2">
                {viewingReport.reportData?.students?.[0]?.results?.map((result: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm text-gray-200">
                    <span>{result.subject}</span>
                    <span className="font-semibold text-white">{result.marks_obtained} / {result.total_marks} ({result.grade})</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => handleDownloadPDF(viewingReport)}
                className="flex-1 rounded-lg border border-gray-600 bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
              <button
                onClick={() => setViewingReport(null)}
                className="flex-1 rounded-lg border border-gray-600 bg-[#1e293b] px-4 py-3 font-medium text-gray-200 hover:bg-white/5"
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

