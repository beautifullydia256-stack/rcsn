import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AddStudentForm } from '@/pages/admin/students/AddStudentForm';
import { schoolCalendarTodayIso } from '@/lib/schoolCalendarDate';
import { fetchAdminDesignDashboardKpis } from '@/pages/admin/api/fetchAdminDesignDashboardKpis';
import { fetchAccountantDashboardMetrics } from '@/lib/accountantDashboardMetrics';
import { invalidateAllFinancialQueries, broadcastFinanceUpdate } from '@/lib/realtimeFinanceSync';
import ExpenseApprovalModal, { type ExpenseApprovalData } from '@/components/accountant/ExpenseApprovalModal';
import {
  GraduationCap,
  Users,
  ClipboardCheck,
  FileText,
  RefreshCw,
  Plus,
  ArrowRight,
  ExternalLink,
  BookOpen,
  School,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  CreditCard,
  Activity,
  Bell,
  Check,
  X,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import '@/styles/government-system.css';

interface GovernmentAdminDashboardProps {
  schoolId: string;
  adminName: string;
}

interface ApplicationRow {
  id: string;
  application_number: string;
  full_name: string;
  programs: string[] | string | null;
  admitted_program?: string | null;
  status: string;
  created_at: string;
  phone?: string | null;
}

interface StudentRow {
  student_id: string;
  name: string;
  current_class: string | null;
  status: string | null;
}

function fmtMoney(num?: number | null) {
  if (num == null || isNaN(num)) return 'UGX 0';
  return 'UGX ' + Math.round(num).toLocaleString('en-US');
}

function formatCardDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).toUpperCase();
  } catch {
    return iso;
  }
}

