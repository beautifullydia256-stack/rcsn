import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { Users, User, ArrowRight, BookOpen } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

interface ClassItem {
  name: string;
  studentCount: number;
  teacherName?: string;
}

export async function fetchClassesPage(userId: string): Promise<ClassItem[]> {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!data?.school_id) return [];

  const { data: sch } = await supabase.from('schools').select('type').eq('school_id', data.school_id).single();
  const classOptions: string[] = [];
  if (sch?.type === 'Nursery/Primary') {
    classOptions.push('Baby Class', 'Middle Class', 'Top Class');
    for (let i = 1; i <= 7; i++) classOptions.push(`Primary ${i}`);
  } else if (sch?.type === 'Secondary') {
    for (let i = 1; i <= 6; i++) classOptions.push(`Senior ${i}`);
  }
  if (classOptions.length === 0) return [];

  const { data: students } = await supabase.from('students').select('current_class').eq('school_id', data.school_id);
  const classCounts: Record<string, number> = {};
  (students || []).forEach((s: any) => {
    if (s.current_class) classCounts[s.current_class] = (classCounts[s.current_class] || 0) + 1;
  });

  const { data: classTeachers, error: ctError } = await supabase
    .from('class_teachers')
    .select('class_name, teacher_id')
    .eq('school_id', data.school_id);
  const teacherMap: Record<string, string> = {};
  if (!ctError && classTeachers?.length) {
    classTeachers.forEach((ct: any) => {
      if (ct.class_name && ct.teacher_id) teacherMap[ct.class_name] = ct.teacher_id;
    });
  }
  const teacherIds = Object.values(teacherMap);
  const { data: teachers } =
    teacherIds.length > 0
      ? await supabase.from('teachers').select('teacher_id, name').eq('school_id', data.school_id).in('teacher_id', teacherIds)
      : { data: [] };
  const teacherNameMap: Record<string, string> = {};
  (teachers || []).forEach((t: any) => {
    teacherNameMap[t.teacher_id] = t.name;
  });

  return classOptions.map((className) => ({
    name: className,
    studentCount: classCounts[className] || 0,
    teacherName: teacherMap[className] ? teacherNameMap[teacherMap[className]] : undefined,
  }));
}

export default function SettingsClassesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'classes', user?.id ?? ''],
    queryFn: () => fetchClassesPage(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const loading = isLoading;

  if (loading) {
    return (
      <AdminPageWrapper eyebrow="Directory" title="Class Management">
        <div className="flex items-center justify-center py-12">
          <div
            className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--ac-border)] border-t-emerald-500"
            aria-hidden
          />
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      eyebrow="Directory"
      title="Class Management"
      subtitle="Manage settings for all classes"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/settings')}
          className="ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
        >
          Back to Settings
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin')}
          className="ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
        >
          Back to Dashboard
        </button>
      </div>

      {classes.length === 0 ? (
        <div className={`${adminCardClass} py-12 text-center`}>
          <BookOpen className="mx-auto mb-4 h-12 w-12 ac-text-muted opacity-70" />
          <p className="ac-text-secondary">No classes available. Please set your school type in settings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((classItem) => (
            <button
              key={classItem.name}
              type="button"
              onClick={() => navigate(`/dashboard/admin/settings/classes/${encodeURIComponent(classItem.name)}`)}
              className={`${adminCardClass} min-h-[44px] text-left transition-colors hover:brightness-110`}
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="mb-2 text-lg font-semibold ac-text-primary">{classItem.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ac-text-secondary">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{classItem.studentCount} students</span>
                    </div>
                    {classItem.teacherName && (
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{classItem.teacherName}</span>
                      </div>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 ac-text-muted opacity-80" />
              </div>
              <div className="border-t border-[var(--ac-border)] pt-4">
                <span className="text-xs ac-text-muted">Click to manage class settings</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </AdminPageWrapper>
  );
}
