import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  NotebookPen, PenLine, FolderOpen, Search, Plus,
  Trash2, Save, Printer, Download, BookOpen, Clock,
  CheckCircle2, X
} from 'lucide-react';
import { useTeacherContext } from '../useTeacherContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import jsPDF from 'jspdf';
import NativeModal from '@/components/NativeModal';

interface NoteItem {
  id: string;
  title: string;
  className: string;
  subject: string;
  date: string;
  content: string;
  summary: string;
}

const DEFAULT_NOTES: NoteItem[] = [
  {
    id: 'note-1',
    title: 'Fractions — Introduction & Proper vs Improper',
    className: 'Primary 4 Blue',
    subject: 'Mathematics',
    date: '2026-09-20',
    content: 'Learners introduced to fractions using paper strip folding. Emphasized numerator as parts counted and denominator as total equal pieces. High engagement with circular fraction discs. P.4 Blue understood well.',
    summary: 'Mastered numerator vs denominator; 4 pupils need reinforcement on improper fractions.',
  },
  {
    id: 'note-2',
    title: 'The Water Cycle & Condensation Demonstration',
    className: 'Primary 5 Red',
    subject: 'Science',
    date: '2026-09-18',
    content: 'Demonstrated condensation using hot water in a beaker covered with ice cubes on a watch glass. Pupils observed droplets forming underneath. Explained evaporation, condensation, precipitation, and collection.',
    summary: 'Experiment was a huge success. Homework given on drawing the 4 water cycle stages.',
  },
  {
    id: 'note-3',
    title: 'Sentence Construction with Adverbs of Frequency',
    className: 'Primary 3 Green',
    subject: 'English',
    date: '2026-09-15',
    content: 'Taught "always", "sometimes", "never", "rarely", and "usually". Pupils made sentences about daily morning routines: "I always brush my teeth before school". Oral drills went smoothly.',
    summary: 'Very good participation. Ensure spelling of "usually" is checked in tomorrow\'s dictation.',
  },
];

