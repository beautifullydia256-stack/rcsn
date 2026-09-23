import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  GraduationCap,
  Trophy,
  Compass,
  Users,
  BookOpen,
  MapPin,
  UserCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Layers,
  Table as TableIcon,
  LayoutGrid,
  FileText,
  X,
  Edit3,
  Trash2,
  Bell,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';
import {
  fetchYearCalendar,
  createSchoolEvent,
  updateSchoolEvent,
  deleteSchoolEvent,
  createExamTimetableSession,
  updateExamTimetableSession,
  deleteExamTimetableSession,
} from '@/features/calendar-events/services/calendarEventService';
import type {
  SchoolEvent,
  ExamTimetableSession,
  SchoolEventType,
  TargetAudience,
  CreateSchoolEventInput,
  CreateExamSessionInput,
} from '@/features/calendar-events/types';
import AdminContentSkeleton from '@/components/layout/AdminContentSkeleton';
import { exportToExcel } from '@/lib/exportUtils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getEventTypeBadge(type: SchoolEventType, isDark: boolean) {
  switch (type) {
    case 'exam':
      return {
        label: 'Examinations',
        icon: <GraduationCap className="w-3.5 h-3.5" />,
        color: isDark ? '#a78bfa' : '#6d28d9',
        bg: isDark ? 'rgba(139, 92, 246, 0.15)' : '#ede9fe',
        border: isDark ? 'rgba(139, 92, 246, 0.3)' : '#ddd6fe',
      };
    case 'sports':
      return {
        label: 'Sports & Athletics',
        icon: <Trophy className="w-3.5 h-3.5" />,
        color: isDark ? '#38bdf8' : '#0284c7',
        bg: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
        border: isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd',
      };
    case 'tour':
      return {
        label: 'School Tour / Trip',
        icon: <Compass className="w-3.5 h-3.5" />,
        color: isDark ? '#34d399' : '#059669',
        bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
        border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0',
      };
    case 'term_dates':
      return {
        label: 'Term Dates',
        icon: <CalendarDays className="w-3.5 h-3.5" />,
        color: isDark ? '#f59e0b' : '#d97706',
        bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
        border: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a',
      };
    case 'meeting':
      return {
        label: 'Meeting / Visitation',
        icon: <Users className="w-3.5 h-3.5" />,
        color: isDark ? '#f43f5e' : '#e11d48',
        bg: isDark ? 'rgba(244, 63, 94, 0.15)' : '#ffe4e6',
        border: isDark ? 'rgba(244, 63, 94, 0.3)' : '#fecdd3',
      };
    case 'cultural':
      return {
        label: 'Cultural & Speech Day',
        icon: <Sparkles className="w-3.5 h-3.5" />,
        color: isDark ? '#ec4899' : '#db2777',
        bg: isDark ? 'rgba(236, 72, 153, 0.15)' : '#fdf2f8',
        border: isDark ? 'rgba(236, 72, 153, 0.3)' : '#fbcfe8',
      };
    default:
      return {
        label: 'School Event',
        icon: <CalendarIcon className="w-3.5 h-3.5" />,
        color: isDark ? '#94a3b8' : '#475569',
        bg: isDark ? 'rgba(148, 163, 184, 0.15)' : '#f1f5f9',
        border: isDark ? 'rgba(148, 163, 184, 0.3)' : '#e2e8f0',
      };
  }
}

function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hours = parseInt(h, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  return `${formattedHours}:${m} ${ampm}`;
}

// Generate days matrix for a month (Monday = 0 ... Sunday = 6)
function getMonthDaysMatrix(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Convert JS Sunday=0 to Monday=0 (Monday=0, Tuesday=1, ..., Sunday=6)
  let startWeekday = firstDay.getDay() - 1;
  if (startWeekday === -1) startWeekday = 6;

  const days: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  for (let i = 0; i < startWeekday; i++) {
    days.push({ day: 0, dateStr: '', isCurrentMonth: false });
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    days.push({
      day: d,
      dateStr: `${year}-${mm}-${dd}`,
      isCurrentMonth: true,
    });
  }

  return days;
}

