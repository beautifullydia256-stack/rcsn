import { publicAssetUrl } from '@/lib/publicAssetUrl';

/**
 * Full-page glass background matching iOS lock screen wallpaper:
 * Crisp, natural campus scenery with gentle atmosphere so 3D liquid glass buttons
 * physically refract the lush background colors and light.
 */
export default function GlassBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      {/* Background Campus Grounds - Crisp & natural like iPhone lock screen wallpaper */}
      <div className="absolute inset-0 z-0">
        <img
          src={publicAssetUrl('/images/rcsn/rcsn-campus-gardens.webp')}
          alt="RCSN Campus Grounds"
          className="w-full h-full object-cover object-center filter brightness-[0.85] contrast-[1.08] saturate-[120%]"
        />
      </div>

      {/* Gentle natural overlay - wallpaper remains bright and visible through 3D glass buttons */}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-black/25" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45" />
    </div>
  );
}
