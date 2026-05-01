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
} from 'lucide-react';
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

const SECONDARY_GRADE_CODES = ['A', 'B', 'C', 'D', 'E'];

type SchoolType = 'Nursery/Primary' | 'Secondary' | null;

async function fetchSchoolType(schoolId: string): Promise<SchoolType> {
  const { data } = await supabase.from('schools').select('type').eq('school_id', schoolId).single();
  const t = (data as { type?: string } | null)?.type;
  if (t === 'Nursery/Primary' || t === 'Secondary') return t;
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

async function fetchUaceGradeBands(schoolId: string) {
  const { data, error } = await supabase
    .from('school_class_uace_grade_bands')
    .select('class_name, bands, updated_at')
    .eq('school_id', schoolId);
  if (error) throw error;
  return (data || []) as { class_name: string; bands: unknown; updated_at?: string }[];
}

export default function GradingSystemPage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.role);
  const { classNames: assignedClasses, classesWithSubjects, isLoading: teacherContextLoading } = useTeacherContext();
  const assignedSubjects = Array.from(new Set(classesWithSubjects.flatMap((c) => c.subjects))).sort();
  const canSeeAll = role === 'admin' || role === 'owner' || role === 'head_teacher';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'scale' | 'remarks' | 'class-comments' | 'head-comments'>('scale');

  const { data: schoolType, isLoading: typeLoading } = useQuery({
    queryKey: ['teacher', 'school-type', schoolId ?? ''],
    queryFn: () => fetchSchoolType(schoolId!),
    enabled: !!schoolId,
  });

  const isPrimary = schoolType === 'Nursery/Primary';
  const isSecondary = schoolType === 'Secondary';

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
    enabled: !!schoolId && (isPrimary || isSecondary),
  });

  const { data: classesList = [] } = useQuery({
    queryKey: ['teacher', 'classes-list', schoolId ?? ''],
    queryFn: () => fetchClasses(schoolId!),
    enabled: !!schoolId && (isPrimary || isSecondary),
  });

  const { data: headCommentsSettings = [], isLoading: headCommentsLoading } = useQuery({
    queryKey: ['teacher', 'headteacher-comments-settings', schoolId ?? ''],
    queryFn: () => fetchHeadTeacherCommentsSettings(schoolId!),
    enabled: !!schoolId && (isPrimary || isSecondary) && canSeeAll,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher', 'grading-scale-primary', schoolId ?? ''] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'teacher-remarks-settings', schoolId ?? ''] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'class-teacher-comments-settings', schoolId ?? ''] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'headteacher-comments-settings', schoolId ?? ''] });
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

  if (!schoolType) {
    return (
      <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
        <p className="ac-text-muted">Unable to determine school type. Ask your admin to set school type (Nursery/Primary or Secondary) in settings.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Percent className="w-8 h-8 text-blue-400" />
        <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">Grading System</h1>
      </div>
      <p className="ac-text-muted">
        {isPrimary
          ? 'Manage your grading scale (D1–F9), Teacher\'s Remarks per subject, and Class Teacher\'s Comments per class. Changes apply to new and updated exam results and reports.'
          : 'Manage A-Level (UACE) percentage → grade bands per Senior 5–6 class and Class Teacher\'s Comments per class (report comments from overall average). Each school stores its own settings; new schools start from defaults until you save custom bands.'}
      </p>

      {isPrimary && (
        <div className="flex gap-2 border-b border-[var(--ac-border)] pb-2">
          {(['scale', 'remarks', 'class-comments', ...(canSeeAll ? ['head-comments' as const] : [])] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'ac-text-secondary hover:bg-[var(--ac-card-bg)] border border-[var(--ac-border)]'
              }`}
            >
              {tab === 'scale' && 'Grading scale'}
              {tab === 'remarks' && "Teacher's remarks"}
              {tab === 'class-comments' && "Class teacher's comments"}
              {tab === 'head-comments' && "Head teacher's comments"}
            </button>
          ))}
        </div>
      )}

      {isSecondary && (
        <div className="flex gap-2 border-b border-[var(--ac-border)] pb-2">
          {(['scale', 'class-comments', ...(canSeeAll ? ['head-comments' as const] : [])] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'ac-text-secondary hover:bg-[var(--ac-card-bg)] border border-[var(--ac-border)]'
              }`}
            >
              {tab === 'scale' && 'Grading scale'}
              {tab === 'class-comments' && "Class teacher's comments"}
              {tab === 'head-comments' && "Head teacher's comments"}
            </button>
          ))}
        </div>
      )}

      {/* ----- PRIMARY: Grading scale ----- */}
      {isPrimary && activeTab === 'scale' && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-semibold ac-text-primary">Primary Grading Scale (D1 – F9)</h2>
          </div>
          <p className="ac-text-muted text-sm mb-4">Used for Primary 1 – Primary 7. You can use the default scale or copy it to your school and edit ranges.</p>
          {primaryScaleLoading ? (
            <div className="flex items-center gap-2 py-4"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>
          ) : (
            <>
              {primarySchoolRows.length === 0 && (
                <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                  <p className="ac-text-primary">Copy the default scale to your school to customize bands (edit/add/remove).</p>
                  <button
                    type="button"
                    onClick={() => copyDefaultPrimaryScale.mutate()}
                    disabled={copyDefaultPrimaryScale.isPending}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                  >
                    {copyDefaultPrimaryScale.isPending ? 'Copying...' : 'Copy default scale to my school'}
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
              <div className="overflow-x-auto rounded-xl border border-[var(--ac-border)]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--ac-border)] ac-text-muted">
                      <th className="p-3 font-medium">Grade</th>
                      <th className="p-3 font-medium">Marks (%)</th>
                      <th className="p-3 font-medium">Remark</th>
                      {primarySchoolRows.length > 0 && <th className="p-3 font-medium w-24">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="ac-text-primary">
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
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-6 h-6 text-violet-400" />
            <h2 className="text-lg font-semibold ac-text-primary">A-Level (Senior 5–6): UACE exam bands</h2>
          </div>
          <p className="ac-text-muted text-sm mb-6">
            Principal papers marked out of 100: percentage maps to a letter grade using bands below. Your school can override the UNEB-style defaults per A-Level class; exam entry, reports, and the database use the same bands.
          </p>
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
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm ac-text-primary">
        No A-Level classes found for your account. Add Senior 5–6 (or equivalent) under school classes, and ensure you are assigned to teach at least one A-Level class to edit UACE bands.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--ac-border)] bg-[var(--ac-card-bg)] px-3 py-4 text-sm ac-text-primary space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs ac-text-muted">A-Level class</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="ac-input rounded-lg px-3 py-2 min-w-[160px]"
          >
            {alevelClassNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs ac-text-muted pb-2">
          {hasCustomRow ? 'Using saved bands for this class.' : 'No saved row — showing UNEB-style defaults until you save.'}
        </span>
      </div>

      <p className="text-xs ac-text-muted">
        Bands are checked from top to bottom; the first range that contains the student&apos;s % wins (same as the database). Use high grades first (e.g. A, then B, …).
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[var(--ac-border)]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--ac-border)] ac-text-muted">
                  <th className="p-2 font-medium">Min %</th>
                  <th className="p-2 font-medium">Max %</th>
                  <th className="p-2 font-medium">Grade</th>
                  <th className="p-2 font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {draft.map((row, idx) => (
                  <tr key={`${row.grade}-${idx}`} className="border-b border-[var(--ac-border)] last:border-0">
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.001"
                        className="ac-input w-24 rounded px-2 py-1"
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
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.001"
                        className="ac-input w-24 rounded px-2 py-1"
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
                    <td className="p-2 font-semibold">{row.grade}</td>
                    <td className="p-2">{uacePointsFromGrade(row.grade)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {localError && <p className="text-sm text-red-600 dark:text-red-400">{localError}</p>}
          {(upsertBands.error || deleteBands.error) && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {(upsertBands.error || deleteBands.error) instanceof Error
                ? (upsertBands.error || deleteBands.error)!.message
                : 'Could not save. Check that you are assigned to this class or ask an admin.'}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
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
              className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
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
              className="px-4 py-2 rounded-lg border border-[var(--ac-border)] ac-text-primary text-sm hover:bg-[var(--ac-border)] disabled:opacity-50"
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
    <div className="mb-4 p-4 rounded-xl border border-[var(--ac-border)] bg-[var(--ac-card-bg)]">
      <h3 className="text-sm font-medium ac-text-primary mb-3">Add grade band</h3>
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs ac-text-muted">Grade</span>
          <select value={grade_code} onChange={(e) => setGradeCode(e.target.value)} className="ac-input rounded-lg px-3 py-2 w-24">
            <option value="">Select</option>
            {primaryGrades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs ac-text-muted">Min %</span>
          <input type="number" min={0} max={100} value={min_pct} onChange={(e) => setMinPct(e.target.value)} placeholder="0" className="ac-input rounded-lg px-3 py-2 w-20" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs ac-text-muted">Max %</span>
          <input type="number" min={0} max={100} value={max_pct} onChange={(e) => setMaxPct(e.target.value)} placeholder="100" className="ac-input rounded-lg px-3 py-2 w-20" />
        </label>
        <button type="button" onClick={handleAdd} disabled={isPending || !grade_code.trim() || min_pct === '' || max_pct === ''} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add
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
  const [editing, setEditing] = useState(false);
  const [grade_code, setGradeCode] = useState(row.grade_code);
  const [min_pct, setMinPct] = useState(row.min_pct);
  const [max_pct, setMaxPct] = useState(row.max_pct);
  const primaryGrades = ['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'P8', 'F9'];

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
    <tr className="border-b border-[var(--ac-border)] last:border-0">
      <td className="p-3 font-medium">
        {editing && row.id ? (
          <select value={grade_code} onChange={(e) => setGradeCode(e.target.value)} className="ac-input rounded px-2 py-1 text-sm w-20">
            {primaryGrades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        ) : (
          row.grade_code
        )}
      </td>
      <td className="p-3">
        {editing && row.id ? (
          <span className="flex items-center gap-1">
            <input type="number" min={0} max={100} value={min_pct} onChange={(e) => setMinPct(e.target.value)} className="ac-input w-14 rounded px-2 py-1 text-sm" />
            <span className="ac-text-muted">–</span>
            <input type="number" min={0} max={100} value={max_pct} onChange={(e) => setMaxPct(e.target.value)} className="ac-input w-14 rounded px-2 py-1 text-sm" />
          </span>
        ) : (
          `${row.min_pct} – ${row.max_pct}`
        )}
      </td>
      <td className="p-3">{row.grade_code === 'F9' ? 'Fail' : 'Pass'}</td>
      {isSchoolRow && (
        <td className="p-3 w-24">
          {row.id ? (
            editing ? (
              <span className="flex items-center gap-1">
                <button type="button" onClick={save} disabled={isUpdating} className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700" title="Save"><Save className="w-4 h-4" /></button>
                <button type="button" onClick={cancel} className="p-1.5 rounded bg-[var(--ac-border)] hover:opacity-80" title="Cancel"><X className="w-4 h-4" /></button>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-[var(--ac-border)]" title="Edit"><Pencil className="w-4 h-4" /></button>
                <button type="button" onClick={() => row.id && window.confirm('Remove this grade band?') && onDelete(row.id)} disabled={isDeleting} className="p-1.5 rounded hover:bg-red-500/20 text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
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

  const subjects = Array.from(new Set(Object.keys(remarksBySubject))).sort();

  return (
    <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-6 h-6 text-blue-400" />
        <h2 className="text-lg font-semibold ac-text-primary">Teacher's Remarks (per subject)</h2>
      </div>
      <p className="ac-text-muted text-sm mb-4">These comments appear on the report for each subject based on the student's percentage. Add bands (e.g. 0–40, 41–60, 61–80, 81–100) and the comment text for each.</p>

      {assignedSubjects !== null && assignedSubjects.length === 0 && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm ac-text-primary">
          You have no subjects assigned. Ask your admin to assign you to classes and subjects. You can only edit Teacher&apos;s Remarks for subjects you teach.
        </div>
      )}
      <div className="mb-6 p-4 rounded-xl border border-[var(--ac-border)] bg-[var(--ac-card-bg)]">
        <h3 className="text-sm font-medium ac-text-primary mb-3">Add new band</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs ac-text-muted">Subject</span>
            {allowedSubjectOptions ? (
              <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="ac-input rounded-lg px-3 py-2 w-40 min-w-0">
                <option value="">Select subject</option>
                {allowedSubjectOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="e.g. Mathematics" className="ac-input rounded-lg px-3 py-2 w-40" />
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs ac-text-muted">Min %</span>
            <input type="number" min={0} max={100} value={newMin} onChange={(e) => setNewMin(Number(e.target.value))} className="ac-input rounded-lg px-3 py-2 w-20" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs ac-text-muted">Max %</span>
            <input type="number" min={0} max={100} value={newMax} onChange={(e) => setNewMax(Number(e.target.value))} className="ac-input rounded-lg px-3 py-2 w-20" />
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <span className="text-xs ac-text-muted">Comment</span>
            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="e.g. Good work. Keep it up!" className="ac-input rounded-lg px-3 py-2" />
          </label>
          <button
            type="button"
            onClick={() => {
              if (!newSubject.trim() || !newComment.trim()) return;
              addRemark.mutate({ subject: newSubject.trim(), min_percent: newMin, max_percent: newMax, comment_text: newComment.trim() }, { onSuccess: () => { setNewSubject(''); setNewMin(0); setNewMax(100); setNewComment(''); } });
            }}
            disabled={addRemark.isPending || !newSubject.trim() || !newComment.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {remarksLoading ? (
        <div className="flex items-center gap-2 py-4"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>
      ) : assignedSubjects !== null && assignedSubjects.length === 0 ? (
        null
      ) : subjectsToShow.length === 0 ? (
        <p className="ac-text-muted text-sm">No remark bands yet. Add one above to get started.</p>
      ) : (
        <div className="space-y-2">
          {subjectsToShow.map((subject) => (
            <div key={subject} className="rounded-xl border border-[var(--ac-border)] overflow-hidden">
              <div className="w-full flex items-center gap-2 p-3 ac-text-primary font-medium bg-[var(--ac-card-bg)]">
                {subject}
              </div>
              <div className="border-t border-[var(--ac-border)]">
                {(filteredBySubject[subject] || []).map((band) => (
                  <RemarkRow
                    key={band.id}
                    band={band}
                    onUpdate={(min_percent, max_percent, comment_text) => updateRemark.mutate({ id: band.id, min_percent, max_percent, comment_text })}
                    onDelete={() => deleteRemark.mutate(band.id)}
                    isUpdating={updateRemark.isPending}
                    isDeleting={deleteRemark.isPending}
                  />
                ))}
              </div>
            </div>
          ))}
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
  const [editing, setEditing] = useState(false);
  const [min, setMin] = useState(band.min_percent);
  const [max, setMax] = useState(band.max_percent);
  const [text, setText] = useState(band.comment_text);

  const save = () => {
    onUpdate(min, max, text);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 p-3 border-b border-[var(--ac-border)] last:border-0 bg-white/50 dark:bg-black/20">
      {editing ? (
        <>
          <input type="number" min={0} max={100} value={min} onChange={(e) => setMin(Number(e.target.value))} className="ac-input w-16 rounded px-2 py-1 text-sm" />
          <span className="ac-text-muted">–</span>
          <input type="number" min={0} max={100} value={max} onChange={(e) => setMax(Number(e.target.value))} className="ac-input w-16 rounded px-2 py-1 text-sm" />
          <span className="ac-text-muted">%</span>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} className="ac-input flex-1 rounded px-2 py-1 text-sm" />
          <button type="button" onClick={save} disabled={isUpdating} className="text-sm text-blue-600 hover:underline">Save</button>
          <button type="button" onClick={() => { setMin(band.min_percent); setMax(band.max_percent); setText(band.comment_text); setEditing(false); }} className="text-sm ac-text-muted hover:underline">Cancel</button>
        </>
      ) : (
        <>
          <span className="text-sm ac-text-muted w-24">{band.min_percent}–{band.max_percent}%</span>
          <span className="text-sm ac-text-primary flex-1">{band.comment_text}</span>
          <button type="button" onClick={() => setEditing(true)} className="p-1 rounded hover:bg-[var(--ac-border)]" title="Edit"><Pencil className="w-4 h-4" /></button>
          <button type="button" onClick={onDelete} disabled={isDeleting} className="p-1 rounded hover:bg-red-500/20 text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
    <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-6 h-6 text-blue-400" />
        <h2 className="text-lg font-semibold ac-text-primary">Class Teacher's Comments (per class)</h2>
      </div>
      <p className="ac-text-muted text-sm mb-4">
        {audience === 'secondary'
          ? 'Stored in class_teacher_comments_settings (per school, per class). Reports pick the comment for the band that matches the student’s overall average (Senior reports use all subjects on the card; missing subjects count as 0%). Add or edit bands—for example 0–40%, 41–60%, 61–80%, 81–100%.'
          : "One overall comment per student on the report, based on the student's average across all subjects. Add bands by class (e.g. 0–40%, 41–60%, 61–80%, 81–100%) and the comment text."}
      </p>

      {assignedClassesOnly && classesList.length === 0 && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm ac-text-primary">
          You have no classes assigned. Ask your admin to assign you to classes. You can only edit Class Teacher&apos;s Comments for classes you teach or are class teacher of.
        </div>
      )}
      <div className="mb-6 p-4 rounded-xl border border-[var(--ac-border)] bg-[var(--ac-card-bg)]">
        <h3 className="text-sm font-medium ac-text-primary mb-3">Add new band</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs ac-text-muted">Class</span>
            <input
              type="text"
              list="classes-datalist"
              value={newClass}
              onChange={(e) => setNewClass(e.target.value)}
              placeholder={audience === 'secondary' ? 'e.g. Senior 2' : 'e.g. Primary 5'}
              className="ac-input rounded-lg px-3 py-2 w-40"
            />
            <datalist id="classes-datalist">{classesList.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs ac-text-muted">Min %</span>
            <input type="number" min={0} max={100} value={newMin} onChange={(e) => setNewMin(Number(e.target.value))} className="ac-input rounded-lg px-3 py-2 w-20" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs ac-text-muted">Max %</span>
            <input type="number" min={0} max={100} value={newMax} onChange={(e) => setNewMax(Number(e.target.value))} className="ac-input rounded-lg px-3 py-2 w-20" />
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <span className="text-xs ac-text-muted">Comment</span>
            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="e.g. An excellent performance..." className="ac-input rounded-lg px-3 py-2" />
          </label>
          <button
            type="button"
            onClick={() => {
              if (!newClass.trim() || !newComment.trim()) return;
              addComment.mutate({ class_name: newClass.trim(), min_percent: newMin, max_percent: newMax, comment_text: newComment.trim() }, { onSuccess: () => { setNewClass(''); setNewMin(0); setNewMax(100); setNewComment(''); } });
            }}
            disabled={addComment.isPending || !newClass.trim() || !newComment.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>
      ) : assignedClassesOnly && classesList.length === 0 ? (
        null
      ) : classNames.length === 0 ? (
        <p className="ac-text-muted text-sm">No classes with comment bands yet. Add one above (use a class name from your school).</p>
      ) : (
        <div className="space-y-2">
          {classNames.map((className) => (
            <div key={className} className="rounded-xl border border-[var(--ac-border)] overflow-hidden">
              <div className="w-full flex items-center gap-2 p-3 ac-text-primary font-medium bg-[var(--ac-card-bg)]">
                {className}
              </div>
              <div className="border-t border-[var(--ac-border)]">
                {(classCommentsByClass[className] || []).map((band) => (
                  <RemarkRow
                    key={band.id}
                    band={band}
                    onUpdate={(min_percent, max_percent, comment_text) => updateComment.mutate({ id: band.id, min_percent, max_percent, comment_text })}
                    onDelete={() => deleteComment.mutate(band.id)}
                    isUpdating={updateComment.isPending}
                    isDeleting={deleteComment.isPending}
                  />
                ))}
                {(!classCommentsByClass[className] || classCommentsByClass[className].length === 0) && (
                  <p className="p-3 text-sm ac-text-muted">No bands for this class. Add one above.</p>
                )}
              </div>
            </div>
          ))}
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
    <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="w-6 h-6 text-violet-400" />
        <h2 className="text-lg font-semibold ac-text-primary">Head Teacher's Comments (School-wide)</h2>
      </div>
      <p className="ac-text-muted text-sm mb-4">
        These comments are school-wide and apply to all students based on their overall average percentage. 
        The system automatically selects the appropriate comment for each student's performance range on their report card.
        Add bands (e.g. 0–40%, 41–60%, 61–80%, 81–100%) and the corresponding comment text.
      </p>

      <div className="mb-6 p-4 rounded-xl border border-[var(--ac-border)] bg-[var(--ac-card-bg)]">
        <h3 className="text-sm font-medium ac-text-primary mb-3">Add new band</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs ac-text-muted">Min %</span>
            <input 
              type="number" 
              min={0} 
              max={100} 
              value={newMin} 
              onChange={(e) => setNewMin(Number(e.target.value))} 
              className="ac-input rounded-lg px-3 py-2 w-20" 
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs ac-text-muted">Max %</span>
            <input 
              type="number" 
              min={0} 
              max={100} 
              value={newMax} 
              onChange={(e) => setNewMax(Number(e.target.value))} 
              className="ac-input rounded-lg px-3 py-2 w-20" 
            />
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <span className="text-xs ac-text-muted">Comment</span>
            <input 
              type="text" 
              value={newComment} 
              onChange={(e) => setNewComment(e.target.value)} 
              placeholder="e.g. Outstanding performance. Keep up the excellent work..." 
              className="ac-input rounded-lg px-3 py-2" 
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
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading...
        </div>
      ) : headCommentsSettings.length === 0 ? (
        <p className="ac-text-muted text-sm">
          No head teacher comment bands configured yet. Add one above to get started.
        </p>
      ) : (
        <div className="rounded-xl border border-[var(--ac-border)] overflow-hidden">
          <div className="w-full flex items-center gap-2 p-3 ac-text-primary font-medium bg-[var(--ac-card-bg)]">
            School-wide Comment Bands
          </div>
          <div className="border-t border-[var(--ac-border)]">
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
