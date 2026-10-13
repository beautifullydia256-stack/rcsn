import { publicAssetUrl } from '@/lib/publicAssetUrl';

/**
 * Full-page glass background matching Next.js admin (2f00b44): radial gradient + optional noise.
 */
export default function GlassBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      {/* Background Campus Grounds - Rich depth for authentic liquid glass refraction */}
      <div className="absolute inset-0 z-0">
        <img
          src={publicAssetUrl('/images/rcsn/rcsn-campus-gardens.webp')}
          alt="RCSN Campus Grounds"
          className="w-full h-full object-cover object-center filter brightness-[0.70] contrast-[1.10] saturate-[115%]"
        />
      </div>

      {/* Frosted deep vignette overlay & ambient light orbs for true liquid glass refraction */}
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[3px]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 15% 20%, rgba(67, 56, 202, 0.45) 0%, transparent 60%), radial-gradient(circle at 85% 85%, rgba(0, 135, 62, 0.35) 0%, transparent 60%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: `url(${publicAssetUrl('/noise.png')})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
    </div>
  );
}

