import { motion } from 'framer-motion';
import { BookOpen, Download, FileText, Loader2 } from 'lucide-react';
import { useTeacherContext } from '../useTeacherContext';

export default function CurriculumPage() {
  const { classNames, isLoading } = useTeacherContext();

  return (
    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="w-8 h-8 text-indigo-400" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">Curriculum</h1>
          <p className="text-sm ac-text-muted mt-0.5">
            Official curriculum documents for your assigned classes — download any time.
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 ac-text-muted py-8">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading your classes…</span>
        </div>
      )}

      {/* No classes assigned */}
      {!isLoading && classNames.length === 0 && (
        <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-10 text-center">
          <BookOpen className="w-12 h-12 text-indigo-400/40 mx-auto mb-3" />
          <p className="font-semibold ac-text-primary mb-1">No classes assigned yet</p>
          <p className="text-sm ac-text-muted">
            Once you are assigned to classes, their curriculum documents will appear here.
          </p>
        </div>
      )}

      {/* Class curriculum cards */}
      {!isLoading && classNames.length > 0 && (
        <div className="space-y-4">
          {classNames.map((cls, i) => (
            <motion.div
              key={cls}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="ac-glass-card rounded-xl border border-[var(--ac-border)] overflow-hidden"
            >
              {/* Class header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--ac-border)] bg-white/[0.03]">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="font-semibold ac-text-primary">{cls}</span>
              </div>

              {/* Files area — empty state until admin uploads */}
              <div className="px-5 py-6 text-center">
                <FileText className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-sm ac-text-muted">No curriculum files uploaded yet for this class.</p>
                <p className="text-xs ac-text-muted mt-1 opacity-60">
                  Files added by the administration will appear here with a download button.
                </p>
                {/* Placeholder download row — shows what it will look like */}
                <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-lg border border-white/5 bg-white/[0.02] opacity-30 cursor-not-allowed select-none">
                  <div className="flex items-center gap-2 text-sm ac-text-muted">
                    <FileText className="w-4 h-4" />
                    <span>Curriculum_Document.pdf</span>
                  </div>
                  <button type="button" disabled className="flex items-center gap-1 text-xs text-indigo-400 font-semibold">
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
