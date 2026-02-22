import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTeacherContext } from '../useTeacherContext';

type StudentRow = { student_id: string; name: string; current_class: string; admission_number?: string };
type AttendanceRow = { attendance_id?: string; student_id: string; present: boolean };

export default function TeacherAttendancePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { schoolId, classNames, isLoading: ctxLoading } = useTeacherContext();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

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
        .select('attendance_id, student_id, present')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass)
        .eq('attendance_date', selectedDate);
      return (data as AttendanceRow[]) ?? [];
    },
    enabled: !!schoolId && !!selectedClass && !!selectedDate,
  });

  const upsertAttendance = useMutation({
    mutationFn: async ({
      studentId,
      present,
    }: {
      studentId: string;
      present: boolean;
    }) => {
      if (!schoolId || !selectedClass || !selectedDate) throw new Error('Missing context');
      const payload = {
        school_id: schoolId,
        class_name: selectedClass,
        student_id: studentId,
        attendance_date: selectedDate,
        present,
      };
      const { error } = await supabase
        .from('student_attendance')
        .upsert(payload, { onConflict: 'student_id,attendance_date' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['teacher', 'attendance', 'records', schoolId ?? '', selectedClass, selectedDate],
      });
    },
  });

  const attendanceByStudent = new Map(existingAttendance.map((a) => [a.student_id, a.present]));
  const isLoading = ctxLoading || studentsLoading || attendanceLoading;

  const setPresent = (studentId: string, present: boolean) => {
    upsertAttendance.mutate({ studentId, present });
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
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-[var(--ac-border)] bg-[var(--ac-bg)] px-3 py-2 ac-text-primary"
              />
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

          {selectedClass && !isLoading && students.length > 0 && (
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
                    const present = attendanceByStudent.get(s.student_id) ?? true;
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
                              disabled={upsertAttendance.isPending}
                              onClick={() => setPresent(s.student_id, !present)}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ac-focus)] focus:ring-offset-2 focus:ring-offset-[var(--ac-bg)] disabled:cursor-not-allowed disabled:opacity-50 ${
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
          )}
        </div>
      )}
    </div>
  );
}
