/**
 * Pre-primary (Baby / Middle / Top): colour rating grid for one holistic strand subject.
 * Saves via teacher_upsert_exam_result_primary with nursery_skill_performance JSON.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  PRE_PRIMARY_HOLISTIC_RATINGS,
  getPrePrimaryHolisticStrandForSubject,
  normalizePrePrimaryHolisticRating,
  prePrimaryHolisticRatingToStoredValue,
  type PrePrimaryHolisticRating,
} from '../../../templates/primary/prePrimaryHolisticRatings';
import { getReadableTextColor, applyAlphaToHex } from '../../../templates/primary/nurseryPerformance';

type StudentRow = { student_id: string; name: string; admission_number?: string | null };

type Props = {
  students: StudentRow[];
  /** Full subject string (must match a strand in PRE_PRIMARY_HOLISTIC_STRANDS). */
  subject: string;
  schoolId: string;
  teacherId: string;
  className: string;
  selectedExamSetId: string;
  existingRows: Array<{ student_id: string; nursery_skill_performance?: unknown }>;
  onRefetch: () => void;
  /** How many of the five holistic strand subjects have ratings for this student (this exam set). */
  strandAreasRatedByStudent?: Map<string, number>;
};

function parseNurseryMap(raw: unknown): Record<string, PrePrimaryHolisticRating> {
  let obj: Record<string, unknown> | null = null;
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  } else if (typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  }
  if (!obj) return {};
  const out: Record<string, PrePrimaryHolisticRating> = {};
  Object.entries(obj).forEach(([k, v]) => {
    const label = normalizePrePrimaryHolisticRating(v);
    if (label) out[k] = label;
  });
  return out;
}

