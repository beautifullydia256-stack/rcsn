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
 * Mobile-optimized download with custom domain support.
 * 
 * Mobile browsers block multiple programmatic downloads per page load.
 * Solution: Use signed URLs with direct navigation on mobile, blob downloads on desktop.
 * 
 * Custom domain (files.pwezacore.com) improves mobile compatibility and branding.
 */
export async function mobileOptimizedDownload(
  supabase: SupabaseClient,
  bucket: string,
  objectPath: string,
  filename: string
): Promise<void> {
  // Electron: use fast blob approach
  if (isDesktopApp) {
    const blob = await storageDownloadBlob(supabase, bucket, objectPath);
    triggerBlobDownload(blob, filename);
    return;
  }

  // Detect mobile browsers
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // Mobile: use signed URL with forced download
    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, 300); // 5-minute window

    if (signErr || !signed?.signedUrl) {
      throw new Error(signErr?.message || 'Failed to create download link');
    }

    // Force download by creating anchor with download attribute
    const a = document.createElement('a');
    a.href = signed.signedUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  // Desktop: use fast blob download (no network round-trip for signed URL)
  const blob = await storageDownloadBlob(supabase, bucket, objectPath);
  triggerBlobDownload(blob, filename);
}
