import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useParentPortal } from '@/context/ParentPortalContext';
import { useUIStore } from '@/store/uiStore';
import { displayStudentName } from '@/lib/parentPortalUtils';
import {
  FileText,
  ArrowLeft,
  Download,
  Eye,
  Calendar,
  CheckCircle2,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

const SIGNED_URL_TTL_SEC = 3600;

type Exam = { id: string; name: string | null };
type PubRow = {
  id: string;
  student_id: string;
  term: number;
  year: number;
  exam_set_id: string;
  published_at: string;
  storage_object_path: string;
};

type DisplayRow = {
  id: string;
  studentId: string;
  studentName: string;
  term: number;
  year: number;
  examLabel: string;
  publishedAt: string;
  pdfUrl: string | null;
};

export default function ParentReportsPage() {
  const { ready, children } = useParentPortal();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const studentIds = children.map((c) => c.student_id);
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ready || studentIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: published, error } = await supabase
      .from('published_student_reports')
      .select('id, student_id, term, year, exam_set_id, published_at, storage_object_path')
      .in('student_id', studentIds)
      .order('published_at', { ascending: false });

    if (error || !published?.length) {
      setRows([]);
      setLoading(false);
      return;
    }

    const list = published as PubRow[];
    const examIds = [...new Set(list.map((r) => r.exam_set_id))];
    let examMap = new Map<string, string>();
    if (examIds.length) {
      const { data: exams } = await supabase.from('exam_sets').select('id, name').in('id', examIds);
      examMap = new Map((exams as Exam[] | null | undefined)?.map((e) => [e.id, e.name || '']) || []);
    }

    const nameById = new Map(children.map((c) => [c.student_id, displayStudentName(c)]));
    const out: DisplayRow[] = [];

    for (const r of list) {
      const { data: signed, error: signErr } = await supabase.storage
        .from('published-reports')
        .createSignedUrl(r.storage_object_path, SIGNED_URL_TTL_SEC);

      out.push({
        id: r.id,
        studentId: r.student_id,
        studentName: nameById.get(r.student_id) || 'Student',
        term: r.term,
        year: r.year,
        examLabel: examMap.get(r.exam_set_id) || 'Term Report Card',
        publishedAt: r.published_at,
        pdfUrl: signErr ? null : signed?.signedUrl ?? null,
      });
    }

    setRows(out);
    setLoading(false);
  }, [ready, studentIds.join('|'), children]);

  useEffect(() => {
    void load();
  }, [load]);

  const download = (url: string, label: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = `${label.replace(/\s+/g, '-').slice(0, 80)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          to="/dashboard/parent"
          className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline mb-2"
          style={{ color: t.mint }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md"
                style={{
                  backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                  color: t.mint,
                  fontFamily: SORA,
                }}
              >
                OFFICIAL REPORT CARDS
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
              style={{ fontFamily: SORA, color: t.textHi }}
            >
              Term Report Cards & Slips
            </h1>
            <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
              Download or preview published end-of-term academic report cards, teacher comments, and head teacher signatures.
            </p>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div
        className="p-5 sm:p-6 rounded-3xl shadow-sm space-y-4"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
              Published Student Reports
            </span>
          </div>
          <span className="text-xs" style={{ color: t.textLow }}>
            {rows.length} Reports Available
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-medium" style={{ color: t.textLow }}>
            Checking published reports...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
            No report cards published online for your children yet. As soon as the administration uploads term reports, they will appear here automatically.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map((r) => (
              <div
                key={r.id}
                className="p-5 rounded-2xl flex flex-col justify-between transition-all hover:scale-[1.01]"
                style={{
                  backgroundColor: t.fieldBg,
                  border: `1px solid ${t.stroke}`,
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                        color: t.mint,
                      }}
                    >
                      Term {r.term} • Year {r.year}
                    </span>

                    <span className="text-[10px]" style={{ color: t.textLow }}>
                      {new Date(r.publishedAt).toLocaleDateString('en-UG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold mt-2" style={{ color: t.textHi }}>
                    {r.studentName}
                  </h3>
                  <div className="text-xs mt-0.5" style={{ color: t.textMid }}>
                    {r.examLabel}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t gap-2" style={{ borderColor: t.divider }}>
                  {r.pdfUrl ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewUrl(r.pdfUrl)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ color: t.textHi }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => download(r.pdfUrl!, `${r.studentName}-Term${r.term}-Report`)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
                        style={{
                          background: 'linear-gradient(135deg,#10d9a8,#0ea5e9)',
                          color: '#05080f',
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs" style={{ color: t.textLow }}>
                      PDF generating / link expired
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="w-full max-w-4xl h-[85vh] rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                  Report Card Document Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold hover:underline"
                  style={{ color: t.mint }}
                >
                  <span>Open Full Window</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 mt-3 rounded-2xl overflow-hidden bg-black/20">
              <iframe
                src={previewUrl}
                title="Report card preview"
                className="w-full h-full border-0 rounded-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
