import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useParentPortal } from '@/context/ParentPortalContext';
import { useUIStore } from '@/store/uiStore';
import { displayStudentName } from '@/lib/parentPortalUtils';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Search,
  Filter,
  ArrowLeft,
  Sparkles,
  Award,
  MessageSquare,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';
import { Link } from 'react-router-dom';

interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  teacher_name: string;
  assigned_date: string;
  due_date: string;
  status: 'Submitted & Graded' | 'Submitted' | 'Pending Submission' | 'Overdue';
  score?: string | null;
  teacher_feedback?: string | null;
  description: string;
}

const SAMPLE_ASSIGNMENTS: AssignmentItem[] = [
  {
    id: 'a1',
    title: 'Fractions & Percentage Word Problems (Exercise 4B)',
    subject: 'Mathematics',
    teacher_name: 'Mr. Kato Brian',
    assigned_date: 'Sep 19, 2026',
    due_date: 'Sep 23, 2026 (Tomorrow)',
    status: 'Pending Submission',
    score: null,
    teacher_feedback: null,
    description: 'Solve questions 1 through 15 on page 78 of Primary Mathematics Pupil Book. Show full working steps for word problems.',
  },
  {
    id: 'a2',
    title: 'Creative Composition: My Memorable School Journey',
    subject: 'English Language',
    teacher_name: 'Mrs. Namukasa Sarah',
    assigned_date: 'Sep 16, 2026',
    due_date: 'Sep 21, 2026',
    status: 'Submitted & Graded',
    score: '18 / 20 (Grade A)',
    teacher_feedback: 'Excellent vocabulary and clear paragraph transitions. Keep practicing creative metaphors!',
    description: 'Write an imaginative 250-word story with a clear beginning, climax, and moral lesson.',
  },
  {
    id: 'a3',
    title: 'Diagram of Human Digestive System & Tooth Structure',
    subject: 'Integrated Science',
    teacher_name: 'Mr. Ssebaggala Ronald',
    assigned_date: 'Sep 18, 2026',
    due_date: 'Sep 25, 2026',
    status: 'Pending Submission',
    score: null,
    teacher_feedback: null,
    description: 'Draw and label the human digestive tract, indicating salivary glands, esophagus, stomach, liver, and intestine functions.',
  },
  {
    id: 'a4',
    title: 'East African Physical Features Map & Climate Zones',
    subject: 'Social Studies',
    teacher_name: 'Ms. Nabirye Grace',
    assigned_date: 'Sep 12, 2026',
    due_date: 'Sep 17, 2026',
    status: 'Submitted & Graded',
    score: '15 / 20 (Grade B+)',
    teacher_feedback: 'Well shaded relief regions. Next time please include the map compass rose and key.',
    description: 'Sketch the map of Uganda, Kenya, and Tanzania labeling Mount Rwenzori, Lake Victoria, and Rift Valley.',
  },
];

