import type { SupabaseClient } from '@supabase/supabase-js';
import { isDesktopApp } from './isDesktopApp';

const STORAGE_DOWNLOAD_TIMEOUT_MS = 90_000;

/**
 * Low-level: object URL + temporary &lt;a download&gt;. Reliable in Electron; some browsers
 * on HTTPS (e.g. after async storage fetch) block or no-op this — use {@link saveBlobAsDownload} from UI.
 */
export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}

type SaveFilePickerCtor = (options?: {
  suggestedName?: string;
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
}) => Promise<FileSystemFileHandle>;

/**
 * Save a blob as a file. Electron keeps the anchor+blob path (known-good). On the deployed web app,
 * prefers the File System Access API when available so saves work after `await` (e.g. Supabase Storage).
 */
export async function saveBlobAsDownload(blob: Blob, filename: string): Promise<void> {
  if (isDesktopApp) {
    triggerBlobDownload(blob, filename);
    return;
  }

  const w = window as Window & { showSaveFilePicker?: SaveFilePickerCtor };
  if (typeof w.showSaveFilePicker === 'function') {
    try {
      const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')).toLowerCase() : '';
      const types =
        ext === '.pdf'
          ? [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }]
          : ext === '.zip'
            ? [{ description: 'ZIP', accept: { 'application/zip': ['.zip'] } }]
            : [{ description: 'File', accept: { 'application/octet-stream': [ext || '.*'] } }];

      const handle = await w.showSaveFilePicker({ suggestedName: filename, types });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (e instanceof Error && e.name === 'AbortError') return;
    }
  }

  triggerBlobDownload(blob, filename);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
    promise.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      }
    );
  });
}

export async function storageDownloadBlob(
  supabase: SupabaseClient,
  bucket: string,
  objectPath: string
): Promise<Blob> {
  try {
    const { data, error } = await withTimeout(
      supabase.storage.from(bucket).download(objectPath),
      STORAGE_DOWNLOAD_TIMEOUT_MS,
      'Storage download'
    );
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Empty file from storage');
    return data;
  } catch (first: unknown) {
    const msg = first instanceof Error ? first.message : String(first);
    if (!/timed out/i.test(msg)) throw first instanceof Error ? first : new Error(msg);
    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, 120);
    if (signErr || !signed?.signedUrl) {
      throw first instanceof Error ? first : new Error(msg);
    }
    const res = await withTimeout(fetch(signed.signedUrl), STORAGE_DOWNLOAD_TIMEOUT_MS, 'Signed URL download');
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    return await res.blob();
  }
}

/**
 * Downloads a file from Supabase Storage.
 *
 * Electron: uses the native Electron download manager via IPC so the file streams
 * directly to the Downloads folder — same speed as a browser download, no
 * blob-in-memory overhead. Falls back to blob if the IPC bridge isn't available.
 *
 * Web (mobile + desktop): creates a short-lived signed URL; the browser streams
 * natively, shows its own progress bar, and the download starts immediately.
 */
export async function mobileOptimizedDownload(
  supabase: SupabaseClient,
  bucket: string,
  objectPath: string,
  filename: string
): Promise<void> {
  // Create a signed URL first — works for both Electron and web paths.
  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, 300, { download: filename });

  if (signErr || !signed?.signedUrl) {
    throw new Error(signErr?.message || 'Failed to create download link');
  }

  if (isDesktopApp) {
    // Use Electron's native download manager (streams directly to Downloads folder).
    const desktop = (window as unknown as { pwezaDesktop?: { downloadFile?: (url: string, filename: string) => Promise<{ ok: boolean }> } }).pwezaDesktop;
    if (desktop?.downloadFile) {
      const result = await desktop.downloadFile(signed.signedUrl, filename);
      if (result?.ok) return;
    }
    // Fallback: download blob into memory (slower but guaranteed to work)
    const blob = await storageDownloadBlob(supabase, bucket, objectPath);
    triggerBlobDownload(blob, filename);
    return;
  }

  // Web: anchor click with signed URL — browser streams natively.
  const a = document.createElement('a');
  a.href = signed.signedUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
