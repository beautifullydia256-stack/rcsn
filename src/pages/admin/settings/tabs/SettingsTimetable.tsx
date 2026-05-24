import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { downloadTimetablePdf } from '@/lib/timetablePdf';
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

export default function SettingsTimetable({
  classOptions,
  schoolId,
  embedded,
}: {
  classOptions: string[];
  schoolId: string | null;
  embedded?: boolean;
}) {
  const [classTeachers, setClassTeachers] = useState<{ teacher_id: string; name: string }[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timetablePeriods, setTimetablePeriods] = useState<Period[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [pdfScope, setPdfScope] = useState<'whole_school' | 'single_class'>('whole_school');
  const [pdfClass, setPdfClass] = useState('');

  // Load school name and all timetable periods once
  useEffect(() => {
    if (!schoolId) return;
    const run = async () => {
      const { data: schRow } = await supabase
        .from('schools')
        .select('name')
        .eq('school_id', schoolId)
        .single();
      setSchoolName((schRow as { name?: string } | null)?.name || '');

      const { data: periodsData } = await supabase
        .from('timetable_periods')
        .select('id, class_name, day_of_week, subject, teacher_id, start_time, end_time, teachers!inner(name)')
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
    };
    void run();
  }, [schoolId]);

  // Step 1 → Step 2: when class changes, load teachers assigned to that class
  useEffect(() => {
    setSelectedTeacher('');
    setSelectedSubject('');
    setClassTeachers([]);
    setTeacherSubjects([]);
    if (!schoolId || !selectedClass) return;
    const run = async () => {
      const { data } = await supabase
        .from('teacher_class_subjects')
        .select('teacher_id, teachers!inner(name)')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass);
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

  // Step 2 → Step 3: when teacher changes, load subjects they teach in this class
  useEffect(() => {
    setSelectedSubject('');
    setTeacherSubjects([]);
    if (!schoolId || !selectedClass || !selectedTeacher) return;
    const run = async () => {
      const { data } = await supabase
        .from('teacher_class_subjects')
        .select('subject')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass)
        .eq('teacher_id', selectedTeacher);
      if (data) {
        const subjs = [...new Set((data as { subject: string }[]).map((r) => r.subject))].sort();
        setTeacherSubjects(subjs);
      }
    };
    void run();
  }, [schoolId, selectedClass, selectedTeacher]);

  const handleAddPeriod = async () => {
    if (
      !schoolId ||
      !selectedClass ||
      !selectedDay ||
      !selectedSubject ||
      !selectedTeacher ||
      !startTime ||
      !endTime
    ) {
      setError('Please fill in all fields before adding a period.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const hasConflict = timetablePeriods.some(
        (period) =>
          period.class_name === selectedClass &&
          period.day_of_week === selectedDay &&
          ((startTime >= period.start_time && startTime < period.end_time) ||
            (endTime > period.start_time && endTime <= period.end_time) ||
            (startTime <= period.start_time && endTime >= period.end_time))
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
        .select(
          `
          id,
          class_name,
          day_of_week,
          subject,
          teacher_id,
          start_time,
          end_time,
          teachers!inner(name)
        `
        )
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
      const newPeriod: Period = {
        id: inserted.id,
        school_id: schoolId,
        class_name: inserted.class_name,
        day_of_week: inserted.day_of_week,
        subject: inserted.subject,
        teacher_id: inserted.teacher_id,
        start_time: inserted.start_time,
        end_time: inserted.end_time,
        teacher_name: teacherName || 'Unknown',
      };
      setTimetablePeriods((prev) => [...prev, newPeriod]);
      setSelectedDay('');
      setSelectedSubject('');
      setSelectedTeacher('');
      setStartTime('');
      setEndTime('');
    } catch (err) {
      console.error('Error adding period:', err);
      setError('Failed to add period. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePeriod = async (periodId: number) => {
    try {
      const { error: err } = await supabase
        .from('timetable_periods')
        .delete()
        .eq('id', periodId);
      if (err) throw err;
      setTimetablePeriods((prev) => prev.filter((p) => p.id !== periodId));
    } catch (err) {
      console.error('Error removing period:', err);
      setError('Failed to remove period. Please try again.');
    }
  };

  const handleDownloadPDF = () => {
    setError(null);
    if (!schoolId) {
      setError('School not loaded yet. Refresh and try again.');
      return;
    }
    if (timetablePeriods.length === 0) {
      setError('Add timetable periods before exporting a PDF.');
      return;
    }
    if (pdfScope === 'single_class') {
      if (!pdfClass) {
        setError('Choose which class to include in the PDF.');
        return;
      }
      const has = timetablePeriods.some((p) => p.class_name === pdfClass);
      if (!has) {
        setError('No periods exist for that class yet.');
        return;
      }
    }
    try {
      const filtered =
        pdfScope === 'single_class'
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
        scope: pdfScope === 'whole_school' ? 'whole_school' : 'single_class',
        singleClassName: pdfScope === 'single_class' ? pdfClass : undefined,
        classOrder: classOptions,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate PDF.');
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          embedded={embedded}
          title="Timetable Designer"
          desc="Design the school timetable: set periods per day, assign classes, subjects and teachers."
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
                  {classOptions.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        <button
          type="button"
          onClick={handleDownloadPDF}
          className="flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download PDF
        </button>
        </div>
      </div>
      <div className={`${settingsInsetSurface} space-y-4 p-4 sm:p-5`}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {/* Step 1: Class */}
        <select
          className="ac-input min-h-[44px] w-full"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="">Select Class</option>
          {classOptions.map((cls) => (
            <option key={cls} value={cls}>
              {cls}
            </option>
          ))}
        </select>
        {/* Step 2: Teacher — only teachers assigned to selectedClass */}
        <select
          className="ac-input min-h-[44px] w-full"
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
          disabled={!selectedClass}
        >
          <option value="">{selectedClass ? 'Select Teacher' : 'Select Teacher (choose class first)'}</option>
          {classTeachers.map((t) => (
            <option key={t.teacher_id} value={t.teacher_id}>
              {t.name}
            </option>
          ))}
        </select>
        {/* Step 3: Subject — only subjects that teacher teaches in selectedClass */}
        <select
          className="ac-input min-h-[44px] w-full"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          disabled={!selectedTeacher}
        >
          <option value="">{selectedTeacher ? 'Select Subject' : 'Select Subject (choose teacher first)'}</option>
          {teacherSubjects.map((subj) => (
            <option key={subj} value={subj}>
              {subj}
            </option>
          ))}
        </select>
        <select
          className="ac-input min-h-[44px] w-full"
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
        >
          <option value="">Weekday</option>
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
        </select>
        <input
          type="time"
          className="ac-input min-h-[44px] w-full"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
        <input
          type="time"
          className="ac-input min-h-[44px] w-full"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
        <button
          type="button"
          onClick={handleAddPeriod}
          disabled={saving}
          className={`${settingsPrimaryActionClass} md:col-span-2`}
        >
          {saving ? 'Adding...' : 'Add Period'}
        </button>
      </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-400/40 bg-red-950/50 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {timetablePeriods.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-4 font-medium ac-text-primary">Current Timetable Periods</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {timetablePeriods.map((period) => (
              <div
                key={period.id}
                className={`${settingsInsetSurface} p-4`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h4 className="font-medium ac-text-primary">{period.class_name}</h4>
                  <button
                    type="button"
                    onClick={() => handleRemovePeriod(period.id)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-1 text-sm ac-text-secondary">
                  <div>
                    <strong className="ac-text-primary">Day:</strong> {period.day_of_week}
                  </div>
                  <div>
                    <strong className="ac-text-primary">Time:</strong> {period.start_time} - {period.end_time}
                  </div>
                  <div>
                    <strong className="ac-text-primary">Subject:</strong> {period.subject}
                  </div>
                  <div>
                    <strong className="ac-text-primary">Teacher:</strong> {period.teacher_name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {timetablePeriods.length === 0 && (
        <div className="mt-4 py-8 text-center text-sm ac-text-muted">
          No periods added yet. Fill in the form above and click &quot;Add Period&quot; to create
          your timetable.
        </div>
      )}

      <div className={`mt-6 ${settingsInsetSurface} border border-[var(--pw-blue)]/35 p-4`}>
        <h4 className="mb-2 text-sm font-medium" style={{ color: 'var(--pw-blue, #3d8ef8)' }}>
          📄 PDF Export
        </h4>
        <p className="text-xs ac-text-muted">
          Choose whole-school export (one landscape page per class, Mon–Sun columns as used) or a
          single-class PDF. Layout uses period times as rows and days as columns (typical Ugandan
          wall timetable style).
        </p>
      </div>
    </div>
  );
}
