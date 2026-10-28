import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { downloadTimetablePdf, type TimetableFixedPeriodForPdf } from '@/lib/timetablePdf';
import SectionHeader from './SectionHeader';
import { useAcademicVocabulary } from '@/hooks/useAcademicVocabulary';
import TertiaryCohortPicker from '@/components/tertiary/TertiaryCohortPicker';

type Period = {
  id: number;
  school_id: string;
  class_name: string;
  day_of_week: string;
  subject: string;
  teacher_id: string;
  start_time: string;
  end_time: string;
  teacher_name: string;
};

type FixedPeriod = {
  id: string;
  school_id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  type: 'break' | 'lunch' | 'custom';
  sort_order: number;
  days: string[] | null; // null = every day
};

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBR: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

function DayPicker({ value, onChange }: { value: string[]; onChange: (d: string[]) => void }) {
  const allDays = value.length === 0;
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      <span className="text-[11px] font-mono uppercase text-[#666666] mr-1">DAYS:</span>
      <button
        type="button"
        onClick={() => onChange([])}
        className={`gov-btn gov-btn-sm text-[10px] font-mono py-0.5 px-2 ${allDays ? 'gov-btn-primary' : ''}`}
      >
        ALL DAYS
      </button>
      {WEEK_DAYS.map((day) => {
        const on = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => {
              if (on) {
                const next = value.filter((d) => d !== day);
                onChange(next);
              } else {
                onChange([...value, day]);
              }
            }}
            className={`gov-btn gov-btn-sm text-[10px] font-mono py-0.5 px-2 ${on && !allDays ? 'gov-btn-primary' : ''}`}
          >
            {DAY_ABBR[day].toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

function daysLabel(days: string[] | null): string {
  if (!days || days.length === 0) return 'All Days';
  return days.map((d) => DAY_ABBR[d] ?? d).join(', ');
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

async function fetchLogoDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

export default function SettingsTimetable({
  classOptions,
  schoolId,
  embedded,
}: {
  classOptions: string[];
  schoolId: string | null;
  embedded?: boolean;
}) {
  const { isTertiary, v } = useAcademicVocabulary();
  // Stream-aware class options
  const [streamsByClass, setStreamsByClass] = useState<Record<string, string[]>>({});

  // Lesson period form
  const [classTeachers, setClassTeachers]   = useState<{ teacher_id: string; name: string }[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [selectedClass, setSelectedClass]   = useState('');
  const [selectedDay, setSelectedDay]       = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [startTime, setStartTime]           = useState('');
  const [endTime, setEndTime]               = useState('');
  const [timetablePeriods, setTimetablePeriods] = useState<Period[]>([]);

  // Fixed periods (break / lunch / custom)
  const [fixedPeriods, setFixedPeriods]     = useState<FixedPeriod[]>([]);
  const [breakStart, setBreakStart]         = useState('');
  const [breakEnd, setBreakEnd]             = useState('');
  const [lunchStart, setLunchStart]         = useState('');
  const [lunchEnd, setLunchEnd]             = useState('');
  const [customName, setCustomName]         = useState('');
  const [customStart, setCustomStart]       = useState('');
  const [customEnd, setCustomEnd]           = useState('');
  const [customColor, setCustomColor]       = useState('#A855F7');
  const [customDays, setCustomDays]         = useState<string[]>([]);
  const [breakDays, setBreakDays]           = useState<string[]>([]);
  const [lunchDays, setLunchDays]           = useState<string[]>([]);
  const [savingFixed, setSavingFixed]       = useState(false);

  // School meta
  const [schoolName, setSchoolName]         = useState('');
  const [schoolLogoUrl, setSchoolLogoUrl]   = useState<string | null>(null);
  const [currentTermLabel, setCurrentTermLabel] = useState<string | null>(null);

  // PDF controls
  const [pdfScope, setPdfScope]   = useState<'whole_school' | 'single_class'>('whole_school');
  const [pdfClass, setPdfClass]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load school data and periods on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!schoolId) return;
    const run = async () => {
      const { data: schRow } = await supabase
        .from('schools')
        .select('name, logo_url')
        .eq('school_id', schoolId)
        .single();
      const row = schRow as { name?: string; logo_url?: string } | null;
      setSchoolName(row?.name || '');
      setSchoolLogoUrl(row?.logo_url || null);

      // Fetch current term so the PDF header shows the real term
      const today = new Date().toISOString().slice(0, 10);
      const { data: termRows } = await supabase
        .from('school_terms')
        .select('term, year, start_date, end_date')
        .eq('school_id', schoolId);
      if (termRows && termRows.length > 0) {
        const active = (termRows as { term: number; year: number; start_date: string; end_date: string }[])
          .find((t) => today >= t.start_date && today <= t.end_date);
        const latest = [...(termRows as { term: number; year: number; start_date: string; end_date: string }[])]
          .sort((a, b) => b.year - a.year || b.term - a.term)[0];
        const t = active ?? latest;
        if (t) setCurrentTermLabel(`${t.term} — ${t.year}`);
      }

      const { data: periodsData } = await supabase
        .from('timetable_periods')
        .select('id, class_name, day_of_week, subject, teacher_id, start_time, end_time, teachers(name)')
        .eq('school_id', schoolId)
        .order('class_name')
        .order('day_of_week')
        .order('start_time');

      if (periodsData) {
        const formatted = (periodsData as unknown[]).map((period: unknown) => {
          const p = period as Record<string, unknown> & { teachers?: { name: string } };
          return {
            id: p.id as number,
            school_id: schoolId,
            class_name: p.class_name as string,
            day_of_week: p.day_of_week as string,
            subject: p.subject as string,
            teacher_id: p.teacher_id as string,
            start_time: p.start_time as string,
            end_time: p.end_time as string,
            teacher_name: (p.teachers as { name: string })?.name || 'Unknown',
          };
        });
        setTimetablePeriods(formatted);
      }

      const { data: fixedData } = await supabase
        .from('timetable_fixed_periods')
        .select('*')
        .eq('school_id', schoolId)
        .order('sort_order');

      if (fixedData) {
        const fps = fixedData as FixedPeriod[];
        setFixedPeriods(fps);
        const bp = fps.find((f) => f.type === 'break');
        const lp = fps.find((f) => f.type === 'lunch');
        if (bp) { setBreakStart(bp.start_time); setBreakEnd(bp.end_time); setBreakDays(bp.days ?? []); }
        if (lp) { setLunchStart(lp.start_time); setLunchEnd(lp.end_time); setLunchDays(lp.days ?? []); }
      }

      // Load streams so we can expand class options
      const { data: streamsData } = await supabase
        .from('class_streams')
        .select('class_name, stream_name, sort_order')
        .eq('school_id', schoolId)
        .order('class_name')
        .order('sort_order')
        .order('stream_name');
      if (streamsData) {
        const map: Record<string, string[]> = {};
        for (const s of streamsData as { class_name: string; stream_name: string }[]) {
          if (!map[s.class_name]) map[s.class_name] = [];
          map[s.class_name].push(s.stream_name);
        }
        setStreamsByClass(map);
      }
    };
    void run();
  }, [schoolId]);

  // Expanded class list: replace streamed classes with their stream variants
  const expandedClassOptions = classOptions.flatMap((cls) => {
    const streams = streamsByClass[cls];
    if (streams && streams.length >= 2) {
      return streams.map((sn) => `${cls} — ${sn}`);
    }
    return [cls];
  });

  // Given a possibly stream-qualified class name like "Primary 7 — West", return base class "Primary 7"
  function baseClassName(cls: string): string {
    for (const base of Object.keys(streamsByClass)) {
      if (cls.startsWith(`${base} — `)) return base;
    }
    return cls;
  }

  // Step 1 → 2: load teachers for selected class
  useEffect(() => {
    setSelectedTeacher('');
    setSelectedSubject('');
    setClassTeachers([]);
    setTeacherSubjects([]);
    if (!schoolId || !selectedClass) return;
    const lookupClass = baseClassName(selectedClass);
    const run = async () => {
      const { data } = await supabase
        .from('teacher_class_subjects')
        .select('teacher_id, teachers!inner(name)')
        .eq('school_id', schoolId)
        .eq('class_name', lookupClass);
      if (data) {
        const seen = new Set<string>();
        const list: { teacher_id: string; name: string }[] = [];
        for (const row of data as unknown as { teacher_id: string; teachers: { name: string } }[]) {
          if (!seen.has(row.teacher_id)) {
            seen.add(row.teacher_id);
            list.push({ teacher_id: row.teacher_id, name: row.teachers?.name || 'Unknown' });
          }
        }
        setClassTeachers(list.sort((a, b) => a.name.localeCompare(b.name)));
      }
    };
    void run();
  }, [schoolId, selectedClass]);

  // Step 2 → 3: load subjects for selected teacher in class
  useEffect(() => {
    setSelectedSubject('');
    setTeacherSubjects([]);
    if (!schoolId || !selectedClass || !selectedTeacher) return;
    const lookupClass = baseClassName(selectedClass);
    const run = async () => {
      const { data } = await supabase
        .from('teacher_class_subjects')
        .select('subject')
        .eq('school_id', schoolId)
        .eq('class_name', lookupClass)
        .eq('teacher_id', selectedTeacher);
      if (data) {
        const subjs = [...new Set((data as { subject: string }[]).map((r) => r.subject))].sort();
        setTeacherSubjects(subjs);
      }
    };
    void run();
  }, [schoolId, selectedClass, selectedTeacher]);

  // ---------------------------------------------------------------------------
  // Save break / lunch / custom fixed periods
  // ---------------------------------------------------------------------------
  const upsertFixed = async (type: 'break' | 'lunch', name: string, st: string, en: string, sortOrder: number, days: string[]) => {
    if (!schoolId || !st || !en) {
      setError(`Please enter both start and end time for ${name}.`);
      return;
    }
    setSavingFixed(true);
    setError(null);
    try {
      await supabase.from('timetable_fixed_periods').delete().eq('school_id', schoolId).eq('type', type);
      const color = type === 'break' ? '#EF4444' : '#111827';
      const { data, error: err } = await supabase
        .from('timetable_fixed_periods')
        .insert({ school_id: schoolId, name, start_time: st, end_time: en, color, type, sort_order: sortOrder, days: days.length === 0 ? null : days })
        .select()
        .single();
      if (err) throw err;
      setFixedPeriods((prev) => [...prev.filter((f) => f.type !== type), data as FixedPeriod]);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to save ${name}.`);
    } finally {
      setSavingFixed(false);
    }
  };

  const handleSaveBreak = () => upsertFixed('break', 'Break Time', breakStart, breakEnd, 10, breakDays);
  const handleSaveLunch = () => upsertFixed('lunch', 'Lunch Time', lunchStart, lunchEnd, 20, lunchDays);

  const handleAddCustom = async () => {
    if (!schoolId || !customName.trim() || !customStart || !customEnd) {
      setError('Please fill in the name, start time, and end time for the custom period.');
      return;
    }
    setSavingFixed(true);
    setError(null);
    try {
      const maxOrder = fixedPeriods.reduce((m, f) => Math.max(m, f.sort_order), 20);
      const { data, error: err } = await supabase
        .from('timetable_fixed_periods')
        .insert({
          school_id: schoolId,
          name: customName.trim(),
          start_time: customStart,
          end_time: customEnd,
          color: customColor,
          type: 'custom',
          sort_order: maxOrder + 10,
          days: customDays.length === 0 ? null : customDays,
        })
        .select()
        .single();
      if (err) throw err;
      setFixedPeriods((prev) => [...prev, data as FixedPeriod]);
      setCustomName('');
      setCustomStart('');
      setCustomEnd('');
      setCustomDays([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add custom period.');
    } finally {
      setSavingFixed(false);
    }
  };

  const handleRemoveFixed = async (id: string) => {
    if (!schoolId) return;
    try {
      const { error: err } = await supabase.from('timetable_fixed_periods').delete().eq('id', id);
      if (err) throw err;
      setFixedPeriods((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove period.');
    }
  };

  // ---------------------------------------------------------------------------
  // Add lesson period
  // ---------------------------------------------------------------------------
  const handleAddPeriod = async () => {
    if (!schoolId || !selectedClass || !selectedDay || !selectedSubject || !selectedTeacher || !startTime || !endTime) {
      setError('Please fill in all fields before adding a period.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Two periods overlap only when they strictly interleave; adjacent periods (end = start) are allowed.
      const hasConflict = timetablePeriods.some(
        (period) =>
          period.class_name === selectedClass &&
          period.day_of_week === selectedDay &&
          startTime < period.end_time &&
          endTime > period.start_time,
      );
      if (hasConflict) {
        setError('Time conflict detected. Please choose a different time slot.');
        setSaving(false);
        return;
      }

      const { data: insertedPeriod, error: insertError } = await supabase
        .from('timetable_periods')
        .insert({
          school_id: schoolId,
          class_name: selectedClass,
          day_of_week: selectedDay,
          subject: selectedSubject,
          teacher_id: selectedTeacher,
          start_time: startTime,
          end_time: endTime,
        })
        .select('id, class_name, day_of_week, subject, teacher_id, start_time, end_time, teachers!inner(name)')
        .single();

      if (insertError) throw insertError;

      const inserted = insertedPeriod as unknown as {
        id: number;
        class_name: string;
        day_of_week: string;
        subject: string;
        teacher_id: string;
        start_time: string;
        end_time: string;
        teachers?: { name: string } | { name: string }[];
      };
      const teacherName = Array.isArray(inserted.teachers)
        ? inserted.teachers[0]?.name
        : inserted.teachers?.name;
      setTimetablePeriods((prev) => [
        ...prev,
        {
          id: inserted.id,
          school_id: schoolId,
          class_name: inserted.class_name,
          day_of_week: inserted.day_of_week,
          subject: inserted.subject,
          teacher_id: inserted.teacher_id,
          start_time: inserted.start_time,
          end_time: inserted.end_time,
          teacher_name: teacherName || 'Unknown',
        },
      ]);
      setSelectedDay('');
      setSelectedSubject('');
      setSelectedTeacher('');
      setStartTime('');
      setEndTime('');
    } catch (err) {
      setError('Failed to add period. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePeriod = async (periodId: number) => {
    try {
      const { error: err } = await supabase.from('timetable_periods').delete().eq('id', periodId);
      if (err) throw err;
      setTimetablePeriods((prev) => prev.filter((p) => p.id !== periodId));
    } catch {
      setError('Failed to remove period. Please try again.');
    }
  };

  // ---------------------------------------------------------------------------
  // Download PDF
  // ---------------------------------------------------------------------------
  const handleDownloadPDF = async () => {
    setError(null);
    if (!schoolId) { setError('School not loaded. Refresh and try again.'); return; }
    if (timetablePeriods.length === 0) { setError('Add timetable periods before exporting a PDF.'); return; }
    if (pdfScope === 'single_class') {
      if (!pdfClass) { setError('Choose which class to include in the PDF.'); return; }
      if (!timetablePeriods.some((p) => p.class_name === pdfClass)) {
        setError('No periods exist for that class yet.'); return;
      }
    }

    // Warn if required fixed periods are missing
    const hasBreak = fixedPeriods.some((f) => f.type === 'break');
    const hasLunch = fixedPeriods.some((f) => f.type === 'lunch');
    if (!hasBreak || !hasLunch) {
      const missing = [!hasBreak && 'Break Time', !hasLunch && 'Lunch Time'].filter(Boolean).join(' and ');
      setError(`Please save ${missing} before downloading the PDF.`);
      return;
    }

    // Fetch school logo as data URL for embedding in PDF
    let logoDataUrl: string | null = null;
    if (schoolLogoUrl) logoDataUrl = await fetchLogoDataUrl(schoolLogoUrl);

    try {
      const filtered = pdfScope === 'single_class'
        ? timetablePeriods.filter((p) => p.class_name === pdfClass)
        : timetablePeriods;

      downloadTimetablePdf({
        schoolName: schoolName || 'School',
        periods: filtered.map((p) => ({
          class_name: p.class_name,
          day_of_week: p.day_of_week,
          subject: p.subject,
          start_time: p.start_time,
          end_time: p.end_time,
          teacher_name: p.teacher_name,
        })),
        scope: pdfScope,
        singleClassName: pdfScope === 'single_class' ? pdfClass : undefined,
        classOrder: classOptions,
        fixedPeriods: fixedPeriods.map<TimetableFixedPeriodForPdf>((fp) => ({
          name: fp.name,
          start_time: fp.start_time,
          end_time: fp.end_time,
          color: fp.color,
          type: fp.type,
          days: fp.days,
        })),
        logoDataUrl,
        termLabel: currentTermLabel,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate PDF.');
    }
  };

  const breakSaved = fixedPeriods.some((f) => f.type === 'break');
  const lunchSaved = fixedPeriods.some((f) => f.type === 'lunch');
  const customPeriods = fixedPeriods.filter((f) => f.type === 'custom');

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header row with PDF download */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader
          embedded={embedded}
          title={isTertiary ? 'MASTER TIMETABLE & CLINICAL ROTATION SCHEDULE' : 'INSTITUTIONAL TIMETABLE MATRIX'}
          badge="SCHEDULE SPECIFICATION"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="gov-select w-auto text-xs"
            value={pdfScope}
            onChange={(e) => {
              const vScope = e.target.value === 'single_class' ? 'single_class' : 'whole_school';
              setPdfScope(vScope);
              if (vScope === 'whole_school') setPdfClass('');
            }}
          >
            <option value="whole_school">{isTertiary ? 'WHOLE CAMPUS (ALL PROGRAMMES)' : 'WHOLE SCHOOL (ALL CLASSES)'}</option>
            <option value="single_class">{isTertiary ? 'SINGLE COHORT / STAGE' : 'SINGLE CLASS'}</option>
          </select>

          {pdfScope === 'single_class' && (
            isTertiary ? (
              <div className="w-56">
                <TertiaryCohortPicker
                  selectedCohort={pdfClass}
                  onChange={setPdfClass}
                  layout="grid"
                  selectClassName="gov-select text-xs"
                  programmeLabel="PROGRAMME"
                  semesterLabel="SEMESTER"
                />
              </div>
            ) : (
              <select
                className="gov-select w-auto text-xs"
                value={pdfClass}
                onChange={(e) => setPdfClass(e.target.value)}
              >
                <option value="">{v.selectClass}</option>
                {expandedClassOptions.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            )
          )}

          <button
            type="button"
            onClick={() => { void handleDownloadPDF(); }}
            className="gov-btn gov-btn-sm gov-btn-primary inline-flex items-center gap-1.5"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            EXPORT TIMETABLE PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-xs font-mono text-red-700">
          {error}
        </div>
      )}

      {/* Fixed periods (break / lunch / custom) card */}
      <div className="gov-card p-5 space-y-4">
        <div className="border-b border-[#E2E8F0] pb-2 mb-2 flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-[#111111] tracking-wider">
            CAMPUS-WIDE FIXED BREAK & RECESS INTERVALS
          </span>
          <span className="text-[11px] font-mono text-[#666666]">MANDATORY FOR PDF WALL-CHART</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Break Time */}
          <div className="border border-[#E2E8F0] p-3 rounded bg-[#FAFAFA]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#111111]">
                MORNING BREAK INTERVAL
              </span>
              {breakSaved ? (
                <span className="gov-tag gov-tag-approved text-[10px] font-mono">CONFIGURED</span>
              ) : (
                <span className="gov-tag gov-tag-warned text-[10px] font-mono">REQUIRED</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <label className="text-xs font-mono text-[#555555]">
                START
                <input type="time" className="gov-input font-mono text-xs ml-1 py-1" value={breakStart}
                  onChange={(e) => setBreakStart(e.target.value)} />
              </label>
              <label className="text-xs font-mono text-[#555555]">
                END
                <input type="time" className="gov-input font-mono text-xs ml-1 py-1" value={breakEnd}
                  onChange={(e) => setBreakEnd(e.target.value)} />
              </label>
              <button
                type="button"
                disabled={savingFixed}
                onClick={handleSaveBreak}
                className="gov-btn gov-btn-sm"
              >
                {savingFixed ? 'SAVING…' : 'SAVE BREAK'}
              </button>
            </div>
            <DayPicker value={breakDays} onChange={setBreakDays} />
          </div>

          {/* Lunch Time */}
          <div className="border border-[#E2E8F0] p-3 rounded bg-[#FAFAFA]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#111111]">
                MIDDAY RECESS / LUNCH INTERVAL
              </span>
              {lunchSaved ? (
                <span className="gov-tag gov-tag-approved text-[10px] font-mono">CONFIGURED</span>
              ) : (
                <span className="gov-tag gov-tag-warned text-[10px] font-mono">REQUIRED</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <label className="text-xs font-mono text-[#555555]">
                START
                <input type="time" className="gov-input font-mono text-xs ml-1 py-1" value={lunchStart}
                  onChange={(e) => setLunchStart(e.target.value)} />
              </label>
              <label className="text-xs font-mono text-[#555555]">
                END
                <input type="time" className="gov-input font-mono text-xs ml-1 py-1" value={lunchEnd}
                  onChange={(e) => setLunchEnd(e.target.value)} />
              </label>
              <button
                type="button"
                disabled={savingFixed}
                onClick={handleSaveLunch}
                className="gov-btn gov-btn-sm"
              >
                {savingFixed ? 'SAVING…' : 'SAVE LUNCH'}
              </button>
            </div>
            <DayPicker value={lunchDays} onChange={setLunchDays} />
          </div>
        </div>

        {/* Custom periods */}
        <div className="border-t border-[#E2E8F0] pt-3 mt-3">
          <span className="text-xs font-mono uppercase font-bold text-[#555555] block mb-2">
            SPECIAL CUSTOM INTERVALS (ASSEMBLIES, CLINICAL HUDDLES, PRAYERS)
          </span>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <input
              type="text"
              placeholder="INTERVAL NAME"
              className="gov-input text-xs font-mono uppercase w-40"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
            <label className="text-xs font-mono text-[#555555]">
              START
              <input type="time" className="gov-input font-mono text-xs ml-1 py-1" value={customStart}
                onChange={(e) => setCustomStart(e.target.value)} />
            </label>
            <label className="text-xs font-mono text-[#555555]">
              END
              <input type="time" className="gov-input font-mono text-xs ml-1 py-1" value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)} />
            </label>
            <label className="flex items-center gap-1 text-xs font-mono text-[#555555]">
              COLOR
              <input type="color" className="h-7 w-8 cursor-pointer rounded border border-[#CCCCCC] bg-white p-0.5 ml-1"
                value={customColor} onChange={(e) => setCustomColor(e.target.value)} />
            </label>
            <button
              type="button"
              disabled={savingFixed}
              onClick={() => { void handleAddCustom(); }}
              className="gov-btn gov-btn-sm"
            >
              {savingFixed ? 'ADDING…' : '+ ADD INTERVAL'}
            </button>
          </div>
          <DayPicker value={customDays} onChange={setCustomDays} />

          {customPeriods.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {customPeriods.map((fp) => (
                <div
                  key={fp.id}
                  className="flex items-center gap-2 rounded border border-[#CCCCCC] px-2.5 py-1 text-xs font-mono bg-white"
                >
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: fp.color }} />
                  <span className="font-bold text-[#111111]">
                    {fp.name} ({fp.start_time}–{fp.end_time})
                    {fp.days && fp.days.length > 0 && (
                      <span className="ml-1 text-[#666666]">· {daysLabel(fp.days)}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => { void handleRemoveFixed(fp.id); }}
                    className="text-[#888888] hover:text-red-600 font-bold ml-1"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add lesson / lecture period card */}
      <div className="gov-card p-5 space-y-4">
        <div className="border-b border-[#E2E8F0] pb-2 mb-2 flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-[#111111] tracking-wider">
            {isTertiary ? 'ADD LECTURE / CLINICAL ROTATION TIMETABLE SLOT' : 'ADD TIMETABLE LESSON SLOT'}
          </span>
        </div>
        <div className={`grid grid-cols-1 gap-3 ${isTertiary ? 'md:grid-cols-5' : 'md:grid-cols-4'} items-end`}>
          {isTertiary ? (
            <div className="md:col-span-2">
              <TertiaryCohortPicker
                selectedCohort={selectedClass}
                onChange={(cohortKey) => {
                  setSelectedClass(cohortKey);
                  setSelectedTeacher('');
                  setSelectedSubject('');
                }}
                layout="grid"
                showLabels
                programmeLabel="PROGRAMME"
                semesterLabel="YEAR & SEMESTER"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
                {v.classNoun}
              </label>
              <select className="gov-select w-full" value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedTeacher('');
                  setSelectedSubject('');
                }}>
                <option value="">{v.selectClass}</option>
                {expandedClassOptions.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              {v.teacherNoun}
            </label>
            <select className="gov-select w-full" value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)} disabled={!selectedClass}>
              <option value="">{selectedClass ? v.selectTeacher : `${v.selectTeacher} (pick cohort first)`}</option>
              {classTeachers.map((t) => (
                <option key={t.teacher_id} value={t.teacher_id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              {v.subjectNoun}
            </label>
            <select className="gov-select w-full" value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)} disabled={!selectedTeacher}>
              <option value="">{selectedTeacher ? v.selectSubject : `${v.selectSubject} (pick tutor first)`}</option>
              {teacherSubjects.map((subj) => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              DAY OF WEEK
            </label>
            <select className="gov-select w-full" value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}>
              <option value="">SELECT DAY...</option>
              {ALL_DAYS.map((d) => (
                <option key={d} value={d}>{d.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              START TIME
            </label>
            <input type="time" className="gov-input w-full font-mono text-xs" value={startTime}
              onChange={(e) => setStartTime(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              END TIME
            </label>
            <input type="time" className="gov-input w-full font-mono text-xs" value={endTime}
              onChange={(e) => setEndTime(e.target.value)} />
          </div>

          <div>
            <button
              type="button"
              onClick={() => { void handleAddPeriod(); }}
              disabled={saving}
              className="gov-btn gov-btn-sm gov-btn-primary w-full h-[38px]"
            >
              {saving ? 'ADDING…' : '+ ADD SLOT'}
            </button>
          </div>
        </div>
      </div>

      {/* Current Timetable Registry Table */}
      <div className="gov-card p-0 overflow-hidden">
        <div className="border-b border-[#E2E8F0] bg-[#FDFDFD] px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-[#111111]">
            ACTIVE TIMETABLE PERIODS REGISTRY
          </span>
          <span className="text-xs font-mono text-[#555555]">
            TOTAL PERIODS: <span className="font-bold text-[#111111]">{timetablePeriods.length}</span>
          </span>
        </div>

        {timetablePeriods.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-[#888888]">
            NO PERIODS REGISTERED YET.
          </div>
        ) : (
          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr>
                  <th className="font-mono">COHORT / CLASS</th>
                  <th className="font-mono">DAY OF WEEK</th>
                  <th className="font-mono">TIME INTERVAL</th>
                  <th className="font-mono">COURSE UNIT / MODULE</th>
                  <th className="font-mono">FACULTY / TUTOR</th>
                  <th className="font-mono text-right w-24">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {timetablePeriods.map((period) => (
                  <tr key={period.id}>
                    <td className="font-bold text-[#111111] font-mono text-xs">{period.class_name}</td>
                    <td className="font-mono text-xs uppercase">{period.day_of_week}</td>
                    <td className="font-mono text-xs font-bold text-[#111111]">{period.start_time} – {period.end_time}</td>
                    <td className="font-medium text-[#111111]">{period.subject}</td>
                    <td className="text-xs text-[#555555]">{period.teacher_name}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => { void handleRemovePeriod(period.id); }}
                        className="gov-btn gov-btn-sm text-red-600 border-[#CCCCCC] hover:bg-red-50"
                      >
                        REMOVE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
