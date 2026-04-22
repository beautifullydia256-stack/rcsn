/**
 * Server-only PDF image optimization (Sharp). Import only from Node contexts (e.g. api/pdf).
 */
import sharp from 'sharp';

/** Logo / student photo embed: smaller than upload targets; layout unchanged in HTML. */
const REPORT_EMBED_MAX_EDGE = 480;
const REPORT_EMBED_QUALITY_START = 52;
const REPORT_EMBED_QUALITY_FLOOR = 42;

/** Nursery holistic skill art: aggressive JPEG + small intrinsic size (~15 tiles per PDF). */
const SKILL_EMBED_MAX_EDGE = 110;
const SKILL_EMBED_QUALITY_START = 34;
const SKILL_EMBED_QUALITY_FLOOR = 22;

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl.trim());
  if (!m) return null;
  const mime = m[1].trim();
  const b64 = m[2].replace(/\s/g, '');
  try {
    return { mime, buffer: Buffer.from(b64, 'base64') };
  } catch {
    return null;
  }
}

async function resizeToJpegEdge(
  input: Buffer,
  maxEdge: number,
  qualityStart: number,
  qualityFloor: number,
  targetMaxBytes: number,
  options?: { flattenAlphaToWhite?: boolean }
): Promise<string> {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? maxEdge;
  const h = meta.height ?? maxEdge;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  let q = qualityStart;
  let lastBuf: Buffer | null = null;
  for (let i = 0; i < 10; i++) {
    let pipeline = sharp(input)
      .rotate()
      .resize(tw, th, { fit: 'inside', withoutEnlargement: true });
    if (options?.flattenAlphaToWhite) {
      pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
    }
    lastBuf = await pipeline.jpeg({ quality: q, mozjpeg: true }).toBuffer();
    if (lastBuf.length <= targetMaxBytes || q <= qualityFloor) break;
    q = Math.max(qualityFloor, Math.floor(q * 0.88));
  }
  const b64 = (lastBuf ?? Buffer.alloc(0)).toString('base64');
  return `data:image/jpeg;base64,${b64}`;
}

const REPORT_EMBED_TARGET_BYTES = 70 * 1024;

/** PDF embed pass for school logo / student photo (fetched or data URLs). */
export async function optimizeDataUrlForReportPdfNode(dataUrl: string | null): Promise<string | null> {
  if (dataUrl == null || String(dataUrl).trim() === '') return dataUrl;
  const parsed = parseDataUrl(String(dataUrl));
  if (!parsed?.buffer.length) return dataUrl;
  try {
    return await resizeToJpegEdge(
      parsed.buffer,
      REPORT_EMBED_MAX_EDGE,
      REPORT_EMBED_QUALITY_START,
      REPORT_EMBED_QUALITY_FLOOR,
      REPORT_EMBED_TARGET_BYTES
    );
  } catch {
    return dataUrl;
  }
}

export async function optimizeReportPhotosForPdfNode(data: {
  logo: string | null;
  photo: string | null;
}): Promise<{ logo: string | null; photo: string | null }> {
  const [logo, photo] = await Promise.all([
    optimizeDataUrlForReportPdfNode(data.logo),
    optimizeDataUrlForReportPdfNode(data.photo),
  ]);
  return { logo, photo };
}

const SKILL_EMBED_TARGET_BYTES = 11 * 1024;

/** Skill art tiles: many per page — keep bytes minimal. */
export async function optimizePrePrimarySkillDataUrlForPdfNode(dataUrl: string): Promise<string> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed?.buffer.length) return dataUrl;
  try {
    return await resizeToJpegEdge(
      parsed.buffer,
      SKILL_EMBED_MAX_EDGE,
      SKILL_EMBED_QUALITY_START,
      SKILL_EMBED_QUALITY_FLOOR,
      SKILL_EMBED_TARGET_BYTES,
      { flattenAlphaToWhite: true }
    );
  } catch {
    return dataUrl;
  }
}

export async function optimizePrePrimarySkillImageDataUrlMapNode(
  map: Record<string, string>
): Promise<Record<string, string>> {
  const keys = Object.keys(map);
  const out: Record<string, string> = { ...map };
  await Promise.all(
    keys.map(async (k) => {
      const v = map[k];
      if (typeof v === 'string' && v.startsWith('data:')) {
        out[k] = await optimizePrePrimarySkillDataUrlForPdfNode(v);
      }
    })
  );
  return out;
}
