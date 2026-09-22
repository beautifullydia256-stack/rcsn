import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardList, Target, Clock, Users, BookOpen,
  Printer, Download, Save, CheckCircle2, Plus, Sparkles,
  Layers, Check
} from 'lucide-react';
import { useTeacherContext } from '../useTeacherContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import jsPDF from 'jspdf';

interface LessonPlanState {
  className: string;
  subject: string;
  topic: string;
  subtopic: string;
  duration: string;
  date: string;
  objectives: string;
  materials: string;
  introduction: string;
  presentation: string;
  application: string;
  conclusion: string;
  evaluation: string;
}

const INITIAL_PLAN: LessonPlanState = {
  className: '',
  subject: '',
  topic: 'Multiplication of 2-digit Numbers',
  subtopic: 'Vertical Multiplication with Regrouping',
  duration: '40 mins',
  date: new Date().toISOString().split('T')[0],
  objectives: 'By the end of the lesson, learners should be able to:\n1. Multiply 2-digit by 1-digit numbers accurately with regrouping.\n2. Apply the vertical multiplication algorithm on chalkboard and workbooks.\n3. Solve practical real-world word problems involving multiplication.',
  materials: 'Chalkboard, place value charts, flashcards, learner workbooks, counters.',
  introduction: 'Review previous lesson on single-digit multiplication and place value (Tens and Ones). Quick oral quiz (5 minutes).',
  presentation: 'Step 1: Teacher demonstrates 24 x 3 on board using expanded form.\nStep 2: Guided example with class participation (36 x 2).\nStep 3: Pair practice on slates/worksheets with teacher roving.',
  application: 'Learners complete 5 vertical multiplication exercises in their notebooks individually while teacher assists struggling pupils.',
  conclusion: 'Sum up the key rule: "Always multiply the ones first, regroup to the tens column." Assign homework exercises 1 to 4.',
  evaluation: '85% of learners successfully solved at least 4 out of 5 problems without assistance.',
};

