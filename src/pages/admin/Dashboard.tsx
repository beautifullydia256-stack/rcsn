import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import {
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  Settings,
  ClipboardList,
  UserPlus,
  CreditCard,
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const KPI_COLORS = {
  students: '#4dabff',
  teachers: '#10b981',
  classes: '#ae79ff',
  exams: '#f59e0b',
} as const;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [counts, setCounts] = useState<{
    students: number;
    teachers: number;
    classes: number;
    exams: number;
  } | null>(null);

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
        supabase
          .from('students')
          .select('student_id', { count: 'exact', head: true })
          .eq('school_id', userData.school_id)
          .eq('status', 'active'),
        supabase
          .from('teachers')
          .select('teacher_id', { count: 'exact', head: true })
          .eq('school_id', userData.school_id),
        supabase
          .from('exam_sets')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', userData.school_id),
      ]);

      const studentCount = studentsRes.count ?? 0;
      const teacherCount = teachersRes.count ?? 0;
      const examCount = examSetsRes.count ?? 0;

      const { data: classData } = await supabase
        .from('students')
        .select('current_class')
        .eq('school_id', userData.school_id);
      const classSet = new Set(
        (classData ?? []).map((r: { current_class: string }) => r.current_class).filter(Boolean)
      );
      const classCount = classSet.size;

      setCounts({
        students: studentCount,
        teachers: teacherCount,
        classes: classCount,
        exams: examCount,
      });
    };
    run();
  }, [user]);

  const kpis = [
    {
      key: 'students',
      label: 'Students',
      sublabel: 'Total enrolled',
      value: counts?.students ?? '—',
      icon: Users,
      color: KPI_COLORS.students,
      onClick: () => navigate('/dashboard/admin/students'),
    },
    {
      key: 'teachers',
      label: 'Teachers',
      sublabel: 'Active staff',
      value: counts?.teachers ?? '—',
      icon: GraduationCap,
      color: KPI_COLORS.teachers,
      onClick: () => navigate('/dashboard/admin/teachers'),
    },
    {
      key: 'classes',
      label: 'Classes',
      sublabel: 'Active classes',
      value: counts?.classes ?? '—',
      icon: BookOpen,
      color: KPI_COLORS.classes,
      onClick: undefined,
    },
    {
      key: 'exams',
      label: 'Exams',
      sublabel: 'This term',
      value: counts?.exams ?? '—',
      icon: FileText,
      color: KPI_COLORS.exams,
      onClick: () => navigate('/dashboard/admin/exam-sets'),
    },
  ];

  const quickLinks = [
    { to: '/dashboard/admin/students', label: 'Students', subtitle: 'Manage students', icon: Users, color: '#4dabff' },
    { to: '/dashboard/admin/teachers', label: 'Teachers', subtitle: 'Manage staff', icon: GraduationCap, color: '#10b981' },
    { to: '/dashboard/admin/parents', label: 'Parents', subtitle: 'Parent accounts', icon: UserPlus, color: '#ff6bcb' },
    { to: '/dashboard/admin/accounts', label: 'Accounts', subtitle: 'User accounts', icon: CreditCard, color: '#ae79ff' },
    { to: '/dashboard/admin/exam-sets', label: 'Exam Sets', subtitle: 'Exams & terms', icon: BookOpen, color: '#f59e0b' },
    { to: '/dashboard/admin/attendance', label: 'Attendance', subtitle: 'Records', icon: ClipboardList, color: '#00d4ff' },
    { to: '/dashboard/admin/reports/snapshots', label: 'Report Snapshots', subtitle: 'Create & lock', icon: FileText, color: '#8b5cf6' },
    { to: '/dashboard/admin/reports/bulk', label: 'Bulk Generate', subtitle: 'Generate reports', icon: FileText, color: '#ec4899' },
    { to: '/dashboard/admin/settings', label: 'Settings', subtitle: 'School settings', icon: Settings, color: '#6366f1' },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-white/85">Manage your school operations and view insights</p>
      </div>

      {/* KPI cards - glass style with gradient tint (2f00b44) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          const rgb = k.color === '#4dabff' ? '77, 171, 255' : k.color === '#10b981' ? '16, 185, 129' : k.color === '#ae79ff' ? '174, 121, 255' : '245, 158, 11';
          return (
            <GlassCard
              key={k.key}
              className="p-4 sm:p-6 cursor-pointer relative overflow-hidden transition-all duration-300 hover:bg-white/20 hover:border-white/30"
              hover
              onClick={k.onClick}
              style={{
                background: `linear-gradient(135deg, rgba(${rgb}, 0.25) 0%, rgba(${rgb}, 0.15) 100%)`,
              }}
            >
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
                style={{ background: k.color }}
              />
              <div className="relative z-10 flex items-center gap-3 sm:gap-4">
                <div
                  className="p-2 sm:p-3 rounded-xl flex-shrink-0"
                  style={{ background: `${k.color}20` }}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: k.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-white/85 mb-1">{k.label}</div>
                  <div className="text-xs text-white/70 mb-0.5">{k.sublabel}</div>
                  <button
                    type="button"
                    className="text-xl sm:text-2xl font-bold text-white hover:underline text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      k.onClick?.();
                    }}
                  >
                    {counts != null ? k.value : '—'}
                  </button>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Quick links - glass card with colored pill buttons (2f00b44) */}
      <GlassCard className="p-6" hover>
        <h2 className="text-lg font-semibold text-white mb-4">Quick links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map(({ to, label, subtitle, icon: Icon, color }) => (
            <button
              key={to}
              type="button"
              onClick={() => navigate(to)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all hover:scale-[1.02] hover:-translate-y-0.5"
              style={{
                background: `${color}20`,
                border: `1px solid ${color}40`,
                color: '#ffffff',
              }}
            >
              <Icon className="w-5 h-5 shrink-0" style={{ color }} />
              <div>
                <div className="font-medium text-white">{label}</div>
                <div className="text-xs text-white/80">{subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
