import { useEffect, useState } from 'react';
import { useOfflineModeStore } from '../store/offlineModeStore';

export default function OfflineStatusBadge() {
  const { mode, lastSynced } = useOfflineModeStore();
  const [online, setOnline] = useState(navigator.onLine);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Only show badge when offline, or when offline mode is set
  if (mode === null || (online && mode === 'online-only')) return null;

  const dot = online
    ? { background: '#10d9a8', boxShadow: '0 0 6px #10d9a8aa' }
    : { background: '#f97316', boxShadow: '0 0 6px #f97316aa' };

  const statusText = online ? 'Online' : 'Offline';
  const cacheText = mode === 'offline'
    ? lastSynced
      ? `Data cached · ${new Date(lastSynced).toLocaleDateString()}`
      : 'Data not yet cached'
    : 'Online only mode';

  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 8000,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        background: 'rgba(14,22,35,0.92)',
        border: '1px solid rgba(100,120,160,0.18)',
        borderRadius: 20,
        padding: expanded ? '7px 14px' : '6px 10px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
      title="Offline status"
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          ...dot,
        }}
      />
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#c5d4ef' }}>
            {statusText}
          </span>
          <span style={{ fontSize: 10, color: '#6a85b0' }}>{cacheText}</span>
        </div>
      )}
    </div>
  );
}
