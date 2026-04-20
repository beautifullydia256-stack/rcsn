import { getAuthSessionStorageSnapshot } from './supabase';

function desktopApi() {
  return typeof window !== 'undefined' ? window.pwezaDesktop : undefined;
}

export function isElectronDesktop(): boolean {
  return !!desktopApi()?.isElectron;
}

/**
 * Renders a HashRouter path (e.g. `/print/heritage-pdf?sessionId=…&token=…`) with the current
 * Supabase session injected into storage, then returns a PDF Blob from the Electron main process (Chromium printToPDF).
 */
/**
 * Renders full HTML (secondary reports, same pipeline as Vercel `POST /api/pdf/generate` htmlContent path)
 * via Chromium printToPDF in the Electron main process — no Vercel.
 */
export async function htmlContentToPdfBlob(payload: {
  htmlContent: string;
  /** Same as Vercel: O-Level template1 + single student → dynamic page dimensions */
  useOlevelStandardDynamic: boolean;
}): Promise<Blob> {
  const api = desktopApi();
  if (!api?.htmlContentToPdf) {
    throw new Error('Desktop PDF API is not available (open the Electron app).');
  }
  const r = await api.htmlContentToPdf({
    htmlContent: payload.htmlContent,
    useOlevelStandardDynamic: payload.useOlevelStandardDynamic,
  });
  if (!r.ok || !r.pdfBase64) {
    throw new Error(r.error || 'PDF generation failed');
  }
  const binary = atob(r.pdfBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function printHashRouteToPdfBlob(hashRoute: string): Promise<Blob> {
  const api = desktopApi();
  if (!api?.printHashRouteToPdf) {
    throw new Error('Desktop PDF API is not available (open the Electron app).');
  }
  const { storageKey, storageJson } = getAuthSessionStorageSnapshot();
  const appUrl =
    import.meta.env.DEV
      ? `http://127.0.0.1:${import.meta.env.VITE_DEV_PORT ?? '3000'}`
      : undefined;

  const r = await api.printHashRouteToPdf({
    hashRoute,
    storageKey,
    storageJson,
    appUrl,
  });

  if (!r.ok || !r.pdfBase64) {
    throw new Error(r.error || 'PDF generation failed');
  }

  const binary = atob(r.pdfBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'application/pdf' });
}
