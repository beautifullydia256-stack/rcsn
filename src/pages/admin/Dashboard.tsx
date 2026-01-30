import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Users, BookOpen, FileText, Settings, ClipboardList, UserPlus, CreditCard } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [counts, setCounts] = useState<{ students: number; teachers: number; classes: number; exams: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('user_id', user.id)
        .single();
      if (!userData?.school_id) return;

      const [studentsRes, teachersRes, examSetsRes] = await Promise.all([
        supabase.from('students').select('student_id', { count: 'exact', head: true }).eq('school_id', userData.school_id).eq('status', 'active'),
        supabase.from('teachers').select('teacher_id', { count: 'exact', head: true }).eq('school_id', userData.school_id),
        supabase.from('exam_sets').select('id', { count: 'exact', head: true }).eq('school_id', userData.school_id),
      ]);

      const studentCount = studentsRes.count ?? 0;
      const teacherCount = teachersRes.count ?? 0;
      const examCount = examSetsRes.count ?? 0;

      const { data: classData } = await supabase
        .from('students')
        .select('current_class')
        .eq('school_id', userData.school_id);
      const classSet = new Set((classData ?? []).map((r: { current_class: string }) => r.current_class).filter(Boolean));
      const classCount = classSet.size;

      setCounts({ students: studentCount, teachers: teacherCount, classes: classCount, exams: examCount });
    };
    run();
  }, [user]);

  const links = [
    { to: '/dashboard/admin/students', label: 'Students', subtitle: 'Manage students', icon: Users },
    { to: '/dashboard/admin/teachers', label: 'Teachers', subtitle: 'Manage staff', icon: UserPlus },
    { to: '/dashboard/admin/parents', label: 'Parents', subtitle: 'Parent accounts', icon: Users },
    { to: '/dashboard/admin/accounts', label: 'Accounts', subtitle: 'User accounts', icon: CreditCard },
    { to: '/dashboard/admin/exam-sets', label: 'Exam Sets', subtitle: 'Exams & terms', icon: BookOpen },
    { to: '/dashboard/admin/attendance', label: 'Attendance', subtitle: 'Records', icon: ClipboardList },
    { to: '/dashboard/admin/reports/snapshots', label: 'Report Snapshots', subtitle: 'Create & lock', icon: FileText },
    { to: '/dashboard/admin/reports/bulk', label: 'Bulk Generate', subtitle: 'Generate reports', icon: FileText },
    { to: '/dashboard/admin/reports/viewer', label: 'Report Viewer', subtitle: 'View cached reports', icon: FileText },
    { to: '/dashboard/admin/settings', label: 'Settings', subtitle: 'School settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
      <p className="text-gray-400">Manage your school operations</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-lg bg-[#1e293b] border border-white/10 p-6">
          <p className="text-sm text-gray-400">Students</p>
          <p className="text-xs text-gray-500 mt-0.5">Total enrolled</p>
          <button type="button" className="text-2xl font-bold text-white mt-2 hover:underline" onClick={() => navigate('/dashboard/admin/students')}>
            {counts != null ? counts.students : '—'}
          </button>
        </div>
        <div className="rounded-lg bg-[#1e293b] border border-white/10 p-6">
          <p className="text-sm text-gray-400">Teachers</p>
          <p className="text-xs text-gray-500 mt-0.5">Active staff</p>
          <button type="button" className="text-2xl font-bold text-white mt-2 hover:underline" onClick={() => navigate('/dashboard/admin/teachers')}>
            {counts != null ? counts.teachers : '—'}
          </button>
        </div>
        <div className="rounded-lg bg-[#1e293b] border border-white/10 p-6">
          <p className="text-sm text-gray-400">Classes</p>
          <p className="text-xs text-gray-500 mt-0.5">Active classes</p>
          <p className="text-2xl font-bold text-white mt-2">{counts != null ? counts.classes : '—'}</p>
        </div>
        <div className="rounded-lg bg-[#1e293b] border border-white/10 p-6">
          <p className="text-sm text-gray-400">Exams</p>
          <p className="text-xs text-gray-500 mt-0.5">This term</p>
          <button type="button" className="text-2xl font-bold text-white mt-2 hover:underline" onClick={() => navigate('/dashboard/admin/exam-sets')}>
            {counts != null ? counts.exams : '—'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-600 bg-[#1e293b]/80 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {links.map(({ to, label, subtitle, icon: Icon }) => (
            <button
              key={to}
              type="button"
              className="flex items-center gap-3 rounded-lg border border-gray-600 bg-[#1e293b] p-4 text-left hover:bg-white/5 transition-colors"
              onClick={() => navigate(to)}
            >
              <Icon className="h-8 w-8 text-gray-400 shrink-0" />
              <div>
                <div className="font-medium text-gray-200">{label}</div>
                <div className="text-sm text-gray-500">{subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
