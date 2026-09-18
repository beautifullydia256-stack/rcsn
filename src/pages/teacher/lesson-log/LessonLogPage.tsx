import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import { resolveTeacherIdForSchool } from '@/lib/resolveTeacherId';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';

/* ─── Uganda time helpers (UTC+3, no DST) ─────────────────────────── */
function ugandaNow(): Date {
  return new Date(Date.now() + 3 * 60 * 60 * 1000);
}
function ugandaDayName(): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    ugandaNow().getUTCDay()
  ];
}
function ugandaDateStr(): string {
  return ugandaNow().toISOString().split('T')[0];
}
function hhmmNow(): string {
  const n = ugandaNow();
  return `${String(n.getUTCHours()).padStart(2, '0')}:${String(n.getUTCMinutes()).padStart(2, '0')}`;
}
function addMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/* ─── Types ────────────────────────────────────────────────────────── */
type SlotStatus = 'upcoming' | 'active' | 'started' | 'completed' | 'approved' | 'missed';

interface Period {
  id: string;
  class_name: string;
  subject: string;
  start_time: string;
  end_time: string;
}

interface LessonLog {
  log_id: string;
  timetable_period_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
}

interface Slot {
  period: Period;
  log: LessonLog | null;
  slotStatus: SlotStatus;
}

interface MissedLog {
  log_id: string;
  lesson_date: string;
  class_name: string;
  subject: string;
  scheduled_start: string;
  scheduled_end: string;
}

/* ─── Camera Modal ─────────────────────────────────────────────────── */
interface CameraModalProps {
  title: string;
  instruction: string;
  onCapture: (base64: string) => void;
  onClose: () => void;
}

