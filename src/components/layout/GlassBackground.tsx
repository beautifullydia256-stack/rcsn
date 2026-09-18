import { publicAssetUrl } from '@/lib/publicAssetUrl';

/**
 * Full-page glass background matching Next.js admin (2f00b44): radial gradient + optional noise.
 */
export default function GlassBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at top left, #4338ca 0%, #0f172a 50%, #000 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: `url(${publicAssetUrl('/noise.png')})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
    </div>
  );
}
