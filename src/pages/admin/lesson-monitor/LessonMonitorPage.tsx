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
  ChevronRight,
  TrendingUp,
  Camera,
  Check,
  User,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import NativeModal from '@/components/NativeModal';
import { useAcademicPeriod } from '@/lib/academicPeriodTerminology';
import { GovPageLoader, GovRollingBox, GovTableLoader } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

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
  teacher_name?: string;
  class_name: string;
  subject: string;
  lesson_date: string;
  scheduled_start: string;
  scheduled_end: string;
  started_at: string | null;
  ended_at: string | null;
  status: LogStatus;
  approved_by?: string | null;
  approved_at?: string | null;
}

interface PhotoUrls {
  startUrl: string | null;
  endUrl: string | null;
}

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
  if (!t) return '—';
  const parts = t.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
}

const STATUS_CONFIG: Record<LogStatus, { label: string; tagCls: string; dotCls: string }> = {
  started: {
    label: 'IN PROGRESS',
    tagCls: 'border-amber-400 bg-amber-50 text-amber-800',
    dotCls: 'bg-amber-500',
  },
  completed: {
    label: 'PENDING REVIEW',
    tagCls: 'border-blue-400 bg-blue-50 text-blue-800',
    dotCls: 'bg-blue-600',
  },
  approved: {
    label: 'VERIFIED & APPROVED',
    tagCls: 'border-emerald-400 bg-emerald-50 text-emerald-800',
    dotCls: 'bg-emerald-600',
  },
  auto_expired: {
    label: 'MISSED / EXPIRED',
    tagCls: 'border-rose-400 bg-rose-50 text-rose-800',
    dotCls: 'bg-rose-600',
  },
};

