import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  CalendarCheck,
  DollarSign,
  Briefcase,
  Calendar,
  Award,
  Clock,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Building2,
  GraduationCap,
  FileText,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { useSchoolType } from '@/hooks/useSchoolType';
import { fetchStaffSalaryObligations } from '@/features/payroll-obligations/services/salaryObligationService';

function fmtUGX(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
}

export default function HrDashboard() {
  const navigate = useNavigate();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const schoolId = useAuthStore((s) => s.schoolId);
  const { isTertiary } = useSchoolType();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const todayIso = new Date().toISOString().slice(0, 10);

  // 1. Fetch Tutors / Teachers
  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['hr', 'teachers-count', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('teachers')
        .select('teacher_id, name, employee_id, phone, status, salary, qualification')
        .eq('school_id', schoolId);
      if (error) return [];
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId,
  });

  // 2. Fetch Other / Support Staff
  const { data: supportStaff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['hr', 'support-staff-count', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('other_staff_members')
        .select('id, full_name, job_title, department, salary_amount, pay_frequency, phone, status')
        .eq('school_id', schoolId);
      if (error) return [];
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId,
  });

  // 3. Fetch Staff Attendance Log for Today
  const { data: todayAttendance = [] } = useQuery({
    queryKey: ['hr', 'today-attendance', schoolId, todayIso],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('teacher_attendance')
        .select('id, teacher_id, status, date')
        .eq('school_id', schoolId)
        .eq('date', todayIso);
      if (error) return [];
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId,
  });

  // 4. Fetch Salary Obligations Summary
  const { data: salaryData } = useQuery({
    queryKey: ['hr', 'salary-commitments', schoolId, currentYear, currentMonth],
    queryFn: () =>
      schoolId
        ? fetchStaffSalaryObligations(schoolId, currentYear, currentMonth, 0)
        : Promise.resolve({ rows: [], summary: {} as any }),
    staleTime: 5 * 60 * 1000,
    enabled: !!schoolId,
  });

  // 5. Fetch Pending Leave Requests
  const { data: pendingLeave = [] } = useQuery({
    queryKey: ['hr', 'pending-leave', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('staff_leave_requests')
        .select('id, staff_name, leave_type, start_date, end_date, status')
        .eq('school_id', schoolId)
        .eq('status', 'pending');
      if (error) return [];
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!schoolId,
  });

  // Derived metrics
  const totalTutors = teachers.length;
  const totalSupport = supportStaff.length;
  const totalWorkforce = totalTutors + totalSupport;

  const presentCount = todayAttendance.filter((a: any) => a.status === 'present').length;
  const attendanceRate = totalTutors > 0 ? Math.round((presentCount / totalTutors) * 100) : 0;

  const totalMonthlyObligation = salaryData?.summary?.total_monthly_payroll_obligation || 0;
  const pendingLeaveCount = pendingLeave.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" style={{ color: t.textPrimary }}>
      {/* Executive HR Hero Banner */}
      <div
        className="rounded-3xl p-6 md:p-8 border shadow-sm relative overflow-hidden"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(13, 21, 18, 0.95) 0%, rgba(20, 28, 46, 0.95) 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)',
          borderColor: t.border,
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/25">
                Human Resource Command Center
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                {isTertiary ? 'Tertiary Institution' : 'School Workforce'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: t.textPrimary }}>
              Staff & Workforce Operations
            </h1>
            <p className="text-xs md:text-sm font-medium max-w-2xl" style={{ color: t.textMuted }}>
              Manage institution tutors, non-teaching personnel, compensation structures, daily attendance records, and leave compliance in real time.
            </p>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/dashboard/hr/staff/add')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Onboard Staff</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/hr/salaries')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 shadow-sm cursor-pointer"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            >
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>Salary Setup</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/hr/attendance')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 shadow-sm cursor-pointer"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            >
              <CalendarCheck className="w-4 h-4 text-blue-500" />
              <span>Attendance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Workforce */}
        <div
          onClick={() => navigate('/dashboard/hr/teachers')}
          className="rounded-2xl p-5 border shadow-sm transition-all hover:border-teal-500/50 cursor-pointer flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Total Headcount
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.textPrimary }}>
              {totalWorkforce}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              {totalTutors} {isTertiary ? 'Tutors' : 'Teachers'} · {totalSupport} Support Staff
            </span>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'rgba(20, 184, 166, 0.12)', color: '#14b8a6' }}
          >
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Staff Attendance Today */}
        <div
          onClick={() => navigate('/dashboard/hr/attendance')}
          className="rounded-2xl p-5 border shadow-sm transition-all hover:border-blue-500/50 cursor-pointer flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Present Today
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandBlue }}>
              {presentCount} / {totalTutors}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              {attendanceRate}% reporting rate
            </span>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'rgba(59, 130, 246, 0.12)', color: t.brandBlue }}
          >
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Monthly Salary Commitments */}
        <div
          onClick={() => navigate('/dashboard/hr/salaries')}
          className="rounded-2xl p-5 border shadow-sm transition-all hover:border-emerald-500/50 cursor-pointer flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Monthly Wage Obligation
            </span>
            <div className="text-xl font-black mt-1" style={{ color: '#10b981' }}>
              {fmtUGX(totalMonthlyObligation)}
            </div>
            <span className="text-xs mt-1 block font-medium text-emerald-600 dark:text-emerald-400">
              Configured pay scale
            </span>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}
          >
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Leave Requests */}
        <div
          onClick={() => navigate('/dashboard/hr/leave')}
          className="rounded-2xl p-5 border shadow-sm transition-all hover:border-amber-500/50 cursor-pointer flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Pending Leave Actions
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: pendingLeaveCount > 0 ? '#f59e0b' : t.textPrimary }}>
              {pendingLeaveCount}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              {pendingLeaveCount > 0 ? 'Awaiting review' : 'All requests processed'}
            </span>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}
          >
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Quick Portals & Staff Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Access Modules Card */}
          <div
            className="rounded-2xl p-6 border shadow-sm"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black flex items-center gap-2" style={{ color: t.textPrimary }}>
                <Building2 className="w-5 h-5 text-teal-500" />
                Workforce Management Modules
              </h2>
              <span className="text-xs font-semibold" style={{ color: t.textMuted }}>
                Centralized HR Control
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Tutors Directory */}
              <div
                onClick={() => navigate('/dashboard/hr/teachers')}
                className="p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer flex items-start gap-3.5 group"
                style={{ background: t.surface, borderColor: t.border }}
              >
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs" style={{ color: t.textPrimary }}>
                    {isTertiary ? 'Tutors & Lecturers' : 'Teachers Directory'}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                    {totalTutors} registered faculty members
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Support Staff */}
              <div
                onClick={() => navigate('/dashboard/hr/staff')}
                className="p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer flex items-start gap-3.5 group"
                style={{ background: t.surface, borderColor: t.border }}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs" style={{ color: t.textPrimary }}>
                    Support & Non-Teaching Staff
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                    {totalSupport} administrative & support workers
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Salary Configuration */}
              <div
                onClick={() => navigate('/dashboard/hr/salaries')}
                className="p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer flex items-start gap-3.5 group"
                style={{ background: t.surface, borderColor: t.border }}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs" style={{ color: t.textPrimary }}>
                    Salary Scale Setup
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                    Base salaries, daily wages, and allowances
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Employment Contracts */}
              <div
                onClick={() => navigate('/dashboard/hr/contracts')}
                className="p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer flex items-start gap-3.5 group"
                style={{ background: t.surface, borderColor: t.border }}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs" style={{ color: t.textPrimary }}>
                    Employment Contracts
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                    Terms, probation, and renewal alerts
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Leave Management */}
              <div
                onClick={() => navigate('/dashboard/hr/leave')}
                className="p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer flex items-start gap-3.5 group"
                style={{ background: t.surface, borderColor: t.border }}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs" style={{ color: t.textPrimary }}>
                    Leave & Absence Requests
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                    Annual, sick, study, and maternity leave
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Performance Appraisals */}
              <div
                onClick={() => navigate('/dashboard/hr/performance')}
                className="p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer flex items-start gap-3.5 group"
                style={{ background: t.surface, borderColor: t.border }}
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20 group-hover:scale-105 transition-transform">
                  <Award className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs" style={{ color: t.textPrimary }}>
                    Staff Appraisals & KPIs
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                    Staff performance reviews and evaluations
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Quick Staff Roster Preview */}
          <div
            className="rounded-2xl border overflow-hidden shadow-sm"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: t.border }}>
              <div>
                <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>
                  Recent Tutors & Staff
                </h3>
                <p className="text-xs" style={{ color: t.textMuted }}>
                  Active employees in the institution
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard/hr/teachers')}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y" style={{ borderColor: t.border }}>
              {teachers.slice(0, 5).map((teacher: any) => (
                <div
                  key={teacher.teacher_id}
                  onClick={() => navigate(`/dashboard/hr/teachers/${teacher.teacher_id}`)}
                  className="p-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-xs flex items-center justify-center border border-teal-500/20">
                      {teacher.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-xs" style={{ color: t.textPrimary }}>
                        {teacher.name}
                      </div>
                      <div className="text-[11px]" style={{ color: t.textMuted }}>
                        {teacher.employee_id || 'Tutor'} · {teacher.phone || 'No phone'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                    <div className="text-[11px] font-mono mt-0.5" style={{ color: t.textMuted }}>
                      {teacher.salary ? fmtUGX(teacher.salary) : 'Salary Not Set'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: HR Notices & Important Responsibilities */}
        <div className="space-y-6">
          {/* Institutional Compliance Card */}
          <div
            className="rounded-2xl p-5 border shadow-sm space-y-4"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-teal-500" />
              <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>
                HR Roles & Responsibility
              </h3>
            </div>

            <div className="space-y-2.5 text-xs font-medium" style={{ color: t.textMuted }}>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Compensation Setup:</strong> Set base salaries and wage frequencies for tutors and support staff.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Separation of Duty:</strong> Financial disbursements and payment voucher approvals remain with the Bursar/Accountant.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Attendance & Leaves:</strong> Monitor tutor lecture attendance logs and process leave applications.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Hiring & Contracts:</strong> Onboard new personnel and track contract renewals.
                </span>
              </div>
            </div>
          </div>

          {/* Pending Alerts Card */}
          <div
            className="rounded-2xl p-5 border shadow-sm space-y-3"
            style={{ background: t.card, borderColor: t.border }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>
                Urgent HR Actions
              </h3>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </div>

            {pendingLeaveCount > 0 ? (
              <div
                onClick={() => navigate('/dashboard/hr/leave')}
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between cursor-pointer hover:bg-amber-500/15 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="font-bold text-xs text-amber-700 dark:text-amber-400">
                      {pendingLeaveCount} Pending Leave Request{pendingLeaveCount > 1 ? 's' : ''}
                    </div>
                    <div className="text-[11px] text-amber-600 dark:text-amber-500">
                      Staff awaiting absence authorization
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-500" />
              </div>
            ) : (
              <div className="text-xs p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>No pending leave approvals</span>
              </div>
            )}

            <div
              onClick={() => navigate('/dashboard/hr/contracts')}
              className="p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ borderColor: t.border }}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="font-bold text-xs" style={{ color: t.textPrimary }}>
                    Contract Expiry Tracker
                  </div>
                  <div className="text-[11px]" style={{ color: t.textMuted }}>
                    Audit contract tenure & renewal dates
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
