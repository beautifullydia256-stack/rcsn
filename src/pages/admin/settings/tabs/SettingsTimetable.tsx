import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { downloadTimetablePdf, type TimetableFixedPeriodForPdf } from '@/lib/timetablePdf';
import SectionHeader from './SectionHeader';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';

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
};

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
        if (bp) { setBreakStart(bp.start_time); setBreakEnd(bp.end_time); }
        if (lp) { setLunchStart(lp.start_time); setLunchEnd(lp.end_time); }
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
  const upsertFixed = async (type: 'break' | 'lunch', name: string, st: string, en: string, sortOrder: number) => {
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
        .insert({ school_id: schoolId, name, start_time: st, end_time: en, color, type, sort_order: sortOrder })
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

  const handleSaveBreak = () => upsertFixed('break', 'Break Time', breakStart, breakEnd, 10);
  const handleSaveLunch = () => upsertFixed('lunch', 'Lunch Time', lunchStart, lunchEnd, 20);

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
        })
        .select()
        .single();
      if (err) throw err;
      setFixedPeriods((prev) => [...prev, data as FixedPeriod]);
      setCustomName('');
      setCustomStart('');
      setCustomEnd('');
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
    <div>
      {/* ── Header row with PDF download ───────────────────────────────────── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          embedded={embedded}
          title="Timetable Designer"
          desc="Design the school timetable: configure fixed periods, add lesson periods, then download the PDF."
        />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <label className="flex min-h-[44px] items-center gap-2 text-sm ac-text-secondary">
              <span className="shrink-0">PDF scope</span>
              <select
                className="ac-input min-h-[44px] min-w-[10rem]"
                value={pdfScope}
                onChange={(e) => {
                  const v = e.target.value === 'single_class' ? 'single_class' : 'whole_school';
                  setPdfScope(v);
                  if (v === 'whole_school') setPdfClass('');
                }}
              >
                <option value="whole_school">Whole school (all classes)</option>
                <option value="single_class">Single class</option>
              </select>
            </label>
            {pdfScope === 'single_class' && (
              <label className="flex min-h-[44px] items-center gap-2 text-sm ac-text-secondary">
                <span className="shrink-0">Class</span>
                <select
                  className="ac-input min-h-[44px] min-w-[10rem]"
                  value={pdfClass}
                  onChange={(e) => setPdfClass(e.target.value)}
                >
                  <option value="">Select class</option>
                  {expandedClassOptions.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <button
            type="button"
            onClick={() => { void handleDownloadPDF(); }}
            className="flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-400/40 bg-red-950/50 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* ── Fixed periods (break / lunch / custom) ──────────────────────────── */}
      <div className={`${settingsInsetSurface} mb-6 space-y-5 p-4 sm:p-5`}>
        <div>
          <h3 className="mb-1 font-semibold ac-text-primary">Fixed School Periods</h3>
          <p className="text-xs ac-text-muted">
            These appear as coloured bands on the timetable PDF. Break Time and Lunch Time are
            required. Custom periods are optional.
          </p>
        </div>

        {/* Break Time */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
            <span className="text-sm font-medium text-red-400">
              Break Time <span className="text-red-500">*</span>
              {breakSaved && <span className="ml-2 text-xs text-emerald-400">✓ Saved</span>}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs ac-text-secondary">
              Start
              <input type="time" className="ac-input min-h-[38px]" value={breakStart}
                onChange={(e) => setBreakStart(e.target.value)} />
            </label>
            <label className="flex items-center gap-1 text-xs ac-text-secondary">
              End
              <input type="time" className="ac-input min-h-[38px]" value={breakEnd}
                onChange={(e) => setBreakEnd(e.target.value)} />
            </label>
            <button
              type="button"
              disabled={savingFixed}
              onClick={handleSaveBreak}
              className="rounded-md bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {savingFixed ? 'Saving…' : 'Save Break Time'}
            </button>
          </div>
        </div>

        {/* Lunch Time */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-gray-900 ring-1 ring-slate-500" />
            <span className="text-sm font-medium" style={{ color: '#6B7280' }}>
              Lunch Time <span className="text-red-500">*</span>
              {lunchSaved && <span className="ml-2 text-xs text-emerald-400">✓ Saved</span>}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs ac-text-secondary">
              Start
              <input type="time" className="ac-input min-h-[38px]" value={lunchStart}
                onChange={(e) => setLunchStart(e.target.value)} />
            </label>
            <label className="flex items-center gap-1 text-xs ac-text-secondary">
              End
              <input type="time" className="ac-input min-h-[38px]" value={lunchEnd}
                onChange={(e) => setLunchEnd(e.target.value)} />
            </label>
            <button
              type="button"
              disabled={savingFixed}
              onClick={handleSaveLunch}
              className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-50"
            >
              {savingFixed ? 'Saving…' : 'Save Lunch Time'}
            </button>
          </div>
        </div>

        {/* Custom periods */}
        <div>
          <p className="mb-2 text-xs font-medium ac-text-secondary">
            Custom Periods <span className="font-normal ac-text-muted">(optional — e.g. Assembly, Prayers, Games)</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Period name"
              className="ac-input min-h-[38px] w-36"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
            <label className="flex items-center gap-1 text-xs ac-text-secondary">
              Start
              <input type="time" className="ac-input min-h-[38px]" value={customStart}
                onChange={(e) => setCustomStart(e.target.value)} />
            </label>
            <label className="flex items-center gap-1 text-xs ac-text-secondary">
              End
              <input type="time" className="ac-input min-h-[38px]" value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)} />
            </label>
            <label className="flex items-center gap-1 text-xs ac-text-secondary">
              Colour
              <input type="color" className="h-9 w-10 cursor-pointer rounded border-0 bg-transparent p-0.5"
                value={customColor} onChange={(e) => setCustomColor(e.target.value)} />
            </label>
            <button
              type="button"
              disabled={savingFixed}
              onClick={() => { void handleAddCustom(); }}
              className="rounded-md bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-50"
            >
              {savingFixed ? 'Adding…' : '+ Add Period'}
            </button>
          </div>

          {customPeriods.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {customPeriods.map((fp) => (
                <div
                  key={fp.id}
                  className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: fp.color }}
                >
                  <span>{fp.name} ({fp.start_time}–{fp.end_time})</span>
                  <button
                    type="button"
                    onClick={() => { void handleRemoveFixed(fp.id); }}
                    className="opacity-70 hover:opacity-100"
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

      {/* ── Add lesson period ───────────────────────────────────────────────── */}
      <div className={`${settingsInsetSurface} space-y-4 p-4 sm:p-5`}>
        <p className="text-sm font-medium ac-text-primary">Add Lesson Period</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select className="ac-input min-h-[44px] w-full" value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">Select Class</option>
            {expandedClassOptions.map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>

          <select className="ac-input min-h-[44px] w-full" value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)} disabled={!selectedClass}>
            <option value="">{selectedClass ? 'Select Teacher' : 'Select Teacher (choose class first)'}</option>
            {classTeachers.map((t) => (
              <option key={t.teacher_id} value={t.teacher_id}>{t.name}</option>
            ))}
          </select>

          <select className="ac-input min-h-[44px] w-full" value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)} disabled={!selectedTeacher}>
            <option value="">{selectedTeacher ? 'Select Subject' : 'Select Subject (choose teacher first)'}</option>
            {teacherSubjects.map((subj) => (
              <option key={subj} value={subj}>{subj}</option>
            ))}
          </select>

          <select className="ac-input min-h-[44px] w-full" value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}>
            <option value="">Day of week</option>
            {ALL_DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <input type="time" className="ac-input min-h-[44px] w-full" value={startTime}
            onChange={(e) => setStartTime(e.target.value)} />
          <input type="time" className="ac-input min-h-[44px] w-full" value={endTime}
            onChange={(e) => setEndTime(e.target.value)} />

          <button
            type="button"
            onClick={() => { void handleAddPeriod(); }}
            disabled={saving}
            className={`${settingsPrimaryActionClass} md:col-span-2`}
          >
            {saving ? 'Adding…' : 'Add Period'}
          </button>
        </div>
      </div>

      {/* ── Current lesson periods ──────────────────────────────────────────── */}
      {timetablePeriods.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-4 font-medium ac-text-primary">Current Timetable Periods</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {timetablePeriods.map((period) => (
              <div key={period.id} className={`${settingsInsetSurface} p-4`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h4 className="font-medium ac-text-primary">{period.class_name}</h4>
                  <button type="button" onClick={() => { void handleRemovePeriod(period.id); }}
                    className="text-sm text-red-400 hover:text-red-300">Remove</button>
                </div>
                <div className="space-y-1 text-sm ac-text-secondary">
                  <div><strong className="ac-text-primary">Day:</strong> {period.day_of_week}</div>
                  <div><strong className="ac-text-primary">Time:</strong> {period.start_time} – {period.end_time}</div>
                  <div><strong className="ac-text-primary">Subject:</strong> {period.subject}</div>
                  <div><strong className="ac-text-primary">Teacher:</strong> {period.teacher_name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {timetablePeriods.length === 0 && (
        <div className="mt-4 py-8 text-center text-sm ac-text-muted">
          No periods added yet. Fill in the form above and click &quot;Add Period&quot; to build your timetable.
        </div>
      )}

      {/* ── PDF info ────────────────────────────────────────────────────────── */}
      <div className={`mt-6 ${settingsInsetSurface} border border-[var(--pw-blue)]/35 p-4`}>
        <h4 className="mb-2 text-sm font-medium" style={{ color: 'var(--pw-blue, #3d8ef8)' }}>
          PDF Export
        </h4>
        <p className="text-xs ac-text-muted">
          The whole-school PDF uses a wall-chart layout: days and classes as rows, time slots as columns.
          Break Time and Lunch Time appear as coloured bands spanning all classes.
          The school badge is included automatically if one has been uploaded in Settings → School Profile.
        </p>
      </div>
    </div>
  );
}
