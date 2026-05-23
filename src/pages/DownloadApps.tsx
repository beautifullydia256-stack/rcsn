import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/theme-toggle';
import { publicAssetUrl } from '@/lib/publicAssetUrl';

const platforms = [
  {
    id: 'android',
    name: 'Android',
    store: 'Google Play',
    badge: 'Get it on',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.303l2.302 2.302a1 1 0 010 1.588L17.7 17.596l-2.302-2.302 2.3-3.89zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z" />
      </svg>
    ),
    gradient: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-400',
    pill: 'bg-green-600',
    desc: 'Download the PwezaCore app from the Google Play Store and manage your school from your Android device.',
    available: false,
  },
  {
    id: 'ios',
    name: 'iOS',
    store: 'App Store',
    badge: 'Download on the',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-400',
    pill: 'bg-blue-600',
    desc: 'Get the PwezaCore app from the Apple App Store and manage your school from your iPhone or iPad.',
    available: false,
  },
  {
    id: 'windows',
    name: 'Windows',
    store: 'Windows App',
    badge: 'Download for',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
      </svg>
    ),
    gradient: 'from-sky-500 to-blue-600',
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    border: 'border-sky-200 dark:border-sky-800',
    text: 'text-sky-700 dark:text-sky-400',
    pill: 'bg-sky-600',
    desc: 'Install the PwezaCore desktop app on your Windows PC for offline access and a native experience.',
    available: false,
  },
];

const features = [
  { icon: '⚡', label: 'Real-time sync across all devices' },
  { icon: '🔒', label: 'Bank-grade security & encryption' },
  { icon: '📶', label: 'Works offline, syncs when connected' },
  { icon: '📊', label: 'Full dashboard access on mobile' },
  { icon: '🔔', label: 'Instant push notifications' },
  { icon: '🇺🇬', label: 'Built for Ugandan schools' },
];

export default function DownloadApps() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">

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
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-semibold mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Coming Soon — Be the first to know
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
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
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-12"
          >
            The full power of PwezaCore in your pocket and on your desktop.
            Android, iOS, and Windows apps are coming soon — manage your school from anywhere.
          </motion.p>

          {/* Platform Cards */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {platforms.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.1, type: 'spring', stiffness: 180, damping: 20 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`relative bg-white dark:bg-slate-800 rounded-3xl shadow-xl border ${p.border} p-8 flex flex-col items-center gap-4 overflow-hidden`}
              >
                {/* Glow blob */}
                <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${p.gradient} opacity-10 blur-2xl pointer-events-none`} />

                {/* Icon circle */}
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
                  <div
                    className={`w-full py-3 rounded-2xl ${p.pill} text-white text-sm font-bold opacity-60 cursor-not-allowed flex items-center justify-center gap-2`}
                    aria-disabled="true"
                  >
                    <span>Coming Soon</span>
                  </div>
                  <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">
                    Not yet available
                  </p>
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

      {/* Notify CTA */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-10 shadow-2xl text-white"
          >
            <div className="text-4xl mb-4">📱</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
              Want to be first in line?
            </h2>
            <p className="text-blue-100 mb-8">
              Sign up for PwezaCore now and you'll get early access to the mobile and desktop apps the moment they launch.
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
