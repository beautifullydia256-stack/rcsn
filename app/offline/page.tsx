'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OfflinePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const checkOnline = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        router.push('/');
      }
    };

    checkOnline();
    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);

    return () => {
      window.removeEventListener('online', checkOnline);
      window.removeEventListener('offline', checkOnline);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl"></div>
          <div className="relative bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 p-12 shadow-lg">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              className="flex justify-center mb-6"
            >
              <WifiOff className="w-24 h-24 text-gray-400 dark:text-gray-500" />
            </motion.div>
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              You're Offline
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              It looks like you've lost your internet connection. Please check your network settings and try again.
            </p>

            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg"
              >
                <RefreshCw className="w-5 h-5" />
                Retry Connection
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/20 dark:bg-white/5 backdrop-blur-sm border border-white/30 dark:border-white/10 text-gray-900 dark:text-white rounded-xl font-medium transition-all"
              >
                <Home className="w-5 h-5" />
                Go to Home
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

