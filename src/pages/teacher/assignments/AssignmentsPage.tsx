import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, Plus, Users, Clock, CheckCircle, AlertTriangle, Loader2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

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

function dueBadge(dueDate: string | null) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0)  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Overdue</span>;
  if (diffDays === 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Due today</span>;
  if (diffDays <= 3)  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300">Due in {diffDays}d</span>;
  return <span className="text-[10px] font-semibold ac-text-muted">{due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>;
}

export default function AssignmentsPage() {
  const navigate  = useNavigate();
  const user      = useAuthStore((s) => s.user);
  const schoolId  = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? '';
  const teacherId = user?.id ?? '';

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

      // Fetch submission counts per assignment
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

  return (
    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">Assignments</h1>
            <p className="text-sm ac-text-muted mt-0.5">Create and manage assignments for your classes.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/teacher/assignments/create?type=file')}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/teacher/assignments/create?type=questions')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Assignment
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 ac-text-muted py-8">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading assignments…</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && assignments.length === 0 && (
        <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-12 text-center">
          <FileText className="w-12 h-12 text-white/15 mx-auto mb-3" />
          <p className="font-semibold ac-text-primary mb-1">No assignments yet</p>
          <p className="text-sm ac-text-muted mb-4">Create your first assignment — either a file upload or an interactive question paper.</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard/teacher/assignments/create?type=questions')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Assignment
          </button>
        </div>
      )}

      {/* Assignment cards */}
      {!isLoading && assignments.length > 0 && (
        <div className="space-y-3">
          {assignments.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-4 flex items-center gap-4 hover:bg-white/[0.03] cursor-pointer transition-colors"
              onClick={() => navigate(`/dashboard/teacher/assignments/${a.id}/submissions`)}
            >
              {/* Type badge */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${a.assignment_type === 'questions' ? 'bg-indigo-500/20' : 'bg-blue-500/20'}`}>
                {a.assignment_type === 'questions'
                  ? <CheckCircle className="w-5 h-5 text-indigo-400" />
                  : <FileText className="w-5 h-5 text-blue-400" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold ac-text-primary text-sm truncate">{a.title}</span>
                  {a._flagged_count! > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                      <AlertTriangle className="w-3 h-3" />
                      {a._flagged_count} flagged
                    </span>
                  )}
                  {dueBadge(a.due_date)}
                </div>
                <p className="text-xs ac-text-muted mt-0.5">{a.class_name} · {a.subject}</p>
              </div>

              {/* Submissions */}
              <div className="shrink-0 flex items-center gap-1.5 text-xs ac-text-muted">
                <Users className="w-3.5 h-3.5" />
                {a._submission_count} submission{a._submission_count !== 1 ? 's' : ''}
              </div>

              {/* Type label */}
              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${a.assignment_type === 'questions' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-blue-500/15 text-blue-400'}`}>
                {a.assignment_type === 'questions' ? 'Question paper' : 'File upload'}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
