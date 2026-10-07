import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, PosTokens } from '@/styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ChevronRight,
  ExternalLink,
  Award,
  Sparkles,
  Download,
} from 'lucide-react';

interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  instructions: string | null;
  due_date: string | null;
  total_marks: number;
  assignment_type: string;
  file_url: string | null;
  created_at: string;
  status: 'pending' | 'submitted' | 'graded';
  submission?: {
    id: string;
    submitted_at: string;
    status: string;
    grade: number | null;
    feedback: string | null;
    file_url: string | null;
    total_time_spent_seconds?: number | null;
  } | null;
}

export default function StudentAssignmentsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined);
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t: PosTokens = getTokens(isDark);

  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentItem | null>(null);

  // 1. Resolve student record
  const { data: studentRecord } = useQuery({
    queryKey: ['student-record', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: userData } = await supabase
        .from('users')
        .select('student_id, school_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const sid = (userData as any)?.student_id;
      const schId = (userData as any)?.school_id || schoolId;

      if (sid && schId) {
        const { data: st } = await supabase
          .from('students')
          .select('student_id, name, current_class')
          .eq('student_id', sid)
          .eq('school_id', schId)
          .maybeSingle();
        return st;
      }
      return null;
    },
    enabled: !!user?.id,
  });

  const className = studentRecord?.current_class;
  const studentId = studentRecord?.student_id || user?.id;

  // 2. Query assignments for student's class
  const { data: assignments = [], isLoading } = useQuery<AssignmentItem[]>({
    queryKey: ['student-assignments-list', schoolId, className, studentId],
    queryFn: async () => {
      if (!schoolId || !className) return [];

      const { data: asgns, error: asgnErr } = await supabase
        .from('assignments')
        .select('*')
        .eq('school_id', schoolId)
        .eq('class_name', className)
        .order('created_at', { ascending: false });

      if (asgnErr) throw asgnErr;
      if (!asgns || asgns.length === 0) return [];

      const asgnIds = asgns.map((a: any) => a.id);
      const { data: subs } = await supabase
        .from('assignment_submissions')
        .select('*')
        .in('assignment_id', asgnIds)
        .eq('student_id', studentId);

      const subMap = new Map<string, any>();
      (subs || []).forEach((s: any) => subMap.set(s.assignment_id, s));

      return asgns.map((a: any) => {
        const sub = subMap.get(a.id);
        const status: 'pending' | 'submitted' | 'graded' = sub
          ? sub.status === 'graded'
            ? 'graded'
            : 'submitted'
          : 'pending';

        return {
          id: a.id,
          title: a.title,
          subject: a.subject,
          instructions: a.instructions,
          due_date: a.due_date,
          total_marks: a.total_marks || 100,
          assignment_type: a.assignment_type || 'questions',
          file_url: a.file_url,
          created_at: a.created_at,
          status,
          submission: sub || null,
        };
      });
    },
    enabled: !!schoolId && !!className,
  });

  // Filter assignments
  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      if (filterTab === 'pending' && a.status !== 'pending') return false;
      if (filterTab === 'submitted' && a.status !== 'submitted') return false;
      if (filterTab === 'graded' && a.status !== 'graded') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.subject.toLowerCase().includes(q) ||
          (a.instructions && a.instructions.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [assignments, filterTab, searchQuery]);

  const counts = useMemo(() => {
    let pending = 0;
    let submitted = 0;
    let graded = 0;
    assignments.forEach((a) => {
      if (a.status === 'pending') pending++;
      else if (a.status === 'submitted') submitted++;
      else if (a.status === 'graded') graded++;
    });
    return { all: assignments.length, pending, submitted, graded };
  }, [assignments]);

  const getUrgencyBadge = (dueDateStr: string | null) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return (
        <span style={{ padding: '2px 8px', borderRadius: 99, background: t.redDim, color: t.red, fontSize: 10, fontWeight: 700 }}>
          Overdue
        </span>
      );
    }
    if (diffHours <= 24) {
      return (
        <span style={{ padding: '2px 8px', borderRadius: 99, background: t.goldDim, color: t.gold, fontSize: 10, fontWeight: 700 }}>
          Due Today
        </span>
      );
    }
    const days = Math.ceil(diffHours / 24);
    return (
      <span style={{ padding: '2px 8px', borderRadius: 99, background: t.surface, color: t.textSecondary, fontSize: 10, fontWeight: 600 }}>
        Due in {days} day{days !== 1 ? 's' : ''}
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
              <BookOpen className="w-3 h-3" />
              Class Coursework
            </span>
            <span style={{ fontSize: 12, color: t.textMuted }}>· {className || 'Assigned Class'}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: t.textPrimary }}>
            My Coursework & Homework
          </h1>
          <p style={{ margin: '3px 0 0', color: t.textSecondary, fontSize: 13 }}>
            Review tasks assigned by teachers, submit answers, and check marks & feedback.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
          <Search className="w-4 h-4 text-slate-400" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assignments…"
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: 10,
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.textPrimary,
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* ── Filter Tabs ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All Tasks', count: counts.all },
          { key: 'pending', label: 'To Do / Pending', count: counts.pending },
          { key: 'submitted', label: 'Submitted', count: counts.submitted },
          { key: 'graded', label: 'Graded & Feedback', count: counts.graded },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key as any)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 10,
              background: filterTab === tab.key ? t.mint : t.card,
              color: filterTab === tab.key ? '#05080f' : t.textSecondary,
              border: `1px solid ${filterTab === tab.key ? 'transparent' : t.border}`,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{tab.label}</span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 99,
                background: filterTab === tab.key ? 'rgba(0,0,0,0.18)' : t.surface,
                color: filterTab === tab.key ? '#05080f' : t.textMuted,
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Assignment Cards List ────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>
          Loading your coursework tasks…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
            color: t.textMuted,
          }}
        >
          <BookOpen className="w-10 h-10 opacity-30 mx-auto mb-3" />
          <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
            {searchQuery ? 'No matching assignments found' : 'No assignments in this tab'}
          </div>
          <div style={{ fontSize: 13 }}>
            {filterTab === 'pending'
              ? 'Great job! You have completed all assignments assigned to your class.'
              : 'Tasks set by your subject teachers will appear here.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{
                background: t.card,
                border: `1px solid ${t.border}`,
                borderRadius: 16,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: t.blueDim,
                      color: t.blue,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {item.subject}
                  </span>
                  {item.status === 'pending'
                    ? getUrgencyBadge(item.due_date)
                    : item.status === 'graded' ? (
                      <span style={{ padding: '2px 8px', borderRadius: 99, background: t.mintDim, color: t.mint, fontSize: 11, fontWeight: 700 }}>
                        {item.submission?.grade !== null ? `${item.submission?.grade} / ${item.total_marks}` : 'Graded'}
                      </span>
                    ) : (
                      <span style={{ padding: '2px 8px', borderRadius: 99, background: t.blueDim, color: t.blue, fontSize: 10, fontWeight: 700 }}>
                        Submitted
                      </span>
                    )}
                </div>

                <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
                  {item.title}
                </h3>

                {item.instructions && (
                  <p
                    style={{
                      margin: '0 0 14px',
                      fontSize: 12,
                      color: t.textSecondary,
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {item.instructions}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: t.textMuted, marginBottom: 16 }}>
                  <span>Max: <strong style={{ color: t.textPrimary }}>{item.total_marks} Marks</strong></span>
                  {item.due_date && (
                    <span>Due: <strong style={{ color: t.textPrimary }}>{new Date(item.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</strong></span>
                  )}
                </div>
              </div>

              <div style={{ paddingTop: 12, borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {item.status === 'graded' ? (
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(item)}
                    style={{
                      width: '100%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: t.mintDim,
                      border: `1px solid rgba(16,217,168,0.25)`,
                      color: t.mint,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Award className="w-4 h-4" />
                    <span>View Marks & Teacher Feedback</span>
                  </button>
                ) : item.status === 'submitted' ? (
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(item)}
                    style={{
                      width: '100%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: t.surface,
                      border: `1px solid ${t.border}`,
                      color: t.textPrimary,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span>View Submitted Work</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/student/assignment/${item.id}`)}
                    style={{
                      width: '100%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '9px 16px',
                      borderRadius: 8,
                      background: t.mint,
                      border: 'none',
                      color: '#05080f',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    <span>Start / Submit Assignment</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Submission & Teacher Feedback Modal ───────────────────────────────── */}
      <NativeModal
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        title={selectedSubmission ? `${selectedSubmission.subject}: ${selectedSubmission.title}` : 'Assignment Review'}
        subtitle="Review submission timestamp, awarded score, evaluation rubric, and educator feedback."
        icon={BookOpen}
        size="lg"
      >
        {selectedSubmission && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider">
                  Submission Status
                </span>
                <span className={`text-base font-extrabold capitalize ${
                  selectedSubmission.status === 'graded' ? 'text-emerald-400' : 'text-blue-400'
                }`}>
                  {selectedSubmission.status}
                </span>
              </div>

              {selectedSubmission.submission?.grade !== null && (
                <div className="text-right">
                  <span className="block text-[11px] font-bold text-white/60 uppercase tracking-wider">
                    Score Awarded
                  </span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {selectedSubmission.submission?.grade} / {selectedSubmission.total_marks}
                  </span>
                </div>
              )}
            </div>

            {selectedSubmission.submission?.feedback && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Teacher&apos;s Evaluation &amp; Feedback</span>
                </div>
                <p className="text-xs text-white/90 leading-relaxed">
                  {selectedSubmission.submission.feedback}
                </p>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-black/20 border border-white/10 text-xs text-white/70 space-y-2">
              <div>
                Submitted on:{' '}
                <strong className="text-white font-medium">
                  {new Date(selectedSubmission.submission?.submitted_at || '').toLocaleString()}
                </strong>
              </div>
              {selectedSubmission.submission?.total_time_spent_seconds && (
                <div>
                  Time spent:{' '}
                  <strong className="text-white font-medium">
                    {Math.round(selectedSubmission.submission.total_time_spent_seconds / 60)} minutes
                  </strong>
                </div>
              )}
              {selectedSubmission.submission?.file_url && (
                <div className="pt-2">
                  <a
                    href={selectedSubmission.submission.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-semibold text-white transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download Submitted File</span>
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
              >
                Close Review
              </button>
            </div>
          </div>
        )}
      </NativeModal>
    </div>
  );
}