export default function LessonPlanPage() {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const { classesWithSubjects, classNames } = useTeacherContext();

  const [plan, setPlan] = useState<LessonPlanState>(() => {
    const defaultCls = classNames[0] || 'Primary 4';
    const defaultSub = classesWithSubjects[0]?.subjects[0] || 'Mathematics';
    return { ...INITIAL_PLAN, className: defaultCls, subject: defaultSub };
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    localStorage.setItem(`lesson_plan_${plan.className}_${plan.subject}`, JSON.stringify(plan));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DAILY LESSON PLAN', pageW / 2, 16, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Class: ${plan.className}   |   Subject: ${plan.subject}   |   Duration: ${plan.duration}   |   Date: ${plan.date}`, pageW / 2, 23, { align: 'center' });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 27, pageW - 14, 27);

    let y = 34;
    const addSection = (title: string, content: string) => {
      if (y > 265) {
        doc.addPage();
        y = 16;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(title.toUpperCase(), 14, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const splitContent = doc.splitTextToSize(content, pageW - 28);
      doc.text(splitContent, 14, y);
      y += splitContent.length * 4.5 + 4;
    };

    addSection('Topic & Subtopic', `Topic: ${plan.topic}\nSubtopic: ${plan.subtopic}`);
    addSection('Learning Objectives', plan.objectives);
    addSection('Instructional Materials', plan.materials);
    addSection('Lesson Introduction', plan.introduction);
    addSection('Presentation & Steps', plan.presentation);
    addSection('Learner Application & Practice', plan.application);
    addSection('Lesson Conclusion & Summary', plan.conclusion);
    addSection('Evaluation & Teacher Remarks', plan.evaluation);

    doc.save(`lesson-plan-${plan.className}-${plan.subject}-${plan.date}.pdf`.replace(/\s+/g, '_'));
  };

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
              style={{ background: 'rgba(59, 130, 246, 0.15)', color: t.brandBlue }}
            >
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: t.textPrimary }}>
                Lesson Plan Builder
              </h1>
              <p className="text-sm font-medium mt-0.5" style={{ color: t.textMuted }}>
                Structure professional competency-based lesson plans with objectives, steps, and learner evaluation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-95"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Print Plan</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md active:scale-95"
              style={{ background: t.brandBlue }}
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
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
              Target Cohort
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.textPrimary }}>
              {plan.className || 'P.4'}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              {plan.subject || 'Mathematics'}
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(59, 130, 246, 0.12)', color: t.brandBlue }}
          >
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Period Duration
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandMint }}>
              {plan.duration}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Standard lesson block
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: t.brandMint }}
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
              Lesson Date
            </span>
            <div className="text-lg font-black mt-1" style={{ color: t.brandGold }}>
              {plan.date}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Active teaching schedule
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.12)', color: t.brandGold }}
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
              Differentiation
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: '#8b5cf6' }}>
              Inclusive
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Multi-ability activities
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}
          >
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Interactive Form Builder */}
      <div
        className="rounded-2xl p-6 border transition-all space-y-5"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: t.border }}>
          <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
            Lesson Parameters & Objectives
          </h2>

          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Plan saved locally!
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-sm active:scale-95"
              style={{ background: '#10b981' }}
            >
              <Save className="w-4 h-4" />
              <span>Save Lesson Plan</span>
            </button>
          </div>
        </div>

        {/* Basic Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>
              Class / Cohort
            </label>
            <input
              type="text"
              value={plan.className}
              onChange={(e) => setPlan({ ...plan, className: e.target.value })}
              placeholder="e.g. Primary 4 Blue"
              className="w-full rounded-xl px-3.5 py-2 text-sm font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>
              Subject
            </label>
            <input
              type="text"
              value={plan.subject}
              onChange={(e) => setPlan({ ...plan, subject: e.target.value })}
              placeholder="e.g. Mathematics"
              className="w-full rounded-xl px-3.5 py-2 text-sm font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>
              Duration
            </label>
            <input
              type="text"
              value={plan.duration}
              onChange={(e) => setPlan({ ...plan, duration: e.target.value })}
              placeholder="e.g. 40 mins"
              className="w-full rounded-xl px-3.5 py-2 text-sm font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>
              Date
            </label>
            <input
              type="date"
              value={plan.date}
              onChange={(e) => setPlan({ ...plan, date: e.target.value })}
              className="w-full rounded-xl px-3.5 py-2 text-sm font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            />
          </div>
        </div>

        {/* Topic & Subtopic */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>
              Topic
            </label>
            <input
              type="text"
              value={plan.topic}
              onChange={(e) => setPlan({ ...plan, topic: e.target.value })}
              placeholder="e.g. Multiplication of Numbers"
              className="w-full rounded-xl px-3.5 py-2 text-sm font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>
              Sub-Topic
            </label>
            <input
              type="text"
              value={plan.subtopic}
              onChange={(e) => setPlan({ ...plan, subtopic: e.target.value })}
              placeholder="e.g. 2-Digit Multiplication with Regrouping"
              className="w-full rounded-xl px-3.5 py-2 text-sm font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            />
          </div>
        </div>

        {/* Objectives & Materials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>
              Competences & Learning Objectives
            </label>
            <textarea
              rows={4}
              value={plan.objectives}
              onChange={(e) => setPlan({ ...plan, objectives: e.target.value })}
              placeholder="State what learners will know and do by end of lesson..."
              className="w-full rounded-xl px-3.5 py-2 text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>
              Teaching & Learning Materials
            </label>
            <textarea
              rows={4}
              value={plan.materials}
              onChange={(e) => setPlan({ ...plan, materials: e.target.value })}
              placeholder="Chalkboard, realia, charts, worksheets, models..."
              className="w-full rounded-xl px-3.5 py-2 text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            />
          </div>
        </div>

        {/* Lesson Steps */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold uppercase tracking-wider border-b pb-2" style={{ color: t.textMuted, borderColor: t.border }}>
            Step-by-Step Delivery Procedure
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>
              1. Introduction (5–10 mins) — Hook & Prior Knowledge
            </label>
            <textarea
              rows={2}
              value={plan.introduction}
              onChange={(e) => setPlan({ ...plan, introduction: e.target.value })}
              className="w-full rounded-xl px-3.5 py-2 text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>
              2. Main Presentation & Activities (20–25 mins) — Direct Instruction & Guided Work
            </label>
            <textarea
              rows={3}
              value={plan.presentation}
              onChange={(e) => setPlan({ ...plan, presentation: e.target.value })}
              className="w-full rounded-xl px-3.5 py-2 text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>
              3. Learner Application (10 mins) — Independent & Pair Practice
            </label>
            <textarea
              rows={2}
              value={plan.application}
              onChange={(e) => setPlan({ ...plan, application: e.target.value })}
              className="w-full rounded-xl px-3.5 py-2 text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>
              4. Conclusion (5 mins) — Reflection & Assignment
            </label>
            <textarea
              rows={2}
              value={plan.conclusion}
              onChange={(e) => setPlan({ ...plan, conclusion: e.target.value })}
              className="w-full rounded-xl px-3.5 py-2 text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: t.textMuted }}>
              5. Self-Evaluation & Post-Lesson Remarks
            </label>
            <textarea
              rows={2}
              value={plan.evaluation}
              onChange={(e) => setPlan({ ...plan, evaluation: e.target.value })}
              className="w-full rounded-xl px-3.5 py-2 text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
