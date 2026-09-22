import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useParentPortal } from '@/context/ParentPortalContext';
import { useUIStore } from '@/store/uiStore';
import { displayStudentName } from '@/lib/parentPortalUtils';
import {
  BarChart3,
  ArrowLeft,
  Award,
  Sparkles,
  TrendingUp,
  BookOpen,
  GraduationCap,
  ChevronRight,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

type Row = {
  subject: string | null;
  marks_obtained: number | null;
  total_marks: number | null;
  grade: string | null;
};

export default function ParentPerformancePage() {
  const { schoolId, ready, children, activeStudentId } = useParentPortal();
  const child = children.find((c) => c.student_id === activeStudentId) || children[0] || null;
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !schoolId || !child) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('exam_results')
        .select('subject, marks_obtained, total_marks, grade')
        .eq('school_id', schoolId)
        .eq('student_id', child.student_id)
        .order('subject');
      if (!cancelled) {
        setRows((data as Row[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, schoolId, child]);

  // Aggregate metrics
  const stats = useMemo(() => {
    if (!rows.length) return { avg: 0, best: null, count: 0 };
    let sum = 0;
    let bestSub = rows[0];
    let bestPct = 0;

    rows.forEach((r) => {
      const tot = Number(r.total_marks || 100);
      const obt = Number(r.marks_obtained || 0);
      const pct = tot > 0 ? (obt / tot) * 100 : 0;
      sum += pct;
      if (pct > bestPct) {
        bestPct = pct;
        bestSub = r;
      }
    });

    return {
      avg: Math.round(sum / rows.length),
      best: bestSub,
      count: rows.length,
    };
  }, [rows]);

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
                ACADEMIC PERFORMANCE
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
              style={{ fontFamily: SORA, color: t.textHi }}
            >
              Continuous Assessment & Marks
            </h1>
            <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
              Published assessment marks, grades, and subject competencies for{' '}
              <span className="font-semibold" style={{ color: t.mint }}>
                {child ? displayStudentName(child) : 'your child'}
              </span>
              .
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{ background: cardGrad(isDark), border: `1px solid ${t.stroke}` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Assessed Subjects
            </span>
            <BookOpen className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {stats.count}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Published in term record
          </div>
        </div>

        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{ background: cardGrad(isDark), border: `1px solid ${t.stroke}` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Overall Mean Average
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.mint }}>
            {stats.avg}%
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Division 1 performance track
          </div>
        </div>

        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{ background: cardGrad(isDark), border: `1px solid ${t.stroke}` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Top Performing Subject
            </span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold mt-2 truncate tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {stats.best?.subject || '—'}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Highest score achieved
          </div>
        </div>
      </div>

      {/* Subject Performance List */}
      <div
        className="p-5 sm:p-6 rounded-3xl shadow-sm space-y-4"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
          <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            Subject Marks Breakdown
          </span>
          <span className="text-xs" style={{ color: t.textLow }}>
            {rows.length} Subjects Evaluated
          </span>
        </div>

        {!child ? (
          <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
            Please link a student to review academic performance.
          </div>
        ) : loading ? (
          <div className="py-12 text-center text-xs font-medium" style={{ color: t.textLow }}>
            Loading marks record...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
            No assessment results published for this term yet.
          </div>
        ) : (
          <div className="space-y-3.5">
            {rows.map((r) => {
              const tot = Number(r.total_marks || 0);
              const mo = Number(r.marks_obtained || 0);
              const pc = tot > 0 ? Math.round((mo / tot) * 100) : null;
              const barColor =
                pc == null ? t.textLow : pc >= 75 ? t.mint : pc >= 50 ? t.gold : t.red;

              return (
                <div
                  key={`${r.subject}-${tot}-${mo}`}
                  className="p-4 rounded-2xl transition-all"
                  style={{
                    backgroundColor: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm" style={{ color: t.textHi }}>
                        {r.subject || 'Subject'}
                      </span>
                      {r.grade && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: isDark ? 'rgba(79,142,247,0.15)' : 'rgba(37,99,235,0.12)',
                            color: t.blue,
                          }}
                        >
                          Grade: {r.grade}
                        </span>
                      )}
                    </div>

                    <div className="font-mono font-bold text-xs sm:text-sm" style={{ color: barColor }}>
                      {pc != null ? `${pc}%` : '—'} • {mo} / {tot || '—'}
                    </div>
                  </div>

                  {pc != null && (
                    <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, pc)}%`, backgroundColor: barColor }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