/* ─── Photo Inspection Modal ───────────────────────────────────────── */
function PhotoModal({
  log,
  schoolId,
  onClose,
  onApprove,
  approving,
}: {
  log: LessonLog;
  schoolId: string;
  onClose: () => void;
  onApprove: (logId: string) => void;
  approving: boolean;
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
          setPhotoErr(d.error ?? 'No photos captured for this session');
        }
      })
      .catch(() => setPhotoErr('Unable to communicate with verification photo vault'))
      .finally(() => setPhotoLoading(false));
  }, [log.log_id, log.status, schoolId]);

  const cfg = STATUS_CONFIG[log.status];

  return (
    <NativeModal
      isOpen={true}
      onClose={onClose}
      title={`${log.subject} — ${log.class_name}`}
      subtitle={`${fmtDate(log.lesson_date)} · ${hhmm(log.scheduled_start)} – ${hhmm(log.scheduled_end)}`}
      icon={BookOpen}
      size="xl"
    >
      <div className="space-y-4">
        {/* Header metadata bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-[#F8F9FA] border border-[#E5E7EB]">
          <div className="text-xs">
            <span className="font-semibold text-[#111111]">{log.teacher_name ?? `Tutor ID: ${log.teacher_id}`}</span>
            {log.started_at && <span className="ml-2 font-mono text-[#555555]">· Start: {fmtTime(log.started_at)}</span>}
            {log.ended_at && <span className="ml-2 font-mono text-[#555555]">· End: {fmtTime(log.ended_at)}</span>}
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border ${cfg.tagCls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotCls}`} />
            {cfg.label}
          </span>
        </div>

        {log.status === 'approved' ? (
          <div className="border border-emerald-300 bg-emerald-50/50 p-6 text-center">
            <div className="mb-2 flex justify-center text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-emerald-950 font-bold text-sm uppercase tracking-wide">
              Instruction Officially Verified &amp; Approved
            </p>
            {log.approved_at && (
              <p className="text-xs font-mono text-emerald-800 mt-1">
                Audit Timestamp: {new Date(log.approved_at).toLocaleString('en-UG')}
              </p>
            )}
          </div>
        ) : (
          <>
            {photoLoading && (
              <div className="py-12">
                <GovPageLoader message="LOADING INSTRUCTION AUDIT PHOTOGRAPHS..." minHeight="min-h-[140px]" />
              </div>
            )}
            {photoErr && !photoLoading && (
              <div className="border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 font-mono">
                {photoErr}
              </div>
            )}
            {photos && !photoLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-[#CCCCCC] p-2 bg-white">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#555555] mb-2 font-semibold">
                    <Camera className="w-3.5 h-3.5" />
                    Session Entry Photo (Arrival / Board)
                  </div>
                  {photos.startUrl ? (
                    <img
                      src={photos.startUrl}
                      alt="Session Entry"
                      className="w-full h-48 object-cover border border-[#E5E7EB]"
                    />
                  ) : (
                    <div className="w-full h-48 border border-dashed border-[#CCCCCC] bg-[#F8F9FA] flex items-center justify-center text-xs font-mono text-[#888888]">
                      NO ENTRY PHOTO CAPTURED
                    </div>
                  )}
                </div>
                <div className="border border-[#CCCCCC] p-2 bg-white">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#555555] mb-2 font-semibold">
                    <Camera className="w-3.5 h-3.5" />
                    Session Exit Photo (Instruction Evidence)
                  </div>
                  {photos.endUrl ? (
                    <img
                      src={photos.endUrl}
                      alt="Session Exit"
                      className="w-full h-48 object-cover border border-[#E5E7EB]"
                    />
                  ) : (
                    <div className="w-full h-48 border border-dashed border-[#CCCCCC] bg-[#F8F9FA] flex items-center justify-center text-xs font-mono text-[#888888]">
                      NO EXIT PHOTO CAPTURED
                    </div>
                  )}
                </div>
              </div>
            )}

            {log.status === 'completed' && (
              <div className="pt-3 flex justify-end gap-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={onClose}
                  className="gov-btn gov-btn-sm"
                >
                  Close Inspection
                </button>
                <button
                  type="button"
                  onClick={() => onApprove(log.log_id)}
                  disabled={approving}
                  className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
                >
                  {approving ? <GovRollingBox size="sm" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Authorize &amp; Verify Lesson Log</span>
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

  // Resolve school ID
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

  // Resolve terms
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

  // Default current term
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
    doc.text('Rakai Community School of Nursing — Official Lecture & Lesson Monitor Registry', 14, 16);
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
      STATUS_CONFIG[l.status]?.label ?? l.status,
    ]);

    autoTable(doc, {
      head: [['Date', 'Tutor / Instructor', 'Subject / Unit', 'Cohort', 'Sched. Start', 'Sched. End', 'Entry Time', 'Exit Time', 'Audit Status']],
      body: rows,
      startY: 33,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [17, 17, 17] },
      columnStyles: { 8: { cellWidth: 32 } },
    });

    doc.save(`RCSN-Lesson-Monitor-Report-${periodLabel}.pdf`);
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
      showToast('Instruction session officially authorized and logged!', true);
      setSelectedLog(null);
      void queryClient.invalidateQueries({ queryKey: ['lesson_logs'] });
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error approving instruction session', false);
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
    <div className="admin-terminal-page space-y-5">
      {/* ── 1. TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            LECTURE &amp; LESSON MONITOR REGISTRY
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            ACADEMIC INSTRUCTION AUDIT &amp; CLASSROOM TIMEKEEPING VERIFICATION
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="gov-btn gov-btn-sm flex items-center gap-1.5"
            title="Refresh Registry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>SYNC</span>
          </button>
          <button
            type="button"
            onClick={downloadPDF}
            disabled={logs.length === 0}
            className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT AUDIT PDF</span>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`border px-3 py-2 text-xs font-mono flex items-center gap-2 ${
            toast.ok
              ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
              : 'border-rose-400 bg-rose-50 text-rose-900'
          }`}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── 2. MONOCHROME KPI SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1 */}
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            TOTAL SESSIONS
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {totalLogs.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1">
            SCHEDULED TIMETABLE SCOPE
          </div>
        </div>

        {/* KPI 2 */}
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            IN SESSION / STARTED
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {counts.started.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1">
            CURRENTLY ACTIVE CLASSROOMS
          </div>
        </div>

        {/* KPI 3 */}
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            AWAITING REVIEW
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
            {counts.completed.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1">
            {pendingRate}% PHOTO AUDIT QUEUE
          </div>
        </div>

        {/* KPI 4 */}
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            VERIFIED &amp; APPROVED
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {counts.approved.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1">
            {verifiedRate}% COMPLIANCE RATE
          </div>
        </div>
      </div>

      {/* Verification Progress Bar */}
      {totalLogs > 0 && (
        <div className="gov-card p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#333333] font-semibold flex items-center gap-1.5 uppercase">
              <TrendingUp className="w-3.5 h-3.5 text-[#111111]" />
              Instructional Verification Progression
            </span>
            <span className="text-[#111111] font-bold">
              {counts.approved} of {totalLogs} Verified ({verifiedRate}%) · Missed / Expired: {counts.missed}
            </span>
          </div>
          <div className="h-2 w-full bg-[#E5E7EB] overflow-hidden flex">
            <div style={{ width: `${verifiedRate}%` }} className="bg-emerald-600 transition-all duration-300" title="Verified" />
            <div style={{ width: `${pendingRate}%` }} className="bg-blue-600 transition-all duration-300" title="Pending Review" />
            <div
              style={{ width: `${totalLogs > 0 ? Math.round((counts.started / totalLogs) * 100) : 0}%` }}
              className="bg-amber-500 transition-all duration-300"
              title="In Session"
            />
            <div
              style={{ width: `${totalLogs > 0 ? Math.round((counts.missed / totalLogs) * 100) : 0}%` }}
              className="bg-rose-600 transition-all duration-300"
              title="Missed"
            />
          </div>
        </div>
      )}

      {/* ── 3. CONTROL BAR ── */}
      <div className="gov-control-bar flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#CCCCCC]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Mode */}
          <div className="inline-flex border border-[#CCCCCC]">
            {(['day', 'month', 'term'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFilterMode(m)}
                className={`px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors ${
                  filterMode === m
                    ? 'bg-[#111111] text-white font-bold'
                    : 'bg-white text-[#555555] hover:bg-[#F3F4F6]'
                }`}
              >
                {m === 'day' ? 'DAILY' : m === 'month' ? 'MONTHLY' : labels.periodNoun.toUpperCase()}
              </button>
            ))}
          </div>

          {filterMode === 'day' && (
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="gov-select text-xs font-mono"
            />
          )}

          {filterMode === 'month' && (
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="gov-select text-xs font-mono"
            />
          )}

          {filterMode === 'term' && (
            <select
              value={filterTermId}
              onChange={(e) => setFilterTermId(e.target.value)}
              className="gov-select text-xs font-mono"
            >
              <option value="">— SELECT {labels.periodNoun.toUpperCase()} —</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {formatPeriod(t.term, t.year, { short: false })}{t.is_current ? ' [CURRENT]' : ''}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as LogStatus | 'all')}
            className="gov-select text-xs font-mono"
          >
            <option value="all">STATUS: ALL ENTRIES</option>
            <option value="started">IN PROGRESS</option>
            <option value="completed">PENDING REVIEW</option>
            <option value="approved">VERIFIED &amp; APPROVED</option>
            <option value="auto_expired">MISSED / EXPIRED</option>
          </select>
        </div>

        <div className="text-xs font-mono text-[#555555]">
          RECORDS MATCHED: <span className="font-bold text-[#111111]">{logs.length}</span>
        </div>
      </div>

      {/* Query error alert */}
      {queryError && (
        <div className="border border-rose-300 bg-rose-50 p-3 text-xs font-mono text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
          <span>{queryError instanceof Error ? queryError.message : 'Failed to query lesson instruction records'}</span>
        </div>
      )}

      {/* ── 4. DATA TABLE ── */}
      <div className="gov-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="gov-table w-full text-left">
            <thead>
              <tr>
                <th className="w-24">DATE</th>
                <th>COURSE UNIT / SUBJECT</th>
                <th>COHORT / CLASS</th>
                <th>TUTOR / INSTRUCTOR</th>
                <th>TIMETABLE SCHEDULE</th>
                <th>SESSION ENTRY/EXIT</th>
                <th>AUDIT STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <GovTableLoader colSpan={8} message="AUDITING CLASSROOM INSTRUCTION SESSIONS..." />
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-xs font-mono text-[#777777]">
                    NO LESSON INSTRUCTION SESSIONS FOUND FOR THE SPECIFIED PERIOD SCOPE
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const cfg = STATUS_CONFIG[log.status];
                  return (
                    <tr key={log.log_id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="font-mono text-xs whitespace-nowrap text-[#555555]">
                        {fmtDate(log.lesson_date)}
                      </td>
                      <td className="font-bold text-xs text-[#111111]">
                        {log.subject}
                      </td>
                      <td className="font-mono text-xs text-[#333333]">
                        {log.class_name}
                      </td>
                      <td className="text-xs text-[#333333]">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#777777] shrink-0" />
                          <span>{log.teacher_name ?? `Tutor ID: ${log.teacher_id.slice(0, 8)}`}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-[#555555] whitespace-nowrap">
                        {hhmm(log.scheduled_start)} – {hhmm(log.scheduled_end)}
                      </td>
                      <td className="font-mono text-xs text-[#555555] whitespace-nowrap">
                        {fmtTime(log.started_at)} / {fmtTime(log.ended_at)}
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border ${cfg.tagCls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotCls}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className={`gov-btn gov-btn-sm ${log.status === 'completed' ? 'gov-btn-primary' : ''}`}
                        >
                          {log.status === 'completed' ? 'AUDIT PHOTOS' : 'INSPECT'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo inspection modal */}
      {selectedLog && schoolId && (
        <PhotoModal
          log={selectedLog}
          schoolId={schoolId}
          onClose={() => setSelectedLog(null)}
          onApprove={handleApprove}
          approving={approving}
        />
      )}
    </div>
  );
}