function formatTimeAgo(iso?: string | null) {
  if (!iso) return '';
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return '';
  }
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function GovernmentAdminDashboard({
  schoolId,
  adminName,
}: GovernmentAdminDashboardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [approvalExpense, setApprovalExpense] = useState<ExpenseApprovalData | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [processingExpenseId, setProcessingExpenseId] = useState<string | null>(null);

  const todayIso = schoolCalendarTodayIso();

  // 1. Fetch Core KPIs (Students, Teachers, Attendance, Classes, Finance)
  const {
    data: kpiData,
    isLoading: kpisLoading,
    refetch: refetchKpis,
  } = useQuery({
    queryKey: ['admin-dashboard-kpis-gov', schoolId],
    queryFn: () => fetchAdminDesignDashboardKpis(schoolId),
    enabled: !!schoolId,
    staleTime: 30000,
  });

  // 2. Fetch Admissions Queue & Intake Summary Metrics
  const {
    data: intakeData,
    isLoading: intakeLoading,
    refetch: refetchIntake,
  } = useQuery({
    queryKey: ['admin-intake-metrics-gov', schoolId],
    queryFn: async () => {
      const studentsRes = await supabase
        .from('students')
        .select('student_id, current_class, status', { count: 'exact' })
        .eq('school_id', schoolId);

      const pendingAppsRes = await supabase
        .from('admission_applications')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .in('status', ['submitted', 'under_review', 'pending']);

      const startOfToday = `${todayIso}T00:00:00.000Z`;
      const approvedTodayRes = await supabase
        .from('admission_applications')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .in('status', ['admitted', 'enrolled', 'approved'])
        .gte('created_at', startOfToday);

      const rejectedRes = await supabase
        .from('admission_applications')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('status', 'rejected');

      const studentRows = (studentsRes.data || []) as StudentRow[];
      const progCounts: Record<string, number> = {
        'Certificate in Nursing (CN)': 0,
        'Diploma in Nursing (DN)': 0,
        'Certificate in Midwifery (CM)': 0,
        'Diploma in Midwifery (DM)': 0,
        'Other / General': 0,
      };

      for (const row of studentRows) {
        const cls = String(row.current_class || '').toLowerCase();
        if (cls.includes('cert') && cls.includes('nurs')) {
          progCounts['Certificate in Nursing (CN)']++;
        } else if (cls.includes('dip') && cls.includes('nurs')) {
          progCounts['Diploma in Nursing (DN)']++;
        } else if (cls.includes('cert') && cls.includes('midw')) {
          progCounts['Certificate in Midwifery (CM)']++;
        } else if (cls.includes('dip') && cls.includes('midw')) {
          progCounts['Diploma in Midwifery (DM)']++;
        } else {
          progCounts['Other / General']++;
        }
      }

      return {
        totalRegistrations: studentsRes.count ?? studentRows.length,
        pendingApplications: pendingAppsRes.count ?? 0,
        approvedToday: approvedTodayRes.count ?? 0,
        rejectedYesterday: rejectedRes.count ?? 0,
        programCounts: progCounts,
      };
    },
    enabled: !!schoolId,
    staleTime: 30000,
  });

  // 3. Fetch Recent Registrations & Admissions Queue (Live Database Records - Max 5)
  interface UnifiedQueueItem {
    id: string;
    refNumber: string;
    fullName: string;
    programTitle: string;
    createdAt: string;
    status: string;
    type: 'registration' | 'application';
    actionLink: string;
    actionText: string;
  }

  const {
    data: recentQueueItems,
    isLoading: queueLoading,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: ['admin-recent-queue-gov', schoolId],
    queryFn: async () => {
      const [studentsRes, appsRes] = await Promise.all([
        supabase
          .from('students')
          .select('student_id, name, first_name, middle_name, last_name, admission_number, current_class, status, created_at, enrollment_date, admission_date')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('admission_applications')
          .select('id, application_number, full_name, programs, admitted_program, status, created_at, phone')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      const items: UnifiedQueueItem[] = [];

      for (const s of (studentsRes.data || []) as any[]) {
        const nameParts = [s.first_name, s.middle_name, s.last_name]
          .filter((x) => x != null && String(x).trim())
          .map((x) => String(x).trim());
        const resolvedName = nameParts.length > 0 ? nameParts.join(' ') : (s.name && String(s.name).trim()) || 'Registered Trainee';

        items.push({
          id: s.student_id,
          refNumber: s.admission_number || `STU-${s.student_id.slice(0, 6).toUpperCase()}`,
          fullName: resolvedName,
          programTitle: s.current_class || 'Nursing / Midwifery',
          createdAt: s.created_at || s.enrollment_date || s.admission_date,
          status: s.status || 'Active',
          type: 'registration',
          actionLink: `/dashboard/admin/students/${s.student_id}`,
          actionText: 'Dossier',
        });
      }

      for (const a of (appsRes.data || []) as any[]) {
        let prog = a.admitted_program;
        if (!prog && Array.isArray(a.programs) && a.programs.length > 0) prog = a.programs[0];
        if (!prog && typeof a.programs === 'string') prog = a.programs;
        items.push({
          id: a.id,
          refNumber: a.application_number || `APP-${a.id.slice(0, 6).toUpperCase()}`,
          fullName: a.full_name || 'Applicant',
          programTitle: prog || 'Admissions Intake',
          createdAt: a.created_at,
          status: a.status || 'Pending',
          type: 'application',
          actionLink: '/dashboard/admin/admissions',
          actionText: 'Review',
        });
      }

      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return items.slice(0, 5);
    },
    enabled: !!schoolId,
    staleTime: 20000,
  });

  // 4. Fetch Staff Overview (Faculty / Tutors)
  const {
    data: staffList,
    isLoading: staffLoading,
    refetch: refetchStaff,
  } = useQuery({
    queryKey: ['admin-staff-overview-gov', schoolId],
    queryFn: async () => {
      const { data } = await supabase
        .from('teachers')
        .select('teacher_id, name, email')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })
        .limit(5);
      return (data || []) as Array<{ teacher_id: string; name: string; email: string }>;
    },
    enabled: !!schoolId,
    staleTime: 30000,
  });

  // 5. Fetch Pending Expense Approvals & Cash Position
  const {
    data: expensesData,
    isLoading: expensesLoading,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ['admin-pending-expenses-gov', schoolId],
    queryFn: async () => {
      const [expensesRes, countRes, metrics] = await Promise.all([
        supabase
          .from('school_expenses')
          .select('expense_id, category_name, description, amount, created_at, status')
          .eq('school_id', schoolId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('school_expenses')
          .select('expense_id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'pending'),
        fetchAccountantDashboardMetrics(supabase, schoolId, todayIso).catch(() => null),
      ]);
      return {
        expenses: (expensesRes.data || []) as any[],
        count: countRes.count ?? (expensesRes.data?.length || 0),
        metrics,
      };
    },
    enabled: !!schoolId,
    staleTime: 20000,
  });

  // 6. Fetch Recent Payments
  const {
    data: paymentsList,
    isLoading: paymentsLoading,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ['admin-recent-payments-gov', schoolId],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_payments')
        .select('payment_id, amount_paid, payment_date, payment_method, student_id, created_at, students(name)')
        .eq('school_id', schoolId)
        .is('reversed_at', null)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);
      return (data || []) as any[];
    },
    enabled: !!schoolId,
    staleTime: 20000,
  });

  // 7. Fetch Upcoming Events
  const {
    data: upcomingEvents,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ['admin-upcoming-events-gov', schoolId],
    queryFn: async () => {
      const { data } = await supabase
        .from('school_events')
        .select('id:event_id, title, event_date, event_type, description')
        .eq('school_id', schoolId)
        .gte('event_date', todayIso)
        .order('event_date', { ascending: true })
        .limit(5);
      return (data || []) as any[];
    },
    enabled: !!schoolId,
    staleTime: 30000,
  });

  // 8. Fetch Recent Activities (Audit Stream)
  const {
    data: recentActivities,
    isLoading: activitiesLoading,
    refetch: refetchActivities,
  } = useQuery({
    queryKey: ['admin-recent-activity-gov', schoolId],
    queryFn: async () => {
      const [payRes, expRes, stuRes] = await Promise.all([
        supabase
          .from('student_payments')
          .select('payment_id, amount_paid, payment_date, created_at, students(name)')
          .eq('school_id', schoolId)
          .is('reversed_at', null)
          .order('created_at', { ascending: false })
          .limit(4),
        supabase
          .from('school_expenses')
          .select('expense_id, category_name, description, amount, status, created_at')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(4),
        supabase
          .from('students')
          .select('student_id, name, current_class, created_at')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(4),
      ]);

      type Act = { id: string; title: string; sub: string; time: string; link: string };
      const list: Act[] = [];

      for (const p of (payRes.data || []) as any[]) {
        const stName = p.students?.name || 'Trainee';
        list.push({
          id: p.payment_id,
          title: `Payment Received: UGX ${Number(p.amount_paid || 0).toLocaleString()}`,
          sub: `Paid by ${stName}`,
          time: p.created_at || p.payment_date,
          link: '/dashboard/admin/finance',
        });
      }
      for (const e of (expRes.data || []) as any[]) {
        list.push({
          id: e.expense_id,
          title: `Expense ${String(e.status || 'recorded').toUpperCase()}: UGX ${Number(e.amount || 0).toLocaleString()}`,
          sub: e.description || e.category_name || 'Operational expense',
          time: e.created_at,
          link: '/dashboard/accountant/expenses',
        });
      }
      for (const s of (stuRes.data || []) as any[]) {
        list.push({
          id: s.student_id,
          title: `Trainee Registered: ${s.name || 'New Trainee'}`,
          sub: `Enrolled in ${s.current_class || 'Nursing Program'}`,
          time: s.created_at,
          link: `/dashboard/admin/students/${s.student_id}`,
        });
      }

      list.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
      return list.slice(0, 6);
    },
    enabled: !!schoolId,
    staleTime: 20000,
  });

  // 9. Fetch Reminders & System Notifications
  const {
    data: remindersList,
    isLoading: remindersLoading,
    refetch: refetchReminders,
  } = useQuery({
    queryKey: ['admin-reminders-gov', schoolId],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('notification_id, title, message, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(4);
      return (data || []) as any[];
    },
    enabled: !!schoolId,
    staleTime: 20000,
  });

  const handleRefreshAll = () => {
    void refetchKpis();
    void refetchIntake();
    void refetchQueue();
    void refetchStaff();
    void refetchExpenses();
    void refetchPayments();
    void refetchEvents();
    void refetchActivities();
    void refetchReminders();
  };

  const handleQuickApproveExpense = async (expenseId: string, amount: number) => {
    setProcessingExpenseId(expenseId);
    try {
      const { error } = await supabase
        .from('school_expenses')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('expense_id', expenseId);
      if (!error) {
        await invalidateAllFinancialQueries(queryClient, schoolId);
        broadcastFinanceUpdate({ schoolId, type: 'expense', id: expenseId, status: 'approved', amount });
        void refetchExpenses();
        void refetchKpis();
      }
    } finally {
      setProcessingExpenseId(null);
    }
  };

  const handleQuickDeclineExpense = async (expenseId: string) => {
    setProcessingExpenseId(expenseId);
    try {
      const { error } = await supabase
        .from('school_expenses')
        .update({ status: 'declined', approved_at: new Date().toISOString() })
        .eq('expense_id', expenseId);
      if (!error) {
        await invalidateAllFinancialQueries(queryClient, schoolId);
        broadcastFinanceUpdate({ schoolId, type: 'expense', id: expenseId, status: 'declined' });
        void refetchExpenses();
        void refetchKpis();
      }
    } finally {
      setProcessingExpenseId(null);
    }
  };

  const getStatusTag = (status: string) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('admit') || s.includes('enrolled') || s.includes('active') || s.includes('approved')) {
      return <span className="gov-tag gov-tag-approved">APPROVED</span>;
    }
    if (s.includes('pending') || s.includes('submitted') || s.includes('review')) {
      return <span className="gov-tag gov-tag-pending">PENDING</span>;
    }
    if (s.includes('reject') || s.includes('failed')) {
      return <span className="gov-tag gov-tag-rejected">REJECTED</span>;
    }
    return <span className="gov-tag">{status.toUpperCase()}</span>;
  };

  const parseProgramTitle = (app: ApplicationRow) => {
    if (app.admitted_program) return app.admitted_program;
    if (Array.isArray(app.programs) && app.programs.length > 0) return app.programs[0];
    if (typeof app.programs === 'string') return app.programs;
    return 'Nursing & Midwifery';
  };

  const netCashSurplus = expensesData?.metrics?.schoolCashPosition?.netCashSurplus ?? 0;
  const approvedExpensesTotal = expensesData?.metrics?.termPerformance?.expensesApproved ?? 0;

  return (
    <div className="space-y-4">
      {/* ── 1. INSTITUTIONAL MASTHEAD HEADER ── */}
      <section className="gov-masthead rounded-xl border border-slate-300 bg-white p-3.5 shadow-sm">
        <div className="gov-masthead-left">
          <div>
            <h1 className="gov-title-main text-base sm:text-lg font-bold text-slate-900 tracking-wide">
              ADMINISTRATOR DASHBOARD
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="gov-masthead-meta">
            <span>DATE: {formatCardDate(todayIso)}</span>
            <span>ADMIN: {adminName || 'COMMAND'}</span>
          </div>
          <button
            type="button"
            className="gov-btn gov-btn-sm rounded-lg"
            onClick={handleRefreshAll}
            title="Refresh System Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* ── 2. OPERATIONAL OVERVIEW ── */}
      <div className="border border-slate-300 rounded-xl bg-white p-4 shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3 font-sans">
          Operational Overview
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Students */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-600 uppercase font-bold">
              <span>Total Students</span>
              <GraduationCap className="w-4 h-4 text-slate-800" />
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900 my-1.5">
              {kpisLoading ? '—' : (kpiData?.totalStudents ?? intakeData?.totalRegistrations ?? 0)}
            </div>
            <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200">
              Active enrolled trainees
            </div>
          </div>

          {/* Card 2: Total Teachers / Tutors */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-600 uppercase font-bold">
              <span>Total Tutors &amp; Faculty</span>
              <BookOpen className="w-4 h-4 text-slate-800" />
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900 my-1.5">
              {kpisLoading ? '—' : (kpiData?.totalTeachers ?? 0)}
            </div>
            <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200">
              Instructors &amp; clinical staff
            </div>
          </div>

          {/* Card 3: Attendance Today */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-600 uppercase font-bold">
              <span>Attendance Today</span>
              <CheckCircle className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900 my-1.5">
              {kpisLoading ? '—' : `${kpiData?.attendancePercent ?? 0}%`}
            </div>
            <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200">
              {kpiData?.presentCount ?? 0} Present · {kpiData?.absentCount ?? 0} Absent
            </div>
          </div>

          {/* Card 4: Active Classes & Practicums */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-600 uppercase font-bold">
              <span>Active Classes</span>
              <School className="w-4 h-4 text-slate-800" />
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900 my-1.5">
              {kpisLoading ? '—' : (kpiData?.activeClasses ?? 0)}
            </div>
            <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200">
              {kpiData?.ongoingClassesCount ?? 0} Ongoing timetable sessions
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. INTAKE & REGISTRATION METRICS ── */}
      <section className="gov-metrics-grid" aria-label="Registration Metrics">
        <div className="gov-metric-box rounded-xl border border-slate-300 p-4 bg-white shadow-sm">
          <div className="gov-metric-label">
            <span>Total Registrations</span>
            <Users className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="gov-metric-value text-slate-900">
            {intakeLoading ? '—' : (intakeData?.totalRegistrations ?? 0).toLocaleString()}
          </div>
          <div className="gov-metric-subtext border-slate-200 text-slate-500">
            Formally registered students
          </div>
        </div>

        <div className="gov-metric-box rounded-xl border border-slate-300 p-4 bg-white shadow-sm">
          <div className="gov-metric-label">
            <span>Pending Applications</span>
            <Clock className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="gov-metric-value text-slate-900">
            {intakeLoading ? '—' : (intakeData?.pendingApplications ?? 0).toLocaleString()}
          </div>
          <div className="gov-metric-subtext border-slate-200 text-slate-500">
            Awaiting administrative review
          </div>
        </div>

        <div className="gov-metric-box rounded-xl border border-slate-300 p-4 bg-white shadow-sm">
          <div className="gov-metric-label">
            <span>Approved Today</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="gov-metric-value text-slate-900">
            {intakeLoading ? '—' : (intakeData?.approvedToday ?? 0).toLocaleString()}
          </div>
          <div className="gov-metric-subtext border-slate-200 text-slate-500">
            Approved admissions today
          </div>
        </div>

        <div className="gov-metric-box rounded-xl border border-slate-300 p-4 bg-white shadow-sm">
          <div className="gov-metric-label">
            <span>Rejected / On Hold</span>
            <XCircle className="w-3.5 h-3.5 text-rose-700" />
          </div>
          <div className="gov-metric-value text-slate-900">
            {intakeLoading ? '—' : (intakeData?.rejectedYesterday ?? 0).toLocaleString()}
          </div>
          <div className="gov-metric-subtext border-slate-200 text-slate-500">
            Incomplete or rejected entries
          </div>
        </div>
      </section>

      {/* ── 4. CURRENT TERM FINANCIAL PERFORMANCE ── */}
      <div className="border border-slate-300 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 font-sans">
            Current Term Finance &amp; Collections
          </span>
          <span className="gov-tag text-[9px] rounded">
            {kpiData?.currentTermLabel || 'CURRENT TERM'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Invoiced Expected Fees</div>
            <div className="font-mono font-bold text-sm text-slate-900 mt-1">
              {kpisLoading ? '—' : fmtMoney(kpiData?.feesExpected)}
            </div>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Collected Attributed</div>
            <div className="font-mono font-bold text-sm text-emerald-700 mt-1">
              {kpisLoading ? '—' : fmtMoney(kpiData?.feesCollectedAttributed)}
            </div>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Outstanding Balances</div>
            <div className="font-mono font-bold text-sm text-rose-700 mt-1">
              {kpisLoading ? '—' : fmtMoney(kpiData?.outstandingOnTerm)}
            </div>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Collection Clearance Rate</div>
            <div className="font-mono font-bold text-sm text-slate-900 mt-1">
              {kpisLoading ? '—' : `${kpiData?.collectionRatePercent ?? 0}%`}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. CORE ADMINISTRATIVE HUB (REGISTRATIONS QUEUE, EXPENSES, PROGRAMS, UTILITIES) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Recent Registrations & Admissions Queue + Pending Expenses */}
        <div className="lg:col-span-2 space-y-4">
          {/* Card: Recent Registrations & Admissions Queue (Strictly max 5 items) */}
          <div className="gov-card rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden mb-0">
            <div className="gov-card-header px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <h2 className="gov-card-title flex items-center gap-2 text-slate-900 font-bold">
                <ClipboardCheck className="w-4 h-4 text-slate-700" />
                Recent Registrations &amp; Admissions Queue
              </h2>
              <button
                type="button"
                className="gov-card-action text-slate-600 hover:text-slate-900"
                onClick={() => navigate('/dashboard/admin/students')}
              >
                View all →
              </button>
            </div>

            <div className="gov-table-container border-0 rounded-none">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Ref / Reg ID</th>
                    <th>Applicant / Student Name</th>
                    <th>Program / Stage</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queueLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500 font-mono text-xs">
                        Loading system records...
                      </td>
                    </tr>
                  ) : !recentQueueItems || recentQueueItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500 font-mono text-xs">
                        No recent registration records found.
                      </td>
                    </tr>
                  ) : (
                    recentQueueItems.map((item) => (
                      <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="font-mono font-bold text-[11px] whitespace-nowrap">
                          {item.refNumber}
                        </td>
                        <td className="font-semibold text-slate-900">
                          {item.fullName}
                        </td>
                        <td className="text-[11px] text-slate-600">
                          {item.programTitle}
                        </td>
                        <td className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {formatCardDate(item.createdAt)}
                        </td>
                        <td className="whitespace-nowrap">
                          {getStatusTag(item.status)}
                        </td>
                        <td className="whitespace-nowrap">
                          <button
                            type="button"
                            className="gov-btn gov-btn-sm rounded-md"
                            onClick={() => navigate(item.actionLink)}
                            title={item.actionText}
                          >
                            <span>{item.actionText}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card: Pending Expense Approvals (Placed under Registrations Queue) */}
          <div className="gov-card rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden mb-0">
            <div className="gov-card-header px-4 py-3 bg-slate-50/80 border-b border-slate-200">
              <h2 className="gov-card-title flex items-center gap-2 text-slate-900 font-bold">
                <FileText className="w-4 h-4 text-slate-700" />
                Pending Expense Approvals
              </h2>
              <span className={`gov-tag text-[10px] rounded ${expensesData?.count ? 'gov-tag-pending' : ''}`}>
                {expensesLoading ? '...' : `${expensesData?.count ?? 0} PENDING`}
              </span>
            </div>

            <div className="p-3">
              {expensesLoading ? (
                <div className="py-6 text-center text-xs text-slate-500">Loading pending expenses...</div>
              ) : !expensesData?.expenses || expensesData.expenses.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">No pending expenses to review.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {expensesData.expenses.map((exp: any) => (
                    <div
                      key={exp.expense_id}
                      className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/70 px-1 rounded-md transition-colors"
                    >
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => {
                          setApprovalExpense(exp);
                          setApprovalModalOpen(true);
                        }}
                      >
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {exp.description || exp.category_name || 'Expense'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{exp.category_name || 'Operational'}</span>
                          <span>•</span>
                          <span className="font-mono">{formatCardDate(exp.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-xs font-mono font-bold text-slate-900">
                          UGX {Number(exp.amount || 0).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-md transition-colors"
                            disabled={processingExpenseId === exp.expense_id}
                            onClick={() => handleQuickApproveExpense(exp.expense_id, Number(exp.amount || 0))}
                            title="Quick Approve"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 rounded-md transition-colors"
                            disabled={processingExpenseId === exp.expense_id}
                            onClick={() => handleQuickDeclineExpense(exp.expense_id)}
                            title="Quick Decline"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-3.5 py-2.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
              <span>
                Net Cash Surplus: <strong className={netCashSurplus >= 0 ? 'text-emerald-700' : 'text-rose-700'}>UGX {Math.round(netCashSurplus).toLocaleString()}</strong>
              </span>
              <span>
                Approved: <strong className="text-slate-900">UGX {Math.round(approvedExpensesTotal).toLocaleString()}</strong>
              </span>
            </div>

            <div className="p-3 bg-white border-t border-slate-200">
              <button
                type="button"
                className="gov-btn w-full justify-center text-xs rounded-lg shadow-sm"
                onClick={() => navigate('/dashboard/accountant/expenses')}
              >
                View All Expenses Ledger
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Program Breakdown & Administrative Utilities */}
        <div className="space-y-4">
          {/* Card: Program Enrollment Breakdown */}
          <div className="gov-card rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden mb-0">
            <div className="gov-card-header px-4 py-3 bg-slate-50/80 border-b border-slate-200">
              <h2 className="gov-card-title flex items-center gap-2 text-slate-900 font-bold">
                <GraduationCap className="w-4 h-4 text-slate-700" />
                Program Enrollment Breakdown
              </h2>
            </div>
            <div className="gov-table-container border-0 rounded-none">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Program Title</th>
                    <th className="text-right">Trainees</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-medium text-slate-800">Certificate in Nursing (CN)</td>
                    <td className="text-right font-mono font-bold text-slate-900">
                      {intakeData?.programCounts['Certificate in Nursing (CN)'] ?? 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium text-slate-800">Diploma in Nursing (DN)</td>
                    <td className="text-right font-mono font-bold text-slate-900">
                      {intakeData?.programCounts['Diploma in Nursing (DN)'] ?? 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium text-slate-800">Certificate in Midwifery (CM)</td>
                    <td className="text-right font-mono font-bold text-slate-900">
                      {intakeData?.programCounts['Certificate in Midwifery (CM)'] ?? 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium text-slate-800">Diploma in Midwifery (DM)</td>
                    <td className="text-right font-mono font-bold text-slate-900">
                      {intakeData?.programCounts['Diploma in Midwifery (DM)'] ?? 0}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium text-slate-800">General / Unassigned</td>
                    <td className="text-right font-mono font-bold text-slate-900">
                      {intakeData?.programCounts['Other / General'] ?? 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Card: Administrative Utilities */}
          <div className="gov-card rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden mb-0">
            <div className="gov-card-header px-4 py-3 bg-slate-50/80 border-b border-slate-200">
              <h2 className="gov-card-title flex items-center gap-2 text-slate-900 font-bold">
                <FileText className="w-4 h-4 text-slate-700" />
                Administrative Utilities
              </h2>
            </div>
            <div className="p-3.5 space-y-2">
              <button
                type="button"
                className="gov-btn w-full justify-between rounded-lg"
                onClick={() => navigate('/dashboard/admin/students/add')}
              >
                <span>Add New Student Profile</span>
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="gov-btn w-full justify-between rounded-lg"
                onClick={() => navigate('/dashboard/admin/admissions')}
              >
                <span>Review Admissions &amp; Intake</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="gov-btn w-full justify-between rounded-lg"
                onClick={() => navigate('/dashboard/accountant')}
              >
                <span>Institutional Fees &amp; Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="gov-btn w-full justify-between rounded-lg"
                onClick={() => navigate('/dashboard/admin/staff')}
              >
                <span>Faculty &amp; Staff Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="gov-btn w-full justify-between rounded-lg"
                onClick={() => navigate('/dashboard/admin/headed-paper')}
              >
                <span>Official Headed Paper &amp; Notices</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. RECENT PAYMENTS + UPCOMING EVENTS + RECENT ACTIVITY (3 COLUMNS) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Col 1: Recent Payments */}
        <div className="gov-card rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden mb-0">
          <div className="gov-card-header px-4 py-3 bg-slate-50/80 border-b border-slate-200">
            <h2 className="gov-card-title flex items-center gap-2 text-slate-900 font-bold">
              <CreditCard className="w-4 h-4 text-slate-700" />
              Recent Payments
            </h2>
            <button
              type="button"
              className="gov-card-action text-slate-600 hover:text-slate-900"
              onClick={() => navigate('/dashboard/admin/finance')}
            >
              View all →
            </button>
          </div>
          <div className="p-3">
            {paymentsLoading ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading payments...</div>
            ) : !paymentsList || paymentsList.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">No recent payments recorded.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {paymentsList.map((p) => {
                  const studentName = p.students?.name || 'Trainee';
                  return (
                    <div key={p.payment_id} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{studentName}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-mono">
                          <span>{formatCardDate(p.payment_date || p.created_at)}</span>
                          <span>•</span>
                          <span className="uppercase">{p.payment_method || 'CASH'}</span>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-emerald-700 whitespace-nowrap">
                        UGX {Number(p.amount_paid || 0).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Col 2: Upcoming Events */}
        <div className="gov-card rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden mb-0">
          <div className="gov-card-header px-4 py-3 bg-slate-50/80 border-b border-slate-200">
            <h2 className="gov-card-title flex items-center gap-2 text-slate-900 font-bold">
              <Calendar className="w-4 h-4 text-slate-700" />
              Upcoming Events
            </h2>
            <button
              type="button"
              className="gov-card-action text-slate-600 hover:text-slate-900"
              onClick={() => navigate('/dashboard/admin/settings/events')}
            >
              View all →
            </button>
          </div>
          <div className="p-3">
            {eventsLoading ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading events...</div>
            ) : !upcomingEvents || upcomingEvents.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">No upcoming events scheduled.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingEvents.map((ev) => {
                  const d = new Date(ev.event_date + 'T00:00:00');
                  const day = String(d.getDate()).padStart(2, '0');
                  const mon = d.toLocaleString('en', { month: 'short' }).toUpperCase();
                  return (
                    <div key={ev.id} className="py-2 flex items-start gap-2.5 text-xs">
                      <div className="w-8 border border-slate-300 rounded bg-slate-100 text-center py-0.5 shrink-0">
                        <div className="font-mono font-bold text-xs leading-none text-slate-900">{day}</div>
                        <div className="font-mono text-[9px] text-slate-500 uppercase">{mon}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">{ev.title}</div>
                        {ev.description && (
                          <div className="text-[10px] text-slate-500 truncate">{ev.description}</div>
                        )}
                      </div>
                      <span className="gov-tag text-[9px] uppercase shrink-0 rounded">
                        {ev.event_type || 'EVENT'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Col 3: Recent Activity */}
        <div className="gov-card rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden mb-0">
          <div className="gov-card-header px-4 py-3 bg-slate-50/80 border-b border-slate-200">
            <h2 className="gov-card-title flex items-center gap-2 text-slate-900 font-bold">
              <Activity className="w-4 h-4 text-slate-700" />
              Recent Activity
            </h2>
            <button
              type="button"
              className="gov-card-action text-slate-600 hover:text-slate-900"
              onClick={() => navigate('/dashboard/admin/notifications')}
            >
              All →
            </button>
          </div>
          <div className="p-3">
            {activitiesLoading ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading activity stream...</div>
            ) : !recentActivities || recentActivities.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">No recent activities logged.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="py-2 flex items-start justify-between gap-2 text-xs hover:bg-slate-50/70 rounded px-1 transition-colors cursor-pointer"
                    onClick={() => navigate(act.link)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 truncate">{act.title}</div>
                      <div className="text-[10px] text-slate-500 truncate">{act.sub}</div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 shrink-0">
                      {formatTimeAgo(act.time)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 7. REMINDERS & NOTICES STRIP ── */}
      <div className="gov-card rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden">
        <div className="gov-card-header px-4 py-3 bg-slate-50/80 border-b border-slate-200">
          <h2 className="gov-card-title flex items-center gap-2 text-slate-900 font-bold">
            <Bell className="w-4 h-4 text-slate-700" />
            Reminders &amp; Administrative Notices
          </h2>
          <button
            type="button"
            className="gov-card-action text-slate-600 hover:text-slate-900"
            onClick={() => navigate('/dashboard/admin/notifications')}
          >
            View All Notifications →
          </button>
        </div>
        <div className="p-3.5">
          {remindersLoading ? (
            <div className="py-4 text-center text-xs text-slate-500">Checking notices...</div>
          ) : !remindersList || remindersList.length === 0 ? (
            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/60 flex items-center gap-2 text-xs text-slate-600">
              <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>All caught up! No urgent reminders or pending notices.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {remindersList.map((n) => (
                <div
                  key={n.notification_id}
                  className="p-3 border border-amber-200 rounded-lg bg-amber-50/60 flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">{n.title || 'Notice'}</div>
                    <div className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{n.message || ''}</div>
                    <div className="text-[9px] font-mono text-slate-400 mt-1">{formatTimeAgo(n.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 8. STAFF OVERVIEW (LAST SECTION ON THE DASHBOARD) ── */}
      <div className="gov-card rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden">
        <div className="gov-card-header px-4 py-3 bg-slate-50/80 border-b border-slate-200">
          <h2 className="gov-card-title flex items-center gap-2 text-slate-900 font-bold">
            <Users className="w-4 h-4 text-slate-700" />
            Staff Overview
          </h2>
          <button
            type="button"
            className="gov-card-action text-slate-600 hover:text-slate-900"
            onClick={() => navigate('/dashboard/admin/teachers')}
          >
            View all →
          </button>
        </div>
        <div className="p-3.5">
          {staffLoading ? (
            <div className="py-6 text-center text-xs text-slate-500">Loading staff records...</div>
          ) : !staffList || staffList.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">No tutors or staff found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {staffList.map((t) => (
                <div
                  key={t.teacher_id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col justify-between hover:bg-slate-100/70 transition-colors cursor-pointer"
                  onClick={() => navigate(`/dashboard/admin/teachers`)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-mono font-bold text-xs text-slate-900 shrink-0 shadow-xs">
                      {initialsFromName(t.name || 'Tutor')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">{t.name || '—'}</div>
                      <div className="text-[11px] text-slate-500 truncate">{t.email || 'Faculty'}</div>
                    </div>
                  </div>
                  <div className="pt-2 mt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="gov-tag text-[9px] rounded">TEACHING</span>
                    <span className="text-[10px] text-slate-400 font-medium">Instructor</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500">
            Faculty &amp; instruction directory
          </span>
          <button
            type="button"
            className="gov-btn gov-btn-sm rounded-lg"
            onClick={() => navigate('/dashboard/admin/teachers')}
          >
            Manage Instructors
          </button>
        </div>
      </div>

      {/* ── EXPENSE APPROVAL MODAL ── */}
      {approvalModalOpen && approvalExpense && (
        <ExpenseApprovalModal
          open={approvalModalOpen}
          onClose={() => {
            setApprovalModalOpen(false);
            setApprovalExpense(null);
          }}
          expense={approvalExpense}
          onSuccess={() => {
            setApprovalModalOpen(false);
            setApprovalExpense(null);
            void refetchExpenses();
            void refetchKpis();
          }}
        />
      )}

      {/* ── ADD STUDENT MODAL (CLEAN PAPER FORM) ── */}
      {addStudentModalOpen && (
        <div className="gov-modal-backdrop" onClick={() => setAddStudentModalOpen(false)}>
          <div
            className="gov-modal-container max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gov-modal-header">
              <div>
                <div className="text-[10px] font-mono uppercase text-[#555555]">
                  RCSN • INSTITUTIONAL REGISTRY
                </div>
                <div className="text-sm font-bold text-[#111111] uppercase">
                  New Trainee Registration Form
                </div>
              </div>
              <button
                type="button"
                className="gov-btn gov-btn-sm"
                onClick={() => setAddStudentModalOpen(false)}
              >
                Cancel / Close [ESC]
              </button>
            </div>
            <div className="gov-modal-body p-0">
              <AddStudentForm
                mode="modal"
                onCompleted={() => {
                  setAddStudentModalOpen(false);
                  handleRefreshAll();
                }}
                onCancel={() => setAddStudentModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
