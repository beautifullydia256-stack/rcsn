import type { SupabaseClient } from '@supabase/supabase-js';

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function storageDownloadBlob(
  supabase: SupabaseClient,
  bucket: string,
  objectPath: string
): Promise<Blob> {
  const { data, error } = await supabase.storage.from(bucket).download(objectPath);
  if (error) throw new Error(error.message);
  return data;
}
