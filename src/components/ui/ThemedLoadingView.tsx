/**
 * Clean loading view that matches the app theme.
 * Seamless transparent loading view that never displays a dark blue/black background override.
 */
export default function ThemedLoadingView() {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500/20 border-t-teal-600 dark:border-teal-400/20 dark:border-t-teal-400" />
      <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Loading...</p>
    </div>
  );
}
