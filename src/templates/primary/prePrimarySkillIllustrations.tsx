import React from 'react';

const STROKE = '#0f172a';
const SW = 2.8;

/** Same folder name as `public/pre-primary-skill-art/` (served at site root). */
export const PRE_PRIMARY_SKILL_ART_PUBLIC_DIR = 'pre-primary-skill-art';

export function normalizePrePrimarySkillArtKey(skillKey: string): string {
  return skillKey.trim().toLowerCase().replace(/-/g, '_');
}

/** Prefer PNG when assets ship as `public/pre-primary-skill-art/{key}.png`; WebP first if you switch to `.webp` only. */
const SKILL_ART_EXT_TRIES = ['png', 'webp', 'jpg', 'jpeg'] as const;

type SvgWrapProps = { children: React.ReactNode; size: number };

function SvgFrame({ children, size }: SvgWrapProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/**
 * Raster first: add files under `public/pre-primary-skill-art/{skill_key}.webp` (or .png / .jpg).
 * Falls back to inline SVG when no file matches — so you can replace skills one at a time.
 * Prefer small, compressed images (~120–250px max edge) to keep HTML/PDF size down.
 */
export function PrePrimarySkillIllustration({ skillKey, size = 76 }: { skillKey: string; size?: number }) {
  const key = normalizePrePrimarySkillArtKey(skillKey);
  const [extIdx, setExtIdx] = React.useState(0);

  React.useEffect(() => {
    setExtIdx(0);
  }, [skillKey]);

  if (extIdx >= SKILL_ART_EXT_TRIES.length) {
    return <PrePrimarySkillSvgIllustration skillKey={skillKey} size={size} />;
  }

  const ext = SKILL_ART_EXT_TRIES[extIdx];
  const src = `/${PRE_PRIMARY_SKILL_ART_PUBLIC_DIR}/${key}.${ext}`;

  return (
    <img
      key={src}
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={{
        display: 'block',
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0,
      }}
      onError={() => setExtIdx((i) => i + 1)}
    />
  );
}

/**
 * Bold, saturated SVG fallbacks (report / PDF) when no custom image exists for `skill_key`.
 */
function PrePrimarySkillSvgIllustration({ skillKey, size = 76 }: { skillKey: string; size?: number }) {
  const k = skillKey.trim().toLowerCase().replace(/-/g, '_');

  switch (k) {
    case 'relating_with_others':
      return (
        <SvgFrame size={size}>
          <circle cx="28" cy="36" r="11" fill="#fbbf24" stroke={STROKE} strokeWidth={SW} />
          <path d="M18 52 Q28 46 38 52 L42 78 L14 78 Z" fill="#38bdf8" stroke={STROKE} strokeWidth={SW} strokeLinejoin="round" />
          <circle cx="50" cy="30" r="12" fill="#fb7185" stroke={STROKE} strokeWidth={SW} />
          <path d="M38 48 Q50 40 62 48 L68 78 L32 78 Z" fill="#a78bfa" stroke={STROKE} strokeWidth={SW} strokeLinejoin="round" />
          <circle cx="72" cy="36" r="11" fill="#4ade80" stroke={STROKE} strokeWidth={SW} />
          <path d="M62 52 Q72 46 82 52 L86 78 L58 78 Z" fill="#f472b6" stroke={STROKE} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M34 62 Q50 58 66 62" fill="none" stroke={STROKE} strokeWidth={2.2} strokeLinecap="round" />
        </SvgFrame>
      );

    case 'games':
      return (
        <SvgFrame size={size}>
          <circle cx="50" cy="48" r="22" fill="#fde047" stroke={STROKE} strokeWidth={SW} />
          <path d="M38 48 L44 54 L62 36" fill="none" stroke={STROKE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="72" cy="28" r="8" fill="#f97316" stroke={STROKE} strokeWidth={2.4} />
          <rect x="22" y="68" width="56" height="10" rx="3" fill="#22c55e" stroke={STROKE} strokeWidth={2.2} />
        </SvgFrame>
      );

    case 'helping':
      return (
        <SvgFrame size={size}>
          <path
            d="M28 72 L28 48 Q28 32 42 32 Q50 32 50 40 L50 72 Z"
            fill="#fdba74"
            stroke={STROKE}
            strokeWidth={SW}
            strokeLinejoin="round"
          />
          <circle cx="42" cy="22" r="12" fill="#fcd34d" stroke={STROKE} strokeWidth={SW} />
          <path
            d="M58 72 L58 52 Q72 44 78 56 L74 72 Z"
            fill="#93c5fd"
            stroke={STROKE}
            strokeWidth={SW}
            strokeLinejoin="round"
          />
          <circle cx="68" cy="38" r="10" fill="#fca5a5" stroke={STROKE} strokeWidth={SW} />
          <path d="M48 56 L62 50" fill="none" stroke={STROKE} strokeWidth={2.6} strokeLinecap="round" />
          <path d="M52 24 Q56 18 62 20" fill="none" stroke="#ef4444" strokeWidth={2.2} strokeLinecap="round" />
        </SvgFrame>
      );

    case 'naming':
      return (
        <SvgFrame size={size}>
          <rect x="18" y="28" width="64" height="44" rx="6" fill="#fef08a" stroke={STROKE} strokeWidth={SW} />
          <rect x="26" y="38" width="22" height="14" rx="2" fill="#fb923c" stroke={STROKE} strokeWidth={2.2} />
          <rect x="52" y="38" width="22" height="14" rx="2" fill="#4ade80" stroke={STROKE} strokeWidth={2.2} />
          <circle cx="34" cy="66" r="5" fill="#2563eb" stroke={STROKE} strokeWidth={2} />
          <circle cx="50" cy="66" r="5" fill="#dc2626" stroke={STROKE} strokeWidth={2} />
          <circle cx="66" cy="66" r="5" fill="#16a34a" stroke={STROKE} strokeWidth={2} />
        </SvgFrame>
      );

    case 'cleanliness':
      return (
        <SvgFrame size={size}>
          <rect x="38" y="22" width="24" height="40" rx="4" fill="#e0f2fe" stroke={STROKE} strokeWidth={SW} />
          <ellipse cx="50" cy="24" rx="14" ry="6" fill="#bae6fd" stroke={STROKE} strokeWidth={2.2} />
          <path d="M44 38 L56 38 M44 48 L56 48 M44 58 L56 58" stroke={STROKE} strokeWidth={2} strokeLinecap="round" />
          <circle cx="72" cy="36" r="6" fill="#fef08a" stroke={STROKE} strokeWidth={2} />
          <circle cx="78" cy="52" r="5" fill="#fef08a" stroke={STROKE} strokeWidth={2} />
          <path d="M24 68 L32 58 L28 72 Z" fill="#22c55e" stroke={STROKE} strokeWidth={2} strokeLinejoin="round" />
        </SvgFrame>
      );

    case 'caring_for_the_environment':
      return (
        <SvgFrame size={size}>
          <path d="M50 78 L30 58 L38 58 L38 42 L62 42 L62 58 L70 58 Z" fill="#86efac" stroke={STROKE} strokeWidth={SW} strokeLinejoin="round" />
          <circle cx="50" cy="28" r="16" fill="#22c55e" stroke={STROKE} strokeWidth={SW} />
          <path d="M50 18 L50 40 M42 24 L58 24 M44 32 L56 20 M56 32 L44 20" stroke="#ecfccb" strokeWidth={2.4} strokeLinecap="round" />
          <ellipse cx="24" cy="70" rx="10" ry="6" fill="#38bdf8" stroke={STROKE} strokeWidth={2} />
        </SvgFrame>
      );

    case 'taking_care_of_myself':
      return (
        <SvgFrame size={size}>
          <rect x="40" y="30" width="20" height="36" rx="4" fill="#fce7f3" stroke={STROKE} strokeWidth={SW} />
          <path d="M42 30 L50 18 L58 30" fill="#f9a8d4" stroke={STROKE} strokeWidth={2.2} strokeLinejoin="round" />
          <line x1="46" y1="44" x2="54" y2="52" stroke={STROKE} strokeWidth={2.6} strokeLinecap="round" />
          <line x1="54" y1="44" x2="46" y2="52" stroke={STROKE} strokeWidth={2.6} strokeLinecap="round" />
          <circle cx="68" cy="48" r="10" fill="#fef08a" stroke={STROKE} strokeWidth={2.4} />
        </SvgFrame>
      );

    case 'toilet_habits':
      return (
        <SvgFrame size={size}>
          <rect x="30" y="26" width="40" height="44" rx="6" fill="#f1f5f9" stroke={STROKE} strokeWidth={SW} />
          <ellipse cx="50" cy="32" rx="16" ry="8" fill="#cbd5e1" stroke={STROKE} strokeWidth={2.2} />
          <rect x="36" y="48" width="28" height="18" rx="3" fill="#bfdbfe" stroke={STROKE} strokeWidth={2} />
          <circle cx="72" cy="58" r="8" fill="#4ade80" stroke={STROKE} strokeWidth={2} />
          <path d="M69 58 L71 60 L75 54" fill="none" stroke={STROKE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </SvgFrame>
      );

    case 'body_hygiene':
      return (
        <SvgFrame size={size}>
          <path d="M38 78 L38 50 L46 42 L54 42 L62 50 L62 78 Z" fill="#7dd3fc" stroke={STROKE} strokeWidth={SW} strokeLinejoin="round" />
          <circle cx="50" cy="30" r="12" fill="#fde047" stroke={STROKE} strokeWidth={SW} />
          <path d="M28 48 Q22 58 28 68 Q34 62 32 52" fill="#38bdf8" stroke={STROKE} strokeWidth={2} strokeLinejoin="round" />
          <path d="M72 48 Q78 58 72 68 Q66 62 68 52" fill="#38bdf8" stroke={STROKE} strokeWidth={2} strokeLinejoin="round" />
        </SvgFrame>
      );

    case 'reciting_numbers':
      return (
        <SvgFrame size={size}>
          <rect x="16" y="34" width="68" height="36" rx="6" fill="#fef9c3" stroke={STROKE} strokeWidth={SW} />
          <rect x="28" y="44" width="10" height="16" rx="2" fill="#e879f9" stroke={STROKE} strokeWidth={2} />
          <rect x="45" y="40" width="10" height="20" rx="2" fill="#c026d3" stroke={STROKE} strokeWidth={2} />
          <rect x="62" y="46" width="10" height="14" rx="2" fill="#a855f7" stroke={STROKE} strokeWidth={2} />
          <circle cx="26" cy="26" r="7" fill="#fb923c" stroke={STROKE} strokeWidth={2} />
          <circle cx="74" cy="26" r="7" fill="#22c55e" stroke={STROKE} strokeWidth={2} />
        </SvgFrame>
      );

    case 'counting_concepts':
      return (
        <SvgFrame size={size}>
          <rect x="22" y="52" width="16" height="16" rx="3" fill="#fb923c" stroke={STROKE} strokeWidth={2.2} />
          <rect x="42" y="52" width="16" height="16" rx="3" fill="#facc15" stroke={STROKE} strokeWidth={2.2} />
          <rect x="62" y="52" width="16" height="16" rx="3" fill="#4ade80" stroke={STROKE} strokeWidth={2.2} />
          <circle cx="34" cy="58" r="3" fill="#0f172a" />
          <circle cx="50" cy="58" r="3" fill="#0f172a" />
          <circle cx="66" cy="58" r="3" fill="#0f172a" />
          <path d="M18 30 L82 30" stroke={STROKE} strokeWidth={2.4} strokeLinecap="round" />
        </SvgFrame>
      );

    case 'addition_concepts':
      return (
        <SvgFrame size={size}>
          <rect x="18" y="40" width="64" height="36" rx="6" fill="#ffedd5" stroke={STROKE} strokeWidth={SW} />
          <rect x="26" y="50" width="14" height="18" rx="3" fill="#fb923c" stroke={STROKE} strokeWidth={2} />
          <path d="M48 52 V68 M41 60 H55" stroke={STROKE} strokeWidth={3} strokeLinecap="round" />
          <rect x="60" y="50" width="14" height="18" rx="3" fill="#fb923c" stroke={STROKE} strokeWidth={2} />
          <rect x="40" y="22" width="20" height="10" rx="2" fill="#86efac" stroke={STROKE} strokeWidth={2} />
        </SvgFrame>
      );

    case 'drawing':
      return (
        <SvgFrame size={size}>
          <rect x="24" y="22" width="52" height="40" rx="4" fill="#fffbeb" stroke={STROKE} strokeWidth={SW} />
          <path d="M32 50 L40 38 L48 46 L58 32 L68 48" fill="none" stroke="#ec4899" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="44" cy="34" r="5" fill="#38bdf8" stroke={STROKE} strokeWidth={2} />
          <line x1="72" y1="28" x2="84" y2="40" stroke={STROKE} strokeWidth={3} strokeLinecap="round" />
          <polygon points="84,40 78,38 80,34" fill="#f97316" stroke={STROKE} strokeWidth={2} strokeLinejoin="round" />
        </SvgFrame>
      );

    case 'reading':
      return (
        <SvgFrame size={size}>
          <path
            d="M50 78 L28 68 L28 32 Q50 24 72 32 L72 68 Z"
            fill="#fecdd3"
            stroke={STROKE}
            strokeWidth={SW}
            strokeLinejoin="round"
          />
          <line x1="50" y1="30" x2="50" y2="76" stroke={STROKE} strokeWidth={2.4} strokeLinecap="round" />
          <path d="M36 44 H48 M36 52 H62 M36 60 H54" stroke={STROKE} strokeWidth={2} strokeLinecap="round" />
          <circle cx="62" cy="26" r="6" fill="#fde047" stroke={STROKE} strokeWidth={2} />
        </SvgFrame>
      );

    case 'writing':
      return (
        <SvgFrame size={size}>
          <rect x="20" y="28" width="56" height="44" rx="4" fill="#f8fafc" stroke={STROKE} strokeWidth={SW} />
          <path d="M32 48 Q40 40 48 48 T64 44" fill="none" stroke="#2563eb" strokeWidth={2.8} strokeLinecap="round" />
          <path d="M34 58 L44 54 L52 60 L68 50" fill="none" stroke="#2563eb" strokeWidth={2.6} strokeLinecap="round" />
          <line x1="70" y1="34" x2="86" y2="50" stroke={STROKE} strokeWidth={2.8} strokeLinecap="round" />
          <polygon points="86,50 80,48 82,42" fill="#1e293b" stroke={STROKE} strokeWidth={1.8} strokeLinejoin="round" />
        </SvgFrame>
      );

    default:
      return (
        <SvgFrame size={size}>
          <path
            d="M50 22 L58 42 L78 42 L62 54 L68 74 L50 62 L32 74 L38 54 L22 42 L42 42 Z"
            fill="#fbbf24"
            stroke={STROKE}
            strokeWidth={SW}
            strokeLinejoin="round"
          />
          <circle cx="50" cy="44" r="6" fill="#fff7ed" stroke={STROKE} strokeWidth={2} />
        </SvgFrame>
      );
  }
}
