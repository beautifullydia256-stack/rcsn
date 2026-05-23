import { motion } from 'framer-motion';
import { LayoutList, CalendarDays, BookMarked, ChevronRight } from 'lucide-react';

const WHAT_IS_SOW = [
  { icon: CalendarDays, label: 'Term Planning', desc: 'Map topics across the full term week by week.' },
  { icon: BookMarked,   label: 'Learning Objectives', desc: 'Define what students should know by the end of each unit.' },
  { icon: LayoutList,   label: 'Content Sequencing', desc: 'Ensure topics build logically from simple to complex.' },
];

export default function SchemeOfWorkPage() {
  return (
    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <LayoutList className="w-8 h-8 text-emerald-400" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">Scheme of Work</h1>
          <p className="text-sm ac-text-muted mt-0.5">
            Plan and organise your teaching across the term, week by week.
          </p>
        </div>
      </div>

      {/* Coming soon banner */}
      <div className="ac-glass-card rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <LayoutList className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold ac-text-primary">Scheme of Work builder</span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
              Coming soon
            </span>
          </div>
          <p className="text-sm ac-text-muted leading-relaxed">
            Create structured, term-long teaching plans per subject and class. This feature is under development
            — your school administrator will enable it when it is ready.
          </p>
        </div>
      </div>

      {/* Feature previews */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {WHAT_IS_SOW.map(({ icon: Icon, label, desc }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-5"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="font-semibold ac-text-primary text-sm mb-1">{label}</p>
            <p className="text-xs ac-text-muted leading-relaxed">{desc}</p>
          </motion.div>
        ))}
      </div>

      {/* What it will look like */}
      <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--ac-border)] bg-white/[0.03] flex items-center justify-between">
          <span className="text-sm font-semibold ac-text-primary">Scheme preview (placeholder)</span>
          <span className="text-xs ac-text-muted">Mathematics · Primary 4 · Term 1</span>
        </div>
        <div className="divide-y divide-[var(--ac-border)] opacity-30 pointer-events-none select-none">
          {['Week 1 — Number & Place Value', 'Week 2 — Addition & Subtraction', 'Week 3 — Multiplication Tables', 'Week 4 — Division Concepts'].map((w) => (
            <div key={w} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm ac-text-primary">{w}</span>
              <ChevronRight className="w-4 h-4 ac-text-muted" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
