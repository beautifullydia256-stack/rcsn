import { motion } from 'framer-motion';
import { Percent, BookOpen, GraduationCap } from 'lucide-react';
import { UGANDA_GRADE_SCALE, PRIMARY_GRADE_SCALE } from '@/lib/reportUtils';

export default function GradingSystemPage() {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Percent className="w-8 h-8 text-blue-400" />
        <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">Grading System</h1>
      </div>
      <p className="ac-text-muted">Grading scales used when entering exam marks and generating reports.</p>

      {/* Secondary / O-Level */}
      <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-6 h-6 text-blue-400" />
          <h2 className="text-lg font-semibold ac-text-primary">Secondary (O-Level) Grading Scale</h2>
        </div>
        <p className="ac-text-muted text-sm mb-4">Used for secondary classes. Marks are converted to grades, points, and remarks.</p>
        <div className="overflow-x-auto rounded-xl border border-[var(--ac-border)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--ac-border)] ac-text-muted">
                <th className="p-3 font-medium">Grade</th>
                <th className="p-3 font-medium">Marks (%)</th>
                <th className="p-3 font-medium">Points</th>
                <th className="p-3 font-medium">Remark</th>
              </tr>
            </thead>
            <tbody className="ac-text-primary">
              {UGANDA_GRADE_SCALE.map((row) => (
                <tr key={row.grade} className="border-b border-[var(--ac-border)] last:border-0">
                  <td className="p-3 font-medium">{row.grade}</td>
                  <td className="p-3">{row.min} – {row.max}</td>
                  <td className="p-3">{row.points}</td>
                  <td className="p-3">{row.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-[var(--ac-card-bg)] border border-[var(--ac-border)]">
          <p className="ac-text-muted text-xs font-medium uppercase tracking-wide mb-1">Divisions (by average)</p>
          <p className="ac-text-primary text-sm">Division 1: 80%+ · Division 2: 60–79% · Division 3: 40–59% · Division 4: 20–39% · Ungraded: below 20%</p>
        </div>
      </div>

      {/* Primary (D1–F9) */}
      <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-6 h-6 text-blue-400" />
          <h2 className="text-lg font-semibold ac-text-primary">Primary Grading Scale (D1 – F9)</h2>
        </div>
        <p className="ac-text-muted text-sm mb-4">Used for primary classes. Percentage range maps to grade; remark is Pass or Fail.</p>
        <div className="overflow-x-auto rounded-xl border border-[var(--ac-border)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--ac-border)] ac-text-muted">
                <th className="p-3 font-medium">Grade</th>
                <th className="p-3 font-medium">Marks (%)</th>
                <th className="p-3 font-medium">Remark</th>
              </tr>
            </thead>
            <tbody className="ac-text-primary">
              {PRIMARY_GRADE_SCALE.map((row) => (
                <tr key={row.grade} className="border-b border-[var(--ac-border)] last:border-0">
                  <td className="p-3 font-medium">{row.grade}</td>
                  <td className="p-3">{row.min} – {row.max}</td>
                  <td className="p-3">{row.grade === 'F9' ? 'Fail' : 'Pass'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
