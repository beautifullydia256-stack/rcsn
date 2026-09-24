/**
 * Teacher Grading System page.
 * - Primary (Nursery/Primary): grading scale (D1–F9) + Teacher's Remarks + Class Teacher's Comments. Full CRUD.
 * - Secondary: A-Level (UACE) % → grade bands per class + Class Teacher's Comments (same DB as primary: class_teacher_comments_settings).
 * Primary teachers never see secondary scale; secondary teachers never see primary-only remarks settings.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Percent,
  BookOpen,
  GraduationCap,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  Users,
  Save,
  X,
  Stethoscope,
  Award,
  CheckCircle2,
  AlertCircle,
  Layers,
  BookMarked,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { useSchoolType } from '@/hooks/useSchoolType';
import { useAuthStore } from '@/store/authStore';
import { useTeacherContext } from '@/pages/teacher/useTeacherContext';
import { supabase } from '@/lib/supabase';
import { PRIMARY_GRADE_SCALE } from '@/lib/reportUtils';
import { UaceExamBandsReminder } from '@/pages/teacher/exam-results/UaceExamBandsReminder';
import { isALevelClass } from '@/components/reports/templates/helpers';
import {
  DEFAULT_UACE_PERCENT_BANDS,
  parseUaceBandsFromDb,
  uacePointsFromGrade,
  type UacePercentBand,
} from '@/lib/uaceGradeBands';
import { TertiaryGradingScaleEditor, TertiaryAssessmentWeightsEditor } from './TertiaryGradingEditor';

const SECONDARY_GRADE_CODES = ['A', 'B', 'C', 'D', 'E'];

type SchoolType = 'Nursery/Primary' | 'Secondary' | 'Tertiary' | null;

async function fetchSchoolType(schoolId: string): Promise<SchoolType> {
  const { data } = await supabase.from('schools').select('type').eq('school_id', schoolId).single();
  const t = (data as { type?: string } | null)?.type;
  if (t === 'Nursery/Primary' || t === 'Secondary') return t;
  if (t && (t.toLowerCase().includes('tertiary') || t.toLowerCase().includes('nursing') || t.toLowerCase().includes('midwifery') || t.toLowerCase().includes('health'))) return 'Tertiary';
  return null;
}

// Primary: rows where grade_code is not A–E (i.e. D1, D2, C3, … F9)
async function fetchPrimaryGradingScale(schoolId: string) {
  const { data, error } = await supabase
    .from('grading_scale')
    .select('id, school_id, grade_code, min_pct, max_pct')
    .or(`school_id.eq.${schoolId},school_id.is.null`)
    .order('min_pct', { ascending: false });
  if (error) throw error;
  const rows = (data || []).filter(
    (r: { grade_code?: string }) => r.grade_code && !SECONDARY_GRADE_CODES.includes(r.grade_code)
  );
  return rows as { id: string; school_id: string | null; grade_code: string; min_pct: string; max_pct: string }[];
}

async function fetchTeacherRemarksSettings(schoolId: string) {
  const { data, error } = await supabase
    .from('teacher_remarks_settings')
    .select('id, subject, min_percent, max_percent, comment_text')
    .eq('school_id', schoolId)
    .order('subject')
    .order('min_percent', { ascending: false });
  if (error) throw error;
  return (data || []) as { id: string; subject: string; min_percent: number; max_percent: number; comment_text: string }[];
}

async function fetchClassTeacherCommentsSettings(schoolId: string) {
  const { data, error } = await supabase
    .from('class_teacher_comments_settings')
    .select('id, class_name, min_percent, max_percent, comment_text')
    .eq('school_id', schoolId)
    .order('class_name')
    .order('min_percent', { ascending: false });
  if (error) throw error;
  return (data || []) as { id: string; class_name: string; min_percent: number; max_percent: number; comment_text: string }[];
}

async function fetchClasses(schoolId: string) {
  const { data } = await supabase.from('classes').select('class_name').eq('school_id', schoolId).order('class_name');
  return (data || []).map((r: { class_name: string }) => r.class_name);
}

async function fetchHeadTeacherCommentsSettings(schoolId: string) {
  const { data, error } = await supabase
    .from('headteacher_comments_settings')
    .select('id, min_percent, max_percent, comment_text')
    .eq('school_id', schoolId)
    .order('min_percent', { ascending: false });
  if (error) throw error;
  return (data || []) as { id: string; min_percent: number; max_percent: number; comment_text: string }[];
}

async function fetchHeadTeacherNurseryCommentsSettings(schoolId: string) {
  const { data, error } = await supabase
    .from('headteacher_nursery_comment_settings')
    .select('id, school_id, performance_level, comment_text')
    .eq('school_id', schoolId)
    .order('performance_level');
  if (error) throw error;
  return (data || []) as { id: string; school_id: string; performance_level: string; comment_text: string }[];
}

async function fetchClassTeacherNurseryCommentsSettings(schoolId: string) {
  const { data, error } = await supabase
    .from('class_teacher_nursery_comment_settings')
    .select('id, school_id, performance_level, comment_text')
    .eq('school_id', schoolId)
    .order('performance_level');
  if (error) throw error;
  return (data || []) as { id: string; school_id: string; performance_level: string; comment_text: string }[];
}

async function fetchUaceGradeBands(schoolId: string) {
  const { data, error } = await supabase
    .from('school_class_uace_grade_bands')
    .select('class_name, bands, updated_at')
    .eq('school_id', schoolId);
  if (error) throw error;
  return (data || []) as { class_name: string; bands: unknown; updated_at?: string }[];
}

export default function GradingSystemPage() {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.role);
  const { classNames: assignedClasses, classesWithSubjects, isLoading: teacherContextLoading } = useTeacherContext();
  const assignedSubjects = Array.from(new Set(classesWithSubjects.flatMap((c) => c.subjects))).sort();
  const canSeeAll = role === 'admin' || role === 'owner' || role === 'head_teacher';
  const queryClient = useQueryClient();
  const { isTertiary } = useSchoolType();
  const [activeTab, setActiveTab] = useState<'scale' | 'remarks' | 'class-comments' | 'head-comments' | 'nursery-class' | 'nursery-head' | 'assessment-weights'>('scale');

  const { data: rawSchoolType, isLoading: typeLoading } = useQuery({
    queryKey: ['teacher', 'school-type', schoolId ?? ''],
    queryFn: () => fetchSchoolType(schoolId!),
    enabled: !!schoolId,
  });

  const isTertiarySchool = isTertiary || rawSchoolType === 'Tertiary';
  const isPrimary = !isTertiarySchool && rawSchoolType === 'Nursery/Primary';
  const isSecondary = !isTertiarySchool && rawSchoolType === 'Secondary';

  useEffect(() => {
    if (isSecondary && activeTab === 'remarks') setActiveTab('scale');
  }, [isSecondary, activeTab]);

  const { data: primaryScale = [], isLoading: primaryScaleLoading } = useQuery({
    queryKey: ['teacher', 'grading-scale-primary', schoolId ?? ''],
    queryFn: () => fetchPrimaryGradingScale(schoolId!),
    enabled: !!schoolId && isPrimary,
  });

  const { data: remarksSettings = [], isLoading: remarksLoading } = useQuery({
    queryKey: ['teacher', 'teacher-remarks-settings', schoolId ?? ''],
    queryFn: () => fetchTeacherRemarksSettings(schoolId!),
    enabled: !!schoolId && isPrimary,
  });

  const { data: classCommentsSettings = [], isLoading: classCommentsLoading } = useQuery({
    queryKey: ['teacher', 'class-teacher-comments-settings', schoolId ?? ''],
    queryFn: () => fetchClassTeacherCommentsSettings(schoolId!),
    enabled: !!schoolId && (isPrimary || isSecondary || isTertiarySchool),
  });

  const { data: classesList = [] } = useQuery({
    queryKey: ['teacher', 'classes-list', schoolId ?? ''],
    queryFn: () => fetchClasses(schoolId!),
    enabled: !!schoolId && (isPrimary || isSecondary || isTertiarySchool),
  });

  const { data: headCommentsSettings = [], isLoading: headCommentsLoading } = useQuery({
    queryKey: ['teacher', 'headteacher-comments-settings', schoolId ?? ''],
    queryFn: () => fetchHeadTeacherCommentsSettings(schoolId!),
    enabled: !!schoolId && (isPrimary || isSecondary || isTertiarySchool) && canSeeAll,
  });

  const { data: nurseryClassComments = [], isLoading: nurseryClassLoading } = useQuery({
    queryKey: ['teacher', 'class-teacher-nursery-comments', schoolId ?? ''],
    queryFn: () => fetchClassTeacherNurseryCommentsSettings(schoolId!),
    enabled: !!schoolId && isPrimary && canSeeAll,
  });

  const { data: nurseryHeadComments = [], isLoading: nurseryHeadLoading } = useQuery({
    queryKey: ['teacher', 'headteacher-nursery-comments', schoolId ?? ''],
    queryFn: () => fetchHeadTeacherNurseryCommentsSettings(schoolId!),
    enabled: !!schoolId && isPrimary && canSeeAll,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher', 'grading-scale-primary', schoolId ?? ''] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'teacher-remarks-settings', schoolId ?? ''] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'class-teacher-comments-settings', schoolId ?? ''] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'headteacher-comments-settings', schoolId ?? ''] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'class-teacher-nursery-comments', schoolId ?? ''] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'headteacher-nursery-comments', schoolId ?? ''] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'uace-grade-bands', schoolId ?? ''] });
  };

  const alevelClassNamesForGrading = (canSeeAll ? classesList : assignedClasses)
    .filter((c) => isALevelClass(String(c || '').trim()))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const copyDefaultPrimaryScale = useMutation({
    mutationFn: async () => {
      if (!schoolId) throw new Error('No school');
      const rows = PRIMARY_GRADE_SCALE.map((r) => ({
        school_id: schoolId,
        grade_code: r.grade,
        min_pct: String(r.min),
        max_pct: String(r.max),
      }));
      const { error } = await supabase.from('grading_scale').insert(rows);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updatePrimaryScaleRow = useMutation({
    mutationFn: async ({ id, grade_code, min_pct, max_pct }: { id: string; grade_code: string; min_pct: string; max_pct: string }) => {
      const { error } = await supabase.from('grading_scale').update({ grade_code, min_pct, max_pct }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deletePrimaryScaleRow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('grading_scale').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addPrimaryScaleRow = useMutation({
    mutationFn: async ({ grade_code, min_pct, max_pct }: { grade_code: string; min_pct: string; max_pct: string }) => {
      if (!schoolId) throw new Error('No school');
      const { error } = await supabase.from('grading_scale').insert({ school_id: schoolId, grade_code, min_pct, max_pct });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const primarySchoolRows = primaryScale.filter((r) => r.school_id === schoolId);
  const primaryDefaultRows = primaryScale.filter((r) => r.school_id === null);
  const displayPrimaryScale = primarySchoolRows.length > 0 ? primarySchoolRows : primaryDefaultRows.length > 0 ? primaryDefaultRows : PRIMARY_GRADE_SCALE.map((r) => ({ grade_code: r.grade, min_pct: String(r.min), max_pct: String(r.max), id: '', school_id: null as string | null }));

  const remarksBySubject = remarksSettings.reduce((acc, r) => {
    if (!acc[r.subject]) acc[r.subject] = [];
    acc[r.subject].push(r);
    return acc;
  }, {} as Record<string, typeof remarksSettings>);

  const classCommentsByClass = classCommentsSettings.reduce((acc, r) => {
    if (!acc[r.class_name]) acc[r.class_name] = [];
    acc[r.class_name].push(r);
    return acc;
  }, {} as Record<string, typeof classCommentsSettings>);

  if (typeLoading) {
    return (
      <div className="ac-glass-card p-8 border border-[var(--ac-border)] flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin ac-text-muted" />
        <span className="ac-text-muted">Loading...</span>
      </div>
    );
  }

  if (!rawSchoolType && !isTertiary) {
    return (
      <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
        <p className="ac-text-muted">Unable to determine school type. Ask your admin to set school type in settings.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-7xl mx-auto pb-12" style={{ color: t.textPrimary }}>
      {/* Header Banner */}
      <div
        className="rounded-2xl p-6 border transition-all"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: isTertiarySchool ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: isTertiarySchool ? '#10b981' : t.brandBlue,
              }}
            >
              {isTertiarySchool ? <Stethoscope className="w-6 h-6" /> : <Percent className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: t.textPrimary }}>
                {isTertiarySchool ? 'UNMEB & Institutional Grading Regulations' : 'Grading System & Performance Bands'}
              </h1>
              <p className="text-sm font-medium mt-0.5" style={{ color: t.textMuted }}>
                {isTertiarySchool
                  ? 'Manage UNMEB / UAHEB semester grading regulations, continuous assessment (CAT 30% / Exam 70%), pass marks (50% threshold), and transcripts.'
                  : isPrimary
                  ? 'Configure national primary grading scale (D1–F9), subject remarks rules, and class teacher comments.'
                  : 'Manage A-Level (UACE) percentage grade bands per class and class teacher report remarks.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5"
              style={{
                background: isTertiarySchool ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                borderColor: isTertiarySchool ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: isTertiarySchool ? '#10b981' : t.brandBlue,
              }}
            >
              <Award className="w-3.5 h-3.5" />
              {isTertiarySchool ? 'Tertiary Health Scale' : isPrimary ? 'Primary Standard (D1-F9)' : 'Secondary A-Level / O-Level'}
            </span>
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
              Institutional Tier
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.textPrimary }}>
              {isTertiarySchool ? 'Tertiary' : isPrimary ? 'Primary' : 'Secondary'}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Active curriculum model
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
              Scale Code Range
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandMint }}>
              {isTertiarySchool ? 'A – F' : isPrimary ? 'D1 – F9' : 'A – E'}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              {isPrimary ? '9 Distinction/Credit bands' : 'Grading bands'}
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: t.brandMint }}
          >
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              {isTertiarySchool ? 'Assessment Model' : 'Remarks Rules'}
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandGold }}>
              {isTertiarySchool ? '30% / 70%' : `${remarksSettings.length} Rules`}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              {isTertiarySchool ? 'CAT + Semester Exam' : 'Subject comment ranges'}
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.12)', color: t.brandGold }}
          >
            <BookMarked className="w-5 h-5" />
          </div>
        </div>

        {!isTertiarySchool && (
          <div
            className="rounded-xl p-5 border flex items-center justify-between"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
                Class Comments
              </span>
              <div className="text-2xl font-black mt-1" style={{ color: '#8b5cf6' }}>
                {classCommentsSettings.length} Rules
              </div>
              <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
                Class teacher remarks
              </span>
            </div>
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}
            >
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>

      {/* Modern Tabs Bar */}
      {isTertiarySchool && (
        <div
          className="rounded-2xl p-2 border flex gap-2 flex-wrap"
          style={{ background: t.card, borderColor: t.border }}
        >
          {(['scale', 'assessment-weights'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab as any)}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 border"
              style={{
                background: activeTab === tab ? t.brandBlue : t.surface,
                borderColor: activeTab === tab ? t.brandBlue : t.border,
                color: activeTab === tab ? '#ffffff' : t.textMuted,
              }}
            >
              {tab === 'scale' && 'UNMEB Grading Scale & Pass Marks'}
              {tab === 'assessment-weights' && 'CAT & Semester Assessment Weights'}
            </button>
          ))}
        </div>
      )}

      {canSeeAll && isPrimary && (
        <div
          className="rounded-xl px-4 py-3 border flex items-center gap-3 text-xs"
          style={{
            background: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
            borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.25)',
            color: t.textPrimary,
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(59, 130, 246, 0.15)', color: t.brandBlue }}
          >
            <Award className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold block" style={{ color: t.brandBlue }}>
              Administrative Privileges Active
            </span>
            <span style={{ color: t.textMuted }}>
              You have access to configure school-wide report card comment banks including Primary remarks, Nursery (Early Childhood) remarks, and Head Teacher comments.
            </span>
          </div>
        </div>
      )}

      {isPrimary && (
        <div
          className="rounded-2xl p-2 border flex gap-2 flex-wrap"
          style={{ background: t.card, borderColor: t.border }}
        >
          {(['scale', 'remarks', 'class-comments', ...(canSeeAll ? ['head-comments' as const, 'nursery-class' as const, 'nursery-head' as const] : [])] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 border flex items-center gap-2 cursor-pointer"
              style={{
                background: activeTab === tab ? t.brandBlue : t.surface,
                borderColor: activeTab === tab ? t.brandBlue : t.border,
                color: activeTab === tab ? '#ffffff' : t.textMuted,
              }}
            >
              {tab === 'scale' && <span>Grading Scale (D1–F9)</span>}
              {tab === 'remarks' && <span>Teacher&apos;s Remarks</span>}
              {tab === 'class-comments' && <span>Class Teacher&apos;s Comments</span>}
              {tab === 'head-comments' && (
                <>
                  <span>Head Teacher&apos;s Comments</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                    style={{
                      background: activeTab === tab ? 'rgba(255,255,255,0.2)' : 'rgba(139, 92, 246, 0.15)',
                      color: activeTab === tab ? '#ffffff' : '#8b5cf6',
                    }}
                  >
                    Admin
                  </span>
                </>
              )}
              {tab === 'nursery-class' && (
                <>
                  <span>Nursery Class Teacher</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                    style={{
                      background: activeTab === tab ? 'rgba(255,255,255,0.2)' : 'rgba(16, 185, 129, 0.15)',
                      color: activeTab === tab ? '#ffffff' : '#10b981',
                    }}
                  >
                    ECD
                  </span>
                </>
              )}
              {tab === 'nursery-head' && (
                <>
                  <span>Nursery Head Teacher</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                    style={{
                      background: activeTab === tab ? 'rgba(255,255,255,0.2)' : 'rgba(245, 158, 11, 0.15)',
                      color: activeTab === tab ? '#ffffff' : '#f59e0b',
                    }}
                  >
                    ECD Head
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {isSecondary && (
        <div
          className="rounded-2xl p-2 border flex gap-2 flex-wrap"
          style={{ background: t.card, borderColor: t.border }}
        >
          {(['scale', 'class-comments', ...(canSeeAll ? ['head-comments' as const] : [])] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 border flex items-center gap-2 cursor-pointer"
              style={{
                background: activeTab === tab ? t.brandBlue : t.surface,
                borderColor: activeTab === tab ? t.brandBlue : t.border,
                color: activeTab === tab ? '#ffffff' : t.textMuted,
              }}
            >
              {tab === 'scale' && <span>A-Level (UACE) Grade Bands</span>}
              {tab === 'class-comments' && <span>Class Teacher&apos;s Comments</span>}
              {tab === 'head-comments' && (
                <>
                  <span>Head Teacher&apos;s Comments</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                    style={{
                      background: activeTab === tab ? 'rgba(255,255,255,0.2)' : 'rgba(139, 92, 246, 0.15)',
                      color: activeTab === tab ? '#ffffff' : '#8b5cf6',
                    }}
                  >
                    Admin
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ----- PRIMARY: Grading scale ----- */}
      {isPrimary && activeTab === 'scale' && (
        <div
          className="rounded-2xl p-6 border transition-all space-y-5"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: t.border }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(59, 130, 246, 0.12)', color: t.brandBlue }}
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
                  Primary Grading Scale (D1 – F9)
                </h2>
                <p className="text-xs font-medium mt-0.5" style={{ color: t.textMuted }}>
                  National UNEB standard for Primary 1 – Primary 7. Customize percentage thresholds or reset to defaults.
                </p>
              </div>
            </div>
          </div>

          {primaryScaleLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center" style={{ color: t.textMuted }}>
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: t.brandBlue }} />
              <span className="text-sm font-medium">Loading grading scale…</span>
            </div>
          ) : (
            <>
              {primarySchoolRows.length === 0 && (
                <div
                  className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    borderColor: 'rgba(245, 158, 11, 0.25)',
                    color: t.textPrimary,
                  }}
                >
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block text-amber-500">
                      Using National Default Bands
                    </span>
                    <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                      Copy the default scale to your school to customize specific mark boundaries per grade.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyDefaultPrimaryScale.mutate()}
                    disabled={copyDefaultPrimaryScale.isPending}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all active:scale-95 shrink-0 disabled:opacity-50 cursor-pointer"
                    style={{ background: t.brandGold }}
                  >
                    {copyDefaultPrimaryScale.isPending ? 'Copying…' : 'Copy Default Scale to My School'}
                  </button>
                </div>
              )}

              {primarySchoolRows.length > 0 && (
                <PrimaryScaleAddRow
                  onAdd={addPrimaryScaleRow.mutate}
                  isPending={addPrimaryScaleRow.isPending}
                  onSuccess={() => addPrimaryScaleRow.reset()}
                />
              )}

              <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: t.border }}>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b" style={{ background: t.surface, borderColor: t.border }}>
                      <th className="p-3.5 font-bold text-xs uppercase tracking-wider" style={{ color: t.textMuted }}>Grade Code</th>
                      <th className="p-3.5 font-bold text-xs uppercase tracking-wider" style={{ color: t.textMuted }}>Marks Range (%)</th>
                      <th className="p-3.5 font-bold text-xs uppercase tracking-wider" style={{ color: t.textMuted }}>Classification</th>
                      {primarySchoolRows.length > 0 && <th className="p-3.5 font-bold text-xs uppercase tracking-wider w-28" style={{ color: t.textMuted }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: t.border, color: t.textPrimary }}>
                    {displayPrimaryScale.map((row) => (
                      <PrimaryScaleRow
                        key={row.grade_code || row.id || row.min_pct}
                        row={row}
                        isSchoolRow={!!(row.id && primarySchoolRows.length > 0)}
                        onUpdate={updatePrimaryScaleRow.mutate}
                        onDelete={deletePrimaryScaleRow.mutate}
                        isUpdating={updatePrimaryScaleRow.isPending}
                        isDeleting={deletePrimaryScaleRow.isPending}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ----- PRIMARY: Teacher's remarks ----- */}
      {isPrimary && activeTab === 'remarks' && (
        <PrimaryRemarksSection
          schoolId={schoolId!}
          userId={userId!}
          remarksBySubject={remarksBySubject}
          remarksLoading={remarksLoading}
          assignedSubjects={canSeeAll ? null : assignedSubjects}
          onSuccess={invalidate}
        />
      )}

      {/* ----- PRIMARY: Class teacher's comments ----- */}
      {isPrimary && activeTab === 'class-comments' && (
        <PrimaryClassCommentsSection
          schoolId={schoolId!}
          userId={userId!}
          classCommentsByClass={classCommentsByClass}
          classesList={canSeeAll ? classesList : assignedClasses}
          assignedClassesOnly={!canSeeAll}
          loading={classCommentsLoading}
          onSuccess={invalidate}
          audience="primary"
        />
      )}

      {/* ----- SECONDARY: A-Level UACE bands (Grading scale tab) ----- */}
      {isSecondary && activeTab === 'scale' && (
        <div
          className="rounded-2xl p-6 border transition-all space-y-5"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: t.border }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}
            >
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
                A-Level (Senior 5–6): UACE Exam Bands
              </h2>
              <p className="text-xs font-medium mt-0.5" style={{ color: t.textMuted }}>
                Principal papers marked out of 100: percentage maps to a letter grade using bands below. Your school can override the UNEB-style defaults per A-Level class.
              </p>
            </div>
          </div>

          {schoolId ? (
            <SecondaryUaceBandsEditor
              schoolId={schoolId}
              alevelClassNames={alevelClassNamesForGrading}
              onSaved={invalidate}
            />
          ) : null}
          <div className="mt-4">
            <UaceExamBandsReminder variant="grading" />
          </div>
        </div>
      )}

      {/* ----- SECONDARY: Class teacher's comments (same table as primary) ----- */}
      {isSecondary && activeTab === 'class-comments' && (
        <PrimaryClassCommentsSection
          schoolId={schoolId!}
          userId={userId!}
          classCommentsByClass={classCommentsByClass}
          classesList={canSeeAll ? classesList : assignedClasses}
          assignedClassesOnly={!canSeeAll}
          loading={classCommentsLoading}
          onSuccess={invalidate}
          audience="secondary"
        />
      )}

      {/* ----- PRIMARY: Head teacher's comments ----- */}
      {isPrimary && activeTab === 'head-comments' && canSeeAll && (
        <HeadTeacherCommentsSection
          schoolId={schoolId!}
          userId={userId!}
          headCommentsSettings={headCommentsSettings}
          loading={headCommentsLoading}
          onSuccess={invalidate}
        />
      )}

      {/* ----- PRIMARY: Nursery Class Teacher Comments ----- */}
      {isPrimary && activeTab === 'nursery-class' && canSeeAll && (
        <NurseryClassTeacherCommentsSection
          schoolId={schoolId!}
          nurseryComments={nurseryClassComments}
          loading={nurseryClassLoading}
          onSuccess={invalidate}
        />
      )}

      {/* ----- PRIMARY: Nursery Head Teacher Comments ----- */}
      {isPrimary && activeTab === 'nursery-head' && canSeeAll && (
        <NurseryHeadTeacherCommentsSection
          schoolId={schoolId!}
          nurseryComments={nurseryHeadComments}
          loading={nurseryHeadLoading}
          onSuccess={invalidate}
        />
      )}

      {/* ----- SECONDARY: Head teacher's comments ----- */}
      {isSecondary && activeTab === 'head-comments' && canSeeAll && (
        <HeadTeacherCommentsSection
          schoolId={schoolId!}
          userId={userId!}
          headCommentsSettings={headCommentsSettings}
          loading={headCommentsLoading}
          onSuccess={invalidate}
        />
      )}

      {/* ----- TERTIARY: UNMEB Grading scale & pass marks ----- */}
      {isTertiarySchool && activeTab === 'scale' && (
        <TertiaryGradingScaleEditor schoolId={schoolId!} />
      )}

      {/* ----- TERTIARY: Assessment Weights ----- */}
      {isTertiarySchool && activeTab === 'assessment-weights' && (
        <TertiaryAssessmentWeightsEditor schoolId={schoolId!} />
      )}

      {/* ----- TERTIARY: Tutor Remarks (same component) ----- */}
      {isTertiarySchool && activeTab === 'class-comments' && (
        <PrimaryClassCommentsSection
          schoolId={schoolId!}
          userId={userId!}
          classCommentsByClass={classCommentsByClass}
          classesList={canSeeAll ? classesList : assignedClasses}
          assignedClassesOnly={!canSeeAll}
          loading={classCommentsLoading}
          onSuccess={invalidate}
          audience="secondary"
        />
      )}

      {/* ----- TERTIARY: Principal Remarks (same component) ----- */}
      {isTertiarySchool && activeTab === 'head-comments' && canSeeAll && (
        <HeadTeacherCommentsSection
          schoolId={schoolId!}
          userId={userId!}
          headCommentsSettings={headCommentsSettings}
          loading={headCommentsLoading}
          onSuccess={invalidate}
        />
      )}
    </motion.div>
  );
}

function SecondaryUaceBandsEditor({
  schoolId,
  alevelClassNames,
  onSaved,
}: {
  schoolId: string;
  alevelClassNames: string[];
  onSaved: () => void;
}) {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('');
  const [draft, setDraft] = useState<UacePercentBand[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['teacher', 'uace-grade-bands', schoolId],
    queryFn: () => fetchUaceGradeBands(schoolId),
    enabled: !!schoolId,
  });

  useEffect(() => {
    if (!selectedClass && alevelClassNames.length > 0) {
      setSelectedClass(alevelClassNames[0]);
    }
  }, [alevelClassNames, selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;
    const row = rows.find((r) => String(r.class_name || '').trim() === selectedClass.trim());
    const parsed = parseUaceBandsFromDb(row?.bands);
    const base =
      parsed && parsed.length > 0 ? parsed : DEFAULT_UACE_PERCENT_BANDS.map((b) => ({ ...b }));
    setDraft(base.map((b) => ({ ...b })));
    setLocalError(null);
  }, [selectedClass, rows]);

  const upsertBands = useMutation({
    mutationFn: async (bands: UacePercentBand[]) => {
      const { error } = await supabase.from('school_class_uace_grade_bands').upsert(
        {
          school_id: schoolId,
          class_name: selectedClass.trim(),
          bands: bands.map((b) => ({
            grade: String(b.grade || '').trim().toUpperCase(),
            min_pct: Number(b.min_pct),
            max_pct: Number(b.max_pct),
          })),
        },
        { onConflict: 'school_id,class_name' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'uace-grade-bands', schoolId] });
      onSaved();
    },
  });

  const deleteBands = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('school_class_uace_grade_bands')
        .delete()
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass.trim());
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'uace-grade-bands', schoolId] });
      onSaved();
    },
  });

  const validateDraft = (): string | null => {
    if (!selectedClass.trim()) return 'Select a class.';
    for (const b of draft) {
      const mn = Number(b.min_pct);
      const mx = Number(b.max_pct);
      if (!Number.isFinite(mn) || !Number.isFinite(mx)) return 'Min and max % must be numbers.';
      if (mn > mx) return `For grade ${b.grade}, min % cannot be greater than max %.`;
      if (mn < 0 || mx > 100) return 'Keep percentages between 0 and 100.';
    }
    return null;
  };

  const hasCustomRow =
    !!selectedClass &&
    rows.some((r) => String(r.class_name || '').trim() === selectedClass.trim());

  if (alevelClassNames.length === 0) {
    return (
      <div
        className="rounded-xl border px-4 py-3 text-xs"
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          borderColor: 'rgba(245, 158, 11, 0.25)',
          color: t.textPrimary,
        }}
      >
        No A-Level classes found for your account. Add Senior 5–6 (or equivalent) under school classes, and ensure you are assigned to teach at least one A-Level class to edit UACE bands.
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 border space-y-4"
      style={{ background: t.surface, borderColor: t.border }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold" style={{ color: t.textMuted }}>A-Level Class</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-xl px-3 py-2 text-xs font-semibold min-w-[170px] border outline-none cursor-pointer"
            style={{
              background: t.card,
              borderColor: t.border,
              color: t.textPrimary,
            }}
          >
            {alevelClassNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs font-medium pb-2" style={{ color: t.textSub }}>
          {hasCustomRow ? 'Using saved bands for this class.' : 'No saved row — showing UNEB-style defaults until you save.'}
        </span>
      </div>

      <p className="text-xs font-medium" style={{ color: t.textMuted }}>
        Bands are checked from top to bottom; the first range that contains the student&apos;s % wins (same as the database). Use high grades first (e.g. A, then B, …).
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4 justify-center" style={{ color: t.textMuted }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: t.brandBlue }} />
          <span className="text-sm font-medium">Loading UACE bands…</span>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: t.border }}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b" style={{ background: t.card, borderColor: t.border }}>
                  <th className="p-3 font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>Min %</th>
                  <th className="p-3 font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>Max %</th>
                  <th className="p-3 font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>Grade</th>
                  <th className="p-3 font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>Points</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: t.border, color: t.textPrimary }}>
                {draft.map((row, idx) => (
                  <tr key={`${row.grade}-${idx}`}>
                    <td className="p-2.5">
                      <input
                        type="number"
                        step="0.001"
                        className="w-24 rounded-lg px-2.5 py-1 text-xs border outline-none font-semibold font-mono"
                        style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
                        value={row.min_pct}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setDraft((d) => {
                            const next = [...d];
                            next[idx] = { ...next[idx], min_pct: Number.isFinite(v) ? v : next[idx].min_pct };
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        step="0.001"
                        className="w-24 rounded-lg px-2.5 py-1 text-xs border outline-none font-semibold font-mono"
                        style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
                        value={row.max_pct}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setDraft((d) => {
                            const next = [...d];
                            next[idx] = { ...next[idx], max_pct: Number.isFinite(v) ? v : next[idx].max_pct };
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="p-2.5">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black font-mono"
                        style={{
                          background: 'rgba(139, 92, 246, 0.15)',
                          color: '#8b5cf6',
                        }}
                      >
                        {row.grade}
                      </span>
                    </td>
                    <td className="p-2.5 font-bold font-mono">{uacePointsFromGrade(row.grade)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {localError && <p className="text-xs font-semibold text-rose-500">{localError}</p>}
          {(upsertBands.error || deleteBands.error) && (
            <p className="text-xs font-semibold text-rose-500">
              {(upsertBands.error || deleteBands.error) instanceof Error
                ? (upsertBands.error || deleteBands.error)!.message
                : 'Could not save. Check that you are assigned to this class or ask an admin.'}
            </p>
          )}

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                const err = validateDraft();
                if (err) {
                  setLocalError(err);
                  return;
                }
                setLocalError(null);
                upsertBands.mutate(draft);
              }}
              disabled={upsertBands.isPending || !selectedClass}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
              style={{ background: '#8b5cf6' }}
            >
              <Save className="w-3.5 h-3.5" />
              {upsertBands.isPending ? 'Saving…' : 'Save bands for this class'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!hasCustomRow) {
                  setDraft(DEFAULT_UACE_PERCENT_BANDS.map((b) => ({ ...b })));
                  setLocalError(null);
                  return;
                }
                if (!window.confirm('Remove custom bands for this class? Exam results will use UNEB-style defaults until you save again.')) return;
                setLocalError(null);
                deleteBands.mutate();
              }}
              disabled={deleteBands.isPending || !selectedClass}
              className="px-4 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{
                background: t.card,
                borderColor: t.border,
                color: t.textPrimary,
              }}
            >
              {hasCustomRow ? 'Reset to defaults (remove custom)' : 'Reset editor to defaults'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function PrimaryScaleAddRow({
  onAdd,
  isPending,
  onSuccess,
}: {
  onAdd: (v: { grade_code: string; min_pct: string; max_pct: string }) => void;
  isPending: boolean;
  onSuccess: () => void;
}) {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const [grade_code, setGradeCode] = useState('');
  const [min_pct, setMinPct] = useState('');
  const [max_pct, setMaxPct] = useState('');
  const primaryGrades = ['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'P8', 'F9'];

  const handleAdd = () => {
    if (!grade_code.trim() || min_pct === '' || max_pct === '') return;
    onAdd({ grade_code: grade_code.trim(), min_pct, max_pct });
    setGradeCode('');
    setMinPct('');
    setMaxPct('');
    onSuccess();
  };

  return (
    <div
      className="p-4 rounded-xl border space-y-3"
      style={{ background: t.surface, borderColor: t.border }}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
        Add Custom Grade Band
      </h3>
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold" style={{ color: t.textMuted }}>Grade</span>
          <select
            value={grade_code}
            onChange={(e) => setGradeCode(e.target.value)}
            className="rounded-xl px-3 py-2 text-xs font-semibold w-28 border outline-none cursor-pointer"
            style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
          >
            <option value="">Select</option>
            {primaryGrades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold" style={{ color: t.textMuted }}>Min %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={min_pct}
            onChange={(e) => setMinPct(e.target.value)}
            placeholder="0"
            className="rounded-xl px-3 py-2 text-xs font-semibold w-24 border outline-none font-mono"
            style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold" style={{ color: t.textMuted }}>Max %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={max_pct}
            onChange={(e) => setMaxPct(e.target.value)}
            placeholder="100"
            className="rounded-xl px-3 py-2 text-xs font-semibold w-24 border outline-none font-mono"
            style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
          />
        </label>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending || !grade_code.trim() || min_pct === '' || max_pct === ''}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
          style={{ background: t.brandBlue }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Band
        </button>
      </div>
    </div>
  );
}

function PrimaryScaleRow({
  row,
  isSchoolRow,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: {
  row: { id?: string; grade_code: string; min_pct: string; max_pct: string };
  isSchoolRow: boolean;
  onUpdate: (v: { id: string; grade_code: string; min_pct: string; max_pct: string }) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}) {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const [editing, setEditing] = useState(false);
  const [grade_code, setGradeCode] = useState(row.grade_code);
  const [min_pct, setMinPct] = useState(row.min_pct);
  const [max_pct, setMaxPct] = useState(row.max_pct);
  const primaryGrades = ['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'P8', 'F9'];

  const getGradeBadge = (grade: string) => {
    if (grade.startsWith('D')) return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', label: 'Distinction' };
    if (grade.startsWith('C')) return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', label: 'Credit' };
    if (grade.startsWith('P')) return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', label: 'Pass' };
    return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'Fail' };
  };

  const badge = getGradeBadge(row.grade_code);

  const save = () => {
    if (row.id) onUpdate({ id: row.id, grade_code, min_pct, max_pct });
    setEditing(false);
  };
  const cancel = () => {
    setGradeCode(row.grade_code);
    setMinPct(row.min_pct);
    setMaxPct(row.max_pct);
    setEditing(false);
  };

  return (
    <tr className="transition-colors hover:bg-black/5 dark:hover:bg-white/5">
      <td className="p-3.5 font-medium">
        {editing && row.id ? (
          <select
            value={grade_code}
            onChange={(e) => setGradeCode(e.target.value)}
            className="rounded-lg px-2 py-1 text-xs border outline-none"
            style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
          >
            {primaryGrades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        ) : (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black font-mono border"
            style={{
              background: badge.bg,
              color: badge.text,
              borderColor: `${badge.text}33`,
            }}
          >
            {row.grade_code}
          </span>
        )}
      </td>
      <td className="p-3.5">
        {editing && row.id ? (
          <span className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              value={min_pct}
              onChange={(e) => setMinPct(e.target.value)}
              className="w-16 rounded-lg px-2 py-1 text-xs border outline-none font-mono"
              style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
            />
            <span style={{ color: t.textMuted }}>–</span>
            <input
              type="number"
              min={0}
              max={100}
              value={max_pct}
              onChange={(e) => setMaxPct(e.target.value)}
              className="w-16 rounded-lg px-2 py-1 text-xs border outline-none font-mono"
              style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
            />
          </span>
        ) : (
          <span className="font-mono font-bold text-xs">
            {row.min_pct}% – {row.max_pct}%
          </span>
        )}
      </td>
      <td className="p-3.5">
        <span
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style={{
            background: badge.bg,
            color: badge.text,
          }}
        >
          {badge.label}
        </span>
      </td>
      {isSchoolRow && (
        <td className="p-3.5 w-28">
          {row.id ? (
            editing ? (
              <span className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={save}
                  disabled={isUpdating}
                  className="p-1.5 rounded-lg text-white transition-all active:scale-95 cursor-pointer"
                  style={{ background: t.brandBlue }}
                  title="Save"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  className="p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer"
                  style={{ background: t.card, borderColor: t.border, color: t.textMuted }}
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer"
                  style={{ background: t.surface, borderColor: t.border, color: t.textMuted }}
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => row.id && window.confirm('Remove this grade band?') && onDelete(row.id)}
                  disabled={isDeleting}
                  className="p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                  }}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            )
          ) : null}
        </td>
      )}
    </tr>
  );
}

function PrimaryRemarksSection({
  schoolId,
  userId,
  remarksBySubject,
  remarksLoading,
  assignedSubjects,
  onSuccess,
}: {
  schoolId: string;
  userId: string;
  remarksBySubject: Record<string, { id: string; subject: string; min_percent: number; max_percent: number; comment_text: string }[]>;
  remarksLoading: boolean;
  /** null = show all (admin/owner/head_teacher); [] = no assignments; string[] = only these subjects */
  assignedSubjects: string[] | null;
  onSuccess: () => void;
}) {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const [newSubject, setNewSubject] = useState('');
  const [newMin, setNewMin] = useState(0);
  const [newMax, setNewMax] = useState(100);
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();
  const filteredBySubject = assignedSubjects === null
    ? remarksBySubject
    : Object.fromEntries(Object.entries(remarksBySubject).filter(([sub]) => assignedSubjects.includes(sub)));
  const subjectsToShow = assignedSubjects === null
    ? Array.from(new Set(Object.keys(remarksBySubject))).sort()
    : assignedSubjects.length === 0
      ? []
      : Array.from(new Set(Object.keys(filteredBySubject))).sort();
  const allowedSubjectOptions = assignedSubjects === null ? undefined : assignedSubjects;

  const addRemark = useMutation({
    mutationFn: async ({ subject, min_percent, max_percent, comment_text }: { subject: string; min_percent: number; max_percent: number; comment_text: string }) => {
      const { error } = await supabase.from('teacher_remarks_settings').insert({
        school_id: schoolId,
        subject: subject.trim(),
        min_percent,
        max_percent,
        comment_text: comment_text.trim(),
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => { onSuccess(); queryClient.invalidateQueries({ queryKey: ['teacher', 'teacher-remarks-settings', schoolId] }); },
  });

  const deleteRemark = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teacher_remarks_settings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { onSuccess(); queryClient.invalidateQueries({ queryKey: ['teacher', 'teacher-remarks-settings', schoolId] }); },
  });

  const updateRemark = useMutation({
    mutationFn: async ({ id, min_percent, max_percent, comment_text }: { id: string; min_percent: number; max_percent: number; comment_text: string }) => {
      const { error } = await supabase.from('teacher_remarks_settings').update({ min_percent, max_percent, comment_text }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { onSuccess(); queryClient.invalidateQueries({ queryKey: ['teacher', 'teacher-remarks-settings', schoolId] }); },
  });

  return (
    <div
      className="rounded-2xl p-6 border transition-all space-y-5"
      style={{ background: t.card, borderColor: t.border }}
    >
      <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: t.border }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(59, 130, 246, 0.12)', color: t.brandBlue }}
        >
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
            Teacher&apos;s Remarks (Per Subject)
          </h2>
          <p className="text-xs font-medium mt-0.5" style={{ color: t.textMuted }}>
            These comments appear on the report card for each subject based on the student&apos;s marks percentage.
          </p>
        </div>
      </div>

      {assignedSubjects !== null && assignedSubjects.length === 0 && (
        <div
          className="p-4 rounded-xl border text-xs"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderColor: 'rgba(245, 158, 11, 0.25)',
            color: t.textPrimary,
          }}
        >
          You have no subjects assigned. Ask your admin to assign you to classes and subjects. You can only edit Teacher&apos;s Remarks for subjects you teach.
        </div>
      )}

      <div
        className="p-4 rounded-xl border space-y-3"
        style={{ background: t.surface, borderColor: t.border }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
          Add New Subject Remark Band
        </h3>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: t.textMuted }}>Subject</span>
            {allowedSubjectOptions ? (
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="rounded-xl px-3 py-2 text-xs font-semibold w-44 border outline-none cursor-pointer"
                style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
              >
                <option value="">Select subject</option>
                {allowedSubjectOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Mathematics"
                className="rounded-xl px-3 py-2 text-xs font-semibold w-44 border outline-none"
                style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
              />
            )}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: t.textMuted }}>Min %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={newMin}
              onChange={(e) => setNewMin(Number(e.target.value))}
              className="rounded-xl px-3 py-2 text-xs font-semibold w-24 border outline-none font-mono"
              style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: t.textMuted }}>Max %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={newMax}
              onChange={(e) => setNewMax(Number(e.target.value))}
              className="rounded-xl px-3 py-2 text-xs font-semibold w-24 border outline-none font-mono"
              style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
            />
          </label>
          <label className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
            <span className="text-xs font-semibold" style={{ color: t.textMuted }}>Comment Text</span>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="e.g. Good mastery of concepts. Keep it up!"
              className="rounded-xl px-3 py-2 text-xs font-semibold border outline-none"
              style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              if (!newSubject.trim() || !newComment.trim()) return;
              addRemark.mutate(
                { subject: newSubject.trim(), min_percent: newMin, max_percent: newMax, comment_text: newComment.trim() },
                { onSuccess: () => { setNewSubject(''); setNewMin(0); setNewMax(100); setNewComment(''); } }
              );
            }}
            disabled={addRemark.isPending || !newSubject.trim() || !newComment.trim()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
            style={{ background: t.brandBlue }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Remark
          </button>
        </div>
      </div>

      {remarksLoading ? (
        <div className="flex items-center gap-2 py-6 justify-center" style={{ color: t.textMuted }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: t.brandBlue }} />
          <span className="text-sm font-medium">Loading teacher remarks…</span>
        </div>
      ) : assignedSubjects !== null && assignedSubjects.length === 0 ? (
        null
      ) : subjectsToShow.length === 0 ? (
        <p className="text-xs font-medium py-4 text-center" style={{ color: t.textMuted }}>
          No remark bands configured yet. Add your first subject band above to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {subjectsToShow.map((subject) => {
            const bands = filteredBySubject[subject] || [];
            return (
              <div
                key={subject}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: t.border }}
              >
                <div
                  className="flex items-center justify-between p-3.5 border-b"
                  style={{ background: t.surface, borderColor: t.border }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: t.textPrimary }}>
                      {subject}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(59, 130, 246, 0.12)',
                        color: t.brandBlue,
                      }}
                    >
                      {bands.length} {bands.length === 1 ? 'Rule' : 'Rules'}
                    </span>
                  </div>
                </div>
                <div className="divide-y" style={{ borderColor: t.border }}>
                  {bands.map((band) => (
                    <RemarkRow
                      key={band.id}
                      band={band}
                      onUpdate={(min_percent, max_percent, comment_text) =>
                        updateRemark.mutate({ id: band.id, min_percent, max_percent, comment_text })
                      }
                      onDelete={() => deleteRemark.mutate(band.id)}
                      isUpdating={updateRemark.isPending}
                      isDeleting={deleteRemark.isPending}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RemarkRow({
  band,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: {
  band: { id: string; min_percent: number; max_percent: number; comment_text: string };
  onUpdate: (min: number, max: number, text: string) => void;
  onDelete: () => void;
  isUpdating: boolean;
  isDeleting: boolean;
}) {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const [editing, setEditing] = useState(false);
  const [min, setMin] = useState(band.min_percent);
  const [max, setMax] = useState(band.max_percent);
  const [text, setText] = useState(band.comment_text);

  const save = () => {
    onUpdate(min, max, text);
    setEditing(false);
  };

  return (
    <div
      className="flex items-center gap-3 p-3 transition-colors"
      style={{ background: t.card }}
    >
      {editing ? (
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <input
            type="number"
            min={0}
            max={100}
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
            className="w-16 rounded-lg px-2 py-1 text-xs border outline-none font-mono"
            style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
          />
          <span style={{ color: t.textMuted }}>–</span>
          <input
            type="number"
            min={0}
            max={100}
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
            className="w-16 rounded-lg px-2 py-1 text-xs border outline-none font-mono"
            style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
          />
          <span className="text-xs font-semibold" style={{ color: t.textMuted }}>%</span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg px-2.5 py-1 text-xs border outline-none font-semibold"
            style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={save}
              disabled={isUpdating}
              className="p-1.5 rounded-lg text-white transition-all active:scale-95 cursor-pointer"
              style={{ background: t.brandBlue }}
              title="Save"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMin(band.min_percent);
                setMax(band.max_percent);
                setText(band.comment_text);
                setEditing(false);
              }}
              className="p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer"
              style={{ background: t.surface, borderColor: t.border, color: t.textMuted }}
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <span
            className="text-xs font-bold font-mono px-2.5 py-1 rounded-full shrink-0"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              color: t.textPrimary,
            }}
          >
            {band.min_percent}% – {band.max_percent}%
          </span>
          <span className="text-xs font-medium flex-1" style={{ color: t.textPrimary }}>
            {band.comment_text}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer"
              style={{ background: t.surface, borderColor: t.border, color: t.textMuted }}
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
              }}
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function PrimaryClassCommentsSection({
  schoolId,
  userId,
  classCommentsByClass,
  classesList,
  assignedClassesOnly,
  loading,
  onSuccess,
  audience = 'primary',
}: {
  schoolId: string;
  userId: string;
  classCommentsByClass: Record<string, { id: string; class_name: string; min_percent: number; max_percent: number; comment_text: string }[]>;
  classesList: string[];
  assignedClassesOnly: boolean;
  loading: boolean;
  onSuccess: () => void;
  /** Secondary uses the same `class_teacher_comments_settings` rows; copy differs for report context. */
  audience?: 'primary' | 'secondary';
}) {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const [newClass, setNewClass] = useState('');
  const [newMin, setNewMin] = useState(0);
  const [newMax, setNewMax] = useState(100);
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();
  const classNames = Array.from(new Set([...Object.keys(classCommentsByClass), ...classesList])).filter((c) => classesList.includes(c)).sort();

  const addComment = useMutation({
    mutationFn: async ({ class_name, min_percent, max_percent, comment_text }: { class_name: string; min_percent: number; max_percent: number; comment_text: string }) => {
      const { error } = await supabase.from('class_teacher_comments_settings').insert({
        school_id: schoolId,
        class_name: class_name.trim(),
        min_percent,
        max_percent,
        comment_text: comment_text.trim(),
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => { onSuccess(); queryClient.invalidateQueries({ queryKey: ['teacher', 'class-teacher-comments-settings', schoolId] }); },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('class_teacher_comments_settings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { onSuccess(); queryClient.invalidateQueries({ queryKey: ['teacher', 'class-teacher-comments-settings', schoolId] }); },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, min_percent, max_percent, comment_text }: { id: string; min_percent: number; max_percent: number; comment_text: string }) => {
      const { error } = await supabase.from('class_teacher_comments_settings').update({ min_percent, max_percent, comment_text }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { onSuccess(); queryClient.invalidateQueries({ queryKey: ['teacher', 'class-teacher-comments-settings', schoolId] }); },
  });

  return (
    <div
      className="rounded-2xl p-6 border transition-all space-y-5"
      style={{ background: t.card, borderColor: t.border }}
    >
      <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: t.border }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}
        >
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
            Class Teacher&apos;s Comments (Per Class)
          </h2>
          <p className="text-xs font-medium mt-0.5" style={{ color: t.textMuted }}>
            {audience === 'secondary'
              ? 'Stored per school & class. Automatically picks the matching comment on the report card based on the student’s overall average mark across all subjects.'
              : "One overall comment per student on their report card, selected based on the student's average across all subjects."}
          </p>
        </div>
      </div>

      {assignedClassesOnly && classesList.length === 0 && (
        <div
          className="p-4 rounded-xl border text-xs"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderColor: 'rgba(245, 158, 11, 0.25)',
            color: t.textPrimary,
          }}
        >
          You have no classes assigned. Ask your admin to assign you to classes. You can only edit Class Teacher&apos;s Comments for classes you teach or are class teacher of.
        </div>
      )}

      <div
        className="p-4 rounded-xl border space-y-3"
        style={{ background: t.surface, borderColor: t.border }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
          Add New Class Comment Band
        </h3>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: t.textMuted }}>Class</span>
            <input
              type="text"
              list="classes-datalist"
              value={newClass}
              onChange={(e) => setNewClass(e.target.value)}
              placeholder={audience === 'secondary' ? 'e.g. Senior 2' : 'e.g. Primary 5'}
              className="rounded-xl px-3 py-2 text-xs font-semibold w-40 border outline-none"
              style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
            />
            <datalist id="classes-datalist">{classesList.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: t.textMuted }}>Min %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={newMin}
              onChange={(e) => setNewMin(Number(e.target.value))}
              className="rounded-xl px-3 py-2 text-xs font-semibold w-24 border outline-none font-mono"
              style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: t.textMuted }}>Max %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={newMax}
              onChange={(e) => setNewMax(Number(e.target.value))}
              className="rounded-xl px-3 py-2 text-xs font-semibold w-24 border outline-none font-mono"
              style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
            />
          </label>
          <label className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
            <span className="text-xs font-semibold" style={{ color: t.textMuted }}>Comment Text</span>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="e.g. An excellent performance throughout the term..."
              className="rounded-xl px-3 py-2 text-xs font-semibold border outline-none"
              style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              if (!newClass.trim() || !newComment.trim()) return;
              addComment.mutate(
                { class_name: newClass.trim(), min_percent: newMin, max_percent: newMax, comment_text: newComment.trim() },
                { onSuccess: () => { setNewClass(''); setNewMin(0); setNewMax(100); setNewComment(''); } }
              );
            }}
            disabled={addComment.isPending || !newClass.trim() || !newComment.trim()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
            style={{ background: '#8b5cf6' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Band
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 justify-center" style={{ color: t.textMuted }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#8b5cf6' }} />
          <span className="text-sm font-medium">Loading class comments…</span>
        </div>
      ) : assignedClassesOnly && classesList.length === 0 ? (
        null
      ) : classNames.length === 0 ? (
        <p className="text-xs font-medium py-4 text-center" style={{ color: t.textMuted }}>
          No classes with comment bands yet. Add one above using a class name from your school.
        </p>
      ) : (
        <div className="space-y-3">
          {classNames.map((className) => {
            const bands = classCommentsByClass[className] || [];
            return (
              <div
                key={className}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: t.border }}
              >
                <div
                  className="flex items-center justify-between p-3.5 border-b"
                  style={{ background: t.surface, borderColor: t.border }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: t.textPrimary }}>
                      {className}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(139, 92, 246, 0.12)',
                        color: '#8b5cf6',
                      }}
                    >
                      {bands.length} {bands.length === 1 ? 'Rule' : 'Rules'}
                    </span>
                  </div>
                </div>
                <div className="divide-y" style={{ borderColor: t.border }}>
                  {bands.map((band) => (
                    <RemarkRow
                      key={band.id}
                      band={band}
                      onUpdate={(min_percent, max_percent, comment_text) =>
                        updateComment.mutate({ id: band.id, min_percent, max_percent, comment_text })
                      }
                      onDelete={() => deleteComment.mutate(band.id)}
                      isUpdating={updateComment.isPending}
                      isDeleting={deleteComment.isPending}
                    />
                  ))}
                  {bands.length === 0 && (
                    <p className="p-3 text-xs font-medium" style={{ color: t.textMuted }}>
                      No bands for this class. Add one above.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HeadTeacherCommentsSection({
  schoolId,
  userId,
  headCommentsSettings,
  loading,
  onSuccess,
}: {
  schoolId: string;
  userId: string;
  headCommentsSettings: { id: string; min_percent: number; max_percent: number; comment_text: string }[];
  loading: boolean;
  onSuccess: () => void;
}) {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const [newMin, setNewMin] = useState(0);
  const [newMax, setNewMax] = useState(100);
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  const addComment = useMutation({
    mutationFn: async ({ min_percent, max_percent, comment_text }: { min_percent: number; max_percent: number; comment_text: string }) => {
      const { error } = await supabase.from('headteacher_comments_settings').insert({
        school_id: schoolId,
        min_percent,
        max_percent,
        comment_text: comment_text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => { 
      onSuccess(); 
      queryClient.invalidateQueries({ queryKey: ['teacher', 'headteacher-comments-settings', schoolId] }); 
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('headteacher_comments_settings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { 
      onSuccess(); 
      queryClient.invalidateQueries({ queryKey: ['teacher', 'headteacher-comments-settings', schoolId] }); 
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, min_percent, max_percent, comment_text }: { id: string; min_percent: number; max_percent: number; comment_text: string }) => {
      const { error } = await supabase.from('headteacher_comments_settings').update({ min_percent, max_percent, comment_text }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { 
      onSuccess(); 
      queryClient.invalidateQueries({ queryKey: ['teacher', 'headteacher-comments-settings', schoolId] }); 
    },
  });

  return (
    <div
      className="rounded-2xl p-6 border transition-all space-y-5"
      style={{ background: t.card, borderColor: t.border }}
    >
      <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: t.border }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}
        >
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
              Head Teacher&apos;s Comments
            </h2>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
              style={{
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#8b5cf6',
              }}
            >
              School-wide Admin Config
            </span>
          </div>
          <p className="text-xs font-medium mt-0.5" style={{ color: t.textMuted }}>
            School-wide performance comments applied to all primary students based on their final average percentage.
          </p>
        </div>
      </div>

      <div
        className="p-4 rounded-xl border space-y-3"
        style={{ background: t.surface, borderColor: t.border }}
      >
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>
          Add New Head Teacher Comment Band
        </h3>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: t.textMuted }}>Min %</span>
            <input 
              type="number" 
              min={0} 
              max={100} 
              value={newMin} 
              onChange={(e) => setNewMin(Number(e.target.value))} 
              className="rounded-xl px-3 py-2 text-xs font-semibold w-24 border outline-none font-mono"
              style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: t.textMuted }}>Max %</span>
            <input 
              type="number" 
              min={0} 
              max={100} 
              value={newMax} 
              onChange={(e) => setNewMax(Number(e.target.value))} 
              className="rounded-xl px-3 py-2 text-xs font-semibold w-24 border outline-none font-mono"
              style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
            />
          </label>
          <label className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
            <span className="text-xs font-semibold" style={{ color: t.textMuted }}>Comment Text</span>
            <input 
              type="text" 
              value={newComment} 
              onChange={(e) => setNewComment(e.target.value)} 
              placeholder="e.g. Outstanding performance. Keep up the excellent dedication..." 
              className="rounded-xl px-3 py-2 text-xs font-semibold border outline-none"
              style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              if (!newComment.trim()) return;
              addComment.mutate(
                { min_percent: newMin, max_percent: newMax, comment_text: newComment.trim() }, 
                { 
                  onSuccess: () => { 
                    setNewMin(0); 
                    setNewMax(100); 
                    setNewComment(''); 
                  } 
                }
              );
            }}
            disabled={addComment.isPending || !newComment.trim()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
            style={{ background: '#8b5cf6' }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Comment Band
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 justify-center" style={{ color: t.textMuted }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#8b5cf6' }} />
          <span className="text-sm font-medium">Loading head teacher comments…</span>
        </div>
      ) : headCommentsSettings.length === 0 ? (
        <p className="text-xs font-medium py-4 text-center" style={{ color: t.textMuted }}>
          No head teacher comment bands configured yet. Add one above to get started.
        </p>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: t.border }}>
          <div
            className="p-3.5 border-b font-bold text-xs"
            style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
          >
            School-wide Comment Bands ({headCommentsSettings.length})
          </div>
          <div className="divide-y" style={{ borderColor: t.border }}>
            {headCommentsSettings.map((band) => (
              <RemarkRow
                key={band.id}
                band={band}
                onUpdate={(min_percent, max_percent, comment_text) => 
                  updateComment.mutate({ id: band.id, min_percent, max_percent, comment_text })
                }
                onDelete={() => deleteComment.mutate(band.id)}
                isUpdating={updateComment.isPending}
                isDeleting={deleteComment.isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const NURSERY_PERFORMANCE_LEVELS = [
  { value: 'VERY_GOOD', label: 'Very Good', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  { value: 'GOOD', label: 'Good', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  { value: 'NEEDS_IMPROVEMENT', label: 'Needs Improvement', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  { value: 'TRIES', label: 'Tries', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
] as const;

function NurseryClassTeacherCommentsSection({
  schoolId,
  nurseryComments,
  loading,
  onSuccess,
}: {
  schoolId: string;
  nurseryComments: { id: string; school_id: string; performance_level: string; comment_text: string }[];
  loading: boolean;
  onSuccess: () => void;
}) {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const queryClient = useQueryClient();
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const updateComment = useMutation({
    mutationFn: async ({ performance_level, comment_text }: { performance_level: string; comment_text: string }) => {
      const { error } = await supabase
        .from('class_teacher_nursery_comment_settings')
        .upsert(
          {
            school_id: schoolId,
            performance_level,
            comment_text: comment_text.trim(),
          },
          { onConflict: 'school_id,performance_level' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      onSuccess();
      queryClient.invalidateQueries({ queryKey: ['teacher', 'class-teacher-nursery-comments', schoolId] });
      setEditingLevel(null);
    },
  });

  const getCommentForLevel = (level: string) => {
    return nurseryComments.find((c) => c.performance_level === level)?.comment_text || '';
  };

  return (
    <div
      className="rounded-2xl p-6 border transition-all space-y-5"
      style={{ background: t.card, borderColor: t.border }}
    >
      <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: t.border }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}
        >
          <Users className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
              Nursery Class Teacher Comments
            </h2>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
              }}
            >
              Early Childhood (Baby, Middle, Top)
            </span>
          </div>
          <p className="text-xs font-medium mt-0.5" style={{ color: t.textMuted }}>
            Used for Nursery learners assessed by qualitative performance levels instead of percentage marks.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 justify-center" style={{ color: t.textMuted }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#10b981' }} />
          <span className="text-sm font-medium">Loading nursery remarks…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NURSERY_PERFORMANCE_LEVELS.map((level) => {
            const currentComment = getCommentForLevel(level.value);
            const isEditing = editingLevel === level.value;

            return (
              <div
                key={level.value}
                className="rounded-xl border overflow-hidden transition-all"
                style={{ background: t.surface, borderColor: t.border }}
              >
                <div
                  className="flex items-center justify-between p-3.5 border-b"
                  style={{ background: t.card, borderColor: t.border }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-black px-2.5 py-1 rounded-full border"
                      style={{
                        background: level.bg,
                        color: level.color,
                        borderColor: `${level.color}33`,
                      }}
                    >
                      {level.label}
                    </span>
                    <span className="text-[11px] font-mono font-semibold" style={{ color: t.textSub }}>
                      ({level.value})
                    </span>
                  </div>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLevel(level.value);
                        setEditText(currentComment);
                      }}
                      className="p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer"
                      style={{ background: t.surface, borderColor: t.border, color: t.textMuted }}
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl p-3 text-xs font-semibold border outline-none resize-none leading-relaxed"
                        style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
                        placeholder="Enter comment text for this performance level..."
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (editText.trim()) {
                              updateComment.mutate({
                                performance_level: level.value,
                                comment_text: editText.trim(),
                              });
                            }
                          }}
                          disabled={updateComment.isPending || !editText.trim()}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
                          style={{ background: '#10b981' }}
                        >
                          <Save className="w-3.5 h-3.5" />
                          {updateComment.isPending ? 'Saving…' : 'Save Remark'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLevel(null);
                            setEditText('');
                          }}
                          className="px-4 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                          style={{ background: t.card, borderColor: t.border, color: t.textMuted }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-medium leading-relaxed" style={{ color: currentComment ? t.textPrimary : t.textSub }}>
                      {currentComment || <span className="italic">No comment configured for this level. Click edit to set one.</span>}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="p-4 rounded-xl border flex items-center gap-3 text-xs font-medium"
        style={{
          background: 'rgba(59, 130, 246, 0.08)',
          borderColor: 'rgba(59, 130, 246, 0.25)',
          color: t.textPrimary,
        }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(59, 130, 246, 0.15)', color: t.brandBlue }}
        >
          <Award className="w-3.5 h-3.5" />
        </div>
        <p>
          <strong>Scope:</strong> These remarks apply strictly to Baby Class, Middle Class, and Top Class. Primary 1 through Primary 7 automatically use the marks percentage-based Class Teacher Comments.
        </p>
      </div>
    </div>
  );
}

function NurseryHeadTeacherCommentsSection({
  schoolId,
  nurseryComments,
  loading,
  onSuccess,
}: {
  schoolId: string;
  nurseryComments: { id: string; school_id: string; performance_level: string; comment_text: string }[];
  loading: boolean;
  onSuccess: () => void;
}) {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const queryClient = useQueryClient();
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const updateComment = useMutation({
    mutationFn: async ({ performance_level, comment_text }: { performance_level: string; comment_text: string }) => {
      const { error } = await supabase
        .from('headteacher_nursery_comment_settings')
        .upsert(
          {
            school_id: schoolId,
            performance_level,
            comment_text: comment_text.trim(),
          },
          { onConflict: 'school_id,performance_level' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      onSuccess();
      queryClient.invalidateQueries({ queryKey: ['teacher', 'headteacher-nursery-comments', schoolId] });
      setEditingLevel(null);
    },
  });

  const getCommentForLevel = (level: string) => {
    return nurseryComments.find((c) => c.performance_level === level)?.comment_text || '';
  };

  return (
    <div
      className="rounded-2xl p-6 border transition-all space-y-5"
      style={{ background: t.card, borderColor: t.border }}
    >
      <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: t.border }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(245, 158, 11, 0.12)', color: t.brandGold }}
        >
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
              Nursery Head Teacher Comments
            </h2>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
              }}
            >
              ECD Head Teacher Config
            </span>
          </div>
          <p className="text-xs font-medium mt-0.5" style={{ color: t.textMuted }}>
            Official Head Teacher signature comments for Early Childhood report cards based on performance levels.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 justify-center" style={{ color: t.textMuted }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: t.brandGold }} />
          <span className="text-sm font-medium">Loading head teacher nursery remarks…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NURSERY_PERFORMANCE_LEVELS.map((level) => {
            const currentComment = getCommentForLevel(level.value);
            const isEditing = editingLevel === level.value;

            return (
              <div
                key={level.value}
                className="rounded-xl border overflow-hidden transition-all"
                style={{ background: t.surface, borderColor: t.border }}
              >
                <div
                  className="flex items-center justify-between p-3.5 border-b"
                  style={{ background: t.card, borderColor: t.border }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-black px-2.5 py-1 rounded-full border"
                      style={{
                        background: level.bg,
                        color: level.color,
                        borderColor: `${level.color}33`,
                      }}
                    >
                      {level.label}
                    </span>
                    <span className="text-[11px] font-mono font-semibold" style={{ color: t.textSub }}>
                      ({level.value})
                    </span>
                  </div>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLevel(level.value);
                        setEditText(currentComment);
                      }}
                      className="p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer"
                      style={{ background: t.surface, borderColor: t.border, color: t.textMuted }}
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl p-3 text-xs font-semibold border outline-none resize-none leading-relaxed"
                        style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
                        placeholder="Enter comment text for this performance level..."
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (editText.trim()) {
                              updateComment.mutate({
                                performance_level: level.value,
                                comment_text: editText.trim(),
                              });
                            }
                          }}
                          disabled={updateComment.isPending || !editText.trim()}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
                          style={{ background: t.brandGold }}
                        >
                          <Save className="w-3.5 h-3.5" />
                          {updateComment.isPending ? 'Saving…' : 'Save Remark'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLevel(null);
                            setEditText('');
                          }}
                          className="px-4 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                          style={{ background: t.card, borderColor: t.border, color: t.textMuted }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-medium leading-relaxed" style={{ color: currentComment ? t.textPrimary : t.textSub }}>
                      {currentComment || <span className="italic">No comment configured for this level. Click edit to set one.</span>}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="p-4 rounded-xl border flex items-center gap-3 text-xs font-medium"
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          borderColor: 'rgba(245, 158, 11, 0.25)',
          color: t.textPrimary,
        }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(245, 158, 11, 0.15)', color: t.brandGold }}
        >
          <Award className="w-3.5 h-3.5" />
        </div>
        <p>
          <strong>Scope:</strong> These Head Teacher remarks apply to Baby Class, Middle Class, and Top Class report cards. Primary 1 to 7 use the standard percentage-based Head Teacher&apos;s Comments.
        </p>
      </div>
    </div>
  );
}
