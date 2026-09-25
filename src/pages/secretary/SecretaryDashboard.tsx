import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { getOfflineStudents, getOfflineTeachers } from '../../lib/offlineDb';
import NativeModal from '../../components/NativeModal';
import { AddStudentForm } from '../admin/students/AddStudentForm';
import { AddTeacherForm } from '../admin/teachers/AddTeacherForm';
import { AddParentForm } from '../admin/parents/AddParentForm';
import {
  GraduationCap,
  Users,
  Briefcase,
  UserCheck,
  FileText,
  ClipboardCheck,
  Wallet,
  CheckCircle2,
  Sparkles,
  Bell,
  ArrowRight,
  Clock,
  ChevronRight,
  Plus,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';
import { getGreetingLastName } from '../../lib/roleTerminology';

type SecModal = 'student' | 'teacher' | 'parent' | null;

const SEC = '/dashboard/secretary';

interface Stats {
  totalStudents: number;
  presentToday: number;
  newAdmissionsMonth: number;
  pendingApprovals: number;
  outstandingDebtorsCount: number;
  visitorsToday: number;
}

interface RecentAdmission {
  student_id: string;
  name: string;
  current_class: string;
  created_at: string;
  admission_number: string;
}

interface RecentVisitor {
  id: string;
  visitor_name: string;
  purpose: string;
  host_name: string;
  check_in_time: string;
  check_out_time: string | null;
}

interface Notification {
  notification_id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

async function fetchSecretaryDashboard(schoolId: string) {
  if (!navigator.onLine) {
    const [students, teachers] = await Promise.all([
      getOfflineStudents(schoolId),
      getOfflineTeachers(schoolId),
    ]);
    return {
      stats: {
        totalStudents: students.length,
        presentToday: 0,
        newAdmissionsMonth: 0,
        pendingApprovals: 0,
        outstandingDebtorsCount: 0,
        visitorsToday: 0,
      } as Stats,
      notifications: [] as Notification[],
      recentAdmissions: [] as RecentAdmission[],
      recentVisitors: [] as RecentVisitor[],
      _offline: true,
    };
  }

  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [studentsRes, absentRes, newAdmissionsRes, debtorsRes, visitorsRes, notifsRes, recentAdmissionsRes, recentVisitorsRes] = await Promise.all([
    supabase.from('students').select('student_id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
    supabase.from('student_attendance').select('attendance_id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('attendance_date', today).eq('present', true),
    supabase.from('students').select('student_id', { count: 'exact', head: true }).eq('school_id', schoolId).gte('created_at', monthStart),
    supabase.from('student_balances').select('student_id', { count: 'exact', head: true }).eq('school_id', schoolId).gt('balance', 0),
    supabase.from('visitor_log').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).gte('check_in_time', today).lte('check_in_time', today + 'T23:59:59'),
    supabase.from('notifications').select('notification_id, title, message, created_at, is_read').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(5),
    supabase.from('students').select('student_id, name, current_class, created_at, admission_number').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(5),
    supabase.from('visitor_log').select('id, visitor_name, purpose, host_name, check_in_time, check_out_time').eq('school_id', schoolId).order('check_in_time', { ascending: false }).limit(6),
  ]);

  const stats: Stats = {
    totalStudents: studentsRes.count ?? 0,
    presentToday: absentRes.count ?? 0,
    newAdmissionsMonth: newAdmissionsRes.count ?? 0,
    pendingApprovals: 0,
    outstandingDebtorsCount: debtorsRes.count ?? 0,
    visitorsToday: visitorsRes.count ?? 0,
  };

  return {
    stats,
    notifications: (notifsRes.data ?? []) as Notification[],
    recentAdmissions: (recentAdmissionsRes.data ?? []) as RecentAdmission[],
    recentVisitors: (recentVisitorsRes.data ?? []) as RecentVisitor[],
  };
}

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return iso.slice(11, 16); }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SecretaryDashboard() {
  const navigate = useNavigate();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;
  const [secModal, setSecModal] = useState<SecModal>(null);
  const [userName, setUserName] = useState('Secretary');

  const closeSecModal = () => setSecModal(null);

  useEffect(() => {
    async function loadUser() {
      if (!user) return;
      const { data } = await supabase.from('users').select('name').eq('user_id', user.id).single();
      if (data?.name) {
        setUserName(getGreetingLastName(data.name, 'Secretary'));
      } else if (user.email) {
        setUserName(getGreetingLastName(user.email.split('@')[0], 'Secretary'));
      }
    }
    void loadUser();
  }, [user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const { data, isLoading } = useQuery({
    queryKey: ['secretary-dashboard', schoolId],
    queryFn: () => fetchSecretaryDashboard(schoolId!),
    enabled: !!schoolId,
    refetchInterval: 30_000,
  });

  const stats = data?.stats;
  const today = new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Categorized Quick Actions
  const actionGroups = [
    {
      category: 'Student Admissions',
      actions: [
        { label: 'Add Student', icon: GraduationCap, color: t.mint, onClick: () => setSecModal('student') },
        { label: 'Admission Form', icon: FileText, color: t.blue, onClick: () => navigate(`${SEC}/admission-form`) },
        { label: 'View Students', icon: Users, color: t.teal, onClick: () => navigate(`${SEC}/students`) },
      ],
    },
    {
      category: 'Staff & Contacts',
      actions: [
        { label: 'Add Parent', icon: UserPlus, color: t.mint, onClick: () => setSecModal('parent') },
        { label: 'Add Teacher', icon: Users, color: t.blue, onClick: () => setSecModal('teacher') },
        { label: 'Add Staff', icon: Briefcase, color: t.gold, onClick: () => navigate(`${SEC}/staff?add=1`) },
      ],
    },
    {
      category: 'Front Desk & Inquiries',
      actions: [
        { label: 'Log Visitor', icon: UserCheck, color: '#a855f7', onClick: () => navigate(`${SEC}/visitors`) },
        { label: 'Attendance Check', icon: ClipboardCheck, color: t.teal, onClick: () => navigate(`${SEC}/attendance`) },
        { label: 'Outstanding Inquiries', icon: Wallet, color: t.red, onClick: () => navigate(`${SEC}/finance/outstanding`) },
      ],
    },
  ];

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-none"
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
        fontFamily: INTER,
      }}
    >
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
              style={{
                backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                color: t.mint,
                fontFamily: SORA,
              }}
            >
              SECRETARY & REGISTRY DESK
            </span>
            <span className="text-xs" style={{ color: t.textLow }}>• {today}</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
            style={{ fontFamily: SORA, color: t.textHi }}
          >
            {greeting}, {userName}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
            Welcome to the front office control center. Manage admissions, visitors, contacts, and fee balance inquiries.
          </p>
        </div>
      </div>

      {/* Quick Action Matrix by Role & Workflow */}
      <div
        className="p-5 rounded-2xl shadow-sm"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: t.textLow, fontFamily: SORA }}>
          Quick Office Workflows
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {actionGroups.map((group) => (
            <div
              key={group.category}
              className="p-3.5 rounded-xl flex flex-col justify-between"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${t.divider}`,
              }}
            >
              <div className="text-[11px] font-semibold mb-2.5" style={{ color: t.textMid }}>
                {group.category}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {group.actions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.label}
                      type="button"
                      onClick={act.onClick}
                      className="p-2.5 rounded-xl flex flex-col items-center text-center gap-1.5 transition-all hover:scale-[1.03] active:scale-[0.98]"
                      style={{
                        backgroundColor: t.fieldBg,
                        border: `1px solid ${t.stroke}`,
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          color: act.color,
                        }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-semibold leading-tight line-clamp-2" style={{ color: t.textHi }}>
                        {act.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div
          onClick={() => navigate(`${SEC}/students`)}
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm hover:scale-[1.01] cursor-pointer"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Total Students
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.1)',
                color: t.mint,
              }}
            >
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {isLoading ? '...' : (stats?.totalStudents ?? 0)}
          </div>
          <div className="text-xs mt-1 flex items-center gap-1" style={{ color: t.textMid }}>
            <span>Active enrollments</span>
            <ChevronRight className="w-3 h-3 text-emerald-500" />
          </div>
        </div>

        {/* Present Today */}
        <div
          onClick={() => navigate(`${SEC}/attendance`)}
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm hover:scale-[1.01] cursor-pointer"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Present Today
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(79,142,247,0.15)' : 'rgba(37,99,235,0.1)',
                color: t.blue,
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {isLoading ? '...' : (stats?.presentToday ?? 0)}
          </div>
          <div className="text-xs mt-1 flex items-center gap-1" style={{ color: t.textMid }}>
            <span>Roll-call confirmed</span>
            <ChevronRight className="w-3 h-3 text-blue-500" />
          </div>
        </div>

        {/* Visitors On Campus Today */}
        <div
          onClick={() => navigate(`${SEC}/visitors`)}
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm hover:scale-[1.01] cursor-pointer"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Visitors Today
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(147,51,234,0.1)',
                color: '#a855f7',
              }}
            >
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {isLoading ? '...' : (stats?.visitorsToday ?? 0)}
          </div>
          <div className="text-xs mt-1 flex items-center gap-1" style={{ color: t.textMid }}>
            <span>Visitor logbook</span>
            <ChevronRight className="w-3 h-3 text-purple-500" />
          </div>
        </div>

        {/* Outstanding Balance Inquiries */}
        <div
          onClick={() => navigate(`${SEC}/finance/outstanding`)}
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm hover:scale-[1.01] cursor-pointer"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Fee Inquiries
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(225,29,72,0.1)',
                color: t.red,
              }}
            >
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {isLoading ? '...' : (stats?.outstandingDebtorsCount ?? 0)}
          </div>
          <div className="text-xs mt-1 flex items-center gap-1" style={{ color: t.textMid }}>
            <span>Students with balances</span>
            <ChevronRight className="w-3 h-3 text-rose-500" />
          </div>
        </div>
      </div>

      {/* Dual Column: Recent Admissions + Visitors Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Admissions */}
        <div
          className="p-5 rounded-2xl shadow-sm flex flex-col"
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" style={{ color: t.mint }} />
              <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                Recent Admissions
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate(`${SEC}/students`)}
              className="text-xs font-semibold flex items-center gap-1 hover:underline"
              style={{ color: t.mint }}
            >
              <span>View Directory</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 divide-y" style={{ borderColor: t.divider }}>
            {isLoading ? (
              <div className="py-8 text-center text-xs" style={{ color: t.textLow }}>Loading admissions...</div>
            ) : !data?.recentAdmissions.length ? (
              <div className="py-8 text-center text-xs" style={{ color: t.textLow }}>No admissions registered this month.</div>
            ) : (
              data.recentAdmissions.map((s) => (
                <div key={s.student_id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                      style={{
                        backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                        color: t.mint,
                      }}
                    >
                      {(s.name || '?').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: t.textHi }}>{s.name}</div>
                      <div className="text-[11px] truncate" style={{ color: t.textMid }}>
                        {s.current_class || 'Class'} • {s.admission_number || 'No ID'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: t.textLow }}>
                    {timeAgo(s.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Visitor Logbook Status */}
        <div
          className="p-5 rounded-2xl shadow-sm flex flex-col"
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                Front Desk Visitors Log
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate(`${SEC}/visitors`)}
              className="text-xs font-semibold flex items-center gap-1 hover:underline text-purple-400"
            >
              <span>Manage Visitors</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 divide-y" style={{ borderColor: t.divider }}>
            {isLoading ? (
              <div className="py-8 text-center text-xs" style={{ color: t.textLow }}>Loading visitors...</div>
            ) : !data?.recentVisitors.length ? (
              <div className="py-8 text-center text-xs" style={{ color: t.textLow }}>No visitors signed in today.</div>
            ) : (
              data.recentVisitors.map((v) => {
                const isCheckedOut = !!v.check_out_time;
                return (
                  <div key={v.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                        style={{
                          backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(147,51,234,0.12)',
                          color: '#a855f7',
                        }}
                      >
                        {v.visitor_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate" style={{ color: t.textHi }}>{v.visitor_name}</div>
                        <div className="text-[11px] truncate" style={{ color: t.textMid }}>
                          {v.purpose} • Visiting {v.host_name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          backgroundColor: isCheckedOut
                            ? isDark
                              ? 'rgba(16,217,168,0.15)'
                              : 'rgba(16,185,129,0.12)'
                            : isDark
                            ? 'rgba(245,158,11,0.15)'
                            : 'rgba(217,119,6,0.12)',
                          color: isCheckedOut ? t.mint : t.gold,
                        }}
                      >
                        {isCheckedOut ? 'CHECKED OUT' : 'ON CAMPUS'}
                      </span>
                      <div className="text-[10px] mt-0.5" style={{ color: t.textLow }}>
                        {formatTime(v.check_in_time)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Office Notifications */}
      <div
        className="p-5 rounded-2xl shadow-sm"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
              Office Notices & Memos
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`${SEC}/notifications`)}
            className="text-xs font-semibold flex items-center gap-1 hover:underline text-amber-400"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="mt-3 divide-y" style={{ borderColor: t.divider }}>
          {isLoading ? (
            <div className="py-6 text-center text-xs" style={{ color: t.textLow }}>Loading notifications...</div>
          ) : !data?.notifications.length ? (
            <div className="py-6 text-center text-xs" style={{ color: t.textLow }}>No new notifications.</div>
          ) : (
            data.notifications.map((n) => (
              <div key={n.notification_id} className="py-3 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold" style={{ color: t.textHi }}>{n.title}</div>
                  <div className="text-[11px] truncate mt-0.5" style={{ color: t.textMid }}>{n.message}</div>
                </div>
                <span className="text-[10px] shrink-0" style={{ color: t.textLow }}>
                  {timeAgo(n.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals for Add Student, Teacher, Parent */}
      <NativeModal isOpen={secModal === 'student'} onClose={closeSecModal} title="Register Student" size="xl">
        <AddStudentForm mode="modal" onCompleted={closeSecModal} onCancel={closeSecModal} />
      </NativeModal>
      <NativeModal isOpen={secModal === 'teacher'} onClose={closeSecModal} title="Add Teacher to Roster" size="lg">
        <AddTeacherForm mode="modal" onCompleted={closeSecModal} onCancel={closeSecModal} />
      </NativeModal>
      <NativeModal isOpen={secModal === 'parent'} onClose={closeSecModal} title="Add Parent / Guardian" size="lg">
        <AddParentForm mode="modal" onCompleted={closeSecModal} onCancel={closeSecModal} />
      </NativeModal>
    </div>
  );
}