export default function ParentAssignmentsPage() {
  const { schoolId, ready, children, activeStudentId } = useParentPortal();
  const child = children.find((c) => c.student_id === activeStudentId) || children[0] || null;

  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'PENDING' | 'GRADED'>('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');

  // Supabase real query with fallback
  const { data: assignments = SAMPLE_ASSIGNMENTS, isLoading } = useQuery({
    queryKey: ['parent-assignments', schoolId, child?.student_id],
    queryFn: async () => {
      if (!schoolId || !child) return SAMPLE_ASSIGNMENTS;
      const { data } = await supabase
        .from('assignments')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      if (!data || data.length === 0) return SAMPLE_ASSIGNMENTS;
      return data as any[];
    },
    enabled: !!schoolId && !!child,
  });

  const subjects = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach((a) => set.add(a.subject));
    return Array.from(set);
  }, [assignments]);

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q);

      const matchSubject = selectedSubject === 'ALL' || a.subject === selectedSubject;

      let matchStatus = true;
      if (selectedStatus === 'PENDING') matchStatus = a.status.includes('Pending') || a.status.includes('Overdue');
      else if (selectedStatus === 'GRADED') matchStatus = a.status.includes('Graded');

      return matchSearch && matchSubject && matchStatus;
    });
  }, [assignments, search, selectedSubject, selectedStatus]);

  const pendingCount = assignments.filter((a) => a.status.includes('Pending') || a.status.includes('Overdue')).length;
  const gradedCount = assignments.filter((a) => a.status.includes('Graded')).length;

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
                  backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(147,51,234,0.12)',
                  color: '#a855f7',
                  fontFamily: SORA,
                }}
              >
                STUDENT COURSEWORK TRACKER
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
              style={{ fontFamily: SORA, color: t.textHi }}
            >
              Homework & Assignments
            </h1>
            <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
              Track daily tasks, submission deadlines, teacher feedback, and scores for{' '}
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
              Total Assignments
            </span>
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {assignments.length}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Assigned for current term
          </div>
        </div>

        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{ background: cardGrad(isDark), border: `1px solid ${t.stroke}` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Pending Tasks
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {pendingCount}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Action required by student
          </div>
        </div>

        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{ background: cardGrad(isDark), border: `1px solid ${t.stroke}` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Graded & Reviewed
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {gradedCount}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            With teacher feedback & marks
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div
        className="p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm"
        style={{ background: t.panel, border: `1px solid ${t.stroke}` }}
      >
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.textLow }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assignment title, topic..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm outline-none"
            style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold outline-none cursor-pointer"
            style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
          >
            <option value="ALL">All Subjects ({subjects.length})</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}` }}>
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'PENDING', label: 'Pending' },
                { id: 'GRADED', label: 'Graded' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStatus(s.id)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: selectedStatus === s.id ? (isDark ? 'rgba(255,255,255,0.12)' : '#ffffff') : 'transparent',
                  color: selectedStatus === s.id ? t.textHi : t.textLow,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assignment Cards List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div
            className="p-12 text-center rounded-2xl"
            style={{ background: t.panel, border: `1px solid ${t.stroke}` }}
          >
            <BookOpen className="w-10 h-10 mx-auto mb-2 text-purple-400" />
            <div className="font-semibold text-sm" style={{ color: t.textHi }}>
              No homework found
            </div>
            <p className="text-xs mt-1" style={{ color: t.textLow }}>
              There are no tasks matching your filters.
            </p>
          </div>
        ) : (
          filtered.map((a) => {
            const isGraded = a.status.includes('Graded');
            const isPending = a.status.includes('Pending');

            return (
              <div
                key={a.id}
                className="p-5 rounded-2xl shadow-sm space-y-3 transition-all"
                style={{
                  backgroundColor: t.panel,
                  border: `1px solid ${t.stroke}`,
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: isDark ? 'rgba(79,142,247,0.15)' : 'rgba(37,99,235,0.12)',
                        color: t.blue,
                      }}
                    >
                      {a.subject}
                    </span>
                    <span className="text-xs" style={{ color: t.textLow }}>
                      Teacher: {a.teacher_name}
                    </span>
                  </div>

                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold self-start sm:self-auto"
                    style={{
                      backgroundColor: isGraded
                        ? isDark
                          ? 'rgba(16,217,168,0.15)'
                          : 'rgba(16,185,129,0.12)'
                        : isPending
                        ? isDark
                          ? 'rgba(245,158,11,0.15)'
                          : 'rgba(217,119,6,0.12)'
                        : isDark
                        ? 'rgba(79,142,247,0.15)'
                        : 'rgba(37,99,235,0.12)',
                      color: isGraded ? t.mint : isPending ? t.gold : t.blue,
                    }}
                  >
                    {a.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold tracking-tight" style={{ color: t.textHi }}>
                    {a.title}
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: t.textMid }}>
                    {a.description}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t text-xs" style={{ borderColor: t.divider }}>
                  <div className="flex items-center gap-4 text-[11px]" style={{ color: t.textLow }}>
                    <span>Assigned: {a.assigned_date}</span>
                    <span className="font-semibold" style={{ color: isPending ? t.gold : t.textLow }}>
                      Due: {a.due_date}
                    </span>
                  </div>

                  {a.score && (
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-500" />
                      <span className="font-bold text-emerald-500 font-mono">
                        Score: {a.score}
                      </span>
                    </div>
                  )}
                </div>

                {a.teacher_feedback && (
                  <div
                    className="p-3 rounded-xl text-xs flex items-start gap-2 mt-2"
                    style={{
                      backgroundColor: isDark ? 'rgba(16,217,168,0.06)' : 'rgba(16,185,129,0.05)',
                      border: `1px solid ${isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.15)'}`,
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: t.mint }} />
                    <div>
                      <span className="font-bold mr-1" style={{ color: t.mint }}>Teacher Remark:</span>
                      <span style={{ color: t.textHi }}>{a.teacher_feedback}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
