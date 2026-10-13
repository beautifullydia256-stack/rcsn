/**
 * Clean loading view that matches the app theme.
 * Seamless transparent loading view that never displays a dark blue/black background override.
 */
export default function ThemedLoadingView() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F5F5F5] dark:bg-[#05080f] transition-colors duration-150">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-teal-500/20 border-t-teal-600 dark:border-teal-400/25 dark:border-t-teal-400" />
    </div>
  );
}