export default function LessonNotesPage() {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const { classNames } = useTeacherContext();

  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('teacher_lesson_notes');
      return saved ? JSON.parse(saved) : DEFAULT_NOTES;
    } catch {
      return DEFAULT_NOTES;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [activeNote, setActiveNote] = useState<NoteItem | null>(null);

  // New Note Form State
  const [formTitle, setFormTitle] = useState('');
  const [formClass, setFormClass] = useState(classNames[0] || 'Primary 4');
  const [formSubject, setFormSubject] = useState('Mathematics');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formContent, setFormContent] = useState('');
  const [formSummary, setFormSummary] = useState('');

  const saveNotesToStorage = (updated: NoteItem[]) => {
    setNotes(updated);
    localStorage.setItem('teacher_lesson_notes', JSON.stringify(updated));
  };

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (activeNote) {
      const updated = notes.map((n) =>
        n.id === activeNote.id
          ? {
              ...n,
              title: formTitle,
              className: formClass,
              subject: formSubject,
              date: formDate,
              content: formContent,
              summary: formSummary,
            }
          : n
      );
      saveNotesToStorage(updated);
    } else {
      const newNote: NoteItem = {
        id: `note-${Date.now()}`,
        title: formTitle,
        className: formClass,
        subject: formSubject,
        date: formDate,
        content: formContent,
        summary: formSummary,
      };
      saveNotesToStorage([newNote, ...notes]);
    }

    setIsEditing(false);
    setActiveNote(null);
    setFormTitle('');
    setFormContent('');
    setFormSummary('');
  };

  const startNewNote = () => {
    setActiveNote(null);
    setFormTitle('');
    setFormClass(classNames[0] || 'Primary 4');
    setFormSubject('Mathematics');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormContent('');
    setFormSummary('');
    setIsEditing(true);
  };

  const editExistingNote = (note: NoteItem) => {
    setActiveNote(note);
    setFormTitle(note.title);
    setFormClass(note.className);
    setFormSubject(note.subject);
    setFormDate(note.date);
    setFormContent(note.content);
    setFormSummary(note.summary);
    setIsEditing(true);
  };

  const deleteNote = (id: string) => {
    if (window.confirm('Delete this lesson note?')) {
      const updated = notes.filter((n) => n.id !== id);
      saveNotesToStorage(updated);
    }
  };

  const downloadNotePdf = (note: NoteItem) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TEACHER LESSON NOTE', pageW / 2, 16, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Class: ${note.className}   |   Subject: ${note.subject}   |   Date: ${note.date}`, pageW / 2, 23, { align: 'center' });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 27, pageW - 14, 27);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(note.title, 14, 35);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DETAILED OBSERVATIONS & CONTENT:', 14, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitContent = doc.splitTextToSize(note.content, pageW - 28);
    doc.text(splitContent, 14, 52);

    const summaryY = 52 + splitContent.length * 5 + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SUMMARY & FOLLOW-UP ACTION:', 14, summaryY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitSummary = doc.splitTextToSize(note.summary, pageW - 28);
    doc.text(splitSummary, 14, summaryY + 7);

    doc.save(`note-${note.className}-${note.date}.pdf`.replace(/\s+/g, '_'));
  };

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesSearch =
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = selectedClass === 'all' || n.className === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [notes, searchQuery, selectedClass]);

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
              style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}
            >
              <NotebookPen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: t.textPrimary }}>
                Teacher Lesson Notebook
              </h1>
              <p className="text-sm font-medium mt-0.5" style={{ color: t.textMuted }}>
                Record classroom observations, pupil misconceptions, and follow-up teaching notes per session.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startNewNote}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md active:scale-95"
              style={{ background: t.brandBlue }}
            >
              <Plus className="w-4 h-4" />
              <span>Write Lesson Note</span>
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
              Total Notes
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.textPrimary }}>
              {notes.length} Notes
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Recorded classroom logs
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}
          >
            <FolderOpen className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Subjects Logged
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandMint }}>
              {new Set(notes.map((n) => n.subject)).size} Subjects
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Cross-disciplinary notes
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: t.brandMint }}
          >
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Latest Entry
            </span>
            <div className="text-sm font-black mt-1 truncate max-w-[140px]" style={{ color: t.brandGold }}>
              {notes[0]?.date || 'Today'}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Most recent observation
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
              Export Format
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandBlue }}>
              PDF / Print
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Direct export capability
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(59, 130, 246, 0.12)', color: t.brandBlue }}
          >
            <Download className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Note Editor Modal */}
      <NativeModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title={activeNote ? 'Edit Lesson Note' : 'Create New Lesson Note'}
        subtitle="Record structured pedagogic observations, topic coverage, and next-session actions."
        icon={BookOpen}
        size="2xl"
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Note Title *
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Fractions — Intro & Proper Fractions"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Class / Stream
              </label>
              <input
                type="text"
                value={formClass}
                onChange={(e) => setFormClass(e.target.value)}
                placeholder="e.g. Primary 4 Blue"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <input
                type="text"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="e.g. Mathematics"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Session Date
            </label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Detailed Classroom Notes & Observations *
            </label>
            <textarea
              rows={4}
              required
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="What happened during the lesson? Which activities were most effective? What misconceptions arose?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Summary & Next Session Action Item
            </label>
            <textarea
              rows={2}
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
              placeholder="Key takeaway or homework / remedial plan for struggling pupils..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 border border-emerald-400/30 transition-all flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Note</span>
            </button>
          </div>
        </form>
      </NativeModal>

      {/* Filter & Search Bar */}
      <div
        className="rounded-2xl p-4 border flex flex-col sm:flex-row items-center justify-between gap-3 transition-all"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedClass('all')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 active:scale-95"
            style={{
              background: selectedClass === 'all' ? t.brandBlue : t.surface,
              borderColor: selectedClass === 'all' ? t.brandBlue : t.border,
              color: selectedClass === 'all' ? '#ffffff' : t.textMuted,
            }}
          >
            All Classes
          </button>
          {Array.from(new Set(notes.map((n) => n.className))).map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => setSelectedClass(cls)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 active:scale-95"
              style={{
                background: selectedClass === cls ? t.brandBlue : t.surface,
                borderColor: selectedClass === cls ? t.brandBlue : t.border,
                color: selectedClass === cls ? '#ffffff' : t.textMuted,
              }}
            >
              {cls}
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
            placeholder="Search notes…"
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            style={{
              background: t.surface,
              borderColor: t.border,
              color: t.textPrimary,
            }}
          />
        </div>
      </div>

      {/* Notes List Cards */}
      {filteredNotes.length === 0 ? (
        <div
          className="rounded-2xl p-12 border text-center transition-all"
          style={{ background: t.card, borderColor: t.border }}
        >
          <NotebookPen className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: t.textPrimary }} />
          <p className="text-base font-bold" style={{ color: t.textPrimary }}>
            No lesson notes found
          </p>
          <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: t.textMuted }}>
            Capture insights, pupil progress, and notes from each lesson you teach.
          </p>
          <button
            type="button"
            onClick={startNewNote}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md active:scale-95"
            style={{ background: t.brandBlue }}
          >
            <Plus className="w-4 h-4" />
            <span>Write First Note</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredNotes.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl p-5 border flex flex-col justify-between transition-all hover:border-blue-500/50 hover:shadow-lg"
                style={{ background: t.card, borderColor: t.border }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider"
                      style={{
                        background: 'rgba(139, 92, 246, 0.1)',
                        borderColor: 'rgba(139, 92, 246, 0.2)',
                        color: '#8b5cf6',
                      }}
                    >
                      {n.className}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: t.textSub }}>
                      {n.date}
                    </span>
                  </div>

                  <h3 className="text-base font-bold mb-1 line-clamp-1" style={{ color: t.textPrimary }}>
                    {n.title}
                  </h3>

                  <p className="text-xs font-semibold mb-2" style={{ color: t.brandBlue }}>
                    {n.subject}
                  </p>

                  <p className="text-xs leading-relaxed line-clamp-3 mb-3" style={{ color: t.textMuted }}>
                    {n.content}
                  </p>

                  {n.summary && (
                    <div
                      className="p-2.5 rounded-xl border text-[11px] font-medium leading-snug"
                      style={{ background: t.surface, borderColor: t.border, color: t.textSub }}
                    >
                      <span className="font-bold block" style={{ color: t.brandGold }}>Action Item:</span>
                      {n.summary}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t pt-3 mt-4" style={{ borderColor: t.border }}>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Edit Note"
                      onClick={() => editExistingNote(n)}
                      className="p-1.5 rounded-xl border transition-all active:scale-95"
                      style={{ background: t.surface, borderColor: t.border, color: t.brandBlue }}
                    >
                      <PenLine className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Download PDF"
                      onClick={() => downloadNotePdf(n)}
                      className="p-1.5 rounded-xl border transition-all active:scale-95"
                      style={{ background: t.surface, borderColor: t.border, color: t.brandMint }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    title="Delete Note"
                    onClick={() => deleteNote(n.id)}
                    className="p-1.5 rounded-xl border transition-all active:scale-95 text-red-400 hover:bg-red-500/10 border-red-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
