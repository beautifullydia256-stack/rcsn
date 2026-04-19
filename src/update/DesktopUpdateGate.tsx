import { useEffect, useState, type ReactNode } from 'react';
import { isDesktopApp } from '../lib/isDesktopApp';
import ForcedUpdateScreen from './ForcedUpdateScreen';

type GatePhase = 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

type UpdatePayload = {
  type:
    | 'checking'
    | 'update-available'
    | 'update-not-available'
    | 'download-progress'
    | 'update-downloaded'
    | 'error'
    | 'offline-policy';
  version?: string;
  percent?: number;
  message?: string;
};

/**
 * Desktop packaged app: when a newer release is available, block the ERP until the update is applied.
 * If the updater cannot reach GitHub after retries, the main process lifts the block (fail-open for schools offline).
 */
export default function DesktopUpdateGate({ children }: { children: ReactNode }) {
  const [blocking, setBlocking] = useState(false);
  const [phase, setPhase] = useState<GatePhase>('checking');
  const [percent, setPercent] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!isDesktopApp) return;
    const api = typeof window !== 'undefined' ? window.pwezaDesktop : undefined;
    if (!api?.subscribeUpdate) return;

    const unsub = api.subscribeUpdate((p: UpdatePayload) => {
      switch (p.type) {
        case 'checking':
          setPhase('checking');
          setBlocking(false);
          break;
        case 'update-available':
          setPhase('available');
          setBlocking(true);
          break;
        case 'update-not-available':
          setBlocking(false);
          break;
        case 'download-progress':
          setPhase('downloading');
          setBlocking(true);
          setPercent(typeof p.percent === 'number' ? p.percent : undefined);
          break;
        case 'update-downloaded':
          setPhase('downloaded');
          setBlocking(true);
          break;
        case 'error':
          setPhase('error');
          setBlocking(false);
          break;
        case 'offline-policy':
          setBlocking(false);
          break;
        default:
          break;
      }
    });

    return () => {
      unsub?.();
    };
  }, []);

  if (!isDesktopApp) {
    return <>{children}</>;
  }

  if (blocking) {
    return <ForcedUpdateScreen phase={phase} percent={percent} />;
  }

  return <>{children}</>;
}
