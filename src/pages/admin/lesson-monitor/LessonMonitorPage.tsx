import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  X,
  Download,
  RefreshCw,
  BookOpen,
  Clock,
  Calendar,
  AlertCircle,
  FileCheck,
  AlertTriangle,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import NativeModal from '@/components/NativeModal';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import { useAcademicPeriod } from '@/lib/academicPeriodTerminology';
import { SORA, INTER } from '@/styles/posThemeTokens';

/* ─── Types ────────────────────────────────────────────────────────── */
type LogStatus = 'started' | 'completed' | 'approved' | 'auto_expired';

interface SchoolTerm {
  id: string;
  term: number;
  year: number;
  start_date: string;
  end_date: string;
  is_current?: boolean;
}

interface LessonLog {
  log_id: string;
  teacher_id: string;
  class_name: string;
  subject: string;
  lesson_date: string;
  scheduled_start: string;
  scheduled_end: string;
  started_at: string | null;
  ended_at: string | null;
  status: LogStatus;
  approved_by: string | null;
  approved_at: string | null;
  teacher_name?: string;
}

interface PhotoUrls {
  startUrl: string | null;
  endUrl: string | null;
}

/* ─── Helpers ──────────────────────────────────────────────────────── */
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-UG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
}
function hhmm(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
}

