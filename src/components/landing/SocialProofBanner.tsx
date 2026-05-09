'use client';

/**
 * SocialProofBanner Component
 * 
 * Displays usage statistics and social proof indicators.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Users, TrendingUp, Clock, Award } from 'lucide-react';
import type { SocialProofBannerProps } from '@/types/pricing';

const DEFAULT_STATS = [
  { value: '150+', label: 'Schools Trust PwezaCore', icon: Users },
  { value: '50,000+', label: 'Students Managed', icon: TrendingUp },
  { value: '99.9%', label: 'Uptime Guarantee', icon: Award },
  { value: '15+', label: 'Hours Saved Weekly', icon: Clock },
];

export function SocialProofBanner({
  stats = DEFAULT_STATS,
  variant = 'banner',
}: SocialProofBannerProps) {
  return (
    <section className="py-12 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <StatItem key={index} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatItem({ stat, index }: { stat: any; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  const Icon = stat.icon;

  useEffect(() => {
    if (!isInView) return;

    const numericValue = parseInt(stat.value.replace(/[^0-9]/g, ''));
    if (isNaN(numericValue)) return;

    const duration = 2000;
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setCount(numericValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isInView, stat.value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1 }}
      className="text-center"
    >
      <div className="flex justify-center mb-2">
        {Icon && <Icon className="w-8 h-8 text-white" />}
      </div>
      <motion.p
        className="text-3xl lg:text-4xl font-bold text-white mb-1"
        initial={{ scale: 0.5 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={{ type: 'spring', stiffness: 100, delay: index * 0.1 }}
      >
        {stat.value}
      </motion.p>
      <p className="text-sm lg:text-base text-blue-100">{stat.label}</p>
    </motion.div>
  );
}
