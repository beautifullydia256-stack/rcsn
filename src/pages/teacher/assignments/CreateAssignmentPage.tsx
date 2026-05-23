import { useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Plus, Trash2, Image as ImageIcon, Loader2,
  FileText, Upload, AlertCircle, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTeacherContext } from '../useTeacherContext';
import { compressStudentPhoto } from '@/lib/imageCompression';

// ─── Types ───────────────────────────────────────────────────────────────────

type QuestionDraft = {
  id: string;
  question_text: string;
  question_image: string | null;   // base64 compressed
  correct_answer: string;
  marks: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newQuestion(): QuestionDraft {
  return { id: crypto.randomUUID(), question_text: '', question_image: null, correct_answer: '', marks: 1 };
}

async function compressQuestionImage(file: File): Promise<string> {
  const { compressedFile } = await compressStudentPhoto(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(compressedFile);
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateAssignmentPage() {
  const navigate        = useNavigate();
  const [params]        = useSearchParams();
  const initialType     = params.get('type') === 'file' ? 'file' : 'questions';

  const user      = useAuthStore((s) => s.user);
  const schoolId  = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? '';
  const teacherId = user?.id ?? '';

  const { classesWithSubjects, isLoading: ctxLoading } = useTeacherContext();

  // ── Form state ──
  const [assignmentType, setAssignmentType] = useState<'file' | 'questions'>(initialType);
  const [title,          setTitle]          = useState('');
  const [instructions,   setInstructions]   = useState('');
  const [dueDate,        setDueDate]        = useState('');
  const [selectedClass,  setSelectedClass]  = useState('');
  const [selectedSubject,setSelectedSubject]= useState('');
  const [questions,      setQuestions]      = useState<QuestionDraft[]>([newQuestion()]);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  // file-type upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  // image refs per question
  const imgRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Derived: subjects for chosen class ──
  const classEntry    = classesWithSubjects.find((c) => c.class_name === selectedClass);
  const subjectOptions= classEntry?.subjects ?? [];

  // ── Class change → reset subject if no longer valid ──
  const handleClassChange = (cls: string) => {
    setSelectedClass(cls);
    const entry = classesWithSubjects.find((c) => c.class_name === cls);
    if (entry && !entry.subjects.includes(selectedSubject)) setSelectedSubject('');
  };

  // ── Question helpers ──
  const updateQuestion = useCallback((id: string, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }, []);

  const addQuestion = () => setQuestions((prev) => [...prev, newQuestion()]);

  const removeQuestion = (id: string) => {
    setQuestions((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((q) => q.id !== id);
    });
  };

  const handleQuestionImage = async (id: string, file: File) => {
    try {
      const b64 = await compressQuestionImage(file);
      updateQuestion(id, { question_image: b64 });
    } catch {
      alert('Could not compress image. Please try a smaller file.');
    }
  };

  // ── File-type assignment: upload file to storage ──
  const handleFileUpload = async (file: File) => {
    if (file.size > 30 * 1024 * 1024) { setError('File must be under 30 MB.'); return; }
    setFileUploading(true);
    setError(null);
    try {
      const ext  = file.name.split('.').pop() ?? 'bin';
      const path = `${teacherId}/assignments/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('teacher-resources').upload(path, file);
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from('teacher-resources').createSignedUrl(path, 60 * 60 * 24 * 365);
      setFileUrl(signed?.signedUrl ?? path);
      setFileName(file.name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setFileUploading(false);
    }
  };

  // ── Save ──
  const handleSave = async () => {
    setError(null);
    if (!title.trim())          { setError('Enter a title.'); return; }
    if (!selectedClass)         { setError('Select a class.'); return; }
    if (!selectedSubject)       { setError('Select a subject.'); return; }
    if (assignmentType === 'file' && !fileUrl) { setError('Upload the assignment file first.'); return; }
    if (assignmentType === 'questions') {
      const empty = questions.find((q) => !q.question_text.trim());
      if (empty) { setError('All questions must have text.'); return; }
    }

    setSaving(true);
    try {
      const totalMarks = assignmentType === 'questions'
        ? questions.reduce((s, q) => s + (q.marks || 1), 0)
        : 0;

      const { data: asgn, error: aErr } = await supabase
        .from('assignments')
        .insert({
          school_id:        schoolId,
          teacher_id:       teacherId,
          class_name:       selectedClass,
          subject:          selectedSubject,
          title:            title.trim(),
          description:      instructions.trim() || null,
          instructions:     instructions.trim() || null,
          due_date:         dueDate || null,
          assignment_type:  assignmentType,
          file_url:         fileUrl ?? null,
          total_marks:      totalMarks,
          status:           'active',
        })
        .select('id')
        .single();

      if (aErr) throw aErr;

      if (assignmentType === 'questions' && questions.length > 0) {
        const rows = questions.map((q, idx) => ({
          assignment_id:   asgn.id,
          question_number: idx + 1,
          question_text:   q.question_text.trim(),
          question_image:  q.question_image ?? null,
          correct_answer:  q.correct_answer.trim() || null,
          marks:           q.marks || 1,
        }));
        const { error: qErr } = await supabase.from('assignment_questions').insert(rows);
        if (qErr) throw qErr;
      }

      navigate('/dashboard/teacher/assignments');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save assignment.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">

      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/dashboard/teacher/assignments')}
          className="p-1.5 rounded-lg hover:bg-white/10 ac-text-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold ac-text-primary">Create Assignment</h1>
      </div>

      {/* Type toggle */}
      <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-1 flex gap-1 w-fit">
        {(['questions', 'file'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setAssignmentType(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              assignmentType === t ? 'bg-blue-600 text-white' : 'ac-text-muted hover:bg-white/5'}`}>
            {t === 'questions' ? <><FileText className="w-4 h-4" />Question paper</> : <><Upload className="w-4 h-4" />File upload</>}
          </button>
        ))}
      </div>

      {/* ── Core details ── */}
      <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-5 space-y-4">
        <p className="text-sm font-semibold ac-text-primary">Assignment details</p>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold ac-text-muted uppercase tracking-wider mb-1">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. End of Term Mathematics Test"
            className="w-full bg-white/5 border border-[var(--ac-border)] ac-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Class + Subject */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold ac-text-muted uppercase tracking-wider mb-1">Class</label>
            {ctxLoading
              ? <div className="flex items-center gap-2 text-xs ac-text-muted py-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading classes…</div>
              : <select value={selectedClass} onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full bg-white/5 border border-[var(--ac-border)] ac-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Select class —</option>
                  {classesWithSubjects.map((c) => <option key={c.class_name} value={c.class_name}>{c.class_name}</option>)}
                </select>}
          </div>
          <div>
            <label className="block text-xs font-semibold ac-text-muted uppercase tracking-wider mb-1">Subject</label>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedClass}
              className="w-full bg-white/5 border border-[var(--ac-border)] ac-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40">
              <option value="">— Select subject —</option>
              {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Instructions + due date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold ac-text-muted uppercase tracking-wider mb-1">Instructions <span className="normal-case text-white/30">(optional)</span></label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2}
              placeholder="Any special instructions for students…"
              className="w-full bg-white/5 border border-[var(--ac-border)] ac-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold ac-text-muted uppercase tracking-wider mb-1">Due date <span className="normal-case text-white/30">(optional)</span></label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-white/5 border border-[var(--ac-border)] ac-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* ── File upload type ── */}
      {assignmentType === 'file' && (
        <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-5 space-y-3">
          <p className="text-sm font-semibold ac-text-primary">Assignment file</p>
          <p className="text-xs ac-text-muted">Upload the assignment document (PDF, Word, image — max 30 MB). Students will download and complete it, then upload their submission.</p>
          {fileUrl
            ? <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-sm text-emerald-300 truncate flex-1">{fileName}</span>
                <button type="button" onClick={() => { setFileUrl(null); setFileName(''); }} className="text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            : <div>
                <input ref={fileRef} type="file" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  disabled={fileUploading}
                  className="flex items-center gap-2 px-4 py-2 border border-dashed border-white/20 rounded-lg ac-text-muted hover:border-blue-500/50 hover:text-blue-400 text-sm transition-colors disabled:opacity-40">
                  {fileUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {fileUploading ? 'Uploading…' : 'Choose file'}
                </button>
              </div>}
        </div>
      )}

      {/* ── Question builder ── */}
      {assignmentType === 'questions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold ac-text-primary">Questions</p>
            <span className="text-xs ac-text-muted">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
          </div>

          <AnimatePresence>
            {questions.map((q, idx) => (
              <motion.div key={q.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-5 space-y-3">

                {/* Q number + delete */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Question {idx + 1}</span>
                  <button type="button" onClick={() => removeQuestion(q.id)}
                    disabled={questions.length <= 1}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400 disabled:opacity-20 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Question text */}
                <textarea
                  value={q.question_text}
                  onChange={(e) => updateQuestion(q.id, { question_text: e.target.value })}
                  rows={3}
                  placeholder={`Type question ${idx + 1} here…`}
                  className="w-full bg-white/5 border border-[var(--ac-border)] ac-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />

                {/* Question image */}
                <div>
                  {q.question_image
                    ? <div className="relative w-fit">
                        <img src={q.question_image} alt={`Q${idx + 1} image`}
                          className="max-h-40 rounded-lg border border-white/10 object-contain" />
                        <button type="button"
                          onClick={() => updateQuestion(q.id, { question_image: null })}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    : <div>
                        <input type="file" accept="image/*" className="hidden"
                          ref={(el) => { imgRefs.current[q.id] = el; }}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQuestionImage(q.id, f); }} />
                        <button type="button"
                          onClick={() => imgRefs.current[q.id]?.click()}
                          className="flex items-center gap-1.5 text-xs ac-text-muted hover:text-blue-400 transition-colors">
                          <ImageIcon className="w-3.5 h-3.5" />
                          Add image to this question
                        </button>
                      </div>}
                </div>

                {/* Correct answer + marks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold ac-text-muted uppercase tracking-wider mb-1">
                      Correct answer <span className="normal-case text-white/30">(for auto-marking)</span>
                    </label>
                    <input type="text" value={q.correct_answer}
                      onChange={(e) => updateQuestion(q.id, { correct_answer: e.target.value })}
                      placeholder="Leave blank for manual marking"
                      className="w-full bg-white/5 border border-[var(--ac-border)] ac-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold ac-text-muted uppercase tracking-wider mb-1">Marks</label>
                    <input type="number" min={1} max={100} value={q.marks}
                      onChange={(e) => updateQuestion(q.id, { marks: parseInt(e.target.value) || 1 })}
                      className="w-full bg-white/5 border border-[var(--ac-border)] ac-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <button type="button" onClick={addQuestion}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/20 rounded-xl ac-text-muted hover:border-blue-500/50 hover:text-blue-400 text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" />
            Add question
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </p>
      )}

      {/* Save */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => navigate('/dashboard/teacher/assignments')}
          className="px-4 py-2 text-sm font-semibold ac-text-muted hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save Assignment'}
        </button>
      </div>
    </motion.div>
  );
}
