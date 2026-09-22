import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Users, Clock, CheckCircle2, AlertTriangle,
  Loader2, Upload, Search, Filter, ArrowRight, ShieldAlert, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';

type Assignment = {
  id: string;
  title: string;
  class_name: string;
  subject: string;
  due_date: string | null;
  assignment_type: string;
  status: string;
  created_at: string;
  _submission_count?: number;
  _flagged_count?: number;
};

function DueBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) {
    return (
      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/20">
        Overdue
      </span>
    );
  }
  if (diffDays === 0) {
    return (
      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20">
        Due Today
      </span>
    );
  }
  if (diffDays <= 3) {
    return (
      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
        Due in {diffDays}d
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/15">
      {due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
    </span>
  );
}

export default function AssignmentsPage() {
  const navigate  = useNavigate();
  const isDark    = useUIStore((s) => s.theme === 'dark');
  const t         = getTokens(isDark);

  const user      = useAuthStore((s) => s.user);
  const schoolId  = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? '';
  const teacherId = user?.id ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType]   = useState<'all' | 'questions' | 'file'>('all');

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['teacher-assignments', teacherId, schoolId],
    queryFn: async (): Promise<Assignment[]> => {
      const { data, error } = await supabase
        .from('assignments')
        .select('id, title, class_name, subject, due_date, assignment_type, status, created_at')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data?.length) return [];

      const ids = data.map((a) => a.id);
      const { data: subs } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, system_flagged')
        .in('assignment_id', ids);

      const countMap: Record<string, number> = {};
      const flagMap:  Record<string, number> = {};
      (subs ?? []).forEach((s: { assignment_id: string; system_flagged: boolean | null }) => {
        countMap[s.assignment_id] = (countMap[s.assignment_id] ?? 0) + 1;
        if (s.system_flagged) flagMap[s.assignment_id] = (flagMap[s.assignment_id] ?? 0) + 1;
      });

      return data.map((a) => ({
        ...a,
        assignment_type: a.assignment_type ?? 'file',
        status: a.status ?? 'active',
        _submission_count: countMap[a.id] ?? 0,
        _flagged_count: flagMap[a.id] ?? 0,
      }));
    },
    enabled: !!teacherId && !!schoolId,
  });

  const totalSubmissions = assignments.reduce((s, a) => s + (a._submission_count ?? 0), 0);
  const totalFlagged     = assignments.reduce((s, a) => s + (a._flagged_count ?? 0), 0);
  const dueSoonCount     = assignments.filter((a) => {
    if (!a.due_date) return false;
    const diff = Math.ceil((new Date(a.due_date).getTime() - Date.now()) / 86400000);
    return diff >= 0 && diff <= 3;
  }).length;

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || a.assignment_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [assignments, searchQuery, filterType]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" style={{ color: t.textPrimary }}>
      {/* Header Banner */}
      <div
        className="rounded-2xl p-6 border transition-all"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(59, 130, 246, 0.15)', color: t.brandBlue }}
            >
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: t.textPrimary }}>
                Class Assignments & Coursework
              </h1>
              <p className="text-sm font-medium mt-0.5" style={{ color: t.textMuted }}>
                Assign interactive question papers or coursework uploads with automated anti-plagiarism tracking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/dashboard/teacher/assignments/create?type=file')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-95"
              style={{
                background: t.surface,
                borderColor: t.border,
                color: t.textPrimary,
              }}
            >
              <Upload className="w-4 h-4 text-blue-400" />
              <span>Upload Document</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/teacher/assignments/create?type=questions')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md active:scale-95"
              style={{ background: t.brandBlue }}
            >
              <Plus className="w-4 h-4" />
              <span>Create Assignment</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Total Assignments
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.textPrimary }}>
              {assignments.length}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Active coursework
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(59, 130, 246, 0.12)', color: t.brandBlue }}
          >
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Student Submissions
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandMint }}>
              {totalSubmissions}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Turned-in papers
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: t.brandMint }}
          >
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Due This Week
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandGold }}>
              {dueSoonCount}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Upcoming deadlines
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.12)', color: t.brandGold }}
          >
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Integrity Alerts
            </span>
            <div
              className="text-2xl font-black mt-1"
              style={{ color: totalFlagged > 0 ? '#ef4444' : t.textPrimary }}
            >
              {totalFlagged}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Paste / fast typing flags
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: totalFlagged > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.05)',
              color: totalFlagged > 0 ? '#ef4444' : t.textMuted,
            }}
          >
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="rounded-2xl p-4 border flex flex-col sm:flex-row items-center justify-between gap-3 transition-all"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['all', 'questions', 'file'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterType(mode)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 active:scale-95"
              style={{
                background: filterType === mode ? t.brandBlue : t.surface,
                borderColor: filterType === mode ? t.brandBlue : t.border,
                color: filterType === mode ? '#ffffff' : t.textMuted,
              }}
            >
              {mode === 'all' && 'All Types'}
              {mode === 'questions' && 'Question Papers'}
              {mode === 'file' && 'File Uploads'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: t.textSub }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assignments…"
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            style={{
              background: t.surface,
              borderColor: t.border,
              color: t.textPrimary,
            }}
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-12 gap-3" style={{ color: t.textMuted }}>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: t.brandBlue }} />
          <span className="text-sm font-medium">Loading class assignments…</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredAssignments.length === 0 && (
        <div
          className="rounded-2xl p-12 border text-center transition-all"
          style={{ background: t.card, borderColor: t.border }}
        >
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: t.textPrimary }} />
          <p className="text-base font-bold" style={{ color: t.textPrimary }}>
            {assignments.length === 0 ? 'No assignments created yet' : 'No matching assignments'}
          </p>
          <p className="text-xs mt-1 max-w-sm mx-auto mb-5" style={{ color: t.textMuted }}>
            {assignments.length === 0
              ? 'Create your first assignment—either an interactive online question paper or a document upload.'
              : 'Try changing your search keywords or filter selection.'}
          </p>
          {assignments.length === 0 && (
            <button
              type="button"
              onClick={() => navigate('/dashboard/teacher/assignments/create?type=questions')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md active:scale-95"
              style={{ background: t.brandBlue }}
            >
              <Plus className="w-4 h-4" />
              <span>Create Assignment</span>
            </button>
          )}
        </div>
      )}

      {/* Assignment Cards List */}
      {!isLoading && filteredAssignments.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredAssignments.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/dashboard/teacher/assignments/${a.id}/submissions`)}
                className="rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer hover:border-blue-500/50 hover:shadow-lg active:scale-[0.99] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{ background: t.card, borderColor: t.border }}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{
                      background: a.assignment_type === 'questions' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                      color: a.assignment_type === 'questions' ? '#6366f1' : '#3b82f6',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    }}
                  >
                    {a.assignment_type === 'questions' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm truncate" style={{ color: t.textPrimary }}>
                        {a.title}
                      </span>
                      {a._flagged_count! > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          {a._flagged_count} Flagged
                        </span>
                      )}
                      <DueBadge dueDate={a.due_date} />
                    </div>

                    <div className="flex items-center gap-2 text-xs mt-1 flex-wrap" style={{ color: t.textMuted }}>
                      <span className="font-semibold px-2 py-0.5 rounded-md border" style={{ background: t.surface, borderColor: t.border, color: t.brandBlue }}>
                        {a.class_name}
                      </span>
                      <span>·</span>
                      <span className="font-medium">{a.subject}</span>
                      <span>·</span>
                      <span className="capitalize">{a.assignment_type === 'questions' ? 'Question Paper' : 'File Upload'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0" style={{ borderColor: t.border }}>
                  <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-xl border" style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}>
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>{a._submission_count}</span>
                    <span style={{ color: t.textMuted }}>Submissions</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: t.brandBlue }}>
                    <span>Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
