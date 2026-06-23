import { useState, useCallback, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';

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
  return new Date(d + 'T00:00:00').toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
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

const STATUS_BADGE: Record<LogStatus, { label: string; cls: string }> = {
  started: { label: 'In Progress', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  completed: { label: 'Pending Review', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  approved: { label: 'Approved', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  auto_expired: { label: 'Expired', cls: 'bg-white/5 text-white/30 border-white/10' },
};

/* ─── Photo modal ──────────────────────────────────────────────────── */
function PhotoModal({ log, schoolId, onClose, onApprove, approving }: {
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
    fetch(`/api/lesson-log/photos?logId=${encodeURIComponent(log.log_id)}&schoolId=${encodeURIComponent(schoolId)}`)
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl my-8 rounded-2xl bg-[#0b1120] border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">{log.subject} — {log.class_name}</h2>
            <p className="text-sm text-white/40 mt-0.5">{fmtDate(log.lesson_date)} · {hhmm(log.scheduled_start)} – {hhmm(log.scheduled_end)}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-white/50">
              {log.teacher_name && <span className="text-white/70 font-medium">{log.teacher_name}</span>}
              {log.started_at && <span className="ml-2">· Started {fmtTime(log.started_at)}</span>}
              {log.ended_at && <span>· Closed {fmtTime(log.ended_at)}</span>}
            </div>
            <span className={`text-xs font-semibold rounded-full border px-3 py-1 ${badge.cls}`}>{badge.label}</span>
          </div>

          {log.status === 'approved' ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/30 px-5 py-8 text-center">
              <div className="text-4xl mb-3">✓</div>
              <p className="text-emerald-300 font-semibold text-base">Lesson Approved</p>
              {log.approved_at && (
                <p className="text-sm text-white/40 mt-1">
                  Approved on {new Date(log.approved_at).toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          ) : (
            <>
              {photoLoading && (
                <div className="text-sm text-white/40 py-8 text-center">Loading photos…</div>
              )}
              {photoErr && !photoLoading && (
                <div className="rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">{photoErr}</div>
              )}
              {photos && !photoLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-white/40 mb-2 font-medium uppercase tracking-wide">Start Photo (Students)</p>
                    {photos.startUrl ? (
                      <img src={photos.startUrl} alt="Start" className="w-full rounded-xl border border-white/10 object-cover aspect-video bg-black" />
                    ) : (
                      <div className="w-full rounded-xl border border-white/10 bg-white/5 aspect-video flex items-center justify-center text-white/30 text-sm">No photo</div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-2 font-medium uppercase tracking-wide">End Photo (Board)</p>
                    {photos.endUrl ? (
                      <img src={photos.endUrl} alt="End" className="w-full rounded-xl border border-white/10 object-cover aspect-video bg-black" />
                    ) : (
                      <div className="w-full rounded-xl border border-white/10 bg-white/5 aspect-video flex items-center justify-center text-white/30 text-sm">No photo yet</div>
                    )}
                  </div>
                </div>
              )}
              {log.status === 'completed' && (
                <button
                  type="button"
                  onClick={() => onApprove(log.log_id)}
                  disabled={approving}
                  className="w-full min-h-[44px] rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40 transition-colors"
                >
                  {approving ? 'Approving…' : '✓ Approve Lesson'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ────────────────────────────────────────────────────── */
export default function LessonMonitorPage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const adminUserId = useAuthStore((s) => s.user?.id);

  const [logs, setLogs] = useState<LessonLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter mode: day / month / term
  const [filterMode, setFilterMode] = useState<'day' | 'month' | 'term'>('day');
  const [filterDate, setFilterDate] = useState(() => {
    return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split('T')[0];
  });
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
  const [terms, setTerms] = useState<SchoolTerm[]>([]);
  const [filterTermId, setFilterTermId] = useState('');

  const [filterStatus, setFilterStatus] = useState<LogStatus | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<LessonLog | null>(null);
  const [approving, setApproving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // Load school terms once
  useEffect(() => {
    if (!schoolId) return;
    supabase
      .from('school_terms')
      .select('id, term, year, start_date, end_date, is_current')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('term', { ascending: true })
      .then(({ data }) => {
        setTerms((data as SchoolTerm[]) ?? []);
        const current = (data as SchoolTerm[])?.find((t) => t.is_current);
        if (current && !filterTermId) setFilterTermId(current.id);
      });
  }, [schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('lesson_logs')
        .select('log_id, teacher_id, class_name, subject, lesson_date, scheduled_start, scheduled_end, started_at, ended_at, status, approved_by, approved_at')
        .eq('school_id', schoolId)
        .order('lesson_date', { ascending: false })
        .order('scheduled_start', { ascending: true });

      if (filterMode === 'day') {
        if (filterDate) q = q.eq('lesson_date', filterDate);
      } else if (filterMode === 'month') {
        const [y, m] = filterMonth.split('-').map(Number);
        const start = `${y}-${String(m).padStart(2, '0')}-01`;
        const end = new Date(y, m, 0).toISOString().split('T')[0];
        q = q.gte('lesson_date', start).lte('lesson_date', end);
      } else if (filterMode === 'term' && filterTermId) {
        const term = terms.find((t) => t.id === filterTermId);
        if (term) q = q.gte('lesson_date', term.start_date).lte('lesson_date', term.end_date);
      }

      if (filterStatus !== 'all') q = q.eq('status', filterStatus);

      const { data, error: err } = await q.limit(500);
      if (err) throw new Error(err.message);

      const rawLogs = (data ?? []) as LessonLog[];

      // Resolve teacher names
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

      setLogs(rawLogs.map((l) => ({ ...l, teacher_name: nameMap[l.teacher_id] })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [schoolId, filterMode, filterDate, filterMonth, filterTermId, filterStatus, terms]);

  useEffect(() => { void load(); }, [load]);

  function downloadPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    let periodLabel = '';
    if (filterMode === 'day') periodLabel = filterDate;
    else if (filterMode === 'month') periodLabel = filterMonth;
    else {
      const term = terms.find((t) => t.id === filterTermId);
      periodLabel = term ? `Term ${term.term} ${term.year}` : 'Selected Term';
    }

    doc.setFontSize(14);
    doc.text('Lesson Log Report', 14, 16);
    doc.setFontSize(9);
    doc.text(`Period: ${periodLabel}`, 14, 22);
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
      headStyles: { fillColor: [14, 165, 233] },
      columnStyles: { 8: { cellWidth: 22 } },
    });

    doc.save(`lesson-log-${periodLabel}.pdf`);
  }

  const handleApprove = async (logId: string) => {
    if (!schoolId || !adminUserId) return;
    setApproving(true);
    try {
      const res = await fetch('/api/lesson-log/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, schoolId, approvedBy: adminUserId }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error ?? 'Approval failed');
      showToast('Lesson approved!', true);
      setSelectedLog(null);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', false);
    } finally {
      setApproving(false);
    }
  };

  const counts = {
    started: logs.filter((l) => l.status === 'started').length,
    completed: logs.filter((l) => l.status === 'completed').length,
    approved: logs.filter((l) => l.status === 'approved').length,
  };

  return (
    <AdminPageWrapper title="Lesson Monitor" subtitle="Review teacher lesson logs and approve submissions">
      {toast && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${toast.ok ? 'border-emerald-400/30 bg-emerald-950/40 text-emerald-200' : 'border-red-400/30 bg-red-950/40 text-red-200'}`}>
          {toast.msg}
        </div>
      )}

      {/* Stat pills */}
      <div className="flex flex-wrap gap-3 mb-5">
        {[
          { label: 'In Progress', count: counts.started, cls: 'border-amber-500/30 bg-amber-950/30 text-amber-300' },
          { label: 'Pending Review', count: counts.completed, cls: 'border-blue-500/30 bg-blue-950/30 text-blue-300' },
          { label: 'Approved', count: counts.approved, cls: 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300' },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-2 rounded-xl border px-4 py-2 ${s.cls}`}>
            <span className="text-lg font-bold">{s.count}</span>
            <span className="text-xs font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Filter mode tabs */}
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          {(['day', 'month', 'term'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setFilterMode(m)}
              className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${filterMode === m ? 'bg-teal-600 text-white' : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/10'}`}
            >
              {m === 'day' ? 'By Day' : m === 'month' ? 'By Month' : 'By Term'}
            </button>
          ))}
        </div>

        {filterMode === 'day' && (
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50"
          />
        )}
        {filterMode === 'month' && (
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50"
          />
        )}
        {filterMode === 'term' && (
          <select
            value={filterTermId}
            onChange={(e) => setFilterTermId(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50"
          >
            <option value="">— Select Term —</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                Term {t.term} {t.year}{t.is_current ? ' (Current)' : ''}
              </option>
            ))}
          </select>
        )}

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as LogStatus | 'all')}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50"
        >
          <option value="all">All statuses</option>
          <option value="started">In Progress</option>
          <option value="completed">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="auto_expired">Expired / Missed</option>
        </select>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          ↻ Refresh
        </button>
        <button
          type="button"
          onClick={downloadPDF}
          disabled={logs.length === 0}
          className="rounded-xl border border-teal-500/40 bg-teal-600/20 px-4 py-2 text-sm text-teal-300 hover:bg-teal-600/40 disabled:opacity-40 transition-colors font-semibold"
        >
          ⬇ Download PDF
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-white/40 py-8 text-center">Loading lesson logs…</div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/40">
          No lesson logs found for this date and filter.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const badge = STATUS_BADGE[log.status];
            return (
              <button
                key={log.log_id}
                type="button"
                onClick={() => setSelectedLog(log)}
                className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{log.subject}</span>
                      <span className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/40">{log.class_name}</span>
                    </div>
                    <div className="mt-1 text-xs text-white/40">
                      {log.teacher_name ?? log.teacher_id.slice(0, 8)} · {hhmm(log.scheduled_start)} – {hhmm(log.scheduled_end)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-semibold rounded-full border px-2.5 py-0.5 ${badge.cls}`}>{badge.label}</span>
                    {log.status === 'completed' && (
                      <span className="text-xs text-blue-300/60">View →</span>
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
        />
      )}
    </AdminPageWrapper>
  );
}
