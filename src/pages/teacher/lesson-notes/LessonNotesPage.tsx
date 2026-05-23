import { motion } from 'framer-motion';
import { NotebookPen, PenLine, FolderOpen, Search } from 'lucide-react';

const FEATURES = [
  { icon: PenLine,    label: 'Write & Save',      desc: 'Capture notes during or after each lesson and save them by date and class.' },
  { icon: FolderOpen, label: 'Organised by Class', desc: 'Notes are grouped per class and subject for easy retrieval.' },
  { icon: Search,     label: 'Quick Search',       desc: 'Find any note instantly by keyword, date, or class.' },
];

export default function LessonNotesPage() {
  return (
    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <NotebookPen className="w-8 h-8 text-violet-400" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">Lesson Notes</h1>
          <p className="text-sm ac-text-muted mt-0.5">
            Record and review notes from every lesson you teach.
          </p>
        </div>
      </div>

      {/* Coming soon banner */}
      <div className="ac-glass-card rounded-xl border border-violet-500/20 bg-violet-500/5 p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <NotebookPen className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold ac-text-primary">Lesson Notes</span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400">
              Coming soon
            </span>
          </div>
          <p className="text-sm ac-text-muted leading-relaxed">
            Write, organise, and revisit your lesson notes — linked to each class, subject, and date. This feature
            will be enabled soon by your school administrator.
          </p>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FEATURES.map(({ icon: Icon, label, desc }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-5"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-violet-400" />
            </div>
            <p className="font-semibold ac-text-primary text-sm mb-1">{label}</p>
            <p className="text-xs ac-text-muted leading-relaxed">{desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Placeholder note list */}
      <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] overflow-hidden opacity-30 pointer-events-none select-none">
        <div className="px-5 py-3 border-b border-[var(--ac-border)] bg-white/[0.03] flex items-center justify-between">
          <span className="text-sm font-semibold ac-text-primary">Recent Notes</span>
          <span className="text-xs ac-text-muted">3 notes</span>
        </div>
        <div className="divide-y divide-[var(--ac-border)]">
          {[
            { title: 'Fractions — Introduction',           cls: 'Primary 4',  sub: 'Mathematics', date: '22 May 2026' },
            { title: 'The Water Cycle',                   cls: 'Primary 5',  sub: 'Science',     date: '21 May 2026' },
            { title: 'Sentence construction with adverbs', cls: 'Primary 3',  sub: 'English',     date: '20 May 2026' },
          ].map((n) => (
            <div key={n.title} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm ac-text-primary font-medium">{n.title}</p>
                <p className="text-xs ac-text-muted">{n.cls} · {n.sub}</p>
              </div>
              <span className="text-xs ac-text-muted">{n.date}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
