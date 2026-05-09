/**
 * Full-page loading view that matches the app theme (glass/dark).
 * Used so loading states never show a white flash (Gmail-style).
 */
import GlassBackground from '@/components/layout/GlassBackground';

export default function ThemedLoadingView() {
  return (
    <div className="relative min-h-screen flex items-center justify-center z-[1]">
      <GlassBackground />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        <p className="text-white/70 text-sm">Loading...</p>
      </div>
    </div>
  );
}
