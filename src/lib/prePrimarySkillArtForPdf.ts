/**
 * Load skill art from `public/pre-primary-skill-art/{key}.{ext}` as data URLs for PDF/HTML print
 * (same files the in-app preview uses). Browser: fetch. Node (API): read `public/` from disk or fetch origin.
 */
import { publicAssetUrl } from '@/lib/publicAssetUrl';
import {
  fetchImageUrlToDataUrlForReport,
  reencodePrePrimarySkillDataUrlForPdf,
} from '@/lib/reportImageDataUrl';
import {
  normalizePrePrimarySkillArtKey,
  PRE_PRIMARY_SKILL_ART_PUBLIC_DIR,
  SKILL_ART_EXT_TRIES,
} from '@/templates/primary/prePrimarySkillIllustrations';

function extToMime(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'image/png';
}

async function tryReadPublicDisk(key: string, ext: string): Promise<string | null> {
  if (typeof window !== 'undefined') return null;
  try {
    const [{ readFile }, { join }] = await Promise.all([import('fs/promises'), import('path')]);
    const filePath = join(process.cwd(), 'public', PRE_PRIMARY_SKILL_ART_PUBLIC_DIR, `${key}.${ext}`);
    const buf = await readFile(filePath);
    if (buf.length === 0) return null;
    return `data:${extToMime(ext)};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * Resolve one skill key to a data URL, trying png → webp → jpg (same order as preview).
 */
export async function fetchPrePrimarySkillRasterDataUrl(skillKey: string): Promise<string | null> {
  const key = normalizePrePrimarySkillArtKey(skillKey);
  for (const ext of SKILL_ART_EXT_TRIES) {
    const fromDisk = await tryReadPublicDisk(key, ext);
    if (fromDisk) return fromDisk;

    const rel = `${PRE_PRIMARY_SKILL_ART_PUBLIC_DIR}/${key}.${ext}`;
    const pathPart = publicAssetUrl(rel).replace(/^\.\//, '');

    if (typeof window !== 'undefined' && window.location?.href) {
      try {
        const abs = new URL(publicAssetUrl(rel), window.location.href).href;
        const d = await fetchImageUrlToDataUrlForReport(abs);
        if (d) return d;
      } catch {
        /* continue */
      }
    }

    const origin =
      (typeof process !== 'undefined' && process.env?.PWEZA_PDF_ASSET_ORIGIN?.replace(/\/$/, '')) ||
      (typeof process !== 'undefined' && process.env?.VERCEL_URL
        ? `https://${String(process.env.VERCEL_URL).replace(/^https?:\/\//, '')}`
        : '') ||
      (typeof process !== 'undefined' ? process.env?.VITE_APP_URL?.replace(/\/$/, '') : '') ||
      '';

    if (origin) {
      const d = await fetchImageUrlToDataUrlForReport(`${origin}/${pathPart}`);
      if (d) return d;
    }
  }
  return null;
}

/**
 * Loads skill rasters then **re-encodes** each to a small JPEG (max edge, aggressive quality band in
 * `reencodePrePrimarySkillDataUrlForPdf`). Template `img` CSS dimensions are unchanged — only intrinsic
 * pixels/bytes shrink so ~15 nursery holistic tiles do not blow up PDF size. Browser: canvas here; Node
 * (Vercel `api/pdf/generate.ts`): raw map from disk then `optimizePrePrimarySkillImageDataUrlMapNode` (Sharp).
 */
export async function buildPrePrimarySkillImageDataUrlMap(skillKeys: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(skillKeys.map((k) => k.trim()).filter(Boolean))];
  const out: Record<string, string> = {};
  await Promise.all(
    unique.map(async (rawKey) => {
      const data = await fetchPrePrimarySkillRasterDataUrl(rawKey);
      if (!data) return;
      out[rawKey] =
        typeof document !== 'undefined'
          ? await reencodePrePrimarySkillDataUrlForPdf(data)
          : data;
    })
  );
  return out;
}
