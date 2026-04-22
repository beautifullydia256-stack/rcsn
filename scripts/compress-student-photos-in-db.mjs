/**
 * One-off: recompress embedded student photos in Postgres (student_photos.photo_url)
 * to match upload policy (~600px max edge, JPEG, target ≤100KB). SQL cannot re-encode images;
 * this uses Sharp + service role.
 *
 * Usage:
 *   node scripts/compress-student-photos-in-db.mjs --dry-run
 *   node scripts/compress-student-photos-in-db.mjs
 *
 * Env (from .env.local): NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Options:
 *   --dry-run     Log only; no updates
 *   --min-kb=N    Only process rows whose photo_url decodes to > N KB (default: 12)
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const MAX_EDGE = 600;
const TARGET_MAX_BYTES = 100 * 1024;
const Q_START = 55;
const Q_FLOOR = 40;

function loadEnvLocal() {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) {
    console.error('Missing .env.local (need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

function parseDataUrl(s) {
  const t = String(s || '').trim();
  const m = /^data:([^;]+);base64,(.*)$/s.exec(t);
  if (!m) return null;
  try {
    return { mime: m[1].trim(), buffer: Buffer.from(m[2].replace(/\s/g, ''), 'base64') };
  } catch {
    return null;
  }
}

function approxBytesFromDataUrl(s) {
  const p = parseDataUrl(s);
  return p ? p.buffer.length : 0;
}

async function recompressToJpegDataUrl(input) {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? MAX_EDGE;
  const h = meta.height ?? MAX_EDGE;
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h, 1));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  let q = Q_START;
  let lastBuf = null;
  for (let i = 0; i < 12; i++) {
    lastBuf = await sharp(input)
      .rotate()
      .resize(tw, th, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: q, mozjpeg: true })
      .toBuffer();
    if (lastBuf.length <= TARGET_MAX_BYTES || q <= Q_FLOOR) break;
    q = Math.max(Q_FLOOR, Math.floor(q * 0.88));
  }
  const b64 = (lastBuf ?? Buffer.alloc(0)).toString('base64');
  return {
    dataUrl: `data:image/jpeg;base64,${b64}`,
    size: lastBuf.length,
  };
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
let minKb = 12;
for (const a of args) {
  const m = /^--min-kb=(\d+)$/.exec(a);
  if (m) minKb = Number(m[1]);
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const minBytes = minKb * 1024;
let start = 0;
const PAGE = 150;
let processed = 0;
let updated = 0;
let skipped = 0;
let errors = 0;

console.log(
  dryRun ? '[DRY-RUN] No rows will be updated.' : 'LIVE: rows will be updated.',
  `min size: ${minKb}KB. Embeddings only (data: URLs).`
);

for (;;) {
  const { data: rows, error } = await supabase
    .from('student_photos')
    .select('id, student_id, school_id, photo_url, photo_filename, photo_size')
    .order('id', { ascending: true })
    .range(start, start + PAGE - 1);

  if (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }
  if (!rows?.length) break;

  for (const row of rows) {
    const raw = row.photo_url;
    if (typeof raw !== 'string' || !raw.startsWith('data:')) {
      skipped++;
      continue;
    }
    const approx = approxBytesFromDataUrl(raw);
    if (approx < minBytes) {
      skipped++;
      continue;
    }
    const parsed = parseDataUrl(raw);
    if (!parsed?.buffer.length) {
      skipped++;
      continue;
    }

    try {
      const { dataUrl, size } = await recompressToJpegDataUrl(parsed.buffer);
      const before = approx;
      processed++;
      if (size >= before * 0.98) {
        console.log(`[skip no gain] id=${row.id} ${Math.round(before / 1024)}KB -> ${Math.round(size / 1024)}KB`);
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(
          `[dry-run] id=${row.id} student=${row.student_id} ${Math.round(before / 1024)}KB -> ${Math.round(size / 1024)}KB`
        );
        updated++;
        continue;
      }

      const { error: upErr } = await supabase
        .from('student_photos')
        .update({
          photo_url: dataUrl,
          photo_size: size,
          photo_type: 'image/jpeg',
          photo_filename: String(row.photo_filename || 'photo').replace(/\.[^.]+$/, '') + '.jpg',
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (upErr) {
        console.error(`[error] id=${row.id}:`, upErr.message);
        errors++;
      } else {
        updated++;
        console.log(
          `OK id=${row.id} ${Math.round(before / 1024)}KB -> ${Math.round(size / 1024)}KB`
        );
      }
    } catch (e) {
      console.error(`[error] id=${row.id}:`, e?.message || e);
      errors++;
    }
  }

  if (rows.length < PAGE) break;
  start += PAGE;
}

console.log('---');
console.log(
  `Done. processed (compressed): ${processed}, ${dryRun ? 'would update' : 'updated'}: ${updated}, skipped: ${skipped}, errors: ${errors}`
);
