/**
 * Student assignment-taking page.
 *
 * Anti-cheat — two layers:
 *   Layer 1 (UI):  onPaste/onDrop/onContextMenu prevented; right-click blocked.
 *   Layer 2 (forensic): character-delta tracking catches paste injections that
 *     bypass Layer 1 (browser extensions, JS-disabled workarounds, etc.).
 *
 * Questions are shown one at a time (stepper) so students cannot screenshot
 * all questions at once or bulk-copy to an AI tool.
 *
 * Question text is wrapped in .uncopyable-question (user-select:none) + event
 * listeners blocking Ctrl+C, Ctrl+A, and the copy clipboard event.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, AlertCircle, Download, Upload, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type AssignmentInfo = {
  id: string; title: string; class_name: string; subject: string;
  assignment_type: string; instructions: string | null; total_marks: number; due_date: string | null; file_url: string | null;
};

type Question = {
  id: string; question_number: number; question_text: string;
  question_image: string | null; marks: number;
};

type IntegrityState = {
  pasteDetected: boolean;
  maxPasteChunk: number;
  startTime: number | null;
  timeSpent: number;
};

// ─── Protected question wrapper ───────────────────────────────────────────────

function ProtectedQuestion({ question, index, total }: { question: Question; index: number; total: number }) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && ['c', 'a'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  };
  return (
    <div
      className="uncopyable-question p-5 rounded-xl border border-[var(--ac-border)] bg-white/[0.03] select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
          Question {question.question_number}
        </span>
        <span className="text-xs ac-text-muted">{question.marks} mark{question.marks !== 1 ? 's' : ''} · {index + 1} of {total}</span>
      </div>
      <p className="ac-text-primary text-base leading-relaxed font-medium">{question.question_text}</p>
      {question.question_image && (
        <img src={question.question_image} alt="Question illustration"
          className="mt-3 max-h-56 rounded-lg object-contain border border-white/10" draggable={false} />
      )}
    </div>
  );
}

// ─── Anti-cheat answer textarea ───────────────────────────────────────────────

type AnswerInputProps = {
  value: string;
  onChange: (val: string, delta: number) => void;
  disabled?: boolean;
};

function AntiCheatTextarea({ value, onChange, disabled }: AnswerInputProps) {
  const prevLenRef = useRef(value.length);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const cur   = e.target.value;
    const delta = cur.length - prevLenRef.current;
    prevLenRef.current = cur.length;
    onChange(cur, delta);
  };

  const block = (e: React.ClipboardEvent | React.DragEvent) => {
    e.preventDefault();
    alert('Pasting or dropping text is not allowed. Please type your answer manually.');
  };

  return (
    <textarea
      value={value}
      onChange={handleChange}
      onPaste={block}
      onDrop={block}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      rows={5}
      placeholder="Type your answer here…"
      className="w-full bg-white/5 border border-[var(--ac-border)] ac-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-40"
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TakeAssignmentPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate  = useNavigate();
  const user      = useAuthStore((s) => s.user);
  const schoolId  = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? '';

  const [step,         setStep]         = useState(0);        // current question index
  const [answers,      setAnswers]      = useState<Record<string, string>>({});  // questionId → text
  const [integrity,    setIntegrity]    = useState<IntegrityState>({
    pasteDetected: false, maxPasteChunk: 0, startTime: null, timeSpent: 0,
  });
  const [submitted,    setSubmitted]    = useState(false);
  const [submitFile,   setSubmitFile]   = useState<File | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Fetch assignment ──
  const { data: asgn, isLoading: asgnLoading } = useQuery<AssignmentInfo>({
    queryKey: ['student-assignment', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('id,title,class_name,subject,assignment_type,instructions,total_marks,due_date,file_url')
        .eq('id', assignmentId!)
        .single();
      if (error) throw error;
      return data as AssignmentInfo;
    },
    enabled: !!assignmentId,
  });

  // ── Fetch questions (question-type only) ──
  const { data: questions = [] } = useQuery<Question[]>({
    queryKey: ['student-assignment-questions', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignment_questions')
        .select('id,question_number,question_text,question_image,marks')
        .eq('assignment_id', assignmentId!)
        .order('question_number');
      if (error) throw error;
      return (data ?? []) as Question[];
    },
    enabled: !!assignmentId && asgn?.assignment_type === 'questions',
  });

  // ── Integrity: track time ──
  useEffect(() => {
    const id = setInterval(() => {
      setIntegrity((prev) => {
        if (!prev.startTime) return prev;
        return { ...prev, timeSpent: Math.round((Date.now() - prev.startTime) / 1000) };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Answer change handler (with anti-cheat delta tracking) ──
  const handleAnswerChange = useCallback((questionId: string, val: string, delta: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
    setIntegrity((prev) => {
      const updated = { ...prev };
      if (!updated.startTime && val.length > 0) updated.startTime = Date.now();
      if (val.length === 0) { updated.startTime = null; updated.timeSpent = 0; }
      if (delta > 5) {
        updated.pasteDetected = true;
        if (delta > updated.maxPasteChunk) updated.maxPasteChunk = delta;
      }
      return updated;
    });
  }, []);

  // ── Submit ──
  const submitMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (!user?.id) throw new Error('Not signed in.');

      // Resolve student_id from users table
      const { data: studentRow } = await supabase
        .from('students')
        .select('student_id')
        .eq('school_id', schoolId)
        .filter('name', 'ilike', user.user_metadata?.name ?? '')
        .maybeSingle();

      const studentId = studentRow?.student_id ?? user.id;

      // Integrity metrics
      const allAnswers = Object.values(answers).join(' ');
      const wordCount  = allAnswers.trim().split(/\s+/).filter(Boolean).length;
      const minutes    = (integrity.timeSpent || 1) / 60;
      const wpm        = Math.round(wordCount / minutes);
      const systemFlagged = integrity.pasteDetected || (wpm > 160 && allAnswers.length > 40);

      // File-type: upload file
      let fileUrl: string | null = null;
      if (asgn?.assignment_type === 'file') {
        if (!submitFile) throw new Error('Please attach your completed file.');
        setUploading(true);
        const ext  = submitFile.name.split('.').pop() ?? 'bin';
        const path = `${user.id}/submissions/${assignmentId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('teacher-resources').upload(path, submitFile);
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from('teacher-resources').createSignedUrl(path, 60 * 60 * 24 * 365);
        fileUrl = signed?.signedUrl ?? null;
        setUploading(false);
      }

      // Insert submission
      const { data: sub, error: subErr } = await supabase
        .from('assignment_submissions')
        .insert({
          assignment_id:            assignmentId,
          student_id:               studentId,
          submitted_at:             new Date().toISOString(),
          file_url:                 fileUrl,
          status:                   'submitted',
          total_time_spent_seconds: integrity.timeSpent,
          paste_detected:           integrity.pasteDetected,
          max_paste_chunk_size:     integrity.maxPasteChunk,
          calculated_wpm:           wpm,
          system_flagged:           systemFlagged,
        })
        .select('id')
        .single();
      if (subErr) throw subErr;

      // Insert answers for question-type
      if (asgn?.assignment_type === 'questions' && questions.length > 0) {
        const rows = questions.map((q) => ({
          submission_id: sub.id,
          question_id:   q.id,
          answer_text:   answers[q.id] ?? null,
        }));
        const { error: ansErr } = await supabase.from('assignment_answers').insert(rows);
        if (ansErr) throw ansErr;
      }
    },
    onSuccess: () => setSubmitted(true),
    onError:   (err: unknown) => {
      setUploading(false);
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    },
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  if (asgnLoading) {
    return (
      <div className="flex items-center gap-2 justify-center py-20 ac-text-muted">
        <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-emerald-400" />
        <h2 className="text-2xl font-bold ac-text-primary">Assignment submitted!</h2>
        <p className="text-sm ac-text-muted">Your teacher will review and grade your submission.</p>
        <button type="button" onClick={() => navigate(-1)}
          className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
          Back
        </button>
      </motion.div>
    );
  }

  // ── File-type assignment ──
  if (asgn?.assignment_type === 'file') {
    return (
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/10 ac-text-muted"><ChevronLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-bold ac-text-primary">{asgn.title}</h1>
            <p className="text-xs ac-text-muted">{asgn.class_name} · {asgn.subject}</p>
          </div>
        </div>

        {asgn.instructions && (
          <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-4 text-sm ac-text-muted leading-relaxed">{asgn.instructions}</div>
        )}

        {asgn.file_url && (
          <a href={asgn.file_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-blue-600/15 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/25 transition-colors text-sm font-semibold">
            <Download className="w-4 h-4" />Download assignment file
          </a>
        )}

        <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-5 space-y-3">
          <p className="text-sm font-semibold ac-text-primary">Upload your completed work</p>
          <input ref={fileRef} type="file" className="hidden"
            onChange={(e) => setSubmitFile(e.target.files?.[0] ?? null)} />
          {submitFile
            ? <p className="text-sm text-emerald-300 flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /><span>{submitFile.name}</span></p>
            : <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-dashed border-white/20 rounded-lg ac-text-muted hover:border-blue-500/50 hover:text-blue-400 text-sm transition-colors">
                <Upload className="w-4 h-4" />Choose file
              </button>}
        </div>

        {error && <p className="flex items-center gap-1.5 text-sm text-red-400"><AlertCircle className="w-4 h-4" />{error}</p>}

        <button type="button" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || uploading || !submitFile}
          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
          {(submitMutation.isPending || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Submit Assignment'}
        </button>
      </motion.div>
    );
  }

  // ── Question-type: stepper ──
  const currentQ = questions[step];
  const isLast   = step === questions.length - 1;

  return (
    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pb-12 max-w-2xl mx-auto">

      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/10 ac-text-muted"><ChevronLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold ac-text-primary">{asgn?.title}</h1>
          <p className="text-xs ac-text-muted">{asgn?.class_name} · {asgn?.subject}</p>
        </div>
      </div>

      {/* Instructions */}
      {asgn?.instructions && step === 0 && (
        <div className="ac-glass-card rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm ac-text-muted leading-relaxed">
          {asgn.instructions}
        </div>
      )}

      {/* Anti-cheat notice */}
      {step === 0 && (
        <div className="flex items-start gap-2 text-xs ac-text-muted p-3 rounded-lg border border-white/10 bg-white/[0.02]">
          <Shield className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
          <span>Paste, drag-and-drop, and copy are disabled. Your typing pattern is monitored. Answer each question in your own words.</span>
        </div>
      )}

      {/* Progress bar */}
      {questions.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs ac-text-muted">
            <span>Question {step + 1} of {questions.length}</span>
            <span>{Math.round(((step) / questions.length) * 100)}% complete</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div className="h-full bg-blue-500 rounded-full"
              animate={{ width: `${((step) / questions.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Current question */}
      <AnimatePresence mode="wait">
        {currentQ && (
          <motion.div key={currentQ.id}
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <ProtectedQuestion question={currentQ} index={step} total={questions.length} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answer input */}
      {currentQ && (
        <div>
          <label className="block text-xs font-semibold ac-text-muted uppercase tracking-wider mb-1">Your answer</label>
          <AntiCheatTextarea
            value={answers[currentQ.id] ?? ''}
            onChange={(val, delta) => handleAnswerChange(currentQ.id, val, delta)}
          />
        </div>
      )}

      {error && <p className="flex items-center gap-1.5 text-sm text-red-400"><AlertCircle className="w-4 h-4" />{error}</p>}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm ac-text-muted bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" />Previous
        </button>

        {isLast
          ? <button type="button" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
              {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Submit Assignment
            </button>
          : <button type="button" onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
              Next question<ChevronRight className="w-4 h-4" />
            </button>}
      </div>
    </motion.div>
  );
}
