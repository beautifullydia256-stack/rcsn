import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { supabase } from '@/lib/supabase';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

type ParentRow = {
  name: string;
  phone: string | null;
  email: string | null;
};

type StudentRow = {
  student_id: string;
  name: string;
  current_class: string | null;
  admission_number: string | null;
  address: string | null;
  guardian_address: string | null;
  created_at: string | null;
  status: string | null;
};

export default function StudentProfile() {
  const navigate = useNavigate();
  const { student_id: studentIdParam } = useParams<{ student_id: string }>();
  const studentId = Array.isArray(studentIdParam) ? studentIdParam[0] : studentIdParam || '';

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [classTeacherName, setClassTeacherName] = useState<string | null>(null);
  const [attendedToday, setAttendedToday] = useState<boolean | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        if (!studentId) return;

        const { data: userData } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
        const schoolId = userData?.school_id;
        if (!schoolId) return;

        const { data: s } = await supabase
          .from('students')
          .select('student_id, name, current_class, admission_number, address, guardian_address, created_at, status')
          .eq('school_id', schoolId)
          .eq('student_id', studentId)
          .single();

        setStudent((s as StudentRow) ?? null);

        const currentClass = (s as StudentRow | null)?.current_class ?? null;
        const today = new Date().toISOString().slice(0, 10);

        const [{ data: pRows }, { data: ctRows }, { data: attendanceRows }] = await Promise.all([
          supabase.from('parents').select('name, phone, email').eq('school_id', schoolId).eq('student_id', studentId),
          currentClass
            ? supabase
                .from('class_teachers')
                .select('teacher_id')
                .eq('school_id', schoolId)
                .eq('class_name', currentClass)
            : Promise.resolve({ data: [] } as any),
          supabase
            .from('student_attendance')
            .select('student_id')
            .eq('school_id', schoolId)
            .eq('student_id', studentId)
            .eq('date', today)
            .eq('present', true),
        ]);

        setParents(
          (pRows || []).map((p: any) => ({
            name: p?.name || '—',
            phone: p?.phone ?? null,
            email: p?.email ?? null,
          }))
        );

        // Class teacher (best-effort): resolve based on the student's current_class.
        if (currentClass) {
          const teacherIds = [...new Set((ctRows || []).map((ct: any) => ct.teacher_id).filter(Boolean))] as string[];
          if (teacherIds.length) {
            const { data: teachers } = await supabase
              .from('teachers')
              .select('teacher_id, name')
              .eq('school_id', schoolId)
              .in('teacher_id', teacherIds);

            setClassTeacherName((teachers?.[0]?.name as string) ?? null);
          } else {
            setClassTeacherName(null);
          }
        } else {
          setClassTeacherName(null);
        }

        setAttendedToday((attendanceRows || []).length > 0);
      } catch (err) {
        console.error('StudentProfile load error:', err);
        setStudent(null);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) void run();
  }, [navigate, studentId]);

  const title = student?.name ? `${student.name}` : 'Student Profile';
  const subtitle = student?.current_class ? `Class · ${student.current_class}` : undefined;

  return (
    <AdminPageWrapper title={title} subtitle={subtitle}>
      <div className="flex items-center justify-end gap-3">
        <button type="button" className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm font-medium ac-text-primary" onClick={() => navigate('/dashboard/admin/students')}>
          Back to Students
        </button>
        <button
          type="button"
          className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm text-white font-medium"
          onClick={() => window.print()}
        >
          Print
        </button>
      </div>

      {loading ? (
        <div className="ac-text-secondary">Loading...</div>
      ) : !student ? (
        <div className="ac-text-secondary">Student not found.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={adminCardClass}>
            <div className="ac-text-primary font-medium mb-2">Personal Info</div>
            <div className="ac-text-secondary text-sm space-y-1">
              <div>
                Admission No: <span className="ac-text-primary">{student.admission_number || '—'}</span>
              </div>
              <div>
                Class: <span className="ac-text-primary">{student.current_class || '—'}</span>
              </div>
              <div>
                Class Teacher: <span className="ac-text-primary">{classTeacherName || '—'}</span>
              </div>
              <div>
                Attended Today: <span className="ac-text-primary">{attendedToday === null ? '—' : attendedToday ? 'Yes' : 'No'}</span>
              </div>
              <div>
                Status: <span className="ac-text-primary">{student.status || '—'}</span>
              </div>
            </div>
          </div>

          <div className={`${adminCardClass} lg:col-span-2`}>
            <div className="ac-text-primary font-medium mb-3">Parents / Guardians</div>
            {parents.length === 0 ? (
              <div className="ac-text-secondary">No parents found.</div>
            ) : (
              <div className="space-y-3">
                {parents.map((p, idx) => (
                  <div key={`${p.name}-${idx}`} className="border-b border-[var(--ac-border)] pb-3">
                    <div className="ac-text-primary font-semibold">{p.name}</div>
                    <div className="ac-text-secondary text-sm mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Phone:{' '}
                        {p.phone ? (
                          <a className="ac-text-primary hover:underline" href={`tel:${String(p.phone).replace(/\s/g, '')}`}>
                            {p.phone}
                          </a>
                        ) : (
                          <span>—</span>
                        )}
                      </span>
                      <span>
                        Email:{' '}
                        {p.email ? (
                          <a className="ac-text-primary hover:underline" href={`mailto:${p.email}`}>
                            {p.email}
                          </a>
                        ) : (
                          <span>—</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`${adminCardClass} lg:col-span-3`}>
            <div className="ac-text-primary font-medium mb-3">Addresses</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="ac-text-secondary text-sm font-medium mb-1">Home Address</div>
                <div className="ac-text-primary">{student.address || '—'}</div>
              </div>
              <div>
                <div className="ac-text-secondary text-sm font-medium mb-1">Guardian Address</div>
                <div className="ac-text-primary">{student.guardian_address || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPageWrapper>
  );
}

