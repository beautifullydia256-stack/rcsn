import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, AlertTriangle, CheckCircle, Clock, Download,
  Loader2, Users, FileText, Shield, ChevronDown, ChevronUp, Star,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

type AssignmentInfo = {
  id: string; title: string; class_name: string; subject: string;
  assignment_type: string; due_date: string | null; total_marks: number; instructions: string | null;
};

type Question = {
  id: string; question_number: number; question_text: string;
  question_image: string | null; correct_answer: string | null; marks: number;
};

type Answer = {
  id: string; question_id: string; answer_text: string | null;
  marks_awarded: number | null; is_correct: boolean | null;
};

type Submission = {
  id: string; student_id: string; submitted_at: string | null;
  file_url: string | null; status: string | null; grade: number | null; feedback: string | null;
  total_time_spent_seconds: number; paste_detected: boolean; max_paste_chunk_size: number;
  calculated_wpm: number; system_flagged: boolean;
  student_name?: string;
  answers?: Answer[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(secs: number) {
  if (secs < 60)  return `${secs}s`;
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}m ${s}s`;
}

function IntegrityBadge({ sub }: { sub: Submission }) {
  if (!sub.system_flagged && !sub.paste_detected) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 shrink-0">
      <AlertTriangle className="w-3 h-3" />
      Integrity warning
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AssignmentSubmissionsPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [markingId,  setMarkingId]  = useState<string | null>(null);
  const [draftGrade, setDraftGrade] = useState<Record<string, string>>({});   // submissionId → grade string
  const [draftFeedback, setDraftFeedback] = useState<Record<string, string>>({});
  const [draftAnswerMarks, setDraftAnswerMarks] = useState<Record<string, string>>({});  // answerId → marks

  // ── Fetch assignment + questions ──
  const { data: asgn } = useQuery<AssignmentInfo>({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('id,title,class_name,subject,assignment_type,due_date,total_marks,instructions')
        .eq('id', assignmentId!)
        .single();
      if (error) throw error;
      return data as AssignmentInfo;
    },
    enabled: !!assignmentId,
  });

  const { data: questions = [] } = useQuery<Question[]>({
    queryKey: ['assignment-questions', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignment_questions')
        .select('*')
        .eq('assignment_id', assignmentId!)
        .order('question_number');
      if (error) throw error;
      return (data ?? []) as Question[];
    },
    enabled: !!assignmentId && asgn?.assignment_type === 'questions',
  });

  // ── Fetch submissions ──
  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ['assignment-submissions', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId!)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      const subs = (data ?? []) as Submission[];
      if (!subs.length) return [];

      // Fetch student names
      const studentIds = [...new Set(subs.map((s) => s.student_id))];
      const { data: students } = await supabase
        .from('students')
        .select('student_id, name')
        .in('student_id', studentIds);
      const nameMap: Record<string, string> = {};
      (students ?? []).forEach((st: { student_id: string; name: string }) => { nameMap[st.student_id] = st.name; });

      // Fetch answers for question-type
      let answerMap: Record<string, Answer[]> = {};
      if (asgn?.assignment_type === 'questions') {
        const subIds = subs.map((s) => s.id);
        const { data: answers } = await supabase
          .from('assignment_answers')
          .select('*')
          .in('submission_id', subIds);
        (answers ?? []).forEach((a: Answer) => {
          if (!answerMap[a.question_id]) answerMap[a.question_id] = [];
        });
        (answers ?? []).forEach((a: Answer & { submission_id: string }) => {
          const sid = (a as any).submission_id as string;
          if (!answerMap[sid]) answerMap[sid] = [];
          answerMap[sid].push(a);
        });
      }

      return subs.map((s) => ({
        ...s,
        student_name: nameMap[s.student_id] ?? 'Unknown student',
        answers: answerMap[s.id] ?? [],
      }));
    },
    enabled: !!assignmentId && !!asgn,
  });

  // ── Save grade/feedback ──
  const saveMark = useMutation({
    mutationFn: async (subId: string) => {
      const grade    = parseFloat(draftGrade[subId] ?? '');
      const feedback = draftFeedback[subId] ?? '';
      const updates: Record<string, unknown> = { status: 'graded', feedback: feedback || null };
      if (!isNaN(grade)) updates.grade = grade;

      const { error } = await supabase
        .from('assignment_submissions')
        .update(updates)
        .eq('id', subId);
      if (error) throw error;

      // If question-type: save per-answer marks
      const sub = submissions.find((s) => s.id === subId);
      if (asgn?.assignment_type === 'questions' && sub?.answers?.length) {
        for (const ans of sub.answers) {
          const m = parseInt(draftAnswerMarks[ans.id] ?? '');
          if (!isNaN(m)) {
            await supabase.from('assignment_answers').update({ marks_awarded: m }).eq('id', ans.id);
          }
        }
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assignment-submissions', assignmentId] });
      setMarkingId(null);
    },
    onError: (err: unknown) => alert(err instanceof Error ? err.message : 'Save failed.'),
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">

      {/* Back */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/dashboard/teacher/assignments')}
          className="p-1.5 rounded-lg hover:bg-white/10 ac-text-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold ac-text-primary">{asgn?.title ?? 'Assignment'}</h1>
          {asgn && <p className="text-xs ac-text-muted">{asgn.class_name} · {asgn.subject}</p>}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Submissions', value: submissions.length, icon: Users, color: 'text-blue-400' },
          { label: 'Graded',      value: submissions.filter((s) => s.status === 'graded').length, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Pending',     value: submissions.filter((s) => s.status !== 'graded').length, icon: Clock,        color: 'text-amber-400' },
          { label: 'Flagged',     value: submissions.filter((s) => s.system_flagged).length,      icon: AlertTriangle,color: 'text-red-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-4 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color} shrink-0`} />
            <div>
              <p className="text-lg font-bold ac-text-primary">{value}</p>
              <p className="text-xs ac-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 ac-text-muted py-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading submissions…</span>
        </div>
      )}

      {/* Empty */}
      {!isLoading && submissions.length === 0 && (
        <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-10 text-center">
          <Users className="w-10 h-10 text-white/15 mx-auto mb-2" />
          <p className="text-sm ac-text-muted">No submissions yet.</p>
        </div>
      )}

      {/* Submission list */}
      <div className="space-y-3">
        {submissions.map((sub) => {
          const isExpanded = expanded === sub.id;
          const isMarking  = markingId === sub.id;
          const graded     = sub.status === 'graded';

          return (
            <div key={sub.id} className="ac-glass-card rounded-xl border border-[var(--ac-border)] overflow-hidden">

              {/* Row header */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02]"
                onClick={() => setExpanded(isExpanded ? null : sub.id)}>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-blue-300">
                  {(sub.student_name ?? '?')[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold ac-text-primary">{sub.student_name}</span>
                    <IntegrityBadge sub={sub} />
                    {graded && sub.grade != null && asgn?.total_marks
                      ? <span className="text-xs font-bold text-emerald-400">{sub.grade}/{asgn.total_marks}</span>
                      : graded
                      ? <span className="text-xs font-bold text-emerald-400">Graded</span>
                      : <span className="text-xs ac-text-muted">Pending</span>}
                  </div>
                  {sub.submitted_at && (
                    <p className="text-xs ac-text-muted">
                      Submitted {new Date(sub.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                {isExpanded ? <ChevronUp className="w-4 h-4 ac-text-muted" /> : <ChevronDown className="w-4 h-4 ac-text-muted" />}
              </div>

              {/* Expanded panel */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-[var(--ac-border)]">
                    <div className="p-4 space-y-4">

                      {/* ── Integrity telemetry ── */}
                      {(sub.system_flagged || sub.paste_detected || sub.total_time_spent_seconds > 0) && (
                        <div className={`rounded-lg border p-3 space-y-1 ${sub.system_flagged ? 'border-red-500/30 bg-red-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Shield className={`w-4 h-4 ${sub.system_flagged ? 'text-red-400' : 'text-emerald-400'}`} />
                            <span className="text-xs font-bold uppercase tracking-wider ac-text-primary">
                              Submission integrity
                            </span>
                            {sub.system_flagged && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 ml-auto">FLAGGED</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div><span className="ac-text-muted">Time taken:</span><br /><span className="font-semibold ac-text-primary">{fmt(sub.total_time_spent_seconds)}</span></div>
                            <div><span className="ac-text-muted">Typing speed:</span><br /><span className="font-semibold ac-text-primary">{sub.calculated_wpm} WPM</span></div>
                            <div><span className="ac-text-muted">Paste bypass:</span><br /><span className={`font-bold ${sub.paste_detected ? 'text-red-400' : 'text-emerald-400'}`}>{sub.paste_detected ? 'YES' : 'No'}</span></div>
                            <div><span className="ac-text-muted">Largest paste:</span><br /><span className={`font-semibold ${sub.max_paste_chunk_size > 5 ? 'text-red-400' : 'ac-text-primary'}`}>{sub.max_paste_chunk_size} chars</span></div>
                          </div>
                        </div>
                      )}

                      {/* ── File-type: download link ── */}
                      {asgn?.assignment_type === 'file' && sub.file_url && (
                        <a href={sub.file_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm rounded-lg hover:bg-blue-600/30 transition-colors">
                          <Download className="w-4 h-4" />
                          Download submission
                        </a>
                      )}

                      {/* ── Question-type: student answers ── */}
                      {asgn?.assignment_type === 'questions' && questions.length > 0 && (
                        <div className="space-y-3">
                          {questions.map((q) => {
                            const ans = sub.answers?.find((a) => a.question_id === q.id);
                            return (
                              <div key={q.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
                                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Q{q.question_number} · {q.marks} mark{q.marks !== 1 ? 's' : ''}</p>
                                <p className="text-sm ac-text-primary">{q.question_text}</p>
                                {q.question_image && <img src={q.question_image} alt="" className="max-h-32 rounded object-contain" />}
                                <div className="pt-1 border-t border-white/5">
                                  <p className="text-xs ac-text-muted mb-0.5">Student answer:</p>
                                  <p className="text-sm ac-text-primary whitespace-pre-wrap">{ans?.answer_text || <em className="opacity-40">No answer</em>}</p>
                                  {q.correct_answer && (
                                    <p className="text-xs text-emerald-400 mt-1">Expected: {q.correct_answer}</p>
                                  )}
                                </div>
                                {/* Per-question marking input */}
                                {isMarking && ans && (
                                  <div className="flex items-center gap-2 pt-1">
                                    <label className="text-xs ac-text-muted shrink-0">Marks awarded:</label>
                                    <input type="number" min={0} max={q.marks}
                                      value={draftAnswerMarks[ans.id] ?? (ans.marks_awarded ?? '')}
                                      onChange={(e) => setDraftAnswerMarks((p) => ({ ...p, [ans.id]: e.target.value }))}
                                      className="w-16 bg-white/5 border border-[var(--ac-border)] ac-text-primary rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                    <span className="text-xs ac-text-muted">/ {q.marks}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Marking section ── */}
                      {isMarking
                        ? <div className="space-y-3 pt-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold ac-text-muted uppercase tracking-wider mb-1">
                                  Total grade {asgn?.total_marks ? `(out of ${asgn.total_marks})` : ''}
                                </label>
                                <input type="number" min={0} max={asgn?.total_marks ?? 100}
                                  value={draftGrade[sub.id] ?? (sub.grade ?? '')}
                                  onChange={(e) => setDraftGrade((p) => ({ ...p, [sub.id]: e.target.value }))}
                                  className="w-full bg-white/5 border border-[var(--ac-border)] ac-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold ac-text-muted uppercase tracking-wider mb-1">Feedback</label>
                                <textarea rows={2} value={draftFeedback[sub.id] ?? (sub.feedback ?? '')}
                                  onChange={(e) => setDraftFeedback((p) => ({ ...p, [sub.id]: e.target.value }))}
                                  placeholder="Comments for the student…"
                                  className="w-full bg-white/5 border border-[var(--ac-border)] ac-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => setMarkingId(null)}
                                className="px-3 py-1.5 text-xs ac-text-muted bg-white/5 hover:bg-white/10 rounded-lg transition-colors">Cancel</button>
                              <button type="button"
                                onClick={() => saveMark.mutate(sub.id)}
                                disabled={saveMark.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg transition-colors font-semibold">
                                {saveMark.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                Save grade
                              </button>
                            </div>
                          </div>
                        : <button type="button" onClick={() => setMarkingId(sub.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600/80 hover:bg-blue-600 rounded-lg transition-colors">
                            <Star className="w-3 h-3" />
                            {graded ? 'Edit grade' : 'Mark this submission'}
                          </button>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
