import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { studentAttendanceRowIsPresent } from '@/lib/studentAttendanceRow';
import { schoolCalendarTodayIso } from '@/lib/schoolCalendarDate';
import { useTeacherContext } from '../useTeacherContext';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';

type StudentRow = { student_id: string; name: string; current_class: string; admission_number?: string };
type AttendanceRow = { student_id: string; present?: boolean | null; status?: string | null };

function todayISO() {
  return schoolCalendarTodayIso();
}

export default function TeacherAttendancePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { schoolId, teacherId, classNames, isLoading: ctxLoading } = useTeacherContext();
  const [selectedClass, setSelectedClass] = useState('');
  const selectedDate = todayISO();
  const [localPresent, setLocalPresent] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['teacher', 'attendance', 'students', schoolId ?? '', selectedClass],
    queryFn: async (): Promise<StudentRow[]> => {
      if (!schoolId || !selectedClass) return [];
      const { data } = await supabase
        .from('students')
        .select('student_id, name, current_class, admission_number')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .eq('current_class', selectedClass)
        .order('name');
      return (data as StudentRow[]) ?? [];
    },
    enabled: !!schoolId && !!selectedClass,
  });

  const { data: existingAttendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['teacher', 'attendance', 'records', schoolId ?? '', selectedClass, selectedDate],
    queryFn: async (): Promise<AttendanceRow[]> => {
      if (!schoolId || !selectedClass || !selectedDate) return [];
      const { data } = await supabase
        .from('student_attendance')
        .select('student_id, present, status')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass)
        .eq('attendance_date', selectedDate);
      return (data as AttendanceRow[]) ?? [];
    },
    enabled: !!schoolId && !!selectedClass && !!selectedDate,
  });

  const attendanceByStudent = useMemo(
    () =>
      new Map(
        existingAttendance.map((a) => [a.student_id, studentAttendanceRowIsPresent(a)])
      ),
    [existingAttendance]
  );

  useEffect(() => {
    if (students.length === 0) {
      setLocalPresent({});
      return;
    }
    const next: Record<string, boolean> = {};
    students.forEach((s) => {
      next[s.student_id] = attendanceByStudent.get(s.student_id) ?? false;
    });
    setLocalPresent(next);
  }, [students, attendanceByStudent]);

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      setSaveError(null);
      if (!schoolId || !teacherId || !selectedClass) throw new Error('Missing context');
      const attendanceDate = todayISO();
      const entries = Object.entries(localPresent);
      if (entries.length === 0) return;

      // Production: UNIQUE(student_id, attendance_date), status present|absent|late|excused
      const rows = entries.map(([student_id, present]) => ({
        school_id: schoolId,
        class_name: selectedClass,
        student_id,
        teacher_id: teacherId,
        attendance_date: attendanceDate,
        status: present ? 'present' : 'absent',
      }));

      const { error } = await supabase.from('student_attendance').upsert(rows, {
        onConflict: 'student_id,attendance_date',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['teacher', 'attendance', 'records', schoolId ?? '', selectedClass, selectedDate],
      });
      setSaveSuccess(true);
      setSaveError(null);
      setTimeout(() => setSaveSuccess(false), 4000);
    },
    onError: (err: Error) => {
      setSaveError(err.message || 'Failed to save attendance');
      console.error('Attendance save error:', err);
    },
  });

  const isLoading = ctxLoading || studentsLoading || attendanceLoading;
  const presentFor = (studentId: string) => localPresent[studentId] ?? false;
  const setPresent = (studentId: string, present: boolean) => {
    setLocalPresent((prev) => ({ ...prev, [studentId]: present }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold ac-text-primary">Attendance</h1>
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/teacher')}
        >
          Back
        </button>
      </div>

      {ctxLoading && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-48 rounded ac-skeleton-block" />
            <div className="h-10 w-full rounded ac-skeleton-block" />
          </div>
        </div>
      )}

      {!ctxLoading && classNames.length === 0 && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <p className="ac-text-muted text-center">No classes assigned. Ask your admin to assign you to classes.</p>
        </div>
      )}

      {!ctxLoading && classNames.length > 0 && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)] space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium ac-text-muted mb-1">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="teacher-dropdown rounded-xl border border-[var(--ac-border)] bg-[var(--ac-bg)] px-3 py-2 ac-text-primary min-w-[160px]"
                style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}
              >
                <option value="" style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}>
                  Select class
                </option>
                {classNames.map((c) => (
                  <option
                    key={c}
                    value={c}
                    style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}
                  >
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium ac-text-muted mb-1">Date</label>
              <div className="rounded-xl border border-[var(--ac-border)] bg-[var(--ac-bg-muted)] px-3 py-2 ac-text-primary min-w-[140px]">
                Today — {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {!selectedClass && (
            <p className="ac-text-muted text-sm">Select a class to view and mark attendance.</p>
          )}

          {selectedClass && isLoading && (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 w-full rounded ac-skeleton-block" />
              ))}
            </div>
          )}

          {selectedClass && !isLoading && students.length === 0 && (
            <p className="ac-text-muted">No active students in this class.</p>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-500/20 px-4 py-3 text-green-800 dark:text-green-200 text-sm font-medium">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>Attendance saved successfully.</span>
            </div>
          )}
          {saveError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
          {selectedClass && !isLoading && students.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="ac-text-muted text-sm">Toggle each student to Present. Default is Absent.</p>
                <button
                  type="button"
                  onClick={() => saveAllMutation.mutate()}
                  disabled={saveAllMutation.isPending || Object.keys(localPresent).length === 0}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    saveSuccess
                      ? 'bg-green-600 text-white border border-green-500'
                      : 'ac-glass-btn'
                  }`}
                >
                  {saveAllMutation.isPending ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save attendance
                    </>
                  )}
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[var(--ac-border)]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--ac-border)] ac-text-muted text-sm">
                      <th className="p-3 font-medium">Name</th>
                      <th className="p-3 font-medium">Admission No.</th>
                      <th className="p-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="ac-text-primary">
                    {students.map((s) => {
                      const present = presentFor(s.student_id);
                      return (
                        <tr key={s.student_id} className="border-b border-[var(--ac-border)] last:border-0">
                          <td className="p-3">{s.name}</td>
                          <td className="p-3">{s.admission_number ?? '—'}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={present}
                                aria-label={present ? 'Present' : 'Absent'}
                                onClick={() => setPresent(s.student_id, !present)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ac-focus)] focus:ring-offset-2 focus:ring-offset-[var(--ac-bg)] ${
                                  present ? 'bg-green-600' : 'bg-[var(--ac-border)]'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                                    present ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                  aria-hidden
                                />
                              </button>
                              <span className="text-sm ac-text-muted min-w-[4rem]">
                                {present ? 'Present' : 'Absent'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