const STATUS_BADGE: Record<LogStatus, { label: string; cls: string; dot: string }> = {
  started: {
    label: 'In Progress',
    cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  completed: {
    label: 'Pending Review',
    cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    dot: 'bg-blue-500',
  },
  approved: {
    label: 'Approved',
    cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  auto_expired: {
    label: 'Missed / Expired',
    cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    dot: 'bg-rose-500',
  },
};

/* ─── Photo modal ──────────────────────────────────────────────────── */
function PhotoModal({
  log,
  schoolId,
  onClose,
  onApprove,
  approving,
  isDark,
}: {
  log: LessonLog;
  schoolId: string;
  onClose: () => void;
  onApprove: (logId: string) => void;
  approving: boolean;
  isDark: boolean;
}) {
  const [photos, setPhotos] = useState<PhotoUrls | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [photoErr, setPhotoErr] = useState<string | null>(null);

  useEffect(() => {
    if (log.status === 'approved') {
      setPhotoLoading(false);
      return;
    }
    setPhotoLoading(true);
    fetch(
      registerApiUrl(
        `/api/lesson-log/photos?logId=${encodeURIComponent(log.log_id)}&schoolId=${encodeURIComponent(schoolId)}`
      )
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.startUrl || d.endUrl) {
          setPhotos({ startUrl: d.startUrl ?? null, endUrl: d.endUrl ?? null });
        } else {
          setPhotoErr(d.error ?? 'No photos available');
        }
      })
      .catch(() => setPhotoErr('Failed to load photos'))
      .finally(() => setPhotoLoading(false));
  }, [log.log_id, log.status, schoolId]);

  const badge = STATUS_BADGE[log.status];

  return (
    <NativeModal
      isOpen={true}
      onClose={onClose}
      title={`${log.subject} — ${log.class_name}`}
      subtitle={`${fmtDate(log.lesson_date)} · ${hhmm(log.scheduled_start)} – ${hhmm(log.scheduled_end)}`}
      icon={BookOpen}
      size="xl"
    >
      <div className="space-y-4 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-white/70">
            {log.teacher_name && <span className="text-white font-semibold">{log.teacher_name}</span>}
            {log.started_at && <span className="ml-2">· Started {fmtTime(log.started_at)}</span>}
            {log.ended_at && <span>· Closed {fmtTime(log.ended_at)}</span>}
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border px-3 py-1 ${badge.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>

        {log.status === 'approved' ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-5 py-8 text-center">
            <div className="mb-3 flex justify-center text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <p className="text-emerald-300 font-bold text-base" style={{ fontFamily: SORA }}>
              Lesson Approved
            </p>
            {log.approved_at && (
              <p className="text-xs text-white/60 mt-1">
                Approved on{' '}
                {new Date(log.approved_at).toLocaleDateString('en-UG', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        ) : (
          <>
            {photoLoading && (
              <div className="text-sm text-white/50 py-12 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent mb-2" />
                <p>Loading lesson verification photos…</p>
              </div>
            )}
            {photoErr && !photoLoading && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/20 px-4 py-3 text-sm text-rose-200">
                {photoErr}
              </div>
            )}
            {photos && !photoLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-white/60 mb-1.5">Start Photo (Arrival / Board)</p>
                  {photos.startUrl ? (
                    <img
                      src={photos.startUrl}
                      alt="Start"
                      className="w-full h-48 object-cover rounded-xl border border-white/15 bg-black/40"
                    />
                  ) : (
                    <div className="w-full h-48 rounded-xl border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-xs text-white/40">
                      No start photo captured
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/60 mb-1.5">End Photo (Lesson Work)</p>
                  {photos.endUrl ? (
                    <img
                      src={photos.endUrl}
                      alt="End"
                      className="w-full h-48 object-cover rounded-xl border border-white/15 bg-black/40"
                    />
                  ) : (
                    <div className="w-full h-48 rounded-xl border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-xs text-white/40">
                      No end photo captured
                    </div>
                  )}
                </div>
              </div>
            )}

            {log.status === 'completed' && (
              <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onApprove(log.log_id)}
                  disabled={approving}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400 transition disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {approving && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  <span>Approve Lesson Log</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </NativeModal>
  );
}

/* ─── Main Component ───────────────────────────────────────────────── */
export default function LessonMonitorPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const { labels, formatPeriod } = useAcademicPeriod();

  const [selectedLog, setSelectedLog] = useState<LessonLog | null>(null);
  const [approving, setApproving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  // Filter states
  const [filterMode, setFilterMode] = useState<'day' | 'month' | 'term'>('day');
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [filterTermId, setFilterTermId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<LogStatus | 'all'>('all');

  // Resolve school ID and terms
  const { data: schoolId } = useQuery({
    queryKey: ['school_id_for_lesson_monitor', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      return (data?.school_id as string | undefined) ?? null;
    },
    enabled: !!user?.id,
    staleTime: 60 * 60 * 1000,
  });

  const { data: terms = [] } = useQuery({
    queryKey: ['school_terms', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from('school_terms')
        .select('id, term, year, start_date, end_date, is_current')
        .eq('school_id', schoolId)
        .order('year', { ascending: false })
        .order('term', { ascending: false });
      return (data ?? []) as SchoolTerm[];
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
  });

  // Set default term when terms load
  useEffect(() => {
    if (terms.length > 0 && !filterTermId) {
      const cur = terms.find((t) => t.is_current) ?? terms[0];
      setFilterTermId(cur.id);
    }
  }, [terms, filterTermId]);

  // Fetch lesson logs
  const {
    data: logs = [],
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['lesson_logs', schoolId, filterMode, filterDate, filterMonth, filterTermId, filterStatus],
    queryFn: async () => {
      if (!schoolId) return [];
      let q = supabase
        .from('lesson_logs')
        .select(
          'log_id, teacher_id, class_name, subject, lesson_date, scheduled_start, scheduled_end, started_at, ended_at, status, approved_by, approved_at'
        )
        .eq('school_id', schoolId);

      if (filterMode === 'day') {
        q = q.eq('lesson_date', filterDate);
      } else if (filterMode === 'month') {
        const [y, m] = filterMonth.split('-');
        const lastDay = new Date(Number(y), Number(m), 0).getDate();
        q = q.gte('lesson_date', `${filterMonth}-01`).lte('lesson_date', `${filterMonth}-${String(lastDay).padStart(2, '0')}`);
      } else if (filterMode === 'term' && filterTermId) {
        const term = terms.find((t) => t.id === filterTermId);
        if (term) {
          q = q.gte('lesson_date', term.start_date).lte('lesson_date', term.end_date);
        }
      }

      if (filterStatus !== 'all') {
        q = q.eq('status', filterStatus);
      }

      q = q.order('lesson_date', { ascending: false }).order('scheduled_start', { ascending: true });

      const { data, error: err } = await q.limit(500);
      if (err) throw err;

      const rawLogs = (data ?? []) as LessonLog[];
      const teacherIds = [...new Set(rawLogs.map((l) => l.teacher_id))];
      let nameMap: Record<string, string> = {};
      if (teacherIds.length > 0) {
        const { data: teachers } = await supabase
          .from('teachers')
          .select('teacher_id, name')
          .in('teacher_id', teacherIds);
        for (const t of teachers ?? []) {
          nameMap[(t as { teacher_id: string; name: string }).teacher_id] = (t as { name: string }).name;
        }
      }

      return rawLogs.map((l) => ({ ...l, teacher_name: nameMap[l.teacher_id] }));
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });

  function downloadPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    let periodLabel = '';
    if (filterMode === 'day') periodLabel = filterDate;
    else if (filterMode === 'month') periodLabel = filterMonth;
    else {
      const term = terms.find((t) => t.id === filterTermId);
      periodLabel = term ? formatPeriod(term.term, term.year, { short: false }) : 'Selected Period';
    }

    doc.setFontSize(14);
    doc.text('Official Lesson Monitor Log Report', 14, 16);
    doc.setFontSize(9);
    doc.text(`Period Scope: ${periodLabel}`, 14, 22);
    doc.text(`Generated: ${new Date().toLocaleString('en-UG', { timeZone: 'Africa/Kampala' })}`, 14, 27);

    const rows = logs.map((l) => [
      fmtDate(l.lesson_date),
      l.teacher_name ?? '—',
      l.subject,
      l.class_name,
      hhmm(l.scheduled_start),
      hhmm(l.scheduled_end),
      l.started_at ? fmtTime(l.started_at) : '—',
      l.ended_at ? fmtTime(l.ended_at) : '—',
      STATUS_BADGE[l.status]?.label ?? l.status,
    ]);

    autoTable(doc, {
      head: [['Date', 'Teacher', 'Subject', 'Class', 'Sched. Start', 'Sched. End', 'Started', 'Ended', 'Status']],
      body: rows,
      startY: 33,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 217, 168] },
      columnStyles: { 8: { cellWidth: 26 } },
    });

    doc.save(`lesson-monitor-report-${periodLabel}.pdf`);
  }

  const handleApprove = async (logId: string) => {
    if (!schoolId || !user?.id) return;
    setApproving(true);
    try {
      const res = await fetch(registerApiUrl('/api/lesson-log/approve'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, schoolId, approvedBy: user.id }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error ?? 'Approval failed');
      showToast('Lesson officially approved!', true);
      setSelectedLog(null);
      void queryClient.invalidateQueries({ queryKey: ['lesson_logs'] });
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error approving lesson', false);
    } finally {
      setApproving(false);
    }
  };

  // Executive KPI Counts
  const counts = useMemo(() => {
    return {
      started: logs.filter((l) => l.status === 'started').length,
      completed: logs.filter((l) => l.status === 'completed').length,
      approved: logs.filter((l) => l.status === 'approved').length,
      missed: logs.filter((l) => l.status === 'auto_expired').length,
    };
  }, [logs]);

  const totalLogs = logs.length;
  const verifiedRate = totalLogs > 0 ? Math.round((counts.approved / totalLogs) * 100) : 0;
  const pendingRate = totalLogs > 0 ? Math.round((counts.completed / totalLogs) * 100) : 0;

  return (
    <AdminPageWrapper
      title="Lesson Monitor"
      subtitle="Track live classroom instruction, review teacher submissions, and verify photographic attendance logs."
    >
      <div className="w-full space-y-6">
        {toast && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${
              toast.ok
                ? 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
                : 'border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200'
            }`}
          >
            {toast.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
            <span>{toast.msg}</span>
          </div>
        )}

        {/* ─── 4 Executive KPI Cards Strip (POS / Admin Dashboard Aesthetics) ─── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {/* Card 1: In Progress */}
          <div
            className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0d1512] p-4 transition-all hover:scale-[1.01] border border-slate-200 dark:border-white/10 shadow-sm"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400" style={{ fontFamily: INTER }}>
                In Progress
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: SORA }}>
              {counts.started}
            </p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
              Currently in session
            </p>
          </div>

          {/* Card 2: Pending Review */}
          <div
            className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0d1512] p-4 transition-all hover:scale-[1.01] border border-slate-200 dark:border-white/10 shadow-sm"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400" style={{ fontFamily: INTER }}>
                Pending Review
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
                <FileCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: SORA }}>
              {counts.completed}
            </p>
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
              {pendingRate}% awaiting approval
            </p>
          </div>

          {/* Card 3: Approved */}
          <div
            className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0d1512] p-4 transition-all hover:scale-[1.01] border border-slate-200 dark:border-white/10 shadow-sm"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400" style={{ fontFamily: INTER }}>
                Approved
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: SORA }}>
              {counts.approved}
            </p>
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {verifiedRate}% verified &amp; logged
            </p>
          </div>

          {/* Card 4: Missed Lessons */}
          <div
            className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0d1512] p-4 transition-all hover:scale-[1.01] border border-slate-200 dark:border-white/10 shadow-sm"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400" style={{ fontFamily: INTER }}>
                Missed Lessons
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: SORA }}>
              {counts.missed}
            </p>
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
              Expired or unsubmitted
            </p>
          </div>
        </div>

        {/* ─── Progress & Completion Bar Strip ─── */}
        {totalLogs > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1512] p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
                Lesson Verification Progression
              </span>
              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                {counts.approved} of {totalLogs} verified ({verifiedRate}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex">
              <div style={{ width: `${verifiedRate}%` }} className="bg-emerald-500 transition-all duration-500" title="Approved" />
              <div style={{ width: `${pendingRate}%` }} className="bg-blue-500 transition-all duration-500" title="Pending Review" />
              <div
                style={{ width: `${totalLogs > 0 ? Math.round((counts.started / totalLogs) * 100) : 0}%` }}
                className="bg-amber-500 transition-all duration-500"
                title="In Progress"
              />
              <div
                style={{ width: `${totalLogs > 0 ? Math.round((counts.missed / totalLogs) * 100) : 0}%` }}
                className="bg-rose-500 transition-all duration-500"
                title="Missed"
              />
            </div>
          </div>
        )}

        {/* ─── Action & Filter Toolbar ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1512] p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter mode tabs */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              {(['day', 'month', 'term'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFilterMode(m)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    filterMode === m
                      ? 'bg-white dark:bg-teal-600 text-teal-700 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {m === 'day' ? 'By Day' : m === 'month' ? 'By Month' : `By ${labels.periodNoun}`}
                </button>
              ))}
            </div>

            {filterMode === 'day' && (
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            )}
            {filterMode === 'month' && (
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            )}
            {filterMode === 'term' && (
              <select
                value={filterTermId}
                onChange={(e) => setFilterTermId(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                <option value="">— Select {labels.periodNoun} —</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {formatPeriod(t.term, t.year, { short: false })}{t.is_current ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as LogStatus | 'all')}
              className="rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              <option value="all">All statuses</option>
              <option value="started">In Progress</option>
              <option value="completed">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="auto_expired">Missed / Expired</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/10 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-teal-500' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={downloadPDF}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {queryError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{queryError instanceof Error ? queryError.message : 'Failed to load lesson logs'}</span>
          </div>
        )}

        {/* ─── Lesson Logs Feed ─── */}
        {loading ? (
          <div className="text-sm text-slate-500 dark:text-white/40 py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent mb-3" />
            <p>Loading lesson instruction logs…</p>
          </div>
        ) : logs.length === 0 ? (
          <PosEmptyState
            icon={<BookOpen className="w-8 h-8 text-teal-500" />}
            title="No Lesson Logs Found"
            description="No teacher classroom logs match your selected date range and filter criteria."
            accentColor="mint"
          />
        ) : (
          <div className="space-y-2.5">
            {logs.map((log) => {
              const badge = STATUS_BADGE[log.status];
              return (
                <button
                  key={log.log_id}
                  type="button"
                  onClick={() => setSelectedLog(log)}
                  className="w-full text-left rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1512] hover:border-teal-500/50 hover:shadow-md p-4 transition-all shadow-sm group"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition" style={{ fontFamily: SORA }}>
                          {log.subject}
                        </span>
                        <span className="text-xs rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 text-slate-700 dark:text-slate-300 font-medium">
                          {log.class_name}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-white/40 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {log.teacher_name ?? `Teacher #${log.teacher_id.slice(0, 8)}`}
                        </span>
                        <span>·</span>
                        <span>{fmtDate(log.lesson_date)}</span>
                        <span>·</span>
                        <span className="font-mono">{hhmm(log.scheduled_start)} – {hhmm(log.scheduled_end)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border px-2.5 py-0.5 ${badge.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                      {log.status === 'completed' && (
                        <span className="inline-flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 ml-1">
                          Review Photos <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedLog && schoolId && (
          <PhotoModal
            log={selectedLog}
            schoolId={schoolId}
            onClose={() => setSelectedLog(null)}
            onApprove={handleApprove}
            approving={approving}
            isDark={isDark}
          />
        )}
      </div>
    </AdminPageWrapper>
  );
}
