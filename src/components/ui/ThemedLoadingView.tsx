/**
 * Clean loading view that matches the app theme.
 * Seamless transparent loading view that never displays a dark blue/black background override.
 */
export default function ThemedLoadingView() {
  return (
    <div className="w-full min-h-[40vh] flex flex-col items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500/20 border-t-teal-600 dark:border-teal-400/20 dark:border-t-teal-400" />
    </div>
  );
}
