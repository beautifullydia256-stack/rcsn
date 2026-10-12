import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __pwaInstallPrompt: BeforeInstallPromptEvent | null;
    __pwaInstalled: boolean | undefined;
  }
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

function isMobileBrowser(): boolean {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

const DISMISSED_KEY = 'pwa-install-dismissed';
const DISMISSED_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function wasDismissedRecently(): boolean {
  const ts = localStorage.getItem(DISMISSED_KEY);
  if (!ts) return false;
  return Date.now() - parseInt(ts, 10) < DISMISSED_TTL_MS;
}

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<'android' | 'ios' | null>(null);

  useEffect(() => {
    if (isInStandaloneMode() || wasDismissedRecently()) return;

    // iOS: no beforeinstallprompt — show manual instructions after a short delay
    if (isIOS() && isMobileBrowser()) {
      const t = setTimeout(() => {
        setMode('ios');
        setShow(true);
      }, 4000);
      return () => clearTimeout(t);
    }

    // If the event already fired before React mounted (captured in index.html),
    // show the banner immediately
    if (window.__pwaInstallPrompt) {
      setMode('android');
      setShow(true);
      return;
    }

    // Also listen for the event in case it fires after React mounts
    const handler = (e: Event) => {
      // index.html already called e.preventDefault() and stored the event,
      // but we handle it here too in case this fires after index.html listener
      e.preventDefault();
      window.__pwaInstallPrompt = e as BeforeInstallPromptEvent;
      setMode('android');
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Listen for appinstalled to hide the banner
  useEffect(() => {
    const onInstalled = () => setShow(false);
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  const handleInstall = () => {
    const p = window.__pwaInstallPrompt;
    if (!p) return;
    // Clear immediately so the DownloadApps button also knows it's consumed
    window.__pwaInstallPrompt = null;
    setShow(false);
    p.prompt()
      .then(() => p.userChoice)
      .then(({ outcome }) => {
        if (outcome === 'dismissed') {
          localStorage.setItem(DISMISSED_KEY, String(Date.now()));
        }
      });
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="pwa-prompt"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9000]"
        >
          <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-white/20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
            {/* Accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600" />

            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shadow-sm">
                  <img src="/images/rcsn/logo.png" alt="RCSN Crest" className="w-9 h-9 object-contain" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">Install RCSN Portal</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Faster login, offline access, installs directly on your phone
                      </p>
                    </div>
                    <button
                      onClick={handleDismiss}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {mode === 'android' && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={handleInstall}
                        className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span>Add to Home Screen</span>
                      </button>
                      <button
                        onClick={handleDismiss}
                        className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium transition-colors"
                      >
                        Maybe Later
                      </button>
                    </div>
                  )}

                  {mode === 'ios' && (
                    <div className="mt-3 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                      <p className="font-medium text-gray-800 dark:text-gray-100">To install on iPhone / iPad:</p>
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-[10px]">1</span>
                        <span>Tap the <Share className="inline w-3 h-3 text-blue-500" /> <strong>Share</strong> button in Safari</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-[10px]">2</span>
                        <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-[10px]">3</span>
                        <span>Tap <strong>"Add"</strong> to confirm</span>
                      </div>
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={handleDismiss}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                        >
                          Maybe Later
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
