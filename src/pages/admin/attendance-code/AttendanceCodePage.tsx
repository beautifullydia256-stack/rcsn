import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { generateAttendanceCode, secondsToNextWindow } from '@/lib/attendanceCode';

export default function AttendanceCodePage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const [code, setCode] = useState('------');
  const [seconds, setSeconds] = useState(secondsToNextWindow());
  const lastWindow = useRef(-1);

  useEffect(() => {
    if (!schoolId) return;

    let cancelled = false;

    async function refresh() {
      const w = Math.floor(Date.now() / 30_000);
      if (w !== lastWindow.current) {
        lastWindow.current = w;
        const c = await generateAttendanceCode(schoolId!);
        if (!cancelled) setCode(c);
      }
    }

    void refresh();

    const tick = setInterval(() => {
      if (cancelled) return;
      setSeconds(secondsToNextWindow());
      void refresh();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [schoolId]);

  const d1 = code.slice(0, 3);
  const d2 = code.slice(3, 6);
  const pct = ((29 - seconds) / 29) * 100;
  const urgent = seconds <= 5;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(16,185,129,0.08) 0%, transparent 70%), var(--ac-bg, #0a0f1e)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: "'Geist', system-ui, sans-serif",
      }}
    >
      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'rgba(15,23,42,0.85)',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 32,
          padding: '48px 40px 40px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 0 1px rgba(16,185,129,0.08), 0 32px 80px rgba(0,0,0,0.5), 0 0 60px rgba(16,185,129,0.06)',
          textAlign: 'center',
        }}
      >
        {/* Label */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(16,185,129,0.75)',
            marginBottom: 12,
          }}
        >
          Attendance Verification Code
        </div>

        {/* Code digits */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            margin: '28px 0 32px',
          }}
        >
          {/* First group */}
          <div style={{ display: 'flex', gap: 10 }}>
            {d1.split('').map((digit, i) => (
              <span
                key={`d1-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 80,
                  background: urgent
                    ? 'rgba(239,68,68,0.12)'
                    : 'rgba(16,185,129,0.10)',
                  border: urgent
                    ? '1.5px solid rgba(239,68,68,0.35)'
                    : '1.5px solid rgba(16,185,129,0.3)',
                  borderRadius: 16,
                  fontSize: 48,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: urgent ? '#f87171' : '#34d399',
                  fontFamily: "'Geist Mono', 'Courier New', monospace",
                  letterSpacing: '-0.02em',
                  transition: 'all 0.2s ease',
                  boxShadow: urgent
                    ? '0 0 20px rgba(239,68,68,0.15)'
                    : '0 0 20px rgba(16,185,129,0.12)',
                }}
              >
                {digit}
              </span>
            ))}
          </div>

          {/* Separator */}
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: urgent ? '#f87171' : '#34d399',
              opacity: 0.7,
              flexShrink: 0,
              boxShadow: urgent ? '0 0 8px rgba(239,68,68,0.5)' : '0 0 8px rgba(52,211,153,0.5)',
            }}
          />

          {/* Second group */}
          <div style={{ display: 'flex', gap: 10 }}>
            {d2.split('').map((digit, i) => (
              <span
                key={`d2-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 80,
                  background: urgent
                    ? 'rgba(239,68,68,0.12)'
                    : 'rgba(16,185,129,0.10)',
                  border: urgent
                    ? '1.5px solid rgba(239,68,68,0.35)'
                    : '1.5px solid rgba(16,185,129,0.3)',
                  borderRadius: 16,
                  fontSize: 48,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: urgent ? '#f87171' : '#34d399',
                  fontFamily: "'Geist Mono', 'Courier New', monospace",
                  letterSpacing: '-0.02em',
                  transition: 'all 0.2s ease',
                  boxShadow: urgent
                    ? '0 0 20px rgba(239,68,68,0.15)'
                    : '0 0 20px rgba(16,185,129,0.12)',
                }}
              >
                {digit}
              </span>
            ))}
          </div>
        </div>

        {/* Countdown bar */}
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              height: 6,
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: urgent
                  ? 'linear-gradient(90deg, #ef4444, #f87171)'
                  : 'linear-gradient(90deg, #10b981, #34d399)',
                borderRadius: 99,
                transition: 'width 0.9s linear, background 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Countdown text */}
        <div
          style={{
            fontSize: 13,
            color: urgent ? '#f87171' : 'rgba(148,163,184,0.8)',
            fontWeight: 500,
            marginBottom: 32,
            transition: 'color 0.2s ease',
          }}
        >
          {urgent
            ? `Code expires in ${seconds}s — tell the teacher now`
            : `Changes in ${seconds} second${seconds !== 1 ? 's' : ''}`}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 24 }} />

        {/* Instructions */}
        <div style={{ textAlign: 'left' }}>
          <p
            style={{
              fontSize: 12,
              color: 'rgba(148,163,184,0.75)',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            <span style={{ color: '#34d399', fontWeight: 600 }}>How it works: </span>
            When a teacher cannot punch in or out using GPS, they come to you and read this code.
            The teacher enters the code on their phone to verify attendance.
            The code is unique to your school and changes every 30 seconds.
          </p>
        </div>
      </div>

      {/* School indicator */}
      {!schoolId && (
        <p style={{ marginTop: 20, color: '#f87171', fontSize: 13 }}>
          No school linked to your account. Contact support.
        </p>
      )}
    </div>
  );
}
