'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Show brief online indicator
        setTimeout(() => {
          setWasOffline(false);
        }, 2000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return (
    <AnimatePresence>
      {(!isOnline || wasOffline) && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-safe-top"
        >
          <div className="relative group overflow-hidden mt-4">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl"></div>
            <div
              className={`relative backdrop-blur-md rounded-xl border border-white/30 dark:border-white/10 px-4 py-2 shadow-lg ${
                isOnline
                  ? 'bg-green-500/20 dark:bg-green-500/10'
                  : 'bg-red-500/20 dark:bg-red-500/10'
              }`}
            >
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Back Online
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                      No Internet Connection
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

