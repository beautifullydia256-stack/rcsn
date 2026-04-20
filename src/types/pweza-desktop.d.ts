export {};

type UpdateEventPayload = {
  type:
    | 'checking'
    | 'update-available'
    | 'update-not-available'
    | 'download-progress'
    | 'update-downloaded'
    | 'error'
    | 'offline-policy';
  version?: string;
  percent?: number;
  message?: string;
};

declare global {
  interface Window {
    pwezaDesktop?: {
      isElectron: boolean;
      printHashRouteToPdf: (opts: {
        hashRoute: string;
        storageKey: string;
        storageJson: string | null;
        appUrl?: string;
      }) => Promise<{ ok: boolean; pdfBase64?: string; error?: string }>;
      /** Secondary (and any) HTML → PDF via Puppeteer; matches Vercel htmlContent path. */
      htmlContentToPdf: (opts: {
        htmlContent: string;
        useOlevelStandardDynamic: boolean;
      }) => Promise<{ ok: boolean; pdfBase64?: string; error?: string }>;
      subscribeUpdate?: (cb: (p: UpdateEventPayload) => void) => () => void;
      checkForUpdates?: () => Promise<{ ok: boolean; reason?: string; error?: string }>;
    };
  }
}