export function PrePrimaryHolisticExamGrid({
  students,
  subject,
  schoolId,
  teacherId,
  className,
  selectedExamSetId,
  existingRows,
  onRefetch,
  strandAreasRatedByStudent,
}: Props) {
  const activeStrand = getPrePrimaryHolisticStrandForSubject(subject);
  const [nurseryPerformances, setNurseryPerformances] = useState<
    Record<string, Record<string, PrePrimaryHolisticRating>>
  >({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!activeStrand) return;
    const next: Record<string, Record<string, PrePrimaryHolisticRating>> = {};
    for (const r of existingRows) {
      const parsed = parseNurseryMap(r.nursery_skill_performance);
      if (Object.keys(parsed).length === 0) continue;
      next[r.student_id] = parsed;
    }
    setNurseryPerformances(next);
  }, [existingRows, activeStrand]);

  const handleSelect = useCallback((studentId: string, skillKey: string, rating: PrePrimaryHolisticRating) => {
    setNurseryPerformances((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [skillKey]: rating },
    }));
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const handleClear = useCallback((studentId: string, skillKey: string) => {
    setNurseryPerformances((prev) => {
      const cur = prev[studentId];
      if (!cur || !cur[skillKey]) return prev;
      const copy = { ...cur };
      delete copy[skillKey];
      return { ...prev, [studentId]: copy };
    });
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const handleSave = async () => {
    if (!activeStrand || !selectedExamSetId || !teacherId) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const saves: Promise<unknown>[] = [];
    for (const stu of students) {
      const perf = nurseryPerformances[stu.student_id] || {};
      const payload: Record<string, string> = {};
      for (const skill of activeStrand.skills) {
        const raw = perf[skill.key];
        const norm = raw ? normalizePrePrimaryHolisticRating(raw) : null;
        if (norm) payload[skill.key] = prePrimaryHolisticRatingToStoredValue(norm);
      }
      if (Object.keys(payload).length === 0) continue;

      saves.push(
        (async () => {
          const { data, error } = await supabase.rpc('teacher_upsert_exam_result_primary', {
            p_school_id: schoolId,
            p_exam_set_id: selectedExamSetId,
            p_student_id: stu.student_id,
            p_class_name: className,
            p_subject: subject,
            p_teacher_id: teacherId,
            p_marks_obtained: null,
            p_total_marks: null,
            p_grade: null,
            p_remarks: null,
            p_teacher_comment: null,
            p_nursery_skills: payload,
          });
          const result = data as { success?: boolean; error?: string } | null;
          if (result && !result.success) throw new Error(result.error ?? 'Save failed');
          if (error) throw error;
        })()
      );
    }

    if (saves.length === 0) {
      setSaveError('Select at least one rating for a student before saving.');
      setSaving(false);
      return;
    }

    try {
      await Promise.all(saves);
      setSaveSuccess(true);
      onRefetch();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!activeStrand) {
    return (
      <p className="ac-text-muted text-sm">
        This subject is not a pre-primary holistic strand. Choose one of the five strand subjects (e.g. Relating with
        others…).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="ac-text-primary text-sm font-medium">
        Pre-primary holistic ratings for <span className="font-semibold">{subject}</span> — choose Very Good, Good,
        Needs Improvement, or Tries for each skill (any exam set).
      </p>
      <p className="text-xs ac-text-muted">
        For a complete report across all learning areas, enter ratings under each of the five strand subjects. Per student,
        the count below shows how many of those five areas already have data for this exam set.
      </p>
      {students.length === 0 ? (
        <p className="ac-text-muted text-sm">No students in this class.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--ac-border)] touch-pan-x">
          <table className="w-full min-w-[min(100%,720px)] border-collapse ac-text-primary text-sm">
            <thead>
              <tr className="border-b border-[var(--ac-border)] bg-[var(--ac-bg-muted)]">
                <th className="text-left p-2 font-medium min-w-[140px] sticky left-0 z-10 bg-[var(--ac-bg-muted)] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                  Student
                </th>
                {activeStrand.skills.map((skill) => (
                  <th key={skill.key} className="text-left p-2 font-medium max-w-[10rem]">
                    {skill.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((stu) => {
                const performance = nurseryPerformances[stu.student_id] || {};
                return (
                  <tr key={stu.student_id} className="border-b border-[var(--ac-border)] hover:bg-[var(--ac-bg-muted)]/50">
                    <td className="p-2 align-top font-medium sticky left-0 z-[1] bg-[var(--ac-bg)] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                      {stu.name}
                      {stu.admission_number && (
                        <span className="block text-xs ac-text-muted mt-0.5">{stu.admission_number}</span>
                      )}
                      {strandAreasRatedByStudent && (
                        <span
                          className={`block text-[10px] mt-0.5 font-medium ${
                            (strandAreasRatedByStudent.get(stu.student_id) ?? 0) >= 5
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {strandAreasRatedByStudent.get(stu.student_id) ?? 0}/5 learning areas (this exam)
                        </span>
                      )}
                      {activeStrand ? (
                        <span className="block text-[10px] ac-text-muted mt-0.5">
                          {
                            activeStrand.skills.filter((s) => (nurseryPerformances[stu.student_id] || {})[s.key]).length
                          }
                          /{activeStrand.skills.length} skills (this subject)
                        </span>
                      ) : null}
                    </td>
                    {activeStrand.skills.map((skill) => {
                      const skillKey = skill.key;
                      const selected = performance[skillKey];
                      const color = selected
                        ? PRE_PRIMARY_HOLISTIC_RATINGS.find((r) => r.label === selected)?.color
                        : undefined;
                      const badgeTextColor = selected && color ? getReadableTextColor(color) : '#94a3b8';
                      const cellBackground = selected && color ? applyAlphaToHex(color, 0.18) : 'transparent';
                      return (
                        <td key={skillKey} className="p-2 align-top" style={{ background: cellBackground }}>
                          <div className="flex flex-col items-stretch gap-2 min-w-[7rem]">
                            <div
                              className="w-full text-center text-[10px] font-semibold uppercase tracking-wide px-1 py-1 rounded-md border border-[var(--ac-border)]"
                              style={{
                                background: selected && color ? color : 'rgba(128,128,128,0.08)',
                                color: badgeTextColor,
                              }}
                            >
                              {selected || '—'}
                            </div>
                            <div className="flex flex-wrap gap-1 justify-center">
                              {PRE_PRIMARY_HOLISTIC_RATINGS.map((option) => {
                                const isSelected = option.label === selected;
                                const btnText = getReadableTextColor(option.color);
                                return (
                                  <button
                                    key={option.label}
                                    type="button"
                                    onClick={() => handleSelect(stu.student_id, skillKey, option.label)}
                                    className="touch-manipulation min-h-[44px] min-w-[44px] px-1.5 py-1 text-[10px] font-semibold rounded-full shadow-sm transition-transform sm:min-h-0 sm:min-w-0"
                                    style={{
                                      background: option.color,
                                      color: btnText,
                                      opacity: isSelected ? 1 : 0.82,
                                      transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                                      boxShadow: isSelected ? '0 0 0 2px rgba(255,255,255,0.5)' : undefined,
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => handleClear(stu.student_id, skillKey)}
                                className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[var(--ac-bg-muted)] ac-text-muted border border-[var(--ac-border)]"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {students.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            className="ac-glass-btn-primary rounded-xl px-4 py-2 text-sm font-medium"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saveSuccess && <span className="ac-text-success text-sm">Saved.</span>}
          {saveError && <span className="text-red-500 dark:text-red-400 text-sm">{saveError}</span>}
        </div>
      )}
    </div>
  );
}
