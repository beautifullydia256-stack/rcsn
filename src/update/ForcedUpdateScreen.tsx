type Props = {
  phase: 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
  message?: string;
  percent?: number;
  onRetry?: () => void;
};

export default function ForcedUpdateScreen({ phase, message, percent, onRetry }: Props) {
  const line =
    phase === 'checking'
      ? 'Checking for updates…'
      : phase === 'available'
        ? 'A new version is available. Download will start automatically.'
        : phase === 'downloading'
          ? 'Downloading update…'
          : phase === 'downloaded'
            ? 'Update ready. Restarting…'
            : message || 'Update check failed.';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 p-8 text-center text-white">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Update required</h1>
        <p className="mt-2 max-w-md text-sm text-white/80">{line}</p>
      </div>
      {typeof percent === 'number' && phase === 'downloading' && (
        <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      )}
      {phase === 'error' && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
        >
          Retry
        </button>
      )}
    </div>
  );
}
