import { publicAssetUrl } from '@/lib/publicAssetUrl';

/**
 * Full-page background with zero blur on the photo:
 * Preserves the natural, crisp, unblurred campus gardens photo.
 * The only blur occurs inside the liquid glass buttons themselves.
 */
export default function GlassBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      {/* Background Campus Grounds - Completely sharp, natural, 100% unblurred */}
      <img
        src={publicAssetUrl('/images/rcsn/rcsn-campus-gardens.webp')}
        alt="RCSN Campus Grounds"
        className="w-full h-full object-cover object-center"
      />

      {/* Gentle dark gradient for white text contrast - NO blur */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/55" />
    </div>
  );
}
