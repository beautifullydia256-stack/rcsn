import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

type DashboardStats = {
  teacherId: string | null;
  classesCount: number;
  studentsCount: number;
};

async function fetchTeacherDashboardStats(
  schoolId: string | null,
  userEmail: string | undefined
): Promise<DashboardStats> {
  if (!schoolId || !userEmail?.trim()) {
    return { teacherId: null, classesCount: 0, studentsCount: 0 };
  }

  const email = userEmail.trim().toLowerCase();

  const { data: teacher } = await supabase
    .from('teachers')
    .select('teacher_id')
    .eq('school_id', schoolId)
    .ilike('email', email)
    .maybeSingle();

  const teacherId = (teacher as { teacher_id?: string } | null)?.teacher_id ?? null;
  if (!teacherId) {
    return { teacherId: null, classesCount: 0, studentsCount: 0 };
  }

  const { data: classRows } = await supabase
    .from('class_teachers')
    .select('class_name')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId);

  const { data: tcsRows } = await supabase
    .from('teacher_class_subjects')
    .select('class_name')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId);

  const classSet = new Set<string>();
  (classRows || []).forEach((r: { class_name: string }) => classSet.add(r.class_name));
  (tcsRows || []).forEach((r: { class_name: string }) => classSet.add(r.class_name));
  const classNames = Array.from(classSet);

  const classesCount = classNames.length;

  let studentsCount = 0;
  if (classNames.length > 0) {
    const { data: students, count } = await supabase
      .from('students')
      .select('student_id', { count: 'exact', head: false })
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .in('current_class', classNames);
    studentsCount = count ?? (students?.length ?? 0);
  }

  return { teacherId, classesCount, studentsCount };
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);
  const userEmail = user?.email;
  // Match old behavior (c1e76a5): school_id from store or from auth user_metadata so dashboard works even before users row is loaded
  const schoolId =
    schoolIdFromStore ??
    (user?.user_metadata?.school_id as string | undefined) ??
    (user?.raw_user_meta_data?.school_id as string | undefined) ??
    null;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['teacher', 'dashboard-stats', schoolId ?? '', userEmail ?? ''],
    queryFn: () => fetchTeacherDashboardStats(schoolId, userEmail),
    enabled: !!schoolId && !!userEmail,
  });

  const classesCount = stats?.classesCount ?? 0;
  const studentsCount = stats?.studentsCount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">Teacher Dashboard</h1>
        <p className="ac-text-secondary mt-1">Manage your classes and students</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          type="button"
          className="ac-glass-card p-6 text-left border border-[var(--ac-border)] hover:opacity-90 transition-opacity"
          onClick={() => navigate('/dashboard/teacher/classes')}
        >
          <h3 className="ac-text-primary text-lg font-medium mb-1">My Classes</h3>
          <p className="ac-text-muted text-sm mb-3">Assigned classes</p>
          {isLoading ? (
            <div className="h-8 w-12 rounded ac-skeleton-block animate-pulse" />
          ) : (
            <p className="text-2xl font-bold ac-text-primary">{classesCount}</p>
          )}
        </button>
        <button
          type="button"
          className="ac-glass-card p-6 text-left border border-[var(--ac-border)] hover:opacity-90 transition-opacity"
          onClick={() => navigate('/dashboard/teacher/students')}
        >
          <h3 className="ac-text-primary text-lg font-medium mb-1">Students</h3>
          <p className="ac-text-muted text-sm mb-3">Total students in your classes</p>
          {isLoading ? (
            <div className="h-8 w-12 rounded ac-skeleton-block animate-pulse" />
          ) : (
            <p className="text-2xl font-bold ac-text-primary">{studentsCount}</p>
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/teacher/exam-results')}
        >
          Exam Results
        </button>
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/teacher/attendance')}
        >
          Attendance
        </button>
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/teacher/timetable')}
        >
          Timetable
        </button>
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/teacher/settings')}
        >
          Settings
        </button>
      </div>
    </div>
  );
}
