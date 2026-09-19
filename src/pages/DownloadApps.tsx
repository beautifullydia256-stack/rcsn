import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Smartphone, Download, CheckCircle2, Zap, Shield, WifiOff,
  BarChart3, Bell, Building2, School
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { publicAssetUrl } from '@/lib/publicAssetUrl';
import { supabase } from '@/lib/supabase';

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

function useIsIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream;
}

function useIsStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

// ─── iOS Install Instructions Modal ─────────────────────────────────────────
function IOSModal({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-7 max-w-sm w-full"
        >
          <div className="text-center mb-5">
            <Smartphone className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add to Home Screen</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Follow these steps in Safari to install the PwezaCore app:
            </p>
          </div>
          <ol className="space-y-4">
            {[
              { num: '1', text: 'Open this page in Safari (not Chrome or Firefox).' },
              { num: '2', text: 'Tap the Share button at the bottom of Safari (the square with an arrow pointing up).' },
              { num: '3', text: 'Scroll down and tap "Add to Home Screen".' },
              { num: '4', text: 'Tap "Add" in the top-right corner. Done!' },
            ].map((step) => (
              <li key={step.num} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">{step.num}</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 pt-0.5">{step.text}</p>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
          >
            Got it
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Android Fallback Modal (when browser prompt not available) ──────────────
function AndroidFallbackModal({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-7 max-w-sm w-full"
        >
          <div className="text-center mb-5">
            <Smartphone className="w-10 h-10 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Install on Android</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Install PwezaCore directly from Chrome:
            </p>
          </div>
          <ol className="space-y-4">
            {[
              { num: '1', text: 'Make sure you are using Chrome on Android.' },
              { num: '2', text: 'Tap the three-dot menu (⋮) at the top-right of Chrome.' },
              { num: '3', text: 'Tap "Add to Home Screen" or "Install app".' },
              { num: '4', text: 'Tap "Install" to confirm. Done!' },
            ].map((step) => (
              <li key={step.num} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">{step.num}</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 pt-0.5">{step.text}</p>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors"
          >
            Got it
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function DownloadApps() {
  const isStandalone = useIsStandalone();
  const isIOS = useIsIOS();

  // Reactive: becomes true as soon as the browser fires beforeinstallprompt
  const [promptAvailable, setPromptAvailable] = useState(!!window.__pwaInstallPrompt);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(isStandalone || !!window.__pwaInstalled);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidFallback, setShowAndroidFallback] = useState(false);
  const [windowsUrl, setWindowsUrl] = useState<string | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e as BeforeInstallPromptEvent;
      setPromptAvailable(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptAvailable(false);
      window.__pwaInstalled = true;
      window.__pwaInstallPrompt = null;
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    supabase
      .from('platform_config')
      .select('value')
      .eq('key', 'windows_app_url')
      .single()
      .then(({ data }) => {
        const val = (data as { value?: string } | null)?.value ?? '';
        if (val) setWindowsUrl(val);
      });
  }, []);

  // Must be a plain (non-async) function — calling prompt() must happen
  // synchronously inside the click handler to preserve the user-gesture context.
  const handleAndroidInstall = () => {
    const p = window.__pwaInstallPrompt;
    if (!p) {
      setShowAndroidFallback(true);
      return;
    }
    window.__pwaInstallPrompt = null;
    setPromptAvailable(false);
    setInstalling(true);
    p.prompt()
      .then(() => p.userChoice)
      .then((choice) => {
        if (choice.outcome === 'accepted') setInstalled(true);
      })
      .finally(() => setInstalling(false));
  };

  const handleWindowsDownload = () => {
    if (windowsUrl) window.open(windowsUrl, '_blank', 'noopener,noreferrer');
  };

  const features = [
    { icon: <Zap className="w-5 h-5 text-amber-500" />, label: 'Real-time sync across all devices' },
    { icon: <Shield className="w-5 h-5 text-blue-500" />, label: 'Bank-grade security & encryption' },
    { icon: <WifiOff className="w-5 h-5 text-indigo-500" />, label: 'Works offline, syncs when connected' },
    { icon: <BarChart3 className="w-5 h-5 text-emerald-500" />, label: 'Full dashboard access on mobile' },
    { icon: <Bell className="w-5 h-5 text-rose-500" />, label: 'Instant push notifications' },
    { icon: <Building2 className="w-5 h-5 text-teal-500" />, label: 'Built for Ugandan schools' },
  ];

  const androidButton = () => {
    if (installed) {
      return (
        <div className="w-full py-3 rounded-2xl bg-green-500 text-white text-sm font-bold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Installed
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={handleAndroidInstall}
        disabled={installing}
        className="w-full py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {installing ? (
          <>
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Installing…
          </>
        ) : (
          <><Download className="w-4 h-4" /> Download</>
        )}
      </button>
    );
  };

  const iosButton = () => {
    if (installed && isIOS) {
      return (
        <div className="w-full py-3 rounded-2xl bg-green-500 text-white text-sm font-bold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Installed
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setShowIOSModal(true)}
        className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" /> Install
      </button>
    );
  };

  const windowsButton = () => (
    <button
      type="button"
      onClick={handleWindowsDownload}
      disabled={!windowsUrl}
      className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
    >
      <Download className="w-4 h-4" /> Download
    </button>
  );

  const platforms = [
    {
      id: 'android',
      name: 'Android',
      store: 'Google Play',
      badge: 'Install via',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
          <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.303l2.302 2.302a1 1 0 010 1.588L17.7 17.596l-2.302-2.302 2.3-3.89zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z" />
        </svg>
      ),
      gradient: 'from-green-500 to-emerald-600',
      border: 'border-green-200 dark:border-green-800',
      desc: promptAvailable
        ? 'Ready! Tap Download and the install dialog will appear.'
        : 'Install directly to your Android home screen — no Play Store required.',
      renderButton: androidButton,
    },
    {
      id: 'ios',
      name: 'iOS',
      store: 'App Store',
      badge: 'Install via',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      ),
      gradient: 'from-blue-500 to-indigo-600',
      border: 'border-blue-200 dark:border-blue-800',
      desc: 'Add PwezaCore to your iPhone or iPad home screen from Safari — works like a native app.',
      renderButton: iosButton,
    },
    {
      id: 'windows',
      name: 'Windows',
      store: 'Desktop App',
      badge: 'Download for',
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
        </svg>
      ),
      gradient: 'from-sky-500 to-blue-600',
      border: 'border-sky-200 dark:border-sky-800',
      desc: 'Install the PwezaCore desktop app on your Windows PC for a full native experience.',
      renderButton: windowsButton,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">

      {showIOSModal && <IOSModal onClose={() => setShowIOSModal(false)} />}
      {showAndroidFallback && <AndroidFallbackModal onClose={() => setShowAndroidFallback(false)} />}

      {/* Nav */}
      <nav className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-sm sticky top-0 z-20 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src={publicAssetUrl('logo.png')} alt="PwezaCore" width={28} height={28} className="rounded" />
              <span className="text-2xl font-bold text-blue-600">PwezaCore</span>
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                to="/login"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none select-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-400/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-400/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight"
          >
            PwezaCore
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              On Every Device
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-12"
          >
            The full power of PwezaCore in your pocket and on your desktop.
            Install on Android, iOS, or Windows and manage your school from anywhere.
          </motion.p>

          {/* Platform Cards */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {platforms.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 180, damping: 20 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`relative bg-white dark:bg-slate-800 rounded-3xl shadow-xl border ${p.border} p-8 flex flex-col items-center gap-4 overflow-hidden`}
              >
                <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${p.gradient} opacity-10 blur-2xl pointer-events-none`} />
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${p.gradient} text-white flex items-center justify-center shadow-lg`}>
                  {p.icon}
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                    {p.badge}
                  </p>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{p.store}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{p.desc}</p>
                </div>
                <div className="mt-2 w-full">
                  {p.renderButton()}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features strip */}
      <section className="py-16 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-10"
          >
            Everything you need, wherever you are
          </motion.h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-3 bg-white dark:bg-slate-700/50 rounded-2xl px-5 py-4 shadow-sm border border-gray-100 dark:border-slate-600"
              >
                <span className="text-2xl shrink-0">{f.icon}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{f.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-10 shadow-2xl text-white"
          >
            <School className="w-12 h-12 text-white/90 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Ready to run your school smarter?</h2>
            <p className="text-blue-100 mb-8">
              Create a free account and get access to the web app instantly — the mobile and desktop apps connect to the same account.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-7 py-3 bg-white text-blue-700 font-bold rounded-2xl hover:bg-blue-50 transition-colors shadow-lg"
              >
                Get Started Free
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-7 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-2xl transition-colors border border-white/30"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-700 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        <p>© {new Date().getFullYear()} PwezaCore · School Management System</p>
        <div className="flex justify-center gap-6 mt-3">
          <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
          <Link to="/library" className="hover:text-blue-600 transition-colors">Library</Link>
          <Link to="/privacy-policy" className="hover:text-blue-600 transition-colors">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