export default function SchoolCalendarPage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.role);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tRaw = getTokens(isDark);
  const queryClient = useQueryClient();

  const t = {
    ...tRaw,
    pageBg: tRaw.screenBg,
    inputBg: tRaw.fieldBg,
    inputBorder: tRaw.stroke,
    textMuted: tRaw.textMid,
  };

  // Roles authorized to add and modify calendar events and timetables
  const canManageEvents =
    role === 'admin' || role === 'owner' || role === 'head_teacher' || role === 'dos';

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [activeTab, setActiveTab] = useState<'year_matrix' | 'month_grid' | 'exam_timetable' | 'all_events'>(
    'year_matrix'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  // Modals state
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [examSessionModalOpen, setExamSessionModalOpen] = useState(false);
  const [editingExamSession, setEditingExamSession] = useState<ExamTimetableSession | null>(null);
  const [inspectingDay, setInspectingDay] = useState<string | null>(null);

  // 1. Fetch calendar events and exam sessions for selected year
  const { data: calendarData, isLoading } = useQuery({
    queryKey: ['school-calendar', schoolId, selectedYear],
    queryFn: () => (schoolId ? fetchYearCalendar(schoolId, selectedYear) : Promise.resolve({ events: [], examSessions: [], summary: {} as any })),
    enabled: Boolean(schoolId),
  });

  const { events = [], examSessions = [], summary } = calendarData || {};

  // Unique classes from exam sessions
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    examSessions.forEach((s) => {
      if (s.class_name) set.add(s.class_name);
    });
    return Array.from(set).sort();
  }, [examSessions]);

  // Today's live events and exam sessions
  const todayActivities = useMemo(() => {
    const todayEvents = events.filter(
      (ev) => ev.start_date <= todayStr && ev.end_date >= todayStr
    );
    const todayPapers = examSessions.filter((s) => s.exam_date === todayStr);
    return { events: todayEvents, papers: todayPapers };
  }, [events, examSessions, todayStr]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        (ev.description && ev.description.toLowerCase().includes(q)) ||
        (ev.location && ev.location.toLowerCase().includes(q));

      const matchCat = categoryFilter === 'all' || ev.event_type === categoryFilter;
      return matchQ && matchCat;
    });
  }, [events, searchQuery, categoryFilter]);

  // Filtered exam sessions
  const filteredExamSessions = useMemo(() => {
    return examSessions.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        s.paper_name.toLowerCase().includes(q) ||
        (s.paper_code && s.paper_code.toLowerCase().includes(q)) ||
        (s.room_or_hall && s.room_or_hall.toLowerCase().includes(q)) ||
        (s.invigilator_name && s.invigilator_name.toLowerCase().includes(q));

      const matchClass = classFilter === 'all' || s.class_name === classFilter;
      return matchQ && matchClass;
    });
  }, [examSessions, searchQuery, classFilter]);

  // Day event map for rapid lookup across the 12-month calendar
  const eventsByDate = useMemo(() => {
    const map = new Map<string, { events: SchoolEvent[]; papers: ExamTimetableSession[] }>();

    events.forEach((ev) => {
      // Loop from start_date to end_date
      let cur = new Date(ev.start_date);
      const end = new Date(ev.end_date);
      while (cur <= end) {
        const dStr = cur.toISOString().slice(0, 10);
        if (!map.has(dStr)) map.set(dStr, { events: [], papers: [] });
        map.get(dStr)!.events.push(ev);
        cur.setDate(cur.getDate() + 1);
      }
    });

    examSessions.forEach((s) => {
      if (!map.has(s.exam_date)) map.set(s.exam_date, { events: [], papers: [] });
      map.get(s.exam_date)!.papers.push(s);
    });

    return map;
  }, [events, examSessions]);

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: (input: CreateSchoolEventInput) => {
      if (!schoolId) throw new Error('Missing schoolId');
      return createSchoolEvent(schoolId, input, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-calendar'] });
      setEventModalOpen(false);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateSchoolEventInput> }) => {
      if (!schoolId) throw new Error('Missing schoolId');
      return updateSchoolEvent(schoolId, id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-calendar'] });
      setEditingEvent(null);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => {
      if (!schoolId) throw new Error('Missing schoolId');
      return deleteSchoolEvent(schoolId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-calendar'] });
    },
  });

  const createExamSessionMutation = useMutation({
    mutationFn: (input: CreateExamSessionInput) => {
      if (!schoolId) throw new Error('Missing schoolId');
      return createExamTimetableSession(schoolId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-calendar'] });
      setExamSessionModalOpen(false);
    },
  });

  const deleteExamSessionMutation = useMutation({
    mutationFn: (id: string) => {
      if (!schoolId) throw new Error('Missing schoolId');
      return deleteExamTimetableSession(schoolId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-calendar'] });
    },
  });

  // Export handlers
  const handleExportExcel = () => {
    if (activeTab === 'exam_timetable') {
      const rows = filteredExamSessions.map((s) => ({
        Date: s.exam_date,
        'Class / Cohort': s.class_name,
        'Paper Name': s.paper_name,
        'Paper Code': s.paper_code || '-',
        Time: `${formatTimeDisplay(s.start_time)} - ${formatTimeDisplay(s.end_time)}`,
        'Exam Room / Hall': s.room_or_hall,
        Invigilator: s.invigilator_name || '-',
        Instructions: s.instructions || '-',
      }));
      exportToExcel({
        title: `Examination Timetable - Academic Year ${selectedYear}`,
        filename: `Exam_Timetable_${selectedYear}`,
        columns: [
          { header: 'Date', key: 'Date' },
          { header: 'Class / Cohort', key: 'Class / Cohort' },
          { header: 'Paper Name', key: 'Paper Name' },
          { header: 'Paper Code', key: 'Paper Code' },
          { header: 'Time', key: 'Time' },
          { header: 'Exam Room / Hall', key: 'Exam Room / Hall' },
          { header: 'Invigilator', key: 'Invigilator' },
          { header: 'Instructions', key: 'Instructions' },
        ],
        rows,
      });
    } else {
      const rows = filteredEvents.map((ev) => ({
        'Event Title': ev.title,
        Category: getEventTypeBadge(ev.event_type, isDark).label,
        'Start Date': ev.start_date,
        'End Date': ev.end_date,
        Location: ev.location || '-',
        Audience: ev.target_audience,
        'Exam Schedule Active': ev.has_exam_timetable ? 'YES' : 'NO',
        Description: ev.description || '-',
      }));
      exportToExcel({
        title: `School Academic Calendar & Year Planner - ${selectedYear}`,
        filename: `School_Calendar_${selectedYear}`,
        columns: [
          { header: 'Event Title', key: 'Event Title' },
          { header: 'Category', key: 'Category' },
          { header: 'Start Date', key: 'Start Date' },
          { header: 'End Date', key: 'End Date' },
          { header: 'Location', key: 'Location' },
          { header: 'Audience', key: 'Audience' },
          { header: 'Exam Schedule Active', key: 'Exam Schedule Active' },
          { header: 'Description', key: 'Description' },
        ],
        rows,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <AdminContentSkeleton />
      </div>
    );
  }

  return (
    <div
      className="w-full min-h-screen px-4 py-6 sm:px-6 lg:px-8 space-y-6"
      style={{
        background: t.pageBg,
        color: t.textPrimary,
        fontFamily: INTER,
      }}
    >
      {/* Top Header & Year Picker */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1">
            <CalendarDays className="w-4 h-4" />
            <span>Academic Year Calendar &amp; Operations Planner</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ fontFamily: SORA, color: t.textPrimary }}
          >
            School Calendar &amp; Exam Timetable
          </h1>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>
            Schedule academic terms, exam weeks, sports galas, and school tours with live daily class examination tracking.
          </p>
        </div>

        {/* Year Dropdown & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Year Picker */}
          <div
            className="flex items-center gap-1.5 p-1 rounded-xl shadow-xs"
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
            }}
          >
            <CalendarIcon className="w-4 h-4 ml-2" style={{ color: t.textMuted }} />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-transparent focus:outline-none cursor-pointer"
              style={{ color: t.textPrimary }}
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y} style={{ background: t.cardBg, color: t.textPrimary }}>
                  Academic Year {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              color: t.textPrimary,
            }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          {canManageEvents && (
            <>
              <button
                type="button"
                onClick={() => setExamSessionModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition-transform active:scale-95 shadow-xs"
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>+ Exam Paper</span>
              </button>

              <button
                type="button"
                onClick={() => setEventModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md transition-transform active:scale-95"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <Plus className="w-4 h-4" />
                <span>Add Event</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards: Year Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Events */}
        <div
          className="rounded-2xl p-4 shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.cardBorder}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMuted }}>
              Total Events ({selectedYear})
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold" style={{ fontFamily: SORA, color: t.textPrimary }}>
            {summary?.total_events || 0}
          </div>
          <div className="mt-1 text-xs" style={{ color: t.textMuted }}>
            Full year calendar schedules
          </div>
        </div>

        {/* KPI 2: Exam Periods & Timetabled Papers */}
        <div
          className="rounded-2xl p-4 shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.cardBorder}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMuted }}>
              Examination Periods
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-500" style={{ fontFamily: SORA }}>
            {summary?.exam_periods_count || 0}
          </div>
          <div className="mt-1 text-xs" style={{ color: t.textMuted }}>
            {summary?.total_exam_papers || 0} individual papers timetabled
          </div>
        </div>

        {/* KPI 3: Sports, Tours & Co-Curricular */}
        <div
          className="rounded-2xl p-4 shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.cardBorder}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMuted }}>
              Sports &amp; Tours
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-500" style={{ fontFamily: SORA }}>
            {summary?.sports_and_tours_count || 0}
          </div>
          <div className="mt-1 text-xs" style={{ color: t.textMuted }}>
            Field excursions &amp; sports gala competitions
          </div>
        </div>

        {/* KPI 4: Live Today's Tracker */}
        <div
          className="rounded-2xl p-4 shadow-sm"
          style={{
            background:
              todayActivities.papers.length > 0
                ? isDark
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(15, 23, 42, 0.8))'
                  : 'linear-gradient(135deg, #fef2f2, #fff1f2)'
                : cardGrad(isDark),
            border: `1px solid ${todayActivities.papers.length > 0 ? (isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca') : t.cardBorder}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${todayActivities.papers.length > 0 ? 'text-rose-500' : ''}`}
              style={{ color: todayActivities.papers.length === 0 ? t.textMuted : undefined }}
            >
              Today's Live Sessions
            </span>
            <div
              className={`p-2 rounded-xl ${todayActivities.papers.length > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-500/10 text-slate-400'}`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div
            className="mt-2 text-2xl font-bold"
            style={{
              fontFamily: SORA,
              color: todayActivities.papers.length > 0 ? '#ef4444' : t.textPrimary,
            }}
          >
            {todayActivities.papers.length} Exam {todayActivities.papers.length === 1 ? 'Paper' : 'Papers'}
          </div>
          <div className="mt-1 text-xs" style={{ color: t.textMuted }}>
            {todayActivities.events.length > 0
              ? `${todayActivities.events[0].title}`
              : 'Regular daily lessons in progress'}
          </div>
        </div>
      </div>

      {/* ── REAL-TIME "TODAY'S SCHEDULE & LIVE PAPERS" BANNER ── */}
      {(todayActivities.papers.length > 0 || todayActivities.events.length > 0) && (
        <div
          className="p-4 rounded-2xl shadow-sm border space-y-3"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(16, 185, 129, 0.08))'
              : 'linear-gradient(135deg, #f0fdf4, #eff6ff)',
            borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#bfdbfe',
          }}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Active Today ({formatDateDisplay(todayStr)})
              </span>
            </div>
            <span className="text-xs font-semibold" style={{ color: t.textMuted }}>
              Live Class &amp; Examination Session Status
            </span>
          </div>

          {todayActivities.papers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayActivities.papers.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      {p.class_name}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeDisplay(p.start_time)} - {formatTimeDisplay(p.end_time)}
                    </span>
                  </div>
                  <div className="font-bold text-sm" style={{ color: t.textPrimary }}>
                    {p.paper_name}
                  </div>
                  <div className="text-xs flex items-center justify-between" style={{ color: t.textMuted }}>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {p.room_or_hall}
                    </span>
                    {p.invigilator_name && (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        {p.invigilator_name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {todayActivities.events.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
              <span className="font-semibold" style={{ color: t.textMuted }}>
                School Events Today:
              </span>
              {todayActivities.events.map((ev) => (
                <span
                  key={ev.event_id}
                  className="px-2.5 py-1 rounded-lg font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                >
                  {ev.title} {ev.location ? `(@ ${ev.location})` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main View Tabs Bar */}
      <div
        className="p-1.5 rounded-2xl flex items-center justify-between gap-2 flex-wrap shadow-xs"
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
        }}
      >
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('year_matrix')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'year_matrix'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-500/10 text-slate-500 dark:text-slate-400'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Full-Year Matrix (12 Months)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('month_grid')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'month_grid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-500/10 text-slate-500 dark:text-slate-400'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Month Deep Dive</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('exam_timetable')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'exam_timetable'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'hover:bg-slate-500/10 text-slate-500 dark:text-slate-400'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Exam Paper Timetable ({examSessions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all_events')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all_events'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-500/10 text-slate-500 dark:text-slate-400'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>All Events List ({events.length})</span>
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search event or paper..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl focus:outline-none w-44 sm:w-56"
              style={{
                background: t.inputBg,
                border: `1px solid ${t.inputBorder}`,
                color: t.textPrimary,
              }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl focus:outline-none cursor-pointer"
            style={{
              background: t.inputBg,
              border: `1px solid ${t.inputBorder}`,
              color: t.textPrimary,
            }}
          >
            <option value="all">All Categories</option>
            <option value="exam">Examinations</option>
            <option value="sports">Sports &amp; Athletics</option>
            <option value="tour">School Tours</option>
            <option value="term_dates">Term Dates</option>
            <option value="meeting">Meetings &amp; Visitation</option>
            <option value="cultural">Cultural &amp; Speech Day</option>
          </select>

          {/* Class Filter (useful when in timetable view) */}
          {availableClasses.length > 0 && (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl focus:outline-none cursor-pointer"
              style={{
                background: t.inputBg,
                border: `1px solid ${t.inputBorder}`,
                color: t.textPrimary,
              }}
            >
              <option value="all">All Classes / Streams</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Class: {cls}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* VIEW 1: FULL-YEAR 12-MONTH MATRIX ON THE SAME PAGE                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'year_matrix' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs px-1" style={{ color: t.textMuted }}>
            <span>
              Showing complete 12-month calendar for {selectedYear}. Click any day to inspect its events &amp; papers.
            </span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Exams
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500" /> Sports
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Tours
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Term Dates
              </span>
            </div>
          </div>

          {/* 12-Month Grid (3 columns on lg, 2 on md, 1 on sm) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {MONTH_NAMES.map((mName, mIdx) => {
              const daysMatrix = getMonthDaysMatrix(selectedYear, mIdx);
              return (
                <div
                  key={mName}
                  className="rounded-2xl p-3.5 shadow-xs flex flex-col justify-between"
                  style={{
                    background: t.cardBg,
                    border: `1px solid ${t.cardBorder}`,
                  }}
                >
                  {/* Month Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                    <span className="font-bold text-sm" style={{ color: t.textPrimary }}>
                      {mName} {selectedYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMonth(mIdx);
                        setActiveTab('month_grid');
                      }}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Expand &rarr;
                    </button>
                  </div>

                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
                    {WEEKDAY_NAMES_SHORT.map((w) => (
                      <div key={w}>{w}</div>
                    ))}
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {daysMatrix.map((cell, idx) => {
                      if (!cell.isCurrentMonth) {
                        return <div key={idx} className="h-7 w-full" />;
                      }

                      const dayData = eventsByDate.get(cell.dateStr);
                      const hasEvents = (dayData?.events.length || 0) > 0;
                      const hasPapers = (dayData?.papers.length || 0) > 0;
                      const isToday = cell.dateStr === todayStr;

                      // Determine dominant color indicator
                      let markerColor = 'bg-emerald-500';
                      if (hasPapers || dayData?.events.some((e) => e.event_type === 'exam')) {
                        markerColor = 'bg-purple-500';
                      } else if (dayData?.events.some((e) => e.event_type === 'sports')) {
                        markerColor = 'bg-sky-500';
                      } else if (dayData?.events.some((e) => e.event_type === 'tour')) {
                        markerColor = 'bg-emerald-500';
                      } else if (dayData?.events.some((e) => e.event_type === 'term_dates')) {
                        markerColor = 'bg-amber-500';
                      }

                      return (
                        <button
                          key={cell.dateStr}
                          type="button"
                          onClick={() => setInspectingDay(cell.dateStr)}
                          title={`${cell.dateStr}: ${hasEvents ? `${dayData!.events.length} event(s)` : ''} ${hasPapers ? `${dayData!.papers.length} paper(s)` : ''}`}
                          className={`h-7 w-full rounded-lg flex flex-col items-center justify-center relative transition-all text-xs font-semibold ${
                            isToday
                              ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400/50'
                              : hasEvents || hasPapers
                              ? 'bg-slate-100 dark:bg-slate-800/80 hover:bg-emerald-500/10 hover:border-emerald-500'
                              : 'hover:bg-slate-500/10'
                          }`}
                          style={{
                            color: isToday ? '#ffffff' : t.textPrimary,
                          }}
                        >
                          <span>{cell.day}</span>
                          {(hasEvents || hasPapers) && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full absolute bottom-0.5 ${
                                isToday ? 'bg-white' : markerColor
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* VIEW 2: DETAILED SINGLE-MONTH DEEP DIVE                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'month_grid' && (
        <div
          className="rounded-2xl p-4 sm:p-6 shadow-xs space-y-4"
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
          }}
        >
          {/* Month Controller */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => (m === 0 ? 11 : m - 1))}
                className="p-2 rounded-xl hover:bg-slate-500/10 transition-colors"
                style={{ color: t.textPrimary }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold" style={{ fontFamily: SORA, color: t.textPrimary }}>
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => (m === 11 ? 0 : m + 1))}
                className="p-2 rounded-xl hover:bg-slate-500/10 transition-colors"
                style={{ color: t.textPrimary }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setSelectedYear(now.getFullYear());
                  setSelectedMonth(now.getMonth());
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                Go to Today
              </button>
            </div>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold" style={{ color: t.textMuted }}>
            {WEEKDAY_NAMES_SHORT.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {getMonthDaysMatrix(selectedYear, selectedMonth).map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={idx}
                    className="min-h-[90px] rounded-xl p-2 opacity-20 border border-dashed border-slate-300 dark:border-slate-800"
                  />
                );
              }

              const dayData = eventsByDate.get(cell.dateStr);
              const dayEvents = dayData?.events || [];
              const dayPapers = dayData?.papers || [];
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setInspectingDay(cell.dateStr)}
                  className={`min-h-[105px] rounded-xl p-2 border flex flex-col justify-between cursor-pointer transition-all hover:border-emerald-500 ${
                    isToday
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-xs'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-emerald-600 text-white' : ''
                      }`}
                      style={{ color: isToday ? '#fff' : t.textPrimary }}
                    >
                      {cell.day}
                    </span>
                    {(dayEvents.length > 0 || dayPapers.length > 0) && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {dayEvents.length + dayPapers.length} items
                      </span>
                    )}
                  </div>

                  {/* Event snippets in cell */}
                  <div className="space-y-1 my-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const badge = getEventTypeBadge(ev.event_type, isDark);
                      return (
                        <div
                          key={ev.event_id}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {ev.title}
                        </div>
                      );
                    })}

                    {dayPapers.slice(0, 2).map((p) => (
                      <div
                        key={p.id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold truncate bg-purple-500/15 text-purple-600 dark:text-purple-300"
                      >
                        {p.class_name}: {p.paper_name}
                      </div>
                    ))}

                    {dayEvents.length + dayPapers.length > 2 && (
                      <div className="text-[9px] font-bold text-slate-400 text-right">
                        +{dayEvents.length + dayPapers.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* VIEW 3: EXAM TIMETABLE MATRIX & LIVE CLASS SESSIONS                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'exam_timetable' && (
        <div
          className="rounded-2xl overflow-hidden shadow-xs"
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
          }}
        >
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-base" style={{ color: t.textPrimary }}>
                Examination Timetable Schedule
              </h3>
              <p className="text-xs" style={{ color: t.textMuted }}>
                Paper sessions, classes, examination halls, and assigned invigilators.
              </p>
            </div>
            {canManageEvents && (
              <button
                type="button"
                onClick={() => setExamSessionModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Timetable Paper</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                    borderBottom: `1px solid ${t.cardBorder}`,
                    color: t.textMuted,
                  }}
                >
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Class / Cohort</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Examination Paper</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Time Window</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Hall / Room</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Invigilator</th>
                  {canManageEvents && <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: t.cardBorder }}>
                {filteredExamSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No exam papers scheduled matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredExamSessions.map((s) => {
                    const isToday = s.exam_date === todayStr;
                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors ${
                          isToday ? 'bg-rose-500/5 dark:bg-rose-950/20' : 'hover:bg-slate-500/5'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold flex items-center gap-1.5" style={{ color: t.textPrimary }}>
                            <span>{formatDateDisplay(s.exam_date)}</span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500 text-white">
                                TODAY
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                          {s.class_name}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-sm" style={{ color: t.textPrimary }}>
                            {s.paper_name}
                          </div>
                          {s.paper_code && (
                            <div className="font-mono text-[11px]" style={{ color: t.textMuted }}>
                              Code: {s.paper_code}
                            </div>
                          )}
                          {s.instructions && (
                            <div className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">
                              {s.instructions}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {formatTimeDisplay(s.start_time)} - {formatTimeDisplay(s.end_time)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1" style={{ color: t.textPrimary }}>
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{s.room_or_hall}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {s.invigilator_name ? (
                            <div className="flex items-center gap-1 font-medium" style={{ color: t.textPrimary }}>
                              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                              <span>{s.invigilator_name}</span>
                            </div>
                          ) : (
                            <span style={{ color: t.textMuted }}>Not assigned</span>
                          )}
                        </td>
                        {canManageEvents && (
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete timetable session for ${s.paper_name}?`)) {
                                  deleteExamSessionMutation.mutate(s.id);
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors"
                              title="Delete Session"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* VIEW 4: ALL EVENTS CHRONOLOGICAL STREAM                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'all_events' && (
        <div
          className="rounded-2xl p-4 sm:p-6 shadow-xs space-y-3"
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
            <div>
              <h3 className="font-bold text-base" style={{ color: t.textPrimary }}>
                All Scheduled School Events ({selectedYear})
              </h3>
              <p className="text-xs" style={{ color: t.textMuted }}>
                Term dates, examination blocks, sports galas, tours, and stakeholder meetings.
              </p>
            </div>
            {canManageEvents && (
              <button
                type="button"
                onClick={() => setEventModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event</span>
              </button>
            )}
          </div>

          <div className="divide-y" style={{ borderColor: t.cardBorder }}>
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-400">No events found matching your criteria.</div>
            ) : (
              filteredEvents.map((ev) => {
                const badge = getEventTypeBadge(ev.event_type, isDark);
                const isMultiDay = ev.start_date !== ev.end_date;
                return (
                  <div key={ev.event_id} className="py-3.5 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="p-2.5 rounded-xl mt-0.5"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {badge.icon}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm" style={{ color: t.textPrimary }}>
                            {ev.title}
                          </h4>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                          {ev.has_exam_timetable && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                              Timetable Attached
                            </span>
                          )}
                        </div>

                        <div className="text-xs flex items-center gap-3 flex-wrap" style={{ color: t.textMuted }}>
                          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                            <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
                            {isMultiDay
                              ? `${formatDateDisplay(ev.start_date)} — ${formatDateDisplay(ev.end_date)}`
                              : formatDateDisplay(ev.start_date)}
                          </span>

                          {ev.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {ev.location}
                            </span>
                          )}

                          <span className="flex items-center gap-1 capitalize">
                            <Users className="w-3.5 h-3.5" />
                            Audience: {ev.target_audience}
                          </span>
                        </div>

                        {ev.description && (
                          <p className="text-xs leading-relaxed max-w-2xl text-slate-500 dark:text-slate-400">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {canManageEvents && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingEvent(ev)}
                          className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400"
                          title="Edit Event"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete event "${ev.title}"?`)) {
                              deleteEventMutation.mutate(ev.event_id);
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: ADD / EDIT SCHOOL EVENT                                   */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {(eventModalOpen || editingEvent) && (
        <AddEditEventModal
          isDark={isDark}
          t={t}
          initialEvent={editingEvent}
          defaultYear={selectedYear}
          onClose={() => {
            setEventModalOpen(false);
            setEditingEvent(null);
          }}
          onSave={(input) => {
            if (editingEvent) {
              updateEventMutation.mutate({ id: editingEvent.event_id, input });
            } else {
              createEventMutation.mutate(input as CreateSchoolEventInput);
            }
          }}
        />
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: SCHEDULE EXAM PAPER SESSION                               */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {examSessionModalOpen && (
        <AddExamSessionModal
          isDark={isDark}
          t={t}
          examEvents={events.filter((e) => e.event_type === 'exam')}
          defaultYear={selectedYear}
          onClose={() => setExamSessionModalOpen(false)}
          onSave={(input) => createExamSessionMutation.mutate(input)}
        />
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: DAY INSPECTOR DRAWER                                      */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {inspectingDay && (
        <DayInspectorModal
          isDark={isDark}
          t={t}
          dateStr={inspectingDay}
          dayData={eventsByDate.get(inspectingDay) || { events: [], papers: [] }}
          canManage={canManageEvents}
          onClose={() => setInspectingDay(null)}
          onAddPaper={() => {
            setInspectingDay(null);
            setExamSessionModalOpen(true);
          }}
          onAddEvent={() => {
            setInspectingDay(null);
            setEventModalOpen(true);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENT: Add / Edit Event Modal
// ─────────────────────────────────────────────────────────────────────────────

function AddEditEventModal({
  isDark,
  t,
  initialEvent,
  defaultYear,
  onClose,
  onSave,
}: {
  isDark: boolean;
  t: any;
  initialEvent: SchoolEvent | null;
  defaultYear: number;
  onClose: () => void;
  onSave: (input: Partial<CreateSchoolEventInput>) => void;
}) {
  const [title, setTitle] = useState(initialEvent?.title || '');
  const [eventType, setEventType] = useState<SchoolEventType>(initialEvent?.event_type || 'exam');
  const [startDate, setStartDate] = useState(
    initialEvent?.start_date || `${defaultYear}-06-01`
  );
  const [endDate, setEndDate] = useState(
    initialEvent?.end_date || initialEvent?.start_date || `${defaultYear}-06-05`
  );
  const [location, setLocation] = useState(initialEvent?.location || '');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>(
    initialEvent?.target_audience || 'all'
  );
  const [hasExamTimetable, setHasExamTimetable] = useState(
    initialEvent ? initialEvent.has_exam_timetable : eventType === 'exam'
  );
  const [description, setDescription] = useState(initialEvent?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) {
      alert('Please specify an event title and start date.');
      return;
    }

    onSave({
      title: title.trim(),
      event_type: eventType,
      start_date: startDate,
      end_date: endDate || startDate,
      location: location.trim() || null,
      target_audience: targetAudience,
      has_exam_timetable: eventType === 'exam' ? true : hasExamTimetable,
      description: description.trim() || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          color: t.textPrimary,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ fontFamily: SORA }}>
                {initialEvent ? 'Edit Calendar Event' : 'Add School Calendar Event'}
              </h3>
              <p className="text-xs" style={{ color: t.textMuted }}>
                Exams, sports, tours, holidays, and term dates
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-500/10 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. End of Term 2 Examinations, Annual Sports Gala"
              className="w-full px-3 py-2 rounded-xl focus:outline-none"
              style={{
                background: t.inputBg,
                border: `1px solid ${t.inputBorder}`,
                color: t.textPrimary,
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
                Event Category *
              </label>
              <select
                value={eventType}
                onChange={(e) => {
                  const val = e.target.value as SchoolEventType;
                  setEventType(val);
                  if (val === 'exam') setHasExamTimetable(true);
                }}
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  color: t.textPrimary,
                }}
              >
                <option value="exam">Examination / Assessment Period</option>
                <option value="sports">Sports &amp; Athletics</option>
                <option value="tour">School Tour / Excursion</option>
                <option value="term_dates">Term Dates (Opening/Closing)</option>
                <option value="meeting">Meeting / Parent Visitation</option>
                <option value="cultural">Cultural Gala &amp; Speech Day</option>
                <option value="holiday">School / Public Holiday</option>
                <option value="other">General Event</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  color: t.textPrimary,
                }}
              >
                <option value="all">Entire School Community</option>
                <option value="students">Students Only</option>
                <option value="staff">Teaching &amp; Support Staff</option>
                <option value="parents">Parents &amp; Guardians</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
                Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  color: t.textPrimary,
                }}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
                End Date (For multi-day blocks) *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  color: t.textPrimary,
                }}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
              Location / Venue
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Main Examination Hall, Sports Grounds, Jinja Source of Nile"
              className="w-full px-3 py-2 rounded-xl focus:outline-none"
              style={{
                background: t.inputBg,
                border: `1px solid ${t.inputBorder}`,
                color: t.textPrimary,
              }}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
              Event Notes / Instructions
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Full uniform required. Examination identity cards to be inspected at the door."
              className="w-full px-3 py-2 rounded-xl focus:outline-none"
              style={{
                background: t.inputBg,
                border: `1px solid ${t.inputBorder}`,
                color: t.textPrimary,
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-500/10 transition-colors"
              style={{ color: t.textMuted }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm"
            >
              {initialEvent ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENT: Schedule Exam Paper Modal
// ─────────────────────────────────────────────────────────────────────────────

function AddExamSessionModal({
  isDark,
  t,
  examEvents,
  defaultYear,
  onClose,
  onSave,
}: {
  isDark: boolean;
  t: any;
  examEvents: SchoolEvent[];
  defaultYear: number;
  onClose: () => void;
  onSave: (input: CreateExamSessionInput) => void;
}) {
  const [selectedEventId, setSelectedEventId] = useState(examEvents[0]?.event_id || '');
  const [paperName, setPaperName] = useState('');
  const [paperCode, setPaperCode] = useState('');
  const [className, setClassName] = useState('Senior 4');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:30');
  const [room, setRoom] = useState('Main Examination Hall');
  const [invigilator, setInvigilator] = useState('');
  const [instructions, setInstructions] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paperName.trim() || !className.trim() || !examDate) {
      alert('Please fill in paper name, class, and examination date.');
      return;
    }

    onSave({
      event_id: selectedEventId || `ev-manual-exam-${defaultYear}`,
      paper_name: paperName.trim(),
      paper_code: paperCode.trim() || null,
      class_name: className.trim(),
      exam_date: examDate,
      start_time: startTime,
      end_time: endTime,
      room_or_hall: room.trim() || 'Main Exam Hall',
      invigilator_name: invigilator.trim() || null,
      instructions: instructions.trim() || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          color: t.textPrimary,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ fontFamily: SORA }}>
                Schedule Examination Paper
              </h3>
              <p className="text-xs" style={{ color: t.textMuted }}>
                Add to the class exam timetable
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-500/10 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {examEvents.length > 0 && (
            <div>
              <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
                Parent Examination Period
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  color: t.textPrimary,
                }}
              >
                {examEvents.map((ev) => (
                  <option key={ev.event_id} value={ev.event_id}>
                    {ev.title} ({formatDateDisplay(ev.start_date)} - {formatDateDisplay(ev.end_date)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
                Paper Name *
              </label>
              <input
                type="text"
                required
                value={paperName}
                onChange={(e) => setPaperName(e.target.value)}
                placeholder="e.g. Mathematics Paper 1"
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  color: t.textPrimary,
                }}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
                Paper Code (Optional)
              </label>
              <input
                type="text"
                value={paperCode}
                onChange={(e) => setPaperCode(e.target.value)}
                placeholder="e.g. 456/1, PHY-P3"
                className="w-full px-3 py-2 rounded-xl focus:outline-none font-mono"
                style={{
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  color: t.textPrimary,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
                Class / Cohort *
              </label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Senior 4, Senior 1, Primary 7"
                className="w-full px-3 py-2 rounded-xl focus:outline-none font-semibold"
                style={{
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  color: t.textPrimary,
                }}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
                Examination Date *
              </label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  color: t.textPrimary,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
                Start Time *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  color: t.textPrimary,
                }}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
                End Time *
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  color: t.textPrimary,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
                Hall / Examination Room *
              </label>
              <input
                type="text"
                required
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. Main Exam Hall A, Lab 2"
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  color: t.textPrimary,
                }}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
                Invigilator / Supervisor
              </label>
              <input
                type="text"
                value={invigilator}
                onChange={(e) => setInvigilator(e.target.value)}
                placeholder="e.g. Mr. Mukasa John"
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{
                  background: t.inputBg,
                  border: `1px solid ${t.inputBorder}`,
                  color: t.textPrimary,
                }}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1" style={{ color: t.textMuted }}>
              Special Paper Instructions
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Calculators allowed. Bring drawing instruments."
              className="w-full px-3 py-2 rounded-xl focus:outline-none"
              style={{
                background: t.inputBg,
                border: `1px solid ${t.inputBorder}`,
                color: t.textPrimary,
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-500/10 transition-colors"
              style={{ color: t.textMuted }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm"
            >
              Schedule Paper
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENT: Day Inspector Drawer / Modal
// ─────────────────────────────────────────────────────────────────────────────

function DayInspectorModal({
  isDark,
  t,
  dateStr,
  dayData,
  canManage,
  onClose,
  onAddPaper,
  onAddEvent,
}: {
  isDark: boolean;
  t: any;
  dateStr: string;
  dayData: { events: SchoolEvent[]; papers: ExamTimetableSession[] };
  canManage: boolean;
  onClose: () => void;
  onAddPaper: () => void;
  onAddEvent: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          color: t.textPrimary,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">
              Day Agenda &amp; Activities
            </span>
            <h3 className="text-lg font-bold" style={{ fontFamily: SORA, color: t.textPrimary }}>
              {formatDateDisplay(dateStr)}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-500/10 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 text-xs">
          {dayData.events.length === 0 && dayData.papers.length === 0 ? (
            <div className="p-8 text-center" style={{ color: t.textMuted }}>
              No special events or exam papers scheduled on this date.
            </div>
          ) : (
            <>
              {/* Examination Papers Scheduled */}
              {dayData.papers.length > 0 && (
                <div className="space-y-2">
                  <div className="font-bold text-indigo-500 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <GraduationCap className="w-4 h-4" />
                    <span>Examination Papers ({dayData.papers.length})</span>
                  </div>
                  {dayData.papers.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          {p.class_name}: {p.paper_name}
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatTimeDisplay(p.start_time)} - {formatTimeDisplay(p.end_time)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {p.room_or_hall}
                        </span>
                        {p.invigilator_name && (
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            {p.invigilator_name}
                          </span>
                        )}
                      </div>
                      {p.instructions && (
                        <div className="text-[11px] text-slate-500 italic">Note: {p.instructions}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* School Events */}
              {dayData.events.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="font-bold text-emerald-500 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <CalendarDays className="w-4 h-4" />
                    <span>Calendar Events ({dayData.events.length})</span>
                  </div>
                  {dayData.events.map((ev) => {
                    const badge = getEventTypeBadge(ev.event_type, isDark);
                    return (
                      <div
                        key={ev.event_id}
                        className="p-3 rounded-xl border space-y-1"
                        style={{ background: badge.bg, borderColor: badge.border }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm" style={{ color: badge.color }}>
                            {ev.title}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                        </div>
                        {ev.location && (
                          <div className="flex items-center gap-1 text-[11px]" style={{ color: t.textMuted }}>
                            <MapPin className="w-3 h-3" />
                            {ev.location}
                          </div>
                        )}
                        {ev.description && (
                          <p className="text-[11px] leading-relaxed" style={{ color: t.textMuted }}>
                            {ev.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          {canManage ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onAddPaper}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
              >
                + Paper
              </button>
              <button
                type="button"
                onClick={onAddEvent}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white"
              >
                + Event
              </button>
            </div>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
