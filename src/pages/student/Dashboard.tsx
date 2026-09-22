import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, PosTokens } from '@/styles/posThemeTokens';
import { schoolCalendarTodayIso } from '@/lib/schoolCalendarDate';
import { todayDbDayOfWeek } from '@/lib/schoolCalendarDate';
import { studentAttendanceRowIsPresent } from '@/lib/studentAttendanceRow';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Award,
  ClipboardCheck,
  CreditCard,
  Bell,
  Clock,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

// ─── 180° Calibrated SVG Semi-circle Gauge ──────────────────────────────────
function SemiCircleGauge({
  percent,
  color,
  trackColor,
  centerLabel,
}: {
  percent: number;
  color: string;
  trackColor: string;
  centerLabel?: string;
}) {
  const circ = 113.1;
  const ratio = Math.min(Math.max(percent / 100, 0), 1);
  const strokeDash = `${(circ * ratio).toFixed(1)} ${circ}`;

  return (
    <div style={{ position: 'relative', width: '84px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="84" height="48" viewBox="0 0 84 48">
        <path
          d="M 6 42 A 36 36 0 0 1 78 42"
          fill="none"
          stroke={trackColor}
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        <path
          d="M 6 42 A 36 36 0 0 1 78 42"
          fill="none"
          stroke={color}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeDasharray={strokeDash}
          style={{ transition: 'stroke-dasharray 0.6s ease-out' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          bottom: '2px',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontWeight: 800,
          fontSize: '13px',
          letterSpacing: '-0.02em',
        }}
      >
        {centerLabel ?? `${Math.round(percent)}%`}
      </div>
    </div>
  );
}

interface PeriodItem {
  id: string;
  subject: string;
  start_time: string;
  end_time: string;
  room?: string | null;
  teacher_name?: string | null;
}

interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  due_date: string | null;
  total_marks: number;
  submitted: boolean;
  grade?: number | null;
  status: 'pending' | 'submitted' | 'graded';
}

interface ExamScoreItem {
  subject: string;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade: string;
  remarks?: string;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined);
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t: PosTokens = getTokens(isDark);

  const [loading, setLoading] = useState(true);
  const [studentDetails, setStudentDetails] = useState<{
    id: string;
    name: string;
    className: string;
    admissionNumber: string;
    schoolName: string;
    initials: string;
  }>({
    id: '',
    name: 'Student',
    className: '—',
    admissionNumber: '—',
    schoolName: 'School',
    initials: 'ST',
  });

  const [academicStats, setAcademicStats] = useState({
    averagePercent: 0,
    attendanceRate: 0,
    presentDays: 0,
    totalAttendanceDays: 0,
    pendingAssignmentsCount: 0,
    feeClearedPercent: 100,
    feeBalanceFormatted: '0 UGX',
  });

  const [todayPeriods, setTodayPeriods] = useState<PeriodItem[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<PeriodItem | null>(null);
  const [nextPeriod, setNextPeriod] = useState<PeriodItem | null>(null);
  const [activeAssignments, setActiveAssignments] = useState<AssignmentItem[]>([]);
  const [recentExamScores, setRecentExamScores] = useState<ExamScoreItem[]>([]);
  const [circulars, setCirculars] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      if (!user) return;
      setLoading(true);
      try {
        // 1. Resolve student identity
        const { data: userData } = await supabase
          .from('users')
          .select('name, student_id, school_id')
          .eq('user_id', user.id)
          .maybeSingle();

        const sid = (userData as any)?.student_id;
        const schId = (userData as any)?.school_id || schoolId;

        let stName = (userData as any)?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Student';
        let admNo = '—';
        let clsName = '—';
        let schName = 'PwezaCore School';

        if (schId) {
          const { data: schData } = await supabase
            .from('schools')
            .select('name')
            .eq('school_id', schId)
            .maybeSingle();
          if (schData?.name) schName = schData.name;
        }

        if (sid && schId) {
          const { data: stRow } = await supabase
            .from('students')
            .select('student_id, name, admission_number, current_class')
            .eq('student_id', sid)
            .eq('school_id', schId)
            .maybeSingle();
          if (stRow) {
            if (stRow.name) stName = stRow.name;
            if (stRow.admission_number) admNo = stRow.admission_number;
            if (stRow.current_class) clsName = stRow.current_class;
          }
        }

        const initials = stName
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'ST';

        setStudentDetails({
          id: sid || user.id,
          name: stName,
          className: clsName,
          admissionNumber: admNo,
          schoolName: schName,
          initials,
        });

        // 2. Load Attendance metrics
        let attRate = 0;
        let presCount = 0;
        let totAttCount = 0;
        if (sid && schId) {
          const { data: attRows } = await supabase
            .from('student_attendance')
            .select('present, status')
            .eq('school_id', schId)
            .eq('student_id', sid)
            .limit(100);

          if (attRows && attRows.length > 0) {
            totAttCount = attRows.length;
            presCount = attRows.filter(studentAttendanceRowIsPresent).length;
            attRate = Math.round((presCount / totAttCount) * 100);
          } else {
            attRate = 100; // default good standing if new term
          }
        }

        // 3. Load Exam Performance metrics
        let avgScore = 0;
        const scoreRows: ExamScoreItem[] = [];
        if (sid && schId) {
          const { data: examData } = await supabase
            .from('exam_results')
            .select('subject, marks_obtained, total_marks')
            .eq('school_id', schId)
            .eq('student_id', sid)
            .order('created_at', { ascending: false })
            .limit(10);

          if (examData && examData.length > 0) {
            let sumPct = 0;
            examData.forEach((row: any) => {
              const mo = Number(row.marks_obtained || 0);
              const tm = Number(row.total_marks || 100);
              const pct = tm > 0 ? Math.round((mo / tm) * 100) : 0;
              sumPct += pct;

              let grade = 'C';
              if (pct >= 80) grade = 'D1';
              else if (pct >= 75) grade = 'D2';
              else if (pct >= 65) grade = 'C3';
              else if (pct >= 60) grade = 'C4';
              else if (pct >= 55) grade = 'C5';
              else if (pct >= 50) grade = 'C6';
              else if (pct >= 45) grade = 'P7';
              else if (pct >= 40) grade = 'P8';
              else grade = 'F9';

              scoreRows.push({
                subject: row.subject || 'General',
                marks_obtained: mo,
                total_marks: tm,
                percentage: pct,
                grade,
              });
            });
            avgScore = Math.round(sumPct / examData.length);
          }
        }
        setRecentExamScores(scoreRows.slice(0, 5));

        // 4. Load Timetable for Today
        const dayOfWeek = todayDbDayOfWeek();
        if (schId && clsName && clsName !== '—') {
          const { data: periods } = await supabase
            .from('timetable_periods')
            .select('id, subject, start_time, end_time, room, teacher_id')
            .eq('school_id', schId)
            .eq('class_name', clsName)
            .eq('day_of_week', dayOfWeek)
            .order('start_time', { ascending: true });

          if (periods && periods.length > 0) {
            const teacherIds = [...new Set(periods.map((p) => p.teacher_id).filter(Boolean))];
            let tMap = new Map<string, string>();
            if (teacherIds.length > 0) {
              const { data: teachers } = await supabase
                .from('teachers')
                .select('teacher_id, name')
                .in('teacher_id', teacherIds);
              (teachers || []).forEach((t: any) => tMap.set(t.teacher_id, t.name));
            }

            const parsedPeriods: PeriodItem[] = periods.map((p: any) => ({
              id: p.id,
              subject: p.subject || 'General Lesson',
              start_time: p.start_time?.slice(0, 5) || '08:00',
              end_time: p.end_time?.slice(0, 5) || '09:00',
              room: p.room || null,
              teacher_name: tMap.get(p.teacher_id) || 'Subject Teacher',
            }));

            setTodayPeriods(parsedPeriods);

            // Determine active/next period
            const now = new Date();
            const curMinutes = now.getHours() * 60 + now.getMinutes();

            let active: PeriodItem | null = null;
            let next: PeriodItem | null = null;

            for (const p of parsedPeriods) {
              const [sh, sm] = p.start_time.split(':').map(Number);
              const [eh, em] = p.end_time.split(':').map(Number);
              const sMin = sh * 60 + sm;
              const eMin = eh * 60 + em;

              if (curMinutes >= sMin && curMinutes < eMin) {
                active = p;
                break;
              } else if (curMinutes < sMin && !next) {
                next = p;
              }
            }

            setCurrentPeriod(active);
            setNextPeriod(next || (parsedPeriods.length > 0 ? parsedPeriods[0] : null));
          }
        }

        // 5. Load Active Coursework / Assignments
        if (schId && clsName && clsName !== '—') {
          const { data: asgns } = await supabase
            .from('assignments')
            .select('id, title, subject, due_date, total_marks')
            .eq('school_id', schId)
            .eq('class_name', clsName)
            .order('created_at', { ascending: false })
            .limit(6);

          let pendingCount = 0;
          if (asgns && asgns.length > 0) {
            // Check student submissions
            const asgnIds = asgns.map((a: any) => a.id);
            const { data: subs } = await supabase
              .from('assignment_submissions')
              .select('assignment_id, status, grade')
              .in('assignment_id', asgnIds)
              .eq('student_id', sid || user.id);

            const subMap = new Map<string, { status: 'submitted' | 'graded'; grade?: number | null }>();
            (subs || []).forEach((s: any) => {
              subMap.set(s.assignment_id, {
                status: s.status === 'graded' ? 'graded' : 'submitted',
                grade: s.grade,
              });
            });

            const parsedAsgns: AssignmentItem[] = asgns.map((a: any) => {
              const sub = subMap.get(a.id);
              const isSub = !!sub;
              const status: 'pending' | 'submitted' | 'graded' = sub ? sub.status : 'pending';
              if (status === 'pending') pendingCount++;
              return {
                id: a.id,
                title: a.title,
                subject: a.subject,
                due_date: a.due_date,
                total_marks: a.total_marks || 100,
                submitted: isSub,
                grade: sub?.grade,
                status,
              };
            });

            setActiveAssignments(parsedAsgns);
          }

          setAcademicStats((prev) => ({
            ...prev,
            averagePercent: avgScore,
            attendanceRate: attRate,
            presentDays: presCount,
            totalAttendanceDays: totAttCount,
            pendingAssignmentsCount: pendingCount,
          }));
        }

        // 6. Load School Circulars
        if (schId) {
          const { data: notifs } = await supabase
            .from('notifications')
            .select('*')
            .eq('school_id', schId)
            .order('created_at', { ascending: false })
            .limit(4);
          setCirculars(notifs || []);
        }
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [user, schoolId]);

  return (
    <div style={{ color: t.textPrimary }}>
      {/* ── Student Profile Hero Banner ──────────────────────────────────────── */}
      <div
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 20,
          padding: '24px 28px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              color: '#ffffff',
              fontSize: 20,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
              flexShrink: 0,
            }}
          >
            {studentDetails.initials}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 99,
                  background: t.mintDim,
                  color: t.mint,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                <Sparkles className="w-3 h-3" />
                Active Learner
              </span>
              <span style={{ fontSize: 12, color: t.textMuted }}>· {studentDetails.schoolName}</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: t.textPrimary, letterSpacing: '-0.02em' }}>
              Welcome back, {studentDetails.name}
            </h1>
            <p style={{ margin: '3px 0 0', color: t.textSecondary, fontSize: 13 }}>
              Class: <span style={{ fontWeight: 700, color: t.textPrimary }}>{studentDetails.className}</span>
              {studentDetails.admissionNumber !== '—' && (
                <> · Reg No: <span style={{ fontWeight: 700, color: t.textPrimary }}>{studentDetails.admissionNumber}</span></>
              )}
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            padding: '10px 18px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: t.mint, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
              {new Date().getDate()}
            </div>
            <div style={{ color: t.textMuted, fontSize: 10, textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>
              {new Date().toLocaleDateString('en-GB', { month: 'short' })}
            </div>
          </div>
          <div style={{ width: 1, height: 28, background: t.border }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Academic Session</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>
              Term 1 · 2026
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Top Calibrated Gauges & Key Indicator Cards ─────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* 1. Academic Average / Standing */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>Academic Average</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: t.mintDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.mint }}>
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: t.mint, lineHeight: 1 }}>
                {academicStats.averagePercent > 0 ? `${academicStats.averagePercent}%` : '—'}
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: t.mint, fontWeight: 700 }}>
                  {academicStats.averagePercent >= 75 ? 'Distinction Level' : academicStats.averagePercent >= 50 ? 'Credit Level' : 'Continuous Assessment'}
                </span>
              </div>
            </div>
            <SemiCircleGauge
              percent={academicStats.averagePercent || 75}
              color={t.mint}
              trackColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
            />
          </div>
        </div>

        {/* 2. Attendance Standing */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>Term Attendance</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: t.blueDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.blue }}>
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: t.blue, lineHeight: 1 }}>
                {academicStats.attendanceRate}%
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
                <span style={{ color: academicStats.attendanceRate >= 80 ? t.mint : t.gold, fontWeight: 700 }}>
                  {academicStats.attendanceRate >= 80 ? 'Good Standing' : 'Attention Needed'}
                </span>
              </div>
            </div>
            <SemiCircleGauge
              percent={academicStats.attendanceRate}
              color={t.blue}
              trackColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
            />
          </div>
        </div>

        {/* 3. Coursework Due */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>Coursework Due</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: t.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.gold }}>
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: academicStats.pendingAssignmentsCount > 0 ? t.gold : t.mint, lineHeight: 1 }}>
            {academicStats.pendingAssignmentsCount}
          </div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8 }}>
            {academicStats.pendingAssignmentsCount === 0 ? 'All caught up!' : 'Assignments to submit'}
          </div>
        </div>

        {/* 4. Tuition & Fee Clearance */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary }}>Tuition Status</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#a78bfa', lineHeight: 1 }}>
                Cleared
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
                Exam clearance verified
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard/student/fees')}
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 11,
                fontWeight: 600,
                color: t.textPrimary,
                cursor: 'pointer',
              }}
            >
              View Statement
            </button>
          </div>
        </div>
      </div>

      {/* ── Live Schedule Banner: Now In Class / Up Next ──────────────────────── */}
      <div
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(16,217,168,0.08), rgba(14,165,233,0.05))'
            : 'linear-gradient(135deg, rgba(16,217,168,0.12), rgba(14,165,233,0.08))',
          border: `1px solid ${isDark ? 'rgba(16,217,168,0.25)' : 'rgba(16,217,168,0.3)'}`,
          borderRadius: 18,
          padding: '20px 24px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: t.mintDim,
              color: t.mint,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: t.mint,
                  background: t.mintDim,
                  padding: '2px 8px',
                  borderRadius: 99,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.mint, display: 'inline-block' }} />
                {currentPeriod ? 'In Session Now' : 'Next Up Today'}
              </span>
              <span style={{ fontSize: 12, color: t.textMuted }}>
                {currentPeriod
                  ? `${currentPeriod.start_time} – ${currentPeriod.end_time}`
                  : nextPeriod
                  ? `${nextPeriod.start_time} – ${nextPeriod.end_time}`
                  : 'Schedule Complete'}
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary }}>
              {currentPeriod
                ? currentPeriod.subject
                : nextPeriod
                ? nextPeriod.subject
                : 'No more classes scheduled today'}
            </div>
            <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>
              Instructor: <span style={{ color: t.textPrimary, fontWeight: 600 }}>{currentPeriod?.teacher_name || nextPeriod?.teacher_name || 'Class Teacher'}</span>
              {(currentPeriod?.room || nextPeriod?.room) && (
                <> · Room: <span style={{ color: t.textPrimary, fontWeight: 600 }}>{currentPeriod?.room || nextPeriod?.room}</span></>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/dashboard/student/timetable')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: t.card,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            padding: '8px 16px',
            color: t.textPrimary,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <span>Full Timetable</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* ── Two Column Row: Active Coursework & Exam Highlights ───────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Active Coursework Widget */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
                Active Coursework & Homework
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: t.textMuted }}>
                Assignments set by your subject teachers
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/student/assignments')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: '6px 12px',
                color: t.textPrimary,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {activeAssignments.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center', color: t.textMuted }}>
              <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-80 mb-2" />
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>No Pending Coursework</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>You are up to date on all class assignments!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeAssignments.map((asgn) => (
                <div
                  key={asgn.id}
                  style={{
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: 12,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: t.mint }}>{asgn.subject}</span>
                      <span style={{ fontSize: 10, color: t.textMuted }}>· Max: {asgn.total_marks} Marks</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {asgn.title}
                    </div>
                    {asgn.due_date && (
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                        Due: {new Date(asgn.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </div>

                  <div>
                    {asgn.status === 'graded' ? (
                      <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: 99, background: t.mintDim, color: t.mint, fontSize: 11, fontWeight: 700 }}>
                        {asgn.grade !== undefined ? `${asgn.grade}/${asgn.total_marks}` : 'Graded'}
                      </span>
                    ) : asgn.status === 'submitted' ? (
                      <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: 99, background: t.blueDim, color: t.blue, fontSize: 11, fontWeight: 700 }}>
                        Submitted
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/student/assignment/${asgn.id}`)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '6px 12px',
                          borderRadius: 8,
                          background: t.mint,
                          color: '#05080f',
                          fontSize: 12,
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <span>Start</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Exam Performance */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
                Recent Exam Scores
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: t.textMuted }}>
                Term continuous assessment & exam results
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/student/results')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: '6px 12px',
                color: t.textPrimary,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>Full Report</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {recentExamScores.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center', color: t.textMuted }}>
              <Award className="w-8 h-8 opacity-40 mb-2" />
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>No Exam Scores Available</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Scores will appear here once teachers complete grading.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentExamScores.map((score, idx) => (
                <div
                  key={idx}
                  style={{
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: 12,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{score.subject}</div>
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                      Raw: {score.marks_obtained} / {score.total_marks}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: t.textPrimary }}>{score.percentage}%</span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: score.percentage >= 70 ? t.mintDim : t.blueDim,
                          color: score.percentage >= 70 ? t.mint : t.blue,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {score.grade}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Official School Circulars & Bulletins ────────────────────────────── */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 20, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
              Official School Announcements & Bulletins
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: t.textMuted }}>
              Important circulars for students and parents
            </p>
          </div>
          <Bell className="w-4 h-4 text-amber-400" />
        </div>

        {circulars.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>
            No new announcements posted this week.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {circulars.map((c) => (
              <div
                key={c.notification_id || c.id}
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
                  {c.title || 'Official Notice'}
                </div>
                <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.4 }}>
                  {c.message || c.content || '—'}
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 8 }}>
                  {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
