/**
 * Teacher Grading System page.
 * - Primary (Nursery/Primary): grading scale (D1–F9) + Teacher's Remarks + Class Teacher's Comments. Full CRUD.
 * - Secondary: grading scale (A–E only, no F). Full CRUD. No remarks/comment settings.
 * Primary teachers never see secondary scale; secondary teachers never see primary scale or remarks settings.
 */
import { useState } from 'react';
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
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTeacherContext } from '@/pages/teacher/useTeacherContext';
import { supabase } from '@/lib/supabase';
import { UGANDA_GRADE_SCALE, PRIMARY_GRADE_SCALE } from '@/lib/reportUtils';

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

// Secondary: rows where grade_code in A–E
async function fetchSecondaryGradingScale(schoolId: string) {
  const { data, error } = await supabase
    .from('grading_scale')
    .select('id, school_id, grade_code, min_pct, max_pct')
    .eq('school_id', schoolId)
    .in('grade_code', SECONDARY_GRADE_CODES)
    .order('min_pct', { ascending: false });
  if (error) throw error;
  return (data || []) as { id: string; school_id: string; grade_code: string; min_pct: string; max_pct: string }[];
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

export default function GradingSystemPage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.role);
  const { classNames: assignedClasses, classesWithSubjects, isLoading: teacherContextLoading } = useTeacherContext();
  const assignedSubjects = Array.from(new Set(classesWithSubjects.flatMap((c) => c.subjects))).sort();
  const canSeeAll = role === 'admin' || role === 'owner' || role === 'head_teacher';
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'scale' | 'remarks' | 'class-comments'>('scale');

  const { data: schoolType, isLoading: typeLoading } = useQuery({
    queryKey: ['teacher', 'school-type', schoolId ?? ''],
    queryFn: () => fetchSchoolType(schoolId!),
    enabled: !!schoolId,
  });

  const isPrimary = schoolType === 'Nursery/Primary';
  const isSecondary = schoolType === 'Secondary';

  const { data: primaryScale = [], isLoading: primaryScaleLoading } = useQuery({
    queryKey: ['teacher', 'grading-scale-primary', schoolId ?? ''],
    queryFn: () => fetchPrimaryGradingScale(schoolId!),
    enabled: !!schoolId && isPrimary,
  });

  const { data: secondaryScale = [], isLoading: secondaryScaleLoading } = useQuery({
    queryKey: ['teacher', 'grading-scale-secondary', schoolId ?? ''],
    queryFn: () => fetchSecondaryGradingScale(schoolId!),
    enabled: !!schoolId && isSecondary,
  });

  const { data: remarksSettings = [], isLoading: remarksLoading } = useQuery({
    queryKey: ['teacher', 'teacher-remarks-settings', schoolId ?? ''],
    queryFn: () => fetchTeacherRemarksSettings(schoolId!),
    enabled: !!schoolId && isPrimary,
  });

  const { data: classCommentsSettings = [], isLoading: classCommentsLoading } = useQuery({
    queryKey: ['teacher', 'class-teacher-comments-settings', schoolId ?? ''],
    queryFn: () => fetchClassTeacherCommentsSettings(schoolId!),
    enabled: !!schoolId && isPrimary,
  });

  const { data: classesList = [] } = useQuery({
    queryKey: ['teacher', 'classes-list', schoolId ?? ''],
    queryFn: () => fetchClasses(schoolId!),
    enabled: !!schoolId && isPrimary,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher', 'grading-scale-primary', schoolId ?? ''] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'grading-scale-secondary', schoolId ?? ''] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'teacher-remarks-settings', schoolId ?? ''] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'class-teacher-comments-settings', schoolId ?? ''] });
  };

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

  const copyDefaultSecondaryScale = useMutation({
    mutationFn: async () => {
      if (!schoolId) throw new Error('No school');
      const rows = UGANDA_GRADE_SCALE.map((r) => ({
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

  const primarySchoolRows = primaryScale.filter((r) => r.school_id === schoolId);
  const primaryDefaultRows = primaryScale.filter((r) => r.school_id === null);
  const displayPrimaryScale = primarySchoolRows.length > 0 ? primarySchoolRows : primaryDefaultRows.length > 0 ? primaryDefaultRows : PRIMARY_GRADE_SCALE.map((r) => ({ grade_code: r.grade, min_pct: String(r.min), max_pct: String(r.max), id: '', school_id: null as string | null }));
  const effectiveSecondaryScale = secondaryScale.length > 0 ? secondaryScale : UGANDA_GRADE_SCALE;

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
          : 'Manage your secondary grading scale (A–E). Comments are entered when you save exam results.'}
      </p>

      {isPrimary && (
        <div className="flex gap-2 border-b border-[var(--ac-border)] pb-2">
          {(['scale', 'remarks', 'class-comments'] as const).map((tab) => (
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
                    {displayPrimaryScale.map((row) => (
                      <tr key={row.grade_code || row.id || row.min_pct} className="border-b border-[var(--ac-border)] last:border-0">
                        <td className="p-3 font-medium">{row.grade_code}</td>
                        <td className="p-3">{row.min_pct} – {row.max_pct}</td>
                        <td className="p-3">{row.grade_code === 'F9' ? 'Fail' : 'Pass'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(primarySchoolRows.length > 0 || primaryDefaultRows.length > 0) && (
                <p className="mt-2 text-xs ac-text-muted">To add, edit or remove bands, your school admin can manage the scale in Admin settings, or we can add inline edit here in a future update.</p>
              )}
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
        />
      )}

      {/* ----- SECONDARY: Grading scale only ----- */}
      {isSecondary && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-semibold ac-text-primary">Secondary Grading Scale (A – E)</h2>
          </div>
          <p className="ac-text-muted text-sm mb-4">Used for Senior 1 – Senior 4 (O-Level). Scale is A to E only (no F). You can use the default or copy it to your school to customize.</p>
          {secondaryScaleLoading ? (
            <div className="flex items-center gap-2 py-4"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>
          ) : (
            <>
              {secondaryScale.length === 0 && (
                <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                  <p className="ac-text-primary">Copy the default A–E scale to your school to customize ranges.</p>
                  <button
                    type="button"
                    onClick={() => copyDefaultSecondaryScale.mutate()}
                    disabled={copyDefaultSecondaryScale.isPending}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                  >
                    {copyDefaultSecondaryScale.isPending ? 'Copying...' : 'Copy scale to my school'}
                  </button>
                </div>
              )}
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
                    {(secondaryScale.length > 0 ? secondaryScale.map((r) => ({ ...r, points: UGANDA_GRADE_SCALE.find(s => s.grade === r.grade_code)?.points ?? 0, remark: UGANDA_GRADE_SCALE.find(s => s.grade === r.grade_code)?.remark ?? '' })) : effectiveSecondaryScale).map((row: any) => (
                      <tr key={row.grade_code ?? row.grade} className="border-b border-[var(--ac-border)] last:border-0">
                        <td className="p-3 font-medium">{row.grade_code ?? row.grade}</td>
                        <td className="p-3">{row.min_pct ?? row.min} – {row.max_pct ?? row.max}</td>
                        <td className="p-3">{row.points ?? 0}</td>
                        <td className="p-3">{row.remark ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-[var(--ac-card-bg)] border border-[var(--ac-border)]">
                <p className="ac-text-muted text-xs font-medium uppercase tracking-wide mb-1">Divisions (by average)</p>
                <p className="ac-text-primary text-sm">Division 1: 80%+ · Division 2: 60–79% · Division 3: 40–59% · Division 4: 20–39% · Ungraded: below 20%</p>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
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
}: {
  schoolId: string;
  userId: string;
  classCommentsByClass: Record<string, { id: string; class_name: string; min_percent: number; max_percent: number; comment_text: string }[]>;
  classesList: string[];
  assignedClassesOnly: boolean;
  loading: boolean;
  onSuccess: () => void;
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
      <p className="ac-text-muted text-sm mb-4">One overall comment per student on the report, based on the student's average across all subjects. Add bands by class (e.g. 0–40%, 41–60%, 61–80%, 81–100%) and the comment text.</p>

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
            <input type="text" list="classes-datalist" value={newClass} onChange={(e) => setNewClass(e.target.value)} placeholder="e.g. Primary 5" className="ac-input rounded-lg px-3 py-2 w-40" />
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
