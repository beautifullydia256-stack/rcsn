import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  Play,
  Square,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import { resolveTeacherIdForSchool } from '@/lib/resolveTeacherId';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';

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

// 180° Calibrated Semi-Circle Progress Gauge
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
          fontSize: '13px',
          fontWeight: 800,
          color,
          letterSpacing: '-0.02em',
        }}
      >
        {centerLabel ?? `${Math.round(percent)}%`}
      </div>
    </div>
  );
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

/* ─── Camera Modal Component ───────────────────────────────────────── */
function CameraModal({
  title,
  instruction,
  onCapture,
  onClose,
  isDark,
}: {
  title: string;
  instruction: string;
  onCapture: (base64: string) => Promise<void>;
  onClose: () => void;
  isDark: boolean;
}) {
  const t = getTokens(isDark);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    let s: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      .then((mediaStream) => {
        s = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      })
      .catch(() => {
        setCamError('Could not access camera. Please ensure permissions are granted.');
      });

    return () => {
      s?.getTracks().forEach((trk) => trk.stop());
    };
  }, []);

  const snap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const b64 = c.toDataURL('image/jpeg', 0.82);
    setCaptured(b64);
  };

  const retake = () => setCaptured(null);

  const confirm = async () => {
    if (!captured) return;
    setUploading(true);
    try {
      await onCapture(captured);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${t.border}`,
            background: t.surface,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={18} style={{ color: t.brandBlue }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: t.textPrimary, margin: 0 }}>{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: t.textMuted,
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport Area */}
        <div style={{ padding: '20px' }}>
          <p style={{ fontSize: '13px', color: t.textMuted, margin: '0 0 14px 0' }}>{instruction}</p>

          {camError ? (
            <div
              style={{
                borderRadius: '12px',
                padding: '14px',
                background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2',
                color: isDark ? '#F87171' : '#B91C1C',
                fontSize: '13px',
              }}
            >
              {camError}
            </div>
          ) : (
            <div
              style={{
                position: 'relative',
                aspectRatio: '4/3',
                width: '100%',
                borderRadius: '14px',
                overflow: 'hidden',
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {!captured && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              {captured && (
                <img
                  src={captured}
                  alt="Captured photolog"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
            {!captured ? (
              <button
                type="button"
                onClick={snap}
                disabled={!!camError}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: t.brandBlue,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: camError ? 'not-allowed' : 'pointer',
                  opacity: camError ? 0.5 : 1,
                }}
              >
                <Camera size={16} />
                Capture Photolog
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={retake}
                  disabled={uploading}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    color: t.textPrimary,
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <RotateCcw size={15} />
                  Retake Photo
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={uploading}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: t.brandMint,
                    color: '#064E3B',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    opacity: uploading ? 0.6 : 1,
                  }}
                >
                  <Check size={16} />
                  {uploading ? 'Submitting...' : 'Use This Photo'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slot status computation ──────────────────────────────────────── */
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

/* ─── Main LessonLogPage Component ─────────────────────────────────── */
export default function LessonLogPage() {
  const navigate = useNavigate();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

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
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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
        const period: Period = {
          id: String(p.id),
          class_name: p.class_name,
          subject: p.subject,
          start_time: p.start_time.slice(0, 5),
          end_time: p.end_time.slice(0, 5),
        };
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

  // Refresh slot statuses every minute
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
        showToast('Lesson started! Photo evidence saved.', true);
      } else {
        if (!log) throw new Error('No active lesson found');
        const res = await fetch(registerApiUrl('/api/lesson-log/complete'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logId: log.log_id, schoolId, teacherId, photoBase64: base64 }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to close lesson');
        showToast('Lesson closed and submitted for DOS review!', true);
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

  const today = ugandaDateStr();
  const dayName = ugandaDayName();

  // Metrics
  const totalPeriodsToday = slots.length;
  const completedCount = slots.filter((s) => s.slotStatus === 'completed' || s.slotStatus === 'approved').length;
  const inProgressCount = slots.filter((s) => s.slotStatus === 'started' || s.slotStatus === 'active').length;
  const missedCount = slots.filter((s) => s.slotStatus === 'missed').length;
  const complianceRate = totalPeriodsToday > 0 ? (completedCount / totalPeriodsToday) * 100 : 100;

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
        
        {/* Header & Navigation */}
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
              <span style={{ fontSize: '12px', color: '#A855F7', fontWeight: 600 }}>Lesson Verification</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: t.textPrimary, margin: 0 }}>
              Daily Lesson Log & Photolog Station
            </h1>
            <p style={{ fontSize: '13px', color: t.textMuted, margin: '4px 0 0 0' }}>
              Verify instructional presence, log period delivery, and submit classroom evidence for {dayName}, {today}.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => void load()}
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
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} />
              Refresh Slots
            </button>
          </div>
        </div>

        {/* Alerts & Notifications */}
        {error && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '14px',
              background: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2',
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5'}`,
              color: isDark ? '#F87171' : '#B91C1C',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {toast && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '14px',
              background: toast.ok
                ? isDark
                  ? 'rgba(61, 232, 160, 0.15)'
                  : '#ECFDF5'
                : isDark
                ? 'rgba(239, 68, 68, 0.12)'
                : '#FEE2E2',
              border: `1px solid ${
                toast.ok
                  ? isDark
                    ? 'rgba(61, 232, 160, 0.3)'
                    : '#A7F3D0'
                  : isDark
                  ? 'rgba(239, 68, 68, 0.3)'
                  : '#FCA5A5'
              }`,
              color: toast.ok ? (isDark ? t.brandMint : '#065F46') : isDark ? '#F87171' : '#B91C1C',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            {toast.msg}
          </div>
        )}

        {/* 4 Summary POS KPI Cards with Semi-Circle Progress Gauge */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Card 1: Today Compliance Rate */}
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
                Delivery Compliance
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: t.textPrimary, marginTop: '4px' }}>
                {Math.round(complianceRate)}%
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                {completedCount} of {totalPeriodsToday} logged
              </span>
            </div>
            <SemiCircleGauge
              percent={complianceRate}
              color="#A855F7"
              trackColor={isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'}
            />
          </div>

          {/* Card 2: Periods Completed */}
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
                Delivered & Closed
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.brandMint, marginTop: '4px' }}>
                {completedCount}
              </div>
              <span style={{ fontSize: '12px', color: t.brandMint, fontWeight: 500 }}>
                Photolog verified
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
              <CheckCircle2 size={24} />
            </div>
          </div>

          {/* Card 3: In Progress or Active */}
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
                Active / In Progress
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.brandGold, marginTop: '4px' }}>
                {inProgressCount}
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                Currently instructing
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
              <Clock size={24} />
            </div>
          </div>

          {/* Card 4: Total Today */}
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
                Today Periods
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.brandBlue, marginTop: '4px' }}>
                {totalPeriodsToday}
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                {dayName} allocation
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
        </div>

        {/* Loading State */}
        {loading && (
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
            <p style={{ marginTop: '12px', fontSize: '14px', color: t.textMuted }}>Syncing timetable slots and verification status...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && slots.length === 0 && (
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <Clock size={36} style={{ color: t.textSub, margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: t.textPrimary, margin: 0 }}>
              No lessons scheduled for today ({dayName})
            </h3>
            <p style={{ fontSize: '13px', color: t.textMuted, maxWidth: '420px', margin: '8px auto 0 auto' }}>
              Your teaching timetable has no periods assigned on this day. Use this time for planning, marking, or resource organization.
            </p>
          </div>
        )}

        {/* Daily Period Slots List */}
        {!loading && slots.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {slots.map((slot) => {
              const { period, log, slotStatus } = slot;
              const isActing = actionLoading === (log?.log_id ?? period.id);

              return (
                <div
                  key={period.id}
                  style={{
                    background:
                      slotStatus === 'active'
                        ? isDark
                          ? 'rgba(61, 232, 160, 0.05)'
                          : '#F0FDF4'
                        : slotStatus === 'started'
                        ? isDark
                          ? 'rgba(245, 192, 68, 0.05)'
                          : '#FEFCE8'
                        : t.card,
                    border: `1px solid ${
                      slotStatus === 'active'
                        ? t.brandMint
                        : slotStatus === 'started'
                        ? t.brandGold
                        : t.border
                    }`,
                    borderRadius: '16px',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    boxShadow: slotStatus === 'active' ? '0 4px 20px rgba(61, 232, 160, 0.12)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Left info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: t.textPrimary }}>
                        {period.subject}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isDark ? 'rgba(120, 170, 255, 0.15)' : '#EFF6FF',
                          color: t.brandBlue,
                        }}
                      >
                        {period.class_name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '13px', color: t.textMuted }}>
                      <Clock size={14} style={{ color: t.textSub }} />
                      <span>
                        {fmtTime(period.start_time)} – {fmtTime(period.end_time)}
                      </span>
                      {log?.started_at && (
                        <>
                          <span style={{ color: t.textSub }}>•</span>
                          <span style={{ color: t.brandMint, fontWeight: 600 }}>
                            Started at {new Date(log.started_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                      {log?.ended_at && (
                        <>
                          <span style={{ color: t.textSub }}>•</span>
                          <span style={{ color: t.textPrimary, fontWeight: 600 }}>
                            Closed at {new Date(log.ended_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right actions & status badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {slotStatus === 'upcoming' && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
                          color: t.textSub,
                        }}
                      >
                        Upcoming
                      </span>
                    )}

                    {slotStatus === 'active' && (
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => openCamera(slot, 'start')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 18px',
                          borderRadius: '10px',
                          background: t.brandMint,
                          color: '#064E3B',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: isActing ? 'not-allowed' : 'pointer',
                          border: 'none',
                          boxShadow: '0 2px 10px rgba(61, 232, 160, 0.25)',
                        }}
                      >
                        <Play size={14} />
                        {isActing ? 'Starting...' : 'Start Lesson'}
                      </button>
                    )}

                    {slotStatus === 'started' && (
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => openCamera(slot, 'close')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 18px',
                          borderRadius: '10px',
                          background: t.brandGold,
                          color: '#78350F',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: isActing ? 'not-allowed' : 'pointer',
                          border: 'none',
                        }}
                      >
                        <Square size={14} />
                        {isActing ? 'Submitting...' : 'Close Lesson'}
                      </button>
                    )}

                    {(slotStatus === 'completed' || slotStatus === 'approved') && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: isDark ? 'rgba(61, 232, 160, 0.15)' : '#ECFDF5',
                          color: isDark ? t.brandMint : '#065F46',
                        }}
                      >
                        <CheckCircle2 size={14} />
                        {slotStatus === 'approved' ? 'Verified & Approved' : 'Submitted'}
                      </span>
                    )}

                    {slotStatus === 'missed' && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                          color: isDark ? '#F87171' : '#B91C1C',
                        }}
                      >
                        Missed Window
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Missed Lessons Section */}
        {missedLogs.length > 0 && (
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: '18px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <AlertCircle size={18} style={{ color: isDark ? '#F87171' : '#DC2626' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: t.textPrimary, margin: 0 }}>
                Unlogged or Expired Periods (Last 14 Days)
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {missedLogs.map((ml) => (
                <div
                  key={ml.log_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: t.card,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: t.textPrimary }}>
                      {ml.subject} ({ml.class_name})
                    </div>
                    <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '2px' }}>
                      {ml.lesson_date} · {fmtTime(ml.scheduled_start.slice(0, 5))} – {fmtTime(ml.scheduled_end.slice(0, 5))}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                      color: isDark ? '#F87171' : '#B91C1C',
                    }}
                  >
                    Auto-Expired
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Mount */}
        {cameraSlot && (
          <CameraModal
            title={cameraPhase === 'start' ? 'Start Lesson — Photo of Students' : 'Close Lesson — Photo of Board'}
            instruction={
              cameraPhase === 'start'
                ? `Take a clear photo showing learners present in class for ${cameraSlot.period.subject} (${cameraSlot.period.class_name}).`
                : `Take a clear photo of the board or written exercises showing what was taught in ${cameraSlot.period.subject} today.`
            }
            onCapture={handleCapture}
            onClose={() => setCameraSlot(null)}
            isDark={isDark}
          />
        )}
      </div>
    </div>
  );
}
