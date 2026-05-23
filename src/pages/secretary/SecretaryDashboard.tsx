import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { getOfflineStudents, getOfflineTeachers } from '../../lib/offlineDb';
import AdminPageWrapper, { adminCardClass } from '../../components/layout/AdminPageWrapper';
import NativeModal from '../../components/NativeModal';
import { AddStudentForm } from '../admin/students/AddStudentForm';
import { AddTeacherForm } from '../admin/teachers/AddTeacherForm';
import { AddParentForm } from '../admin/parents/AddParentForm';

type SecModal = 'student' | 'teacher' | 'parent' | null;

const SEC = '/dashboard/secretary';

interface Stats {
  totalStudents: number;
  presentToday: number;
  newAdmissionsMonth: number;
  pendingApprovals: number;
  feesToday: number;
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
  // Offline: return cached counts from IndexedDB
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
        feesToday: 0,
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

  const [studentsRes, absentRes, newAdmissionsRes, feesRes, visitorsRes, notifsRes, recentAdmissionsRes, recentVisitorsRes] = await Promise.all([
    supabase.from('students').select('student_id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
    supabase.from('student_attendance').select('attendance_id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('attendance_date', today).eq('present', true),
    supabase.from('students').select('student_id', { count: 'exact', head: true }).eq('school_id', schoolId).gte('created_at', monthStart),
    supabase.from('student_payments').select('amount').eq('school_id', schoolId).gte('payment_date', today).lte('payment_date', today + 'T23:59:59'),
    supabase.from('visitor_log').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).gte('check_in_time', today).lte('check_in_time', today + 'T23:59:59'),
    supabase.from('notifications').select('notification_id, title, message, created_at, is_read').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(5),
    supabase.from('students').select('student_id, name, current_class, created_at, admission_number').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(5),
    supabase.from('visitor_log').select('id, visitor_name, purpose, host_name, check_in_time, check_out_time').eq('school_id', schoolId).order('check_in_time', { ascending: false }).limit(5),
  ]);

  const feesTotal = ((feesRes.data ?? []) as { amount: number }[]).reduce((s, r) => s + (r.amount ?? 0), 0);

  const stats: Stats = {
    totalStudents: studentsRes.count ?? 0,
    presentToday: absentRes.count ?? 0,
    newAdmissionsMonth: newAdmissionsRes.count ?? 0,
    pendingApprovals: 0,
    feesToday: feesTotal,
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

function StatCard({ icon, label, value, sub, color, onClick }: { icon: string; label: string; value: string | number; sub?: string; color: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={adminCardClass}
      style={{ cursor: onClick ? 'pointer' : 'default', display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px 20px', transition: 'border-color 0.15s' }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--pw-t3,#94a8d0)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--pw-t1,#f8fafc)', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--pw-t3,#94a8d0)', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function SecretaryDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;
  const [greeting, setGreeting] = useState('Good morning');
  const [userName, setUserName] = useState('Secretary');
  const [secModal, setSecModal] = useState<SecModal>(null);
  const closeSecModal = () => setSecModal(null);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
    async function loadName() {
      if (!user?.id) return;
      const { data } = await supabase.from('users').select('name').eq('user_id', user.id).maybeSingle();
      const n = (data as { name?: string } | null)?.name;
      if (n) setUserName(n.split(' ')[0]);
    }
    void loadName();
  }, [user?.id]);

  const { data, isLoading } = useQuery({
    queryKey: ['secretary-dashboard', schoolId],
    queryFn: () => fetchSecretaryDashboard(schoolId!),
    enabled: !!schoolId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const stats = data?.stats;
  const today = new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
    <AdminPageWrapper eyebrow="SECRETARY" title={`${greeting}, ${userName}`} subtitle={today}>
      {/* Quick actions */}
      <div className={`${adminCardClass} mb-6 p-4`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
          {([
            { icon: '👨‍🎓', label: 'Add Student', openModal: 'student' as SecModal, color: 'rgba(16,217,168,0.15)' },
            { icon: '👨‍🏫', label: 'Add Teacher', openModal: 'teacher' as SecModal, color: 'rgba(79,142,247,0.15)' },
            { icon: '👪',   label: 'Add Parent',  openModal: 'parent'  as SecModal, color: 'rgba(16,217,168,0.12)' },
            { icon: '🧑‍💼', label: 'Add Staff',   path: `${SEC}/staff?add=1`,           color: 'rgba(245,166,35,0.15)' },
            { icon: '🚪',   label: 'Log Visitor', path: `${SEC}/visitors`,               color: 'rgba(139,92,246,0.15)' },
            { icon: '📄',   label: 'Admission Form', path: `${SEC}/admission-form`,      color: 'rgba(16,217,168,0.1)' },
            { icon: '📋',   label: 'Attendance',  path: `${SEC}/attendance`,             color: 'rgba(139,92,246,0.15)' },
            { icon: '💰',   label: 'Outstanding', path: `${SEC}/finance/outstanding`,    color: 'rgba(239,68,68,0.12)' },
            { icon: '🎓',   label: 'Exams',       path: `${SEC}/exams`,                  color: 'rgba(245,166,35,0.12)' },
          ] as const).map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                if ('openModal' in a) setSecModal(a.openModal);
                else navigate(a.path);
              }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '14px 8px', borderRadius: 10, background: a.color, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
            >
              <span style={{ fontSize: 22 }}>{a.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--pw-t2,#c5d4ef)', textAlign: 'center' }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard icon="👨‍🎓" label="Total Students" value={isLoading ? '—' : (stats?.totalStudents ?? 0)} sub="Active enrollments" color="rgba(16,217,168,0.15)" onClick={() => navigate(`${SEC}/students`)} />
        <StatCard icon="✅" label="Present Today" value={isLoading ? '—' : (stats?.presentToday ?? 0)} sub="Marked present" color="rgba(16,185,129,0.15)" onClick={() => navigate(`${SEC}/attendance`)} />
        <StatCard icon="🆕" label="New This Month" value={isLoading ? '—' : (stats?.newAdmissionsMonth ?? 0)} sub="New admissions" color="rgba(79,142,247,0.15)" onClick={() => navigate(`${SEC}/students`)} />
        <StatCard icon="🚪" label="Visitors Today" value={isLoading ? '—' : (stats?.visitorsToday ?? 0)} sub="Signed in" color="rgba(245,166,35,0.15)" onClick={() => navigate(`${SEC}/visitors`)} />
        <StatCard icon="💰" label="Fees Today" value={isLoading ? '—' : `${(stats?.feesToday ?? 0).toLocaleString()} UGX`} sub="Payments received" color="rgba(16,185,129,0.15)" />
      </div>

      {/* Recent admissions + recent visitors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginBottom: 20 }}>
        {/* Recent Admissions */}
        <div className={adminCardClass}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 10px' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--pw-t1,#f8fafc)' }}>🆕 Recent Admissions</span>
            <button type="button" onClick={() => navigate(`${SEC}/students`)} style={{ fontSize: 11, color: '#10d9a8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
          </div>
          {isLoading ? (
            <div style={{ padding: '20px 18px', color: 'var(--pw-t3)', fontSize: 13 }}>Loading…</div>
          ) : !data?.recentAdmissions.length ? (
            <div style={{ padding: '20px 18px', color: 'var(--pw-t3)', fontSize: 13 }}>No recent admissions.</div>
          ) : data.recentAdmissions.map((s) => (
            <div key={s.student_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderTop: '1px solid var(--pw-border,rgba(255,255,255,0.07))' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#10d9a8,#4f8ef7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#05080f', flexShrink: 0 }}>
                {(s.name || '?').charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pw-t1,#f8fafc)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--pw-t3,#94a8d0)' }}>{s.current_class} · {s.admission_number || 'No ID'}</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--pw-t3,#94a8d0)', flexShrink: 0 }}>{timeAgo(s.created_at)}</span>
            </div>
          ))}
        </div>

        {/* Recent Visitors */}
        <div className={adminCardClass}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 10px' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--pw-t1,#f8fafc)' }}>🚪 Recent Visitors</span>
            <button type="button" onClick={() => navigate(`${SEC}/visitors`)} style={{ fontSize: 11, color: '#10d9a8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Log visitor →</button>
          </div>
          {isLoading ? (
            <div style={{ padding: '20px 18px', color: 'var(--pw-t3)', fontSize: 13 }}>Loading…</div>
          ) : !data?.recentVisitors.length ? (
            <div style={{ padding: '20px 18px', color: 'var(--pw-t3)', fontSize: 13 }}>No visitors logged today.</div>
          ) : data.recentVisitors.map((v) => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderTop: '1px solid var(--pw-border,rgba(255,255,255,0.07))' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#4f8ef7,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {v.visitor_name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pw-t1,#f8fafc)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.visitor_name}</div>
                <div style={{ fontSize: 11, color: 'var(--pw-t3,#94a8d0)' }}>{v.purpose} · to {v.host_name}</div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: v.check_out_time ? '#10d9a8' : '#f5a623', background: v.check_out_time ? 'rgba(16,217,168,0.12)' : 'rgba(245,166,35,0.12)', borderRadius: 4, padding: '2px 6px' }}>
                  {v.check_out_time ? 'Left' : 'IN'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--pw-t3)', marginTop: 2 }}>{formatTime(v.check_in_time)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className={adminCardClass}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 10px' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--pw-t1,#f8fafc)' }}>🔔 Notifications</span>
          <button type="button" onClick={() => navigate(`${SEC}/notifications`)} style={{ fontSize: 11, color: '#10d9a8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
        </div>
        {isLoading ? (
          <div style={{ padding: '20px 18px', color: 'var(--pw-t3)', fontSize: 13 }}>Loading…</div>
        ) : !data?.notifications.length ? (
          <div style={{ padding: '20px 18px', color: 'var(--pw-t3)', fontSize: 13 }}>✅ All caught up — no notifications.</div>
        ) : data.notifications.map((n) => (
          <div key={n.notification_id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 18px', borderTop: '1px solid var(--pw-border,rgba(255,255,255,0.07))', background: n.is_read ? 'transparent' : 'rgba(16,217,168,0.04)' }}>
            <span style={{ fontSize: 16, marginTop: 1 }}>📌</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pw-t1,#f8fafc)' }}>{n.title}</div>
              <div style={{ fontSize: 11, color: 'var(--pw-t3,#94a8d0)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--pw-t3,#94a8d0)', flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
          </div>
        ))}
      </div>
    </AdminPageWrapper>

      <NativeModal isOpen={secModal === 'student'} onClose={closeSecModal} title="Add Student" size="xl">
        <AddStudentForm mode="modal" onCompleted={closeSecModal} onCancel={closeSecModal} />
      </NativeModal>
      <NativeModal isOpen={secModal === 'teacher'} onClose={closeSecModal} title="Add Teacher" size="lg">
        <AddTeacherForm mode="modal" onCompleted={closeSecModal} onCancel={closeSecModal} />
      </NativeModal>
      <NativeModal isOpen={secModal === 'parent'} onClose={closeSecModal} title="Add Parent" size="lg">
        <AddParentForm mode="modal" onCompleted={closeSecModal} onCancel={closeSecModal} />
      </NativeModal>
    </>
  );
}