function CameraModal({ title, instruction, onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => setReady(true)).catch(() => setReady(true));
        }
      })
      .catch((e) => {
        if (!cancelled) setCamError(e?.message || 'Camera access denied. Please allow camera permission.');
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    // Cap at 1280×960 to keep JPEG well under 3 MB
    const MAX_W = 1280;
    const MAX_H = 960;
    const srcW = video.videoWidth || MAX_W;
    const srcH = video.videoHeight || MAX_H;
    const scale = Math.min(1, MAX_W / srcW, MAX_H / srcH);
    canvas.width = Math.round(srcW * scale);
    canvas.height = Math.round(srcH * scale);
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setPreview(dataUrl);
    // Stop live feed once captured
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const retake = () => {
    setPreview(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play(); }
      })
      .catch((e) => setCamError(e?.message || 'Camera error'));
  };

  const confirm = () => {
    if (!preview) return;
    setUploading(true);
    const base64 = preview.split(',')[1] ?? '';
    onCapture(base64);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#0b1120] border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-white/60">{instruction}</p>

          {camError ? (
            <div className="rounded-xl bg-red-950/50 border border-red-400/30 p-4 text-sm text-red-200">{camError}</div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              {!preview ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ display: ready ? 'block' : 'none' }}
                />
              ) : (
                <img src={preview} alt="Captured" className="w-full h-full object-cover" />
              )}
              {!ready && !preview && !camError && (
                <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
                  Starting camera…
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          <div className="flex gap-3">
            {!preview ? (
              <button
                type="button"
                onClick={capture}
                disabled={!ready || !!camError}
                className="flex-1 min-h-[44px] rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-500 disabled:opacity-40 transition-colors"
              >
                📸 Capture Photo
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={retake}
                  disabled={uploading}
                  className="flex-1 min-h-[44px] rounded-xl border border-white/20 text-white/70 text-sm font-medium hover:bg-white/5 disabled:opacity-40"
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={uploading}
                  className="flex-1 min-h-[44px] rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-500 disabled:opacity-40 transition-colors"
                >
                  {uploading ? 'Submitting…' : '✓ Use This Photo'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slot status helpers ──────────────────────────────────────────── */
function computeSlotStatus(period: Period, log: LessonLog | null): SlotStatus {
  if (log) {
    if (log.status === 'approved') return 'approved';
    if (log.status === 'completed') return 'completed';
    if (log.status === 'started') return 'started';
  }
  const now = hhmmNow();
  const windowOpen = addMins(period.start_time, -5);
  const windowClose = addMins(period.start_time, 30);
  if (now >= windowOpen && now <= windowClose) return 'active';
  if (now > windowClose && now < period.end_time) return 'missed';
  if (now >= period.end_time) return 'missed';
  return 'upcoming';
}

const STATUS_STYLE: Record<SlotStatus, string> = {
  upcoming: 'border-white/10 bg-white/[0.03]',
  active: 'border-teal-500/50 bg-teal-950/30',
  started: 'border-amber-500/50 bg-amber-950/30',
  completed: 'border-blue-500/40 bg-blue-950/30',
  approved: 'border-emerald-500/40 bg-emerald-950/25',
  missed: 'border-red-500/30 bg-red-950/20',
};
const STATUS_BADGE: Record<SlotStatus, { label: string; cls: string }> = {
  upcoming: { label: 'Upcoming', cls: 'bg-white/10 text-white/50' },
  active: { label: 'Start Now', cls: 'bg-teal-500/20 text-teal-300' },
  started: { label: 'In Progress', cls: 'bg-amber-500/20 text-amber-300' },
  completed: { label: 'Submitted', cls: 'bg-blue-500/20 text-blue-300' },
  approved: { label: 'Approved ✓', cls: 'bg-emerald-500/20 text-emerald-300' },
  missed: { label: 'Missed', cls: 'bg-red-500/20 text-red-400' },
};

/* ─── Main page ────────────────────────────────────────────────────── */
export default function LessonLogPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId);

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [missedLogs, setMissedLogs] = useState<MissedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Camera modal state
  type CameraPhase = 'start' | 'close';
  const [cameraSlot, setCameraSlot] = useState<Slot | null>(null);
  const [cameraPhase, setCameraPhase] = useState<CameraPhase>('start');
  const [actionLoading, setActionLoading] = useState<string | null>(null); // log_id or period_id
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }, []);

  /* ── Resolve teacher_id ── */
  useEffect(() => {
    if (!user || !schoolId) return;
    resolveTeacherIdForSchool(schoolId, user).then((tid) => setTeacherId(tid));
  }, [user, schoolId]);

  /* ── Load timetable + logs ── */
  const load = useCallback(async () => {
    if (!teacherId || !schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const today = ugandaDateStr();
      const dayName = ugandaDayName();

      const fourteenDaysAgo = new Date(Date.now() + 3 * 60 * 60 * 1000 - 14 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      const [{ data: periods, error: pErr }, { data: logs, error: lErr }, { data: expired }] = await Promise.all([
        supabase
          .from('timetable_periods')
          .select('id, class_name, subject, start_time, end_time')
          .eq('school_id', schoolId)
          .eq('teacher_id', teacherId)
          .eq('day_of_week', dayName)
          .order('start_time'),
        supabase
          .from('lesson_logs')
          .select('log_id, timetable_period_id, status, started_at, ended_at')
          .eq('teacher_id', teacherId)
          .eq('lesson_date', today),
        supabase
          .from('lesson_logs')
          .select('log_id, lesson_date, class_name, subject, scheduled_start, scheduled_end')
          .eq('teacher_id', teacherId)
          .eq('status', 'auto_expired')
          .gte('lesson_date', fourteenDaysAgo)
          .lt('lesson_date', today)
          .order('lesson_date', { ascending: false })
          .order('scheduled_start', { ascending: true })
          .limit(50),
      ]);

      if (pErr) throw new Error(pErr.message);
      if (lErr) throw new Error(lErr.message);

      const logMap = new Map<string, LessonLog>();
      for (const l of logs ?? []) logMap.set(l.timetable_period_id, l as LessonLog);

      const built: Slot[] = (periods ?? []).map((p) => {
        const period: Period = { id: String(p.id), class_name: p.class_name, subject: p.subject, start_time: p.start_time.slice(0, 5), end_time: p.end_time.slice(0, 5) };
        const log = logMap.get(period.id) ?? null;
        return { period, log, slotStatus: computeSlotStatus(period, log) };
      });

      setSlots(built);
      setMissedLogs((expired ?? []) as MissedLog[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  }, [teacherId, schoolId]);

  useEffect(() => { void load(); }, [load]);

  // Refresh slot statuses every minute so time-lock updates live
  useEffect(() => {
    const id = setInterval(() => {
      setSlots((prev) =>
        prev.map((s) => ({ ...s, slotStatus: computeSlotStatus(s.period, s.log) }))
      );
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  /* ── Handle photo captured ── */
  const handleCapture = async (base64: string) => {
    if (!cameraSlot || !teacherId || !schoolId) return;
    const { period, log } = cameraSlot;
    setActionLoading(log?.log_id ?? period.id);
    setCameraSlot(null);

    try {
      if (cameraPhase === 'start') {
        const res = await fetch(registerApiUrl('/api/lesson-log/start'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId,
            teacherId,
            periodId: period.id,
            className: period.class_name,
            subject: period.subject,
            scheduledStart: period.start_time,
            scheduledEnd: period.end_time,
            photoBase64: base64,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to start lesson');
        showToast('Lesson started! Photo saved.', true);
      } else {
        if (!log) throw new Error('No active lesson found');
        const res = await fetch(registerApiUrl('/api/lesson-log/complete'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logId: log.log_id, schoolId, teacherId, photoBase64: base64 }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to close lesson');
        showToast('Lesson closed and submitted for review!', true);
      }
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Action failed', false);
    } finally {
      setActionLoading(null);
    }
  };

  const openCamera = (slot: Slot, phase: CameraPhase) => {
    setCameraPhase(phase);
    setCameraSlot(slot);
  };

  /* ── Render ── */
  if (loading) {
    return (
      <AdminPageWrapper title="Lesson Log">
        <div className="ac-text-muted text-sm">Loading today's timetable…</div>
      </AdminPageWrapper>
    );
  }

  const today = ugandaDateStr();
  const dayName = ugandaDayName();

  return (
    <AdminPageWrapper title="Lesson Log" subtitle={`${dayName} · ${today}`}>
      {error && (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {toast && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${toast.ok ? 'border-emerald-400/30 bg-emerald-950/40 text-emerald-200' : 'border-red-400/30 bg-red-950/40 text-red-200'}`}>
          {toast.msg}
        </div>
      )}

      {!teacherId && !loading && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          Your account is not linked to a teacher record. Contact the administrator.
        </div>
      )}

      {teacherId && slots.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/40">
          No lessons scheduled for today ({dayName}).
        </div>
      )}

      <div className="space-y-3">
        {slots.map((slot) => {
          const { period, log, slotStatus } = slot;
          const badge = STATUS_BADGE[slotStatus];
          const cardStyle = STATUS_STYLE[slotStatus];
          const isActing = actionLoading === (log?.log_id ?? period.id);

          return (
            <div key={period.id} className={`rounded-2xl border p-4 transition-colors ${cardStyle}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-semibold text-white">{period.subject}</span>
                    <span className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/50">{period.class_name}</span>
                  </div>
                  <div className="mt-1 text-sm text-white/50">
                    {fmtTime(period.start_time)} – {fmtTime(period.end_time)}
                  </div>
                  {log?.started_at && (
                    <div className="mt-1 text-xs text-white/40">
                      Started at {new Date(log.started_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
                      {log.ended_at && ` · Closed at ${new Date(log.ended_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`text-xs font-semibold rounded-full px-3 py-1 ${badge.cls}`}>{badge.label}</span>

                  {slotStatus === 'active' && (
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => openCamera(slot, 'start')}
                      className="min-h-[40px] rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40 transition-colors"
                    >
                      {isActing ? 'Starting…' : '▶ Start Lesson'}
                    </button>
                  )}

                  {slotStatus === 'started' && (
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => openCamera(slot, 'close')}
                      className="min-h-[40px] rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-40 transition-colors"
                    >
                      {isActing ? 'Submitting…' : '⏹ Close Lesson'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-white/30">
        <strong className="text-white/50">How it works:</strong> The Start button becomes active at the scheduled lesson time. Take a photo of your students to confirm you are in class. At the end, close the lesson with a photo of the board showing today's work.
      </div>

      {missedLogs.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-red-400 mb-3">Missed Lessons (Last 14 Days)</h2>
          <div className="space-y-2">
            {missedLogs.map((ml) => (
              <div key={ml.log_id} className="rounded-2xl border border-red-500/20 bg-red-950/15 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{ml.subject}</span>
                      <span className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/50">{ml.class_name}</span>
                    </div>
                    <div className="mt-1 text-xs text-white/40">
                      {new Date(ml.lesson_date + 'T12:00:00Z').toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}{fmtTime(ml.scheduled_start.slice(0, 5))} – {fmtTime(ml.scheduled_end.slice(0, 5))}
                    </div>
                  </div>
                  <span className="text-xs font-semibold rounded-full px-3 py-1 bg-red-500/20 text-red-400 flex-shrink-0">Missed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cameraSlot && (
        <CameraModal
          title={cameraPhase === 'start' ? 'Start Lesson — Photo of Students' : 'Close Lesson — Photo of Board'}
          instruction={
            cameraPhase === 'start'
              ? `Take a clear photo showing students present in class for ${cameraSlot.period.subject} (${cameraSlot.period.class_name}).`
              : `Take a photo of the board or written work to show what was covered in ${cameraSlot.period.subject} today.`
          }
          onCapture={handleCapture}
          onClose={() => setCameraSlot(null)}
        />
      )}
    </AdminPageWrapper>
  );
}
