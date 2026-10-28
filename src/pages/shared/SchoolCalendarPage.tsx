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
  Award,
  Info,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';
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
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import '@/styles/government-system.css';
import { exportToExcel } from '@/lib/exportUtils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getEventTypeBadge(type: SchoolEventType, isDark: boolean) {
  const normalized = (type || '').toLowerCase();
  if (
    normalized.includes('exam') ||
    normalized.includes('paper') ||
    normalized.includes('assessment') ||
    normalized.includes('test') ||
    normalized.includes('unmeb')
  ) {
    return {
      label: type || 'Examination',
      icon: <GraduationCap className="w-3.5 h-3.5" />,
      color: isDark ? '#a78bfa' : '#6d28d9',
      bg: isDark ? 'rgba(139, 92, 246, 0.15)' : '#ede9fe',
      border: isDark ? 'rgba(139, 92, 246, 0.3)' : '#ddd6fe',
    };
  }
  if (
    normalized.includes('clinic') ||
    normalized.includes('practic') ||
    normalized.includes('hospital') ||
    normalized.includes('ward') ||
    normalized.includes('rotation')
  ) {
    return {
      label: type || 'Clinical Practicum',
      icon: <BookOpen className="w-3.5 h-3.5" />,
      color: isDark ? '#34d399' : '#059669',
      bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
      border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0',
    };
  }
  if (normalized.includes('sport') || normalized.includes('athletic')) {
    return {
      label: type || 'Sports & Athletics',
      icon: <Trophy className="w-3.5 h-3.5" />,
      color: isDark ? '#38bdf8' : '#0284c7',
      bg: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
      border: isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd',
    };
  }
  if (
    normalized.includes('ceremony') ||
    normalized.includes('capping') ||
    normalized.includes('graduation')
  ) {
    return {
      label: type || 'Ceremony',
      icon: <Award className="w-3.5 h-3.5" />,
      color: isDark ? '#ec4899' : '#db2777',
      bg: isDark ? 'rgba(236, 72, 153, 0.15)' : '#fdf2f8',
      border: isDark ? 'rgba(236, 72, 153, 0.3)' : '#fbcfe8',
    };
  }
  if (
    normalized.includes('meet') ||
    normalized.includes('board') ||
    normalized.includes('assembly') ||
    normalized.includes('symposium')
  ) {
    return {
      label: type || 'Meeting / Assembly',
      icon: <Users className="w-3.5 h-3.5" />,
      color: isDark ? '#f43f5e' : '#e11d48',
      bg: isDark ? 'rgba(244, 63, 94, 0.15)' : '#ffe4e6',
      border: isDark ? 'rgba(244, 63, 94, 0.3)' : '#fecdd3',
    };
  }
  if (normalized.includes('academic') || normalized.includes('calendar')) {
    return {
      label: type || 'Academic Calendar',
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      color: isDark ? '#f59e0b' : '#d97706',
      bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
      border: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a',
    };
  }
  return {
    label: type || 'Calendar Event',
    icon: <CalendarIcon className="w-3.5 h-3.5" />,
    color: isDark ? '#94a3b8' : '#475569',
    bg: isDark ? 'rgba(148, 163, 184, 0.15)' : '#f1f5f9',
    border: isDark ? 'rgba(148, 163, 184, 0.3)' : '#e2e8f0',
  };
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

  // Unique event categories derived dynamically from loaded events
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((ev) => {
      if (ev.event_type) set.add(ev.event_type);
    });
    return Array.from(set).sort();
  }, [events]);

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

      const matchCat =
        categoryFilter === 'all' ||
        ev.event_type?.toLowerCase() === categoryFilter.toLowerCase();
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
    <AdminPageWrapper>
      <div className="space-y-4">
        {/* ── 1. TOP HEADER (GOVERNMENT DESIGN SYSTEM STANDARD) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans m-0">
              Institutional Calendar &amp; Planner
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
              ACADEMIC YEAR {selectedYear}
            </span>
          </div>

          {/* Action Button Group */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Year Picker */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="gov-select w-auto text-xs font-mono"
              aria-label="Select Academic Year"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleExportExcel}
              className="gov-btn gov-btn-sm"
              title="Export Excel Calendar"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            {canManageEvents && (
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null);
                  setEventModalOpen(true);
                }}
                className="gov-btn gov-btn-sm gov-btn-primary"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event</span>
              </button>
            )}
          </div>
        </div>

        {/* ── 2. METRIC SUMMARY BOXES (PLAIN, HIGH-DENSITY, NO FLUFF) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              Total Events ({selectedYear})
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {summary?.total_events || 0}
            </div>
          </div>

          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              Examination Periods
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {summary?.exam_periods_count || 0}
            </div>
          </div>

          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              Sports &amp; Tours
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {summary?.sports_and_tours_count || 0}
            </div>
          </div>

          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              Today's Live Sessions
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {todayActivities.papers.length} {todayActivities.papers.length === 1 ? 'Paper' : 'Papers'}
            </div>
          </div>
        </div>

        {/* ── 3. CONTROLS & NAVIGATION BAR ── */}
        <div className="gov-control-bar">
          <div className="gov-control-bar-left flex-wrap">
            {/* View Tabs */}
            <div className="inline-flex p-0.5 bg-[#EAEAEA] border border-[#CCCCCC] rounded gap-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('year_matrix')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  activeTab === 'year_matrix'
                    ? 'bg-white text-[#111111] shadow-xs'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                12-Month Matrix
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('month_grid')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  activeTab === 'month_grid'
                    ? 'bg-white text-[#111111] shadow-xs'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Month Deep Dive
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('exam_timetable')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  activeTab === 'exam_timetable'
                    ? 'bg-white text-[#111111] shadow-xs'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                Exam Timetable ({examSessions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all_events')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                  activeTab === 'all_events'
                    ? 'bg-white text-[#111111] shadow-xs'
                    : 'text-[#555555] hover:text-[#111111]'
                }`}
              >
                All Events ({events.length})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-[#555555] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search event or paper..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="gov-input pl-8 font-mono text-xs"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="gov-select w-auto text-xs"
              aria-label="Filter Category"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Class Filter */}
            {availableClasses.length > 0 && (
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="gov-select w-auto text-xs"
                aria-label="Filter Class"
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
                      if (
                        hasPapers ||
                        dayData?.events.some(
                          (e) =>
                            e.event_type?.toLowerCase().includes('exam') ||
                            e.event_type?.toLowerCase().includes('paper')
                        )
                      ) {
                        markerColor = 'bg-purple-500';
                      } else if (
                        dayData?.events.some(
                          (e) =>
                            e.event_type?.toLowerCase().includes('clinic') ||
                            e.event_type?.toLowerCase().includes('practic')
                        )
                      ) {
                        markerColor = 'bg-teal-500';
                      } else if (dayData?.events.some((e) => e.event_type?.toLowerCase().includes('sport'))) {
                        markerColor = 'bg-sky-500';
                      } else if (dayData?.events.some((e) => e.event_type?.toLowerCase().includes('ceremony'))) {
                        markerColor = 'bg-pink-500';
                      } else if (dayData?.events.some((e) => e.event_type?.toLowerCase().includes('calendar'))) {
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
                Modular examination schedules, cohorts, examination venues, and time windows.
              </p>
            </div>
            {canManageEvents && (
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null);
                  setEventModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event</span>
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
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Course / Cohort</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Examination Paper</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Time Window</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Venue / Room</th>
                  {canManageEvents && <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: t.cardBorder }}>
                {filteredExamSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
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
          onAddEvent={() => {
            setInspectingDay(null);
            setEditingEvent(null);
            setEventModalOpen(true);
          }}
        />
      )}
      </div>
    </AdminPageWrapper>
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
  const [eventType, setEventType] = useState<string>(initialEvent?.event_type || '');
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
    initialEvent ? initialEvent.has_exam_timetable : false
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
      event_type: eventType.trim() || 'General Event',
      start_date: startDate,
      end_date: endDate || startDate,
      location: location.trim() || null,
      target_audience: targetAudience,
      has_exam_timetable:
        eventType.toLowerCase().includes('exam') ||
        eventType.toLowerCase().includes('paper') ||
        hasExamTimetable,
      description: description.trim() || null,
    });
  };

  return (
    <NativeModal
      isOpen={true}
      onClose={onClose}
      title={initialEvent ? 'Edit Calendar Event' : 'Add School Calendar Event'}
      subtitle="Institutional calendar, examinations, clinical rotations, and events"
      icon={CalendarDays}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-white">
        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1">
            Event Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Semester Final Examinations, Clinical Practicum, UNMEB Licensure Mocks"
            className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Event Category *
            </label>
            <input
              type="text"
              required
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="e.g. Examination, Clinical Practicum, Academic Calendar, Symposium"
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Target Audience
            </label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-slate-900/90 dark:bg-black/90 hover:border-white/35 focus:border-white/70 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            >
              <option value="all" className="bg-slate-900 text-white">Entire School Community</option>
              <option value="students" className="bg-slate-900 text-white">Students Only</option>
              <option value="staff" className="bg-slate-900 text-white">Teaching &amp; Support Staff</option>
              <option value="parents" className="bg-slate-900 text-white">Parents &amp; Guardians</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              End Date (For multi-day blocks) *
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1">
            Location / Venue
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Main Examination Hall, Sports Grounds, Jinja Source of Nile"
            className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1">
            Event Notes / Instructions
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Full uniform required. Examination identity cards to be inspected at the door."
            className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/25"
          >
            {initialEvent ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </form>
    </NativeModal>
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
  const [className, setClassName] = useState('');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [room, setRoom] = useState('Main Examination Hall');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paperName.trim() || !className.trim() || !examDate) {
      alert('Please fill in paper name, course/cohort, and examination date.');
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
      room_or_hall: room.trim() || 'Main Examination Hall',
      invigilator_name: null,
      instructions: null,
    });
  };

  return (
    <NativeModal
      isOpen={true}
      onClose={onClose}
      title="Schedule Examination Session"
      subtitle="Add to the examination timetable schedule"
      icon={GraduationCap}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-white">
        {examEvents.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Examination Period / Block
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-slate-900/90 dark:bg-black/90 hover:border-white/35 focus:border-white/70 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            >
              {examEvents.map((ev) => (
                <option key={ev.event_id} value={ev.event_id} className="bg-slate-900 text-white">
                  {ev.title} ({formatDateDisplay(ev.start_date)} - {formatDateDisplay(ev.end_date)})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Examination Paper Name *
            </label>
            <input
              type="text"
              required
              value={paperName}
              onChange={(e) => setPaperName(e.target.value)}
              placeholder="e.g. Anatomy & Physiology for Nurses, Foundations of Nursing"
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Paper Code (Optional)
            </label>
            <input
              type="text"
              value={paperCode}
              onChange={(e) => setPaperCode(e.target.value)}
              placeholder="e.g. NR-111, MW-121, UNMEB-NR1"
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Course / Cohort *
            </label>
            <input
              type="text"
              required
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Certificate in Nursing (Year 1), Diploma in Midwifery"
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Examination Date *
            </label>
            <input
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Start Time *
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              End Time *
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1">
            Examination Venue / Room *
          </label>
          <input
            type="text"
            required
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="e.g. Main Examination Hall, Skills Lab A"
            className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-400 transition shadow-lg shadow-indigo-500/25"
          >
            Schedule Paper
          </button>
        </div>
      </form>
    </NativeModal>
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
  onAddEvent,
}: {
  isDark: boolean;
  t: any;
  dateStr: string;
  dayData: { events: SchoolEvent[]; papers: ExamTimetableSession[] };
  canManage: boolean;
  onClose: () => void;
  onAddEvent: () => void;
}) {
  return (
    <NativeModal
      isOpen={true}
      onClose={onClose}
      title={formatDateDisplay(dateStr)}
      subtitle="Day Agenda & Activities"
      icon={CalendarDays}
      size="lg"
    >
      <div className="space-y-4 text-white">
        <div className="max-h-[55vh] overflow-y-auto space-y-3 pr-1 text-xs">
          {dayData.events.length === 0 && dayData.papers.length === 0 ? (
            <div className="p-8 text-center text-white/50 bg-white/5 rounded-2xl border border-white/10">
              No special events or exam papers scheduled on this date.
            </div>
          ) : (
            <>
              {/* Examination Papers Scheduled */}
              {dayData.papers.length > 0 && (
                <div className="space-y-2">
                  <div className="font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <GraduationCap className="w-4 h-4" />
                    <span>Examination Papers ({dayData.papers.length})</span>
                  </div>
                  {dayData.papers.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-indigo-400/30 bg-indigo-500/10 space-y-1.5 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-indigo-200">
                          {p.class_name}: {p.paper_name}
                        </span>
                        <span className="font-semibold text-emerald-300">
                          {formatTimeDisplay(p.start_time)} - {formatTimeDisplay(p.end_time)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-white/70">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          <span>{p.room_or_hall}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* School Events */}
              {dayData.events.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <CalendarDays className="w-4 h-4" />
                    <span>Calendar Events ({dayData.events.length})</span>
                  </div>
                  {dayData.events.map((ev) => {
                    const badge = getEventTypeBadge(ev.event_type, true);
                    return (
                      <div
                        key={ev.event_id}
                        className="p-3 rounded-xl border border-white/15 bg-white/5 space-y-1 backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">
                            {ev.title}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold border border-white/20"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                        </div>
                        {ev.location && (
                          <div className="flex items-center gap-1 text-[11px] text-white/70">
                            <MapPin className="w-3 h-3 text-white/50" />
                            {ev.location}
                          </div>
                        )}
                        {ev.description && (
                          <p className="text-[11px] leading-relaxed text-white/60">
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

        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
          {canManage ? (
            <button
              type="button"
              onClick={onAddEvent}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            Close
          </button>
        </div>
      </div>
    </NativeModal>
  );
}
