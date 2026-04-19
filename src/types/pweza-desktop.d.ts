export {};

declare global {
  interface Window {
    pwezaDesktop?: {
      isElectron: boolean;
      printHashRouteToPdf: (opts: {
        hashRoute: string;
        storageKey: string;
        storageJson: string | null;
        /** Dev only: Vite origin so Puppeteer loads the SPA over HTTP. */
        appUrl?: string;
      }) => Promise<{ ok: boolean; pdfBase64?: string; error?: string }>;
    };
  }
}
