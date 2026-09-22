import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useParentPortal } from '@/context/ParentPortalContext';
import { useUIStore } from '@/store/uiStore';
import { displayStudentName } from '@/lib/parentPortalUtils';
import {
  PenTool,
  ArrowLeft,
  Calendar,
  Award,
  BookOpen,
  ChevronRight,
  FileText,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

interface ExamSet {
  id: string;
  name: string | null;
  term: number | null;
  year: number | null;
}

export default function ParentExamsPage() {
  const navigate = useNavigate();
  const { schoolId, ready, children, activeStudentId } = useParentPortal();
  const child = children.find((c) => c.student_id === activeStudentId) || children[0] || null;
  const className = child?.current_class ? String(child.current_class) : '';

  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [rows, setRows] = useState<ExamSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !schoolId || !className) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('exam_sets')
        .select('id, name, term, year, target_classes, is_active')
        .eq('school_id', schoolId)
        .order('year', { ascending: false })
        .order('term', { ascending: false })
        .limit(40);
      if (cancelled) return;
      const raw = (data || []) as {
        id: string;
        name?: string;
        term?: number;
        year?: number;
        target_classes?: string[] | null;
        is_active?: boolean;
      }[];
      const filtered = raw.filter((e) => {
        if (e.is_active !== true) return false;
        const tc = e.target_classes;
        if (!tc?.length) return true;
        return tc.includes(className);
      });
      setRows(
        filtered.map((e) => ({
          id: e.id,
          name: e.name ?? null,
          term: e.term ?? null,
          year: e.year ?? null,
        }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, schoolId, className]);

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
                  backgroundColor: isDark ? 'rgba(79,142,247,0.15)' : 'rgba(37,99,235,0.12)',
                  color: t.blue,
                  fontFamily: SORA,
                }}
              >
                EXAMINATIONS & EVALUATIONS
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
              style={{ fontFamily: SORA, color: t.textHi }}
            >
              Term Exam Sets & Results
            </h1>
            <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
              Standardized examination sessions scheduled and published for{' '}
              <span className="font-semibold" style={{ color: t.mint }}>
                {child ? displayStudentName(child) : 'your child'}
              </span>
              {className ? ` (${className})` : ''}.
            </p>
          </div>
        </div>
      </div>

      {/* Exam Sets List */}
      <div
        className="p-5 sm:p-6 rounded-3xl shadow-sm space-y-4"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
              Term Assessment Sets Catalog
            </span>
          </div>
          <span className="text-xs" style={{ color: t.textLow }}>
            {rows.length} Exam Periods
          </span>
        </div>

        {!className ? (
          <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
            Please link a student with an active class to view relevant exams.
          </div>
        ) : loading ? (
          <div className="py-12 text-center text-xs font-medium" style={{ color: t.textLow }}>
            Loading exam sets...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
            No exam periods published for this class yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rows.map((e) => (
              <div
                key={e.id}
                className="p-4 rounded-2xl flex flex-col justify-between transition-all hover:scale-[1.01]"
                style={{
                  backgroundColor: t.fieldBg,
                  border: `1px solid ${t.stroke}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                      style={{
                        backgroundColor: isDark ? 'rgba(79,142,247,0.15)' : 'rgba(37,99,235,0.1)',
                        color: t.blue,
                      }}
                    >
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: t.textHi }}>
                        {e.name || 'Term Examination'}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: t.textMid }}>
                        Term {e.term ?? '—'} • Academic Year {e.year ?? '—'}
                      </div>
                    </div>
                  </div>

                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-semibold"
                    style={{
                      backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                      color: t.mint,
                    }}
                  >
                    Published
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t text-xs" style={{ borderColor: t.divider }}>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/parent/performance')}
                    className="flex items-center gap-1 font-semibold hover:underline"
                    style={{ color: t.blue }}
                  >
                    <span>View Subject Marks</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/parent/reports')}
                    className="flex items-center gap-1 font-semibold hover:underline"
                    style={{ color: t.mint }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Report Card</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
