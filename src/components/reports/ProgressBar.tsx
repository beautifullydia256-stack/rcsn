import React, { useState, useEffect } from 'react';
import { Clock, Loader2, Sparkles, CheckCircle2, UploadCloud, FileText, Package, Zap } from 'lucide-react';

export type ProgressPhase =
  | 'preparing'
  | 'generating'
  | 'uploading'
  | 'packaging'
  | 'saving'
  | 'completed';

export interface ProgressBarProps {
  phase: ProgressPhase;
  current: number;
  total: number;
  isVisible: boolean;
  startTime?: number | null;
  currentItemName?: string;
  statusMessage?: string;
  stepLabel?: string;
}

export function ProgressBar({
  phase,
  current,
  total,
  isVisible,
  startTime,
  currentItemName,
  statusMessage,
  stepLabel,
}: ProgressBarProps) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!isVisible || !startTime) return;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, [isVisible, startTime]);

  if (!isVisible) return null;

  const elapsedMs = startTime ? Math.max(0, now - startTime) : 0;
  const elapsedSec = Math.floor(elapsedMs / 1000);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    return `${mins}:${remSec.toString().padStart(2, '0')}`;
  };

  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  // Compute dynamic pace and remaining ETA
  let etaDisplay = 'Calculating pace…';
  let paceDisplay = '';
  if (current > 0 && elapsedSec >= 1) {
    const pace = elapsedSec / current; // seconds per item
    paceDisplay = `${pace.toFixed(1)}s / item`;
    const remaining = Math.max(0, total - current);
    if (remaining === 0) {
      etaDisplay = 'Finishing up…';
    } else {
      const remSec = Math.round(remaining * pace);
      if (remSec < 60) {
        etaDisplay = `~${remSec}s remaining`;
      } else {
        const m = Math.floor(remSec / 60);
        const s = remSec % 60;
        etaDisplay = `~${m}m ${s}s remaining`;
      }
    }
  } else if (total > 0) {
    const estSec = Math.round(total * 1.5);
    etaDisplay = `Est. ~${estSec < 60 ? `${estSec}s` : `${Math.floor(estSec / 60)}m ${estSec % 60}s`}`;
  }

  // Phase configurations
  const phaseMeta: Record<
    ProgressPhase,
    {
      title: string;
      color: string;
      gradient: string;
      icon: React.ReactNode;
      badgeBg: string;
      badgeText: string;
    }
  > = {
    preparing: {
      title: stepLabel || 'Preparing Report PDFs',
      color: '#8b5cf6',
      gradient: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
      icon: <FileText size={16} className="text-purple-400 animate-pulse" />,
      badgeBg: 'rgba(139, 92, 246, 0.15)',
      badgeText: '#a78bfa',
    },
    generating: {
      title: stepLabel || 'Generating Report PDFs',
      color: '#8b5cf6',
      gradient: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
      icon: <FileText size={16} className="text-purple-400 animate-pulse" />,
      badgeBg: 'rgba(139, 92, 246, 0.15)',
      badgeText: '#a78bfa',
    },
    uploading: {
      title: stepLabel || 'Publishing Reports to Cloud',
      color: '#06b6d4',
      gradient: 'linear-gradient(90deg, #0284c7 0%, #06b6d4 50%, #10b981 100%)',
      icon: <UploadCloud size={16} className="text-cyan-400 animate-bounce" />,
      badgeBg: 'rgba(6, 182, 212, 0.15)',
      badgeText: '#38bdf8',
    },
    packaging: {
      title: stepLabel || 'Compiling ZIP Archive',
      color: '#f59e0b',
      gradient: 'linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #10b981 100%)',
      icon: <Package size={16} className="text-amber-400 animate-spin" />,
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeText: '#fbbf24',
    },
    saving: {
      title: stepLabel || 'Finalizing Published Records',
      color: '#10b981',
      gradient: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
      icon: <Loader2 size={16} className="text-emerald-400 animate-spin" />,
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeText: '#34d399',
    },
    completed: {
      title: 'Operation Completed',
      color: '#10b981',
      gradient: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
      icon: <CheckCircle2 size={16} className="text-emerald-400" />,
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeText: '#34d399',
    },
  };

  const meta = phaseMeta[phase] || phaseMeta.generating;

  return (
    <div
      style={{
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 16,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        color: '#f8fafc',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Top Header: Phase Title + Progress Fraction */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              background: meta.badgeBg,
              border: `1px solid ${meta.color}40`,
            }}
          >
            {meta.icon}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
              {meta.title}
            </div>
            {statusMessage ? (
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                {statusMessage}
              </div>
            ) : null}
          </div>
        </div>

        {/* Counter Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              background: meta.badgeBg,
              color: meta.badgeText,
              border: `1px solid ${meta.color}50`,
            }}
          >
            {total > 0 ? `${current} / ${total} (${percentage}%)` : `${percentage}%`}
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div
        style={{
          width: '100%',
          height: 10,
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 9999,
          overflow: 'hidden',
          marginBottom: 12,
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: meta.gradient,
            borderRadius: 9999,
            transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 12px ${meta.color}80`,
          }}
        />
      </div>

      {/* Real-time Metrics Bar (Elapsed, Remaining, Speed) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 8,
          marginBottom: currentItemName ? 10 : 0,
        }}
      >
        {/* Metric 1: Elapsed Stopwatch */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: 12,
          }}
        >
          <Clock size={14} style={{ color: '#38bdf8' }} />
          <span style={{ color: '#94a3b8' }}>Elapsed:</span>
          <span style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
            {formatDuration(elapsedSec)}
          </span>
        </div>

        {/* Metric 2: Estimated Time Remaining */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: 12,
          }}
        >
          <Sparkles size={14} style={{ color: '#f59e0b' }} />
          <span style={{ color: '#94a3b8' }}>Remaining:</span>
          <span style={{ fontWeight: 700, color: '#fbbf24' }}>
            {etaDisplay}
          </span>
        </div>

        {/* Metric 3: Processing Pace */}
        {paceDisplay ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: 12,
            }}
          >
            <Zap size={14} style={{ color: '#10b981' }} />
            <span style={{ color: '#94a3b8' }}>Pace:</span>
            <span style={{ fontWeight: 700, color: '#34d399' }}>
              {paceDisplay}
            </span>
          </div>
        ) : null}
      </div>

      {/* Active Student Detail Note */}
      {currentItemName ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            fontSize: 12,
            color: '#c4b5fd',
          }}
        >
          <span style={{ fontWeight: 600, color: '#a78bfa' }}>Current Student:</span>
          <span style={{ fontWeight: 500, color: '#ffffff' }}>{currentItemName}</span>
        </div>
      ) : null}
    </div>
  );
}
