import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, PosTokens } from '@/styles/posThemeTokens';
import { todayDbDayOfWeek } from '@/lib/schoolCalendarDate';
import {
  Calendar,
  Clock,
  Printer,
  LayoutGrid,
  List,
  Sparkles,
  MapPin,
  User,
} from 'lucide-react';

interface TimetablePeriod {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject: string;
  room?: string | null;
  teacher_id?: string | null;
  teacher_name?: string | null;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentTimetablePage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined);
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t: PosTokens = getTokens(isDark);

  const initialDay = useMemo(() => {
    const today = todayDbDayOfWeek();
    return DAYS.includes(today) ? today : 'Monday';
  }, []);

  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [viewMode, setViewMode] = useState<'timeline' | 'matrix'>('timeline');

  // 1. Resolve student class
  const { data: studentData } = useQuery({
    queryKey: ['student-timetable-profile', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: u } = await supabase
        .from('users')
        .select('student_id, school_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const sid = (u as any)?.student_id;
      const schId = (u as any)?.school_id || schoolId;

      if (sid && schId) {
        const { data: st } = await supabase
          .from('students')
          .select('student_id, name, current_class')
          .eq('student_id', sid)
          .eq('school_id', schId)
          .maybeSingle();
        return st;
      }
      return null;
    },
    enabled: !!user?.id,
  });

  const className = studentData?.current_class;

  // 2. Fetch all timetable periods for student's class
  const { data: periods = [], isLoading } = useQuery<TimetablePeriod[]>({
    queryKey: ['student-class-timetable', schoolId, className],
    queryFn: async () => {
      if (!schoolId || !className) return [];

      const { data: rows, error } = await supabase
        .from('timetable_periods')
        .select('*')
        .eq('school_id', schoolId)
        .eq('class_name', className)
        .order('start_time', { ascending: true });

      if (error) throw error;
      if (!rows || rows.length === 0) return [];

      const teacherIds = [...new Set(rows.map((r: any) => r.teacher_id).filter(Boolean))];
      let tMap = new Map<string, string>();
      if (teacherIds.length > 0) {
        const { data: teachers } = await supabase
          .from('teachers')
          .select('teacher_id, name')
          .in('teacher_id', teacherIds);
        (teachers || []).forEach((tch: any) => tMap.set(tch.teacher_id, tch.name));
      }

      return rows.map((r: any) => ({
        id: r.id,
        day_of_week: r.day_of_week,
        start_time: r.start_time?.slice(0, 5) || '08:00',
        end_time: r.end_time?.slice(0, 5) || '09:00',
        subject: r.subject || 'General Lesson',
        room: r.room || null,
        teacher_id: r.teacher_id,
        teacher_name: tMap.get(r.teacher_id) || 'Subject Teacher',
      }));
    },
    enabled: !!schoolId && !!className,
  });

  // Filter periods for selected day
  const dayPeriods = useMemo(() => {
    return periods.filter((p) => p.day_of_week.toLowerCase() === selectedDay.toLowerCase());
  }, [periods, selectedDay]);

  // Check if period is active right now
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayDay = todayDbDayOfWeek();

  const isPeriodActive = (p: TimetablePeriod) => {
    if (selectedDay.toLowerCase() !== todayDay.toLowerCase()) return false;
    const [sh, sm] = p.start_time.split(':').map(Number);
    const [eh, em] = p.end_time.split(':').map(Number);
    const sMin = sh * 60 + sm;
    const eMin = eh * 60 + em;
    return currentMinutes >= sMin && currentMinutes < eMin;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ color: t.textPrimary }}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
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
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 99,
                background: t.mintDim,
                color: t.mint,
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              <Calendar className="w-3 h-3" />
              Weekly Schedule
            </span>
            <span style={{ fontSize: 12, color: t.textMuted }}>· {className || 'Class Timetable'}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: t.textPrimary }}>
            Class Timetable & Schedule
          </h1>
          <p style={{ margin: '3px 0 0', color: t.textSecondary, fontSize: 13 }}>
            Official periods, subject times, allocated instructors, and venue rooms.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', background: t.surface, padding: 3, borderRadius: 8, border: `1px solid ${t.border}` }}>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 10px',
                borderRadius: 6,
                background: viewMode === 'timeline' ? t.mint : 'transparent',
                color: viewMode === 'timeline' ? '#05080f' : t.textSecondary,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <List className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 10px',
                borderRadius: 6,
                background: viewMode === 'matrix' ? t.mint : 'transparent',
                color: viewMode === 'matrix' ? '#05080f' : t.textSecondary,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Week Matrix</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.textPrimary,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ── Day Selector Tabs ────────────────────────────────────────────────── */}
      {viewMode === 'timeline' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {DAYS.map((day) => {
            const isToday = day.toLowerCase() === todayDay.toLowerCase();
            const isSelected = day.toLowerCase() === selectedDay.toLowerCase();
            const count = periods.filter((p) => p.day_of_week.toLowerCase() === day.toLowerCase()).length;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 10,
                  background: isSelected ? t.mint : t.card,
                  color: isSelected ? '#05080f' : t.textSecondary,
                  border: `1px solid ${isSelected ? 'transparent' : t.border}`,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{day}</span>
                {isToday && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: isSelected ? '#05080f' : t.mint,
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 99,
                    background: isSelected ? 'rgba(0,0,0,0.18)' : t.surface,
                    color: isSelected ? '#05080f' : t.textMuted,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Daily Timeline View ──────────────────────────────────────────────── */}
      {viewMode === 'timeline' && (
        <div>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>
              Loading timetable schedule…
            </div>
          ) : dayPeriods.length === 0 ? (
            <div
              style={{
                background: t.card,
                border: `1px solid ${t.border}`,
                borderRadius: 16,
                padding: '48px 24px',
                textAlign: 'center',
                color: t.textMuted,
              }}
            >
              <Calendar className="w-10 h-10 opacity-30 mx-auto mb-3" />
              <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
                No periods scheduled on {selectedDay}
              </div>
              <div style={{ fontSize: 13 }}>
                Lessons entered by the Director of Studies and class teachers will appear here.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dayPeriods.map((period, index) => {
                const active = isPeriodActive(period);
                return (
                  <div
                    key={period.id}
                    style={{
                      background: active
                        ? isDark
                          ? 'rgba(16,217,168,0.08)'
                          : 'rgba(16,217,168,0.12)'
                        : t.card,
                      border: `1px solid ${active ? 'rgba(16,217,168,0.35)' : t.border}`,
                      borderRadius: 16,
                      padding: '18px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 16,
                      boxShadow: active ? '0 4px 20px rgba(16,217,168,0.08)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: active ? t.mint : t.surface,
                          color: active ? '#05080f' : t.textPrimary,
                          fontSize: 14,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        P{index + 1}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary }}>
                            {period.subject}
                          </span>
                          {active && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                borderRadius: 99,
                                background: t.mintDim,
                                color: t.mint,
                                fontSize: 10,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.mint, display: 'inline-block' }} />
                              Active Now
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: t.textSecondary }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {period.teacher_name || 'Subject Teacher'}
                          </span>
                          {period.room && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              Room: {period.room}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 14px',
                        borderRadius: 10,
                        background: t.surface,
                        border: `1px solid ${t.border}`,
                        fontSize: 13,
                        fontWeight: 700,
                        color: t.textPrimary,
                      }}
                    >
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>{period.start_time} – {period.end_time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Week Matrix View ─────────────────────────────────────────────────── */}
      {viewMode === 'matrix' && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 18, padding: '20px', overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(180px, 1fr))', gap: 12 }}>
            {DAYS.map((day) => {
              const currentDayPeriods = periods.filter((p) => p.day_of_week.toLowerCase() === day.toLowerCase());
              return (
                <div key={day} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: '12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary, borderBottom: `1px solid ${t.border}`, paddingBottom: 8, marginBottom: 10 }}>
                    {day}
                  </div>
                  {currentDayPeriods.length === 0 ? (
                    <div style={{ fontSize: 11, color: t.textMuted, textAlign: 'center', padding: '16px 0' }}>
                      No periods
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {currentDayPeriods.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            background: t.card,
                            border: `1px solid ${t.border}`,
                            borderRadius: 8,
                            padding: '8px 10px',
                          }}
                        >
                          <div style={{ fontSize: 10, fontWeight: 700, color: t.mint }}>{p.start_time} – {p.end_time}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginTop: 2 }}>{p.subject}</div>
                          <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>{p.teacher_name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
