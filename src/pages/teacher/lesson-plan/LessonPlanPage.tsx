import { motion } from 'framer-motion';
import { ClipboardList, Target, Clock, Users } from 'lucide-react';

const FEATURES = [
  { icon: Target, label: 'Learning Objectives', desc: 'Set clear, measurable goals for each lesson.' },
  { icon: Clock,  label: 'Time Management',    desc: 'Break the lesson into timed sections: introduction, body, conclusion.' },
  { icon: Users,  label: 'Class Differentiation', desc: 'Adapt activities for different learner abilities in the same class.' },
];

export default function LessonPlanPage() {
  return (
    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <ClipboardList className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">Lesson Plan</h1>
          <p className="text-sm ac-text-muted mt-0.5">
            Prepare structured lesson plans for each class and subject.
          </p>
        </div>
      </div>

      {/* Coming soon banner */}
      <div className="ac-glass-card rounded-xl border border-blue-500/20 bg-blue-500/5 p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <ClipboardList className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold ac-text-primary">Lesson Plan builder</span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
              Coming soon
            </span>
          </div>
          <p className="text-sm ac-text-muted leading-relaxed">
            Build detailed lesson plans linked to your scheme of work. Capture objectives, materials, activities, and
            assessment strategies in one place. Your administrator will enable this feature soon.
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
            <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-blue-400" />
            </div>
            <p className="font-semibold ac-text-primary text-sm mb-1">{label}</p>
            <p className="text-xs ac-text-muted leading-relaxed">{desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Placeholder lesson plan card */}
      <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] overflow-hidden opacity-30 pointer-events-none select-none">
        <div className="px-5 py-3 border-b border-[var(--ac-border)] bg-white/[0.03] flex items-center justify-between">
          <span className="text-sm font-semibold ac-text-primary">Sample Lesson Plan</span>
          <span className="text-xs ac-text-muted">Primary 4 · Mathematics · 40 min</span>
        </div>
        <div className="p-5 space-y-3">
          {['Topic: Multiplication of 2-digit numbers', 'Objective: Students will multiply two 2-digit numbers without a calculator', 'Materials: Chalkboard, exercise books, number cards', 'Introduction (5 min): Review previous homework', 'Main Activity (25 min): Guided examples then pair work', 'Conclusion (10 min): Quick quiz and summary'].map((line) => (
            <div key={line} className="text-sm ac-text-muted">{line}</div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
