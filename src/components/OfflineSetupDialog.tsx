import { useState } from 'react';
import { Globe, CheckCircle2, Check } from 'lucide-react';
import { isDesktopApp } from '../lib/isDesktopApp';
import { cacheSchoolData } from '../lib/offlineSync';
import { useOfflineModeStore } from '../store/offlineModeStore';

interface Props {
  schoolId: string;
  onDone: () => void;
}

type Phase = 'choice' | 'downloading' | 'done';

const S = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 9998,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5, 8, 15, 0.80)',
    backdropFilter: 'blur(8px)',
    padding: '1rem',
  },
  card: {
    background: '#0e1623',
    border: '1px solid rgba(100,120,160,0.18)',
    borderRadius: 16,
    padding: '2rem',
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'rgba(16,217,168,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.25rem',
    fontSize: 26,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: '#c5d4ef',
    marginBottom: '0.5rem',
  },
  body: {
    fontSize: 14,
    color: '#94a8d0',
    lineHeight: 1.6,
    marginBottom: '1.25rem',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  listItem: {
    fontSize: 13,
    color: '#8aafd4',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  check: {
    color: '#10d9a8',
    fontSize: 14,
    flexShrink: 0,
  },
  primaryBtn: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: 10,
    border: 'none',
    background: '#10d9a8',
    color: '#05080f',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    marginBottom: 10,
    transition: 'opacity 0.15s',
  },
  ghostBtn: {
    width: '100%',
    padding: '0.65rem 1rem',
    borderRadius: 10,
    border: '1px solid rgba(100,120,160,0.2)',
    background: 'transparent',
    color: '#94a8d0',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 8,
    background: 'rgba(16,217,168,0.12)',
    overflow: 'hidden',
    margin: '1rem 0 0.5rem',
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#94a8d0',
    marginBottom: '1.5rem',
  },
  stepLabel: {
    fontSize: 14,
    color: '#c5d4ef',
    marginBottom: '0.25rem',
  },
  muted: {
    fontSize: 12,
    color: '#6a85b0',
  },
  doneIcon: {
    fontSize: 40,
    marginBottom: '0.75rem',
  },
  syncedAt: {
    fontSize: 12,
    color: '#6a85b0',
    marginTop: 4,
  },
};

function stepLabel(progress: number): string {
  if (progress < 10) return 'Starting download…';
  if (progress < 45) return 'Fetching data from server…';
  if (progress < 72) return 'Saving to local database…';
  if (progress < 100) return 'Downloading student photos…';
  return 'All done!';
}

export default function OfflineSetupDialog({ schoolId, onDone }: Props) {
  const { setMode, setCacheStatus, setCacheProgress, setLastSynced } = useOfflineModeStore();
  const [phase, setPhase] = useState<Phase>('choice');
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    setMode('offline');
    setCacheStatus('downloading');
    setPhase('downloading');

    await cacheSchoolData(schoolId, (p) => {
      setProgress(p);
      setCacheProgress(p);
    });

    const now = new Date().toISOString();
    setLastSynced(now);
    setCacheStatus('done');
    setProgress(100);
    setPhase('done');
  };

  const handleSkip = () => {
    setMode('online-only');
    onDone();
  };

  const handleDone = () => {
    onDone();
  };

  return (
    <div style={S.overlay}>
      <div style={S.card}>

        {phase === 'choice' && (
          <>
            <div style={S.iconWrap}><Globe style={{ width: 36, height: 36, color: "#38bdf8" }} /></div>
            <div style={S.title}>Enable offline access?</div>
            <div style={S.body}>
              Download your school data now so PwezaCore works even without an internet
              connection. Attendance, fees, visitors and more will all be available offline.
            </div>
            <ul style={S.list}>
              <li style={S.listItem}><span style={S.check}><Check style={{ width: 14, height: 14 }} /></span> Students &amp; classes</li>
              <li style={S.listItem}><span style={S.check}><Check style={{ width: 14, height: 14 }} /></span> Teachers &amp; staff</li>
              <li style={S.listItem}><span style={S.check}><Check style={{ width: 14, height: 14 }} /></span> Parents &amp; contacts</li>
              <li style={S.listItem}><span style={S.check}><Check style={{ width: 14, height: 14 }} /></span> School information</li>
              {isDesktopApp && (
                <li style={S.listItem}><span style={S.check}><Check style={{ width: 14, height: 14 }} /></span> Student photos</li>
              )}
            </ul>
            <button
              style={S.primaryBtn}
              onClick={handleDownload}
            >
              Download now (recommended)
            </button>
            <button style={S.ghostBtn} onClick={handleSkip}>
              Skip — use online only
            </button>
          </>
        )}

        {phase === 'downloading' && (
          <>
            <div style={S.title}>Downloading school data…</div>
            <div style={S.stepLabel}>{stepLabel(progress)}</div>
            <div style={S.progressTrack}>
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: '#10d9a8',
                  borderRadius: 8,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
            <div style={S.progressLabel}>
              <span>{progress < 100 ? 'Downloading…' : 'Done!'}</span>
              <span>{progress}%</span>
            </div>
            <div style={S.muted}>
              Please wait. This only happens once and keeps your data safe offline.
            </div>
          </>
        )}

        {phase === 'done' && (
          <>
            <div style={S.doneIcon}><CheckCircle2 style={{ width: 44, height: 44, color: "#10d9a8" }} /></div>
            <div style={S.title}>Ready for offline use!</div>
            <div style={S.body}>
              Your school data is saved on this device. You can now use PwezaCore even
              without an internet connection. Data will refresh automatically when you
              reconnect.
            </div>
            <div style={S.syncedAt}>
              Last synced: {new Date().toLocaleString()}
            </div>
            <button
              style={{ ...S.primaryBtn, marginTop: '1.5rem' }}
              onClick={handleDone}
            >
              Start using the app
            </button>
          </>
        )}

      </div>

      <style>{`
        button:hover { opacity: 0.88; }
      `}</style>
    </div>
  );
}
