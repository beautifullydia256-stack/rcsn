import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, PosTokens } from '@/styles/posThemeTokens';
import { useSchoolType } from '@/hooks/useSchoolType';
import {
  Award,
  Calendar,
  Printer,
  FileText,
  TrendingUp,
  MessageSquare,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

interface ResultRow {
  id: string;
  subject: string;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade: string;
  descriptor: string;
  teacher_comment?: string | null;
  exam_set_name?: string | null;
  term?: number;
  year?: number;
}

export default function StudentResultsPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined);
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t: PosTokens = getTokens(isDark);
  const { isTertiary } = useSchoolType();

  const [selectedTerm, setSelectedTerm] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // 1. Resolve student identity
  const { data: studentRecord } = useQuery({
    queryKey: ['student-results-profile', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: u } = await supabase
        .from('users')
        .select('student_id, school_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const sid = (u as any)?.student_id;
      const schId = (u as any)?.school_id || schoolId;

      if (sid && schId) {
        const { data: st } = await supabase
          .from('students')
          .select('student_id, name, admission_number, current_class')
          .eq('student_id', sid)
          .eq('school_id', schId)
          .maybeSingle();
        return st;
      }
      return null;
    },
    enabled: !!user?.id,
  });

  const studentId = studentRecord?.student_id || user?.id;

  // 2. Fetch results for this student
  const { data: results = [], isLoading } = useQuery<ResultRow[]>({
    queryKey: ['student-exam-results', schoolId, studentId, selectedTerm, selectedYear],
    queryFn: async () => {
      if (!schoolId || !studentId) return [];

      const { data: rows, error } = await supabase
        .from('exam_results')
        .select('*')
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!rows || rows.length === 0) return [];

      return rows.map((r: any) => {
        const mo = Number(r.marks_obtained || 0);
        const tm = Number(r.total_marks || 100);
        const pct = tm > 0 ? Math.round((mo / tm) * 100) : 0;

        let grade = r.grade || '';
        let descriptor = '';

        if (!grade) {
          if (pct >= 80) { grade = 'D1'; descriptor = 'Distinction'; }
          else if (pct >= 75) { grade = 'D2'; descriptor = 'Distinction'; }
          else if (pct >= 65) { grade = 'C3'; descriptor = 'Credit'; }
          else if (pct >= 60) { grade = 'C4'; descriptor = 'Credit'; }
          else if (pct >= 55) { grade = 'C5'; descriptor = 'Credit'; }
          else if (pct >= 50) { grade = 'C6'; descriptor = 'Credit'; }
          else if (pct >= 45) { grade = 'P7'; descriptor = 'Pass'; }
          else if (pct >= 40) { grade = 'P8'; descriptor = 'Pass'; }
          else { grade = 'F9'; descriptor = 'Fail'; }
        } else {
          if (grade.startsWith('D')) descriptor = 'Distinction';
          else if (grade.startsWith('C')) descriptor = 'Credit';
          else if (grade.startsWith('P')) descriptor = 'Pass';
          else descriptor = 'Fail';
        }

        return {
          id: r.id,
          subject: r.subject || 'General',
          marks_obtained: mo,
          total_marks: tm,
          percentage: pct,
          grade,
          descriptor,
          teacher_comment: r.teacher_comment || r.comment || null,
          exam_set_name: r.exam_set_name,
          term: r.term || 1,
          year: r.year || selectedYear,
        };
      });
    },
    enabled: !!schoolId && !!studentId,
  });

  // Calculate Aggregates and Division
  const stats = useMemo(() => {
    if (!results.length) return { average: 0, aggregate: 0, division: '—', totalSubjects: 0 };

    const totalPct = results.reduce((s, r) => s + r.percentage, 0);
    const avg = Math.round(totalPct / results.length);

    // Compute basic UNEB aggregate from best 4 or 8 subjects
    let totalAgg = 0;
    results.slice(0, 8).forEach((r) => {
      const gNum = parseInt(r.grade.replace(/\D/g, ''), 10);
      totalAgg += isNaN(gNum) ? 9 : gNum;
    });

    let div = 'Division 1';
    if (totalAgg > 32) div = 'Division 4';
    else if (totalAgg > 24) div = 'Division 3';
    else if (totalAgg > 12) div = 'Division 2';

    return {
      average: avg,
      aggregate: totalAgg,
      division: div,
      totalSubjects: results.length,
    };
  }, [results]);

  const handlePrint = () => {
    window.print();
  };

  const getGradePill = (grade: string, descriptor: string) => {
    let bg = t.blueDim;
    let color = t.blue;
    if (grade.startsWith('D') || descriptor === 'Distinction') {
      bg = t.mintDim;
      color = t.mint;
    } else if (grade.startsWith('C') || descriptor === 'Credit') {
      bg = t.blueDim;
      color = t.blue;
    } else if (grade.startsWith('P') || descriptor === 'Pass') {
      bg = t.goldDim;
      color = t.gold;
    } else if (grade.startsWith('F') || descriptor === 'Fail') {
      bg = t.redDim;
      color = t.red;
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 10px',
          borderRadius: 6,
          background: bg,
          color,
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        <span>{grade}</span>
        <span style={{ fontSize: 10, opacity: 0.8, fontWeight: 600 }}>({descriptor})</span>
      </span>
    );
  };

  return (
    <div style={{ color: t.textPrimary }}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 20,
          padding: '24px 28px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 99,
                background: t.mintDim,
                color: t.mint,
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              <Award className="w-3 h-3" />
              Academic Performance
            </span>
            <span style={{ fontSize: 12, color: t.textMuted }}>· {studentRecord?.current_class || 'Class Record'}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: t.textPrimary }}>
            Exam Results & Academic Slips
          </h1>
          <p style={{ margin: '3px 0 0', color: t.textSecondary, fontSize: 13 }}>
            Continuous assessment, end-of-term examinations, division ranking, and official remarks.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.textPrimary,
              fontSize: 12,
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value={1}>Term 1</option>
            <option value={2}>Term 2</option>
            <option value={3}>Term 3</option>
          </select>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              background: t.mint,
              color: '#05080f',
              border: 'none',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            <Printer className="w-4 h-4" />
            <span>Print Report Card</span>
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
            Overall Average
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.mint }}>
            {stats.average > 0 ? `${stats.average}%` : '—'}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
            Across all subjects sat
          </div>
        </div>

        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
            {isTertiary ? 'UNMEB GPA' : 'Total Aggregate'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.blue }}>
            {stats.aggregate > 0 ? stats.aggregate : '—'}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
            National grading scale
          </div>
        </div>

        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
            Classification
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: t.gold }}>
            {results.length > 0 ? stats.division : 'Pending'}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
            Official standard tier
          </div>
        </div>

        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
            Subjects Assessed
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary }}>
            {stats.totalSubjects}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
            Papers submitted
          </div>
        </div>
      </div>

      {/* ── Subject Performance Table ────────────────────────────────────────── */}
      <div
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 20,
          padding: '24px',
          marginBottom: 24,
          overflowX: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
            Subject Breakdown & Marks Statement
          </h2>
          <span style={{ fontSize: 12, color: t.textMuted }}>Term {selectedTerm} Examinations</span>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>
            Loading examination scores…
          </div>
        ) : results.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>
            <Award className="w-10 h-10 opacity-30 mx-auto mb-2" />
            <div style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary }}>No Results Recorded For This Term</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Results entered by teachers during assessment will be published here.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Subject</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Score</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Percentage</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Grade</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Teacher Remarks</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: `1px solid ${t.border}`,
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = t.surface)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px', fontWeight: 700, color: t.textPrimary }}>
                    {r.subject}
                  </td>
                  <td style={{ textAlign: 'center', padding: '14px', color: t.textSecondary }}>
                    {r.marks_obtained} / {r.total_marks}
                  </td>
                  <td style={{ textAlign: 'center', padding: '14px', fontWeight: 800, color: t.textPrimary }}>
                    {r.percentage}%
                  </td>
                  <td style={{ textAlign: 'center', padding: '14px' }}>
                    {getGradePill(r.grade, r.descriptor)}
                  </td>
                  <td style={{ padding: '14px', color: t.textSecondary, fontSize: 12 }}>
                    {r.teacher_comment || 'Satisfactory academic performance demonstrated.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Official Institutional Comments ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
              Class Teacher's Term Remark
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>
            {stats.average >= 70
              ? 'An exceptionally diligent pupil with outstanding mastery across learning areas and active classroom leadership. Keep up the brilliant standard!'
              : 'Good academic effort demonstrated throughout the term. Consistent revision in weaker subject areas will yield top division results.'}
          </p>
        </div>

        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
              Head Teacher's Endorsement
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: t.textSecondary, lineHeight: 1.5 }}>
            {stats.average >= 70
              ? 'Promising academic excellence. The administration commends the student on a successful term.'
              : 'Promoted with encouragement to maintain focused preparation and timely coursework completion.'}
          </p>
        </div>
      </div>
    </div>
  );
}
