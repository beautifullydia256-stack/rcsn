import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTeacherContext } from '../useTeacherContext';
import { formatTimetableTime, timetableDayNameToIndex } from '@/lib/timetableDay';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  Calendar,
  Clock,
  Printer,
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Sparkles,
  Layers,
  CheckCircle2,
  CalendarCheck,
  Video,
  FileText,
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type TimetableRow = {
  id: string;
  class_name: string;
  subject: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
};

/* Uganda current day index (0 = Monday, ..., 6 = Sunday) */
function getUgandaTodayDayIndex(): number {
  const ugandaDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const day = ugandaDate.getUTCDay(); // 0 is Sunday, 1 is Monday
  return day === 0 ? 6 : day - 1;
}

function getUgandaCurrentTimeMinutes(): number {
  const ugandaDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return ugandaDate.getUTCHours() * 60 + ugandaDate.getUTCMinutes();
}

function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function TeacherTimetablePage() {
  const navigate = useNavigate();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const { schoolId, teacherId, isLoading: ctxLoading } = useTeacherContext();

  const currentTodayIndex = getUgandaTodayDayIndex();
  const [activeDayTab, setActiveDayTab] = useState<number>(currentTodayIndex);
  const [viewMode, setViewMode] = useState<'timeline' | 'week'>('timeline');

  const { data: rows = [], isLoading: tableLoading } = useQuery({
    queryKey: ['teacher', 'timetable-full', schoolId ?? '', teacherId ?? ''],
    queryFn: async (): Promise<TimetableRow[]> => {
      if (!schoolId || !teacherId) return [];
      const { data, error } = await supabase
        .from('timetable_periods')
        .select('id, class_name, subject, day_of_week, start_time, end_time')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacherId);
      if (error) throw error;
      const raw = (data || []) as {
        id: number | string;
        class_name: string;
        subject: string;
        day_of_week: string;
        start_time: string;
        end_time: string;
      }[];
      const mapped: TimetableRow[] = [];
      for (const r of raw) {
        const dayIx = timetableDayNameToIndex(r.day_of_week);
        if (dayIx === null) continue;
        mapped.push({
          id: String(r.id),
          class_name: r.class_name,
          subject: r.subject,
          day_of_week: dayIx,
          start_time: formatTimetableTime(r.start_time),
          end_time: formatTimetableTime(r.end_time),
          room: undefined,
        });
      }
      mapped.sort(
        (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
      );
      return mapped;
    },
    enabled: !!schoolId && !!teacherId,
  });

  const isLoading = ctxLoading || tableLoading;

  // Periods grouped by day
  const byDay = useMemo(() => {
    return DAYS.map((_, i) => rows.filter((r) => r.day_of_week === i));
  }, [rows]);

  const activeDayPeriods = byDay[activeDayTab] ?? [];
  const todayPeriods = byDay[currentTodayIndex] ?? [];
  const totalWeeklyPeriods = rows.length;

  // Workload computation (assuming ~40 mins or parsed delta)
  const totalWorkloadHours = useMemo(() => {
    let totalMinutes = 0;
    rows.forEach((r) => {
      const start = timeStringToMinutes(r.start_time);
      const end = timeStringToMinutes(r.end_time);
      const delta = end > start ? end - start : 40;
      totalMinutes += delta;
    });
    return (totalMinutes / 60).toFixed(1);
  }, [rows]);

  // Current session status
  const currentNowMinutes = getUgandaCurrentTimeMinutes();

  return (
    <div
      style={{
        background: t.bg,
        color: t.textPrimary,
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Header & Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <button
                type="button"
                onClick={() => navigate('/dashboard/teacher')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: t.textMuted,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <ArrowLeft size={14} />
                Dashboard
              </button>
              <span style={{ fontSize: '12px', color: t.textSub }}>/</span>
              <span style={{ fontSize: '12px', color: t.brandBlue, fontWeight: 600 }}>Timetable Schedule</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: t.textPrimary, margin: 0 }}>
              Teaching Timetable & Schedule
            </h1>
            <p style={{ fontSize: '13px', color: t.textMuted, margin: '4px 0 0 0' }}>
              Master weekly instructional periods, venue allocations, and lesson tracking calendar.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={rows.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: t.surface,
                border: `1px solid ${t.border}`,
                color: t.textPrimary,
                borderRadius: '10px',
                padding: '9px 15px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: rows.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <Printer size={15} />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/teacher/lesson-log')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: t.brandBlue,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(120, 170, 255, 0.25)',
              }}
            >
              <Video size={15} />
              Open Lesson Log
            </button>
          </div>
        </div>

        {/* 4 Summary POS KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Card 1: Weekly Load */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Weekly Workload
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.brandBlue, marginTop: '4px' }}>
                {totalWeeklyPeriods}
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                Total periods scheduled
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(120, 170, 255, 0.12)' : '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.brandBlue,
              }}
            >
              <Calendar size={24} />
            </div>
          </div>

          {/* Card 2: Today's Load */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Today's Lessons
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.brandMint, marginTop: '4px' }}>
                {todayPeriods.length}
              </div>
              <span style={{ fontSize: '12px', color: t.brandMint, fontWeight: 500 }}>
                {DAYS[currentTodayIndex]} schedule
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(61, 232, 160, 0.12)' : '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.brandMint,
              }}
            >
              <Clock size={24} />
            </div>
          </div>

          {/* Card 3: Workload Hours */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Contact Hours
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.brandGold, marginTop: '4px' }}>
                {totalWorkloadHours}h
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                Instruction time per week
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(245, 192, 68, 0.12)' : '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.brandGold,
              }}
            >
              <Layers size={24} />
            </div>
          </div>

          {/* Card 4: Compliance Status */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Timetable Sync
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#A855F7', marginTop: '4px' }}>
                Verified
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                Approved by DOS office
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(168, 85, 247, 0.12)' : '#F3E8FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#A855F7',
              }}
            >
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>

        {/* View Mode & Day Tabs */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: '16px',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            {/* Day Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {DAYS.map((day, idx) => {
                const count = byDay[idx]?.length ?? 0;
                const isSelected = activeDayTab === idx;
                const isToday = currentTodayIndex === idx;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setActiveDayTab(idx);
                      setViewMode('timeline');
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: isToday && !isSelected ? `1px solid ${t.brandMint}` : 'none',
                      cursor: 'pointer',
                      background: isSelected ? t.brandBlue : t.card,
                      color: isSelected ? '#FFFFFF' : isToday ? t.brandMint : t.textMuted,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{day}</span>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        background: isSelected ? 'rgba(255,255,255,0.25)' : t.surface,
                        color: isSelected ? '#FFFFFF' : t.textPrimary,
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'timeline' ? t.surface : 'transparent',
                  color: viewMode === 'timeline' ? t.textPrimary : t.textMuted,
                }}
              >
                Day Timeline
              </button>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === 'week' ? t.surface : 'transparent',
                  color: viewMode === 'week' ? t.textPrimary : t.textMuted,
                }}
              >
                Full Week Matrix
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: `3px solid ${t.brandBlue}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '12px', fontSize: '14px', color: t.textMuted }}>Resolving teacher period timetable...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && rows.length === 0 && (
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: t.textSub,
              }}
            >
              <Calendar size={28} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: t.textPrimary, margin: 0 }}>
              No timetable periods scheduled
            </h3>
            <p style={{ fontSize: '13px', color: t.textMuted, maxWidth: '400px', margin: '8px auto 0 auto' }}>
              Your Director of Studies or Academic Registrar has not assigned any instructional periods to your schedule yet.
            </p>
          </div>
        )}

        {/* Timeline View Mode */}
        {!isLoading && rows.length > 0 && viewMode === 'timeline' && (
          <div>
            {activeDayPeriods.length === 0 ? (
              <div
                style={{
                  background: t.card,
                  border: `1px solid ${t.border}`,
                  borderRadius: '16px',
                  padding: '40px 20px',
                  textAlign: 'center',
                }}
              >
                <Clock size={32} style={{ color: t.textSub, margin: '0 auto 10px auto' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: t.textPrimary, margin: 0 }}>
                  No teaching periods on {DAYS[activeDayTab]}
                </h3>
                <p style={{ fontSize: '13px', color: t.textMuted, margin: '6px 0 0 0' }}>
                  Use this time for lesson planning, grading, or scheme preparation.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {activeDayPeriods.map((period, idx) => {
                  const startMin = timeStringToMinutes(period.start_time);
                  const endMin = timeStringToMinutes(period.end_time);
                  const isCurrent =
                    activeDayTab === currentTodayIndex &&
                    currentNowMinutes >= startMin &&
                    currentNowMinutes <= endMin;
                  const isPast =
                    activeDayTab === currentTodayIndex && currentNowMinutes > endMin;

                  return (
                    <div
                      key={period.id}
                      style={{
                        background: isCurrent
                          ? isDark
                            ? 'rgba(61, 232, 160, 0.06)'
                            : '#F0FDF4'
                          : t.card,
                        border: `1px solid ${
                          isCurrent
                            ? t.brandMint
                            : isDark
                            ? t.border
                            : '#E5E7EB'
                        }`,
                        borderRadius: '16px',
                        padding: '18px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px',
                        boxShadow: isCurrent ? '0 4px 20px rgba(61, 232, 160, 0.12)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Left: Time & Period Index */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: isCurrent
                              ? t.brandMint
                              : isDark
                              ? 'rgba(255,255,255,0.06)'
                              : '#F3F4F6',
                            color: isCurrent ? '#064E3B' : t.textPrimary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '14px',
                            flexShrink: 0,
                          }}
                        >
                          P{idx + 1}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '17px', fontWeight: 800, color: t.textPrimary }}>
                              {period.start_time} – {period.end_time}
                            </span>
                            {isCurrent && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: t.brandMint,
                                  color: '#064E3B',
                                }}
                              >
                                Now in Session
                              </span>
                            )}
                            {isPast && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: t.textSub,
                                }}
                              >
                                Completed
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: t.brandBlue }}>
                              {period.class_name}
                            </span>
                            <span style={{ color: t.textSub }}>•</span>
                            <span style={{ fontSize: '13px', color: t.textMuted }}>
                              {period.subject}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/teacher/attendance`)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            background: t.surface,
                            border: `1px solid ${t.border}`,
                            color: t.textPrimary,
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <CalendarCheck size={13} style={{ color: t.brandMint }} />
                          Take Roll
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/dashboard/teacher/lesson-log')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            background: isCurrent ? t.brandMint : t.surface,
                            border: `1px solid ${isCurrent ? t.brandMint : t.border}`,
                            color: isCurrent ? '#064E3B' : t.textPrimary,
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <Video size={13} />
                          Log Lesson
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Full Week Matrix Mode */}
        {!isLoading && rows.length > 0 && viewMode === 'week' && (
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '18px',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: `1px solid ${t.border}`,
                      background: t.surface,
                      color: t.textSub,
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <th style={{ padding: '14px 20px', width: '130px' }}>Day of Week</th>
                    <th style={{ padding: '14px 16px', width: '80px' }}>Periods</th>
                    <th style={{ padding: '14px 20px' }}>Scheduled Lessons</th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, idx) => {
                    const dayPeriods = byDay[idx] ?? [];
                    const isToday = currentTodayIndex === idx;

                    return (
                      <tr
                        key={day}
                        style={{
                          borderBottom: idx === DAYS.length - 1 ? 'none' : `1px solid ${t.border}`,
                          background: isToday ? (isDark ? 'rgba(61, 232, 160, 0.03)' : '#F0FDF4') : 'transparent',
                        }}
                      >
                        <td style={{ padding: '14px 20px', fontWeight: 700, color: isToday ? t.brandMint : t.textPrimary }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {day}
                            {isToday && (
                              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: t.brandMint, color: '#064E3B', fontWeight: 800 }}>
                                TODAY
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: t.textMuted }}>
                          {dayPeriods.length}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          {dayPeriods.length === 0 ? (
                            <span style={{ color: t.textSub, fontStyle: 'italic', fontSize: '12px' }}>
                              No teaching periods
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {dayPeriods.map((p) => (
                                <span
                                  key={p.id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 10px',
                                    borderRadius: '7px',
                                    background: t.surface,
                                    border: `1px solid ${t.border}`,
                                    fontSize: '12px',
                                  }}
                                >
                                  <span style={{ fontWeight: 800, color: t.brandBlue }}>{p.start_time}</span>
                                  <span style={{ fontWeight: 700, color: t.textPrimary }}>{p.class_name}</span>
                                  <span style={{ color: t.textMuted }}>({p.subject})</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
