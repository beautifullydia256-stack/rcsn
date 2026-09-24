import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, ArrowRight, BookOpen, Layers, Award,
  Users, CheckCircle2, Search, ArrowLeft, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTeacherContext } from '../useTeacherContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getSecondaryExamEntryTrack } from '@/components/reports/templates/helpers';

type ClassInfo = { class_name: string; subjects: string[]; is_class_teacher: boolean; stream_name?: string | null };

export default function TeacherExamResultsPage() {
  const navigate  = useNavigate();
  const isDark    = useUIStore((s) => s.theme === 'dark');
  const t         = getTokens(isDark);

  const schoolId  = useAuthStore((s) => s.schoolId);
  const { teacherId, isLoading: ctxLoading } = useTeacherContext();
  const { isTertiary, isSecondary, isPrimary, isLoading: typeLoading } = useSchoolType();

  const [searchQuery, setSearchQuery] = useState('');

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['teacher', 'exam-results', 'classes', schoolId ?? '', teacherId ?? ''],
    queryFn: async (): Promise<ClassInfo[]> => {
      if (!schoolId || !teacherId) return [];
      const [ctRes, tcsRes] = await Promise.all([
        supabase.from('class_teachers').select('class_name').eq('school_id', schoolId).eq('teacher_id', teacherId),
        supabase.from('teacher_class_subjects').select('class_name, subject, stream_name').eq('school_id', schoolId).eq('teacher_id', teacherId),
      ]);
      const classTeacherSet = new Set((ctRes.data ?? []).map((r: { class_name: string }) => r.class_name));
      const byClass = new Map<string, Set<string>>();
      const streamByClass = new Map<string, string | null>();
      (tcsRes.data ?? []).forEach((r: { class_name: string; subject: string; stream_name?: string | null }) => {
        if (!byClass.has(r.class_name)) byClass.set(r.class_name, new Set());
        byClass.get(r.class_name)!.add(r.subject);
        if (r.stream_name && !streamByClass.has(r.class_name)) streamByClass.set(r.class_name, r.stream_name);
      });
      const allClasses = new Set([...classTeacherSet, ...byClass.keys()]);
      return Array.from(allClasses).map((class_name) => ({
        class_name,
        subjects: Array.from(byClass.get(class_name) ?? []).sort(),
        is_class_teacher: classTeacherSet.has(class_name),
        stream_name: streamByClass.get(class_name) ?? null,
      }));
    },
    enabled: !!schoolId && !!teacherId,
  });

  const isLoading = ctxLoading || typeLoading || classesLoading;

  const totalSubjectsTaught = Array.from(new Set(classes.flatMap((c) => c.subjects))).length;
  const classTeacherCount = classes.filter((c) => c.is_class_teacher).length;

  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes;
    const q = searchQuery.toLowerCase();
    return classes.filter(
      (c) =>
        c.class_name.toLowerCase().includes(q) ||
        (c.stream_name && c.stream_name.toLowerCase().includes(q)) ||
        c.subjects.some((s) => s.toLowerCase().includes(q))
    );
  }, [classes, searchQuery]);

  const handleClassSelect = (className: string) => {
    navigate(`/dashboard/teacher/exam-results/class/${encodeURIComponent(className)}`);
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
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: t.textPrimary }}>
                {isTertiary ? 'Continuous Assessment & Results Portal' : 'Exam Results & Mark Entry Hub'}
              </h1>
              <p className="text-sm font-medium mt-0.5" style={{ color: t.textMuted }}>
                {isTertiary
                  ? 'Enter and audit continuous assessment (CAT), practical OSCE, and semester examination marks.'
                  : 'Enter and audit student marks for your assigned classes and subjects.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard/teacher')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-95"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
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
              {isTertiary ? 'Assigned Cohorts' : 'Assigned Classes'}
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.textPrimary }}>
              {classes.length} {isTertiary ? 'Cohorts' : 'Classes'}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              {isTertiary ? 'Active student cohorts' : 'Active student classes'}
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(59, 130, 246, 0.12)', color: t.brandBlue }}
          >
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              {isTertiary ? 'Course Units Taught' : 'Subjects Taught'}
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandMint }}>
              {totalSubjectsTaught} {isTertiary ? 'Units' : 'Subjects'}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Curriculum allocations
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
              {isTertiary ? 'Cohort Lead' : 'Class Teacher'}
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandGold }}>
              {classTeacherCount} Assigned
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              {isTertiary ? 'Lead tutor in-charge' : 'Full report card remarks'}
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.12)', color: t.brandGold }}
          >
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              {isTertiary ? 'Curricular Model' : 'School Track'}
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: '#8b5cf6' }}>
              {isTertiary ? 'UNMEB 5.0' : isSecondary ? 'Secondary' : 'Primary'}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              {isTertiary ? 'Semester & 50% Pass Mark' : isSecondary ? 'O & A-Level Grading' : 'D1 – F9 National Scale'}
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}
          >
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div
        className="rounded-2xl p-4 border flex items-center justify-between gap-3 transition-all"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="relative w-full sm:w-80">
          <Search
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: t.textSub }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isTertiary ? 'Search cohort or course unit…' : 'Search class or subject…'}
            className="w-full pl-10 pr-3 py-2 text-xs font-medium rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            style={{
              background: t.surface,
              borderColor: t.border,
              color: t.textPrimary,
            }}
          />
        </div>

        <span className="text-xs font-semibold hidden sm:inline-block" style={{ color: t.textMuted }}>
          {isTertiary ? 'Select a cohort card to enter continuous assessment marks' : 'Select a class card to enter exam marks'}
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-16 gap-3" style={{ color: t.textMuted }}>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: t.brandBlue }} />
          <span className="text-sm font-medium">Loading assigned classes…</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredClasses.length === 0 && (
        <div
          className="rounded-2xl p-12 border text-center transition-all"
          style={{ background: t.card, borderColor: t.border }}
        >
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: t.textPrimary }} />
          <p className="text-base font-bold" style={{ color: t.textPrimary }}>
            {classes.length === 0 ? 'No cohorts assigned' : 'No matching cohorts found'}
          </p>
          <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: t.textMuted }}>
            {classes.length === 0
              ? 'You have not been assigned to any cohorts or course units yet. Contact your school administrator.'
              : 'Try searching for a different cohort name or course unit.'}
          </p>
        </div>
      )}

      {/* Classes Grid */}
      {!isLoading && filteredClasses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredClasses.map((c, i) => {
              const secTrack = isSecondary ? getSecondaryExamEntryTrack(c.class_name) : null;
              return (
                <motion.div
                  key={c.class_name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleClassSelect(c.class_name)}
                  className="rounded-2xl p-5 border flex flex-col justify-between transition-all cursor-pointer hover:border-blue-500/50 hover:shadow-lg active:scale-[0.99]"
                  style={{ background: t.card, borderColor: t.border }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold" style={{ color: t.textPrimary }}>
                          {c.class_name}
                        </h3>
                        {c.stream_name && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider"
                            style={{
                              background: 'rgba(139, 92, 246, 0.12)',
                              borderColor: 'rgba(139, 92, 246, 0.25)',
                              color: '#8b5cf6',
                            }}
                          >
                            {c.stream_name}
                          </span>
                        )}
                        {secTrack && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider"
                            style={{
                              background: secTrack === 'alevel' ? 'rgba(236, 72, 153, 0.12)' : 'rgba(14, 165, 233, 0.12)',
                              borderColor: secTrack === 'alevel' ? 'rgba(236, 72, 153, 0.25)' : 'rgba(14, 165, 233, 0.25)',
                              color: secTrack === 'alevel' ? '#ec4899' : '#0ea5e9',
                            }}
                          >
                            {secTrack === 'alevel' ? 'A-Level' : 'O-Level'}
                          </span>
                        )}
                      </div>

                      {c.is_class_teacher && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1"
                          style={{
                            background: 'rgba(16, 185, 129, 0.12)',
                            borderColor: 'rgba(16, 185, 129, 0.25)',
                            color: '#10b981',
                          }}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {isTertiary ? 'Lead Tutor' : 'Class Teacher'}
                        </span>
                      )}
                    </div>

                    <div className="mb-4">
                      <span className="text-xs font-semibold block mb-2" style={{ color: t.textMuted }}>
                        {isTertiary ? 'Your Assigned Course Units:' : 'Your Assigned Subjects:'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {c.subjects.length === 0 ? (
                          <span className="text-xs italic" style={{ color: t.textSub }}>
                            {isTertiary ? 'No course units assigned' : 'No subjects assigned'}
                          </span>
                        ) : (
                          c.subjects.map((s) => (
                            <span
                              key={s}
                              className="text-xs font-medium px-2.5 py-1 rounded-lg border"
                              style={{
                                background: t.surface,
                                borderColor: t.border,
                                color: t.textPrimary,
                              }}
                            >
                              {s}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between border-t pt-3.5 mt-2"
                    style={{ borderColor: t.border }}
                  >
                    <span className="text-xs font-medium" style={{ color: t.textMuted }}>
                      {isTertiary ? 'Enter Continuous Assessment' : 'Enter Marks & Scores'}
                    </span>
                    <div
                      className="flex items-center gap-1 text-xs font-bold"
                      style={{ color: t.brandBlue }}
                    >
                      <span>{isTertiary ? 'Open Assessment Roster' : 'Open Roster'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
