'use client';

import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  pullProgress: number;
}

export default function PullToRefreshIndicator({ isPulling, pullProgress }: PullToRefreshIndicatorProps) {
  if (!isPulling) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 pointer-events-none"
    >
      <div className="relative group overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-full backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl"></div>
        <div className="relative bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-full border border-white/30 dark:border-white/10 p-4 shadow-lg">
          <motion.div
            animate={{ rotate: pullProgress * 360 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

