import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Phone, Mail, MapPin, GraduationCap, Hash, User, CalendarDays, Activity } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
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

const AVATAR_GRADIENTS = [
  'from-teal-500 to-cyan-600',
  'from-violet-500 to-fuchsia-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
];

function initials(name: string) {
  return (name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function avatarForName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h + name.charCodeAt(i)) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[h];
}

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

        const stored = useAuthStore.getState();
        const userId = stored.user?.id;
        if (!userId) {
          navigate('/login');
          return;
        }

        if (!studentId) return;

        let schoolId = stored.schoolId;
        if (!schoolId) {
          const { data: userData } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
          schoolId = userData?.school_id ?? null;
        }
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
            ? supabase.from('class_teachers').select('teacher_id').eq('school_id', schoolId).eq('class_name', currentClass)
            : Promise.resolve({ data: [] } as { data: unknown[] }),
          supabase
            .from('student_attendance')
            .select('student_id')
            .eq('school_id', schoolId)
            .eq('student_id', studentId)
            .eq('date', today)
            .eq('present', true),
        ]);

        setParents(
          (pRows || []).map((p: { name?: string; phone?: string | null; email?: string | null }) => ({
            name: p?.name || '—',
            phone: p?.phone ?? null,
            email: p?.email ?? null,
          }))
        );

        if (currentClass) {
          const ctList = (ctRows || []) as { teacher_id?: string }[];
          const teacherIds = [...new Set(ctList.map((ct) => ct.teacher_id).filter(Boolean))] as string[];
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

  const title = student?.name ? student.name : 'Student profile';
  const subtitle = student?.current_class
    ? `Class ${student.current_class}${student.admission_number ? ` · Adm. ${student.admission_number}` : ''}`
    : 'Enrollment details';

  const grad = student ? avatarForName(student.name || '') : AVATAR_GRADIENTS[0];

  return (
    <AdminPageWrapper title={title} subtitle={subtitle}>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/students')}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--ac-border)] bg-white/5 px-4 py-2 text-sm font-medium ac-text-primary hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to students
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--ac-border)] bg-white/5 px-4 py-2 text-sm font-medium ac-text-primary hover:bg-white/10"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-48 animate-pulse rounded-xl bg-white/5" />
            <div className="h-48 animate-pulse rounded-xl bg-white/5" />
          </div>
        </div>
      ) : !student ? (
        <div className="ac-glass-card rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-amber-200">
          Student not found or you don&apos;t have access.
        </div>
      ) : (
        <>
          {/* Hero */}
          <div className="ac-glass-card overflow-hidden rounded-2xl border border-[var(--ac-border)] p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div
                className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-bold text-white shadow-lg ${grad}`}
              >
                {initials(student.name || '')}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl ac-text-primary">{student.name}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {student.current_class && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {student.current_class}
                    </span>
                  )}
                  {student.status && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ac-text-secondary">
                      <Activity className="h-3.5 w-3.5" />
                      {student.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className={`${adminCardClass} lg:col-span-1`}>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ac-text-muted">
                <User className="h-4 w-4" />
                Record
              </h3>
              <dl className="space-y-4">
                <div className="flex gap-3">
                  <Hash className="mt-0.5 h-4 w-4 shrink-0 ac-text-muted" />
                  <div>
                    <dt className="text-xs font-medium ac-text-muted">Admission number</dt>
                    <dd className="mt-0.5 text-sm font-medium ac-text-primary">{student.admission_number || '—'}</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 ac-text-muted" />
                  <div>
                    <dt className="text-xs font-medium ac-text-muted">Class</dt>
                    <dd className="mt-0.5 text-sm font-medium ac-text-primary">{student.current_class || '—'}</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <User className="mt-0.5 h-4 w-4 shrink-0 ac-text-muted" />
                  <div>
                    <dt className="text-xs font-medium ac-text-muted">Class teacher</dt>
                    <dd className="mt-0.5 text-sm font-medium ac-text-primary">{classTeacherName || '—'}</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Activity className="mt-0.5 h-4 w-4 shrink-0 ac-text-muted" />
                  <div>
                    <dt className="text-xs font-medium ac-text-muted">Attended today</dt>
                    <dd className="mt-0.5 text-sm font-medium ac-text-primary">
                      {attendedToday === null ? '—' : attendedToday ? 'Yes' : 'No'}
                    </dd>
                  </div>
                </div>
                {student.created_at && (
                  <div className="flex gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 ac-text-muted" />
                    <div>
                      <dt className="text-xs font-medium ac-text-muted">Enrolled</dt>
                      <dd className="mt-0.5 text-sm ac-text-secondary">
                        {new Date(student.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>

            <div className={`${adminCardClass} lg:col-span-2`}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide ac-text-muted">Parents / guardians</h3>
              {parents.length === 0 ? (
                <p className="text-sm ac-text-secondary">No parent records linked.</p>
              ) : (
                <ul className="divide-y divide-[var(--ac-border)]">
                  {parents.map((p, idx) => (
                    <li key={`${p.name}-${idx}`} className="py-4 first:pt-0">
                      <p className="font-semibold ac-text-primary">{p.name}</p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
                        {p.phone && (
                          <a
                            href={`tel:${String(p.phone).replace(/\s/g, '')}`}
                            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-500 hover:text-emerald-400"
                          >
                            <Phone className="h-4 w-4 opacity-80" />
                            {p.phone}
                          </a>
                        )}
                        {p.email && (
                          <a
                            href={`mailto:${p.email}`}
                            className="inline-flex items-center gap-2 text-sm text-sky-500 hover:text-sky-400 break-all"
                          >
                            <Mail className="h-4 w-4 shrink-0 opacity-80" />
                            {p.email}
                          </a>
                        )}
                        {!p.phone && !p.email && <span className="text-sm ac-text-muted">No contact on file</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={`${adminCardClass} lg:col-span-3`}>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ac-text-muted">
                <MapPin className="h-4 w-4" />
                Addresses
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium ac-text-muted mb-1.5">Student / home address</p>
                  <p className="text-sm leading-relaxed ac-text-primary">{student.address || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium ac-text-muted mb-1.5">Guardian address</p>
                  <p className="text-sm leading-relaxed ac-text-primary">{student.guardian_address || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminPageWrapper>
  );
}
