import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import SectionHeader from './SectionHeader';

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
}: {
  classOptions: string[];
  schoolId: string | null;
}) {
  const [teachers, setTeachers] = useState<{ teacher_id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timetablePeriods, setTimetablePeriods] = useState<Period[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!schoolId) return;

      const { data: teacherData } = await supabase
        .from('teachers')
        .select('teacher_id, name')
        .eq('school_id', schoolId)
        .order('name');
      setTeachers(teacherData || []);

      if (selectedClass) {
        const { data: subjectData } = await supabase
          .from('class_subjects')
          .select('subject')
          .eq('school_id', schoolId)
          .eq('class_name', selectedClass);
        if (subjectData) {
          setSubjects(subjectData.map((s: { subject: string }) => s.subject));
        }
      }

      const { data: periodsData } = await supabase
        .from('timetable_periods')
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
    loadData();
  }, [schoolId, selectedClass]);

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
    alert(
      'Timetable PDF download will be implemented. This will generate a formatted PDF of the school timetable.'
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SectionHeader
          title="Timetable Designer"
          desc="Design the school timetable: set periods per day, assign classes, subjects and teachers."
        />
        <button
          type="button"
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-gray-900 hover:bg-red-500"
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <select
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="">Select Class</option>
          {classOptions.map((cls) => (
            <option key={cls} value={cls} className="bg-slate-900">
              {cls}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
        >
          <option value="">Weekday</option>
          <option value="Monday" className="bg-slate-900">Monday</option>
          <option value="Tuesday" className="bg-slate-900">Tuesday</option>
          <option value="Wednesday" className="bg-slate-900">Wednesday</option>
          <option value="Thursday" className="bg-slate-900">Thursday</option>
          <option value="Friday" className="bg-slate-900">Friday</option>
        </select>
        <input
          type="time"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
        <input
          type="time"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
        <select
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 md:col-span-2"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          disabled={!selectedClass}
        >
          <option value="">Select Subject</option>
          {subjects.map((subj) => (
            <option key={subj} value={subj} className="bg-slate-900">
              {subj}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 md:col-span-2"
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
        >
          <option value="">Select Teacher</option>
          {teachers.map((t) => (
            <option key={t.teacher_id} value={t.teacher_id} className="bg-slate-900">
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAddPeriod}
          disabled={saving}
          className="rounded-lg bg-purple-600 px-3 py-2 text-white hover:bg-purple-500 disabled:opacity-50"
        >
          {saving ? 'Adding...' : 'Add Period'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-600/10 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {timetablePeriods.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-4 font-medium text-gray-900">Current Timetable Periods</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {timetablePeriods.map((period) => (
              <div
                key={period.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="mb-2 flex items-start justify-between">
                  <h4 className="font-medium text-gray-900">{period.class_name}</h4>
                  <button
                    type="button"
                    onClick={() => handleRemovePeriod(period.id)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-1 text-sm text-gray-700">
                  <div>
                    <strong>Day:</strong> {period.day_of_week}
                  </div>
                  <div>
                    <strong>Time:</strong> {period.start_time} - {period.end_time}
                  </div>
                  <div>
                    <strong>Subject:</strong> {period.subject}
                  </div>
                  <div>
                    <strong>Teacher:</strong> {period.teacher_name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {timetablePeriods.length === 0 && (
        <div className="mt-4 py-8 text-center text-sm text-gray-600">
          No periods added yet. Fill in the form above and click &quot;Add Period&quot; to create
          your timetable.
        </div>
      )}

      <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-600/10 p-4">
        <h4 className="mb-2 text-sm font-medium text-blue-700">📄 PDF Export</h4>
        <p className="text-xs text-gray-600">
          Click the &quot;Download PDF&quot; button above to export the timetable as a formatted
          PDF document.
        </p>
      </div>
    </div>
  );
}
