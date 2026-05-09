'use client';

/**
 * TrustSection Component
 * 
 * Displays security, compliance, and trust indicators.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Database, Clock, FileCheck, HeadphonesIcon } from 'lucide-react';
import Link from 'next/link';
import type { TrustSectionProps } from '@/types/pricing';

const DEFAULT_SECURITY_FEATURES = [
  {
    icon: Shield,
    title: 'Bank-Level Encryption',
    description: 'Your data is protected with industry-standard encryption',
  },
  {
    icon: Lock,
    title: 'Secure Data Storage',
    description: 'All data stored securely with automatic backups',
  },
  {
    icon: Database,
    title: 'Data Backup & Recovery',
    description: 'Automated daily backups with point-in-time recovery',
  },
  {
    icon: Clock,
    title: '99.9% Uptime',
    description: 'Reliable service you can count on',
  },
  {
    icon: FileCheck,
    title: 'GDPR Compliant',
    description: 'We follow international data protection standards',
  },
  {
    icon: HeadphonesIcon,
    title: 'Dedicated Support',
    description: 'Our team is here to help when you need us',
  },
];

export function TrustSection({
  securityFeatures = DEFAULT_SECURITY_FEATURES,
  complianceStatements = [],
  uptimeStats,
}: TrustSectionProps) {
  return (
    <section className="py-16 lg:py-24 bg-white dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Secure & Reliable
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Your school's data is safe with enterprise-grade security
          </p>
        </motion.div>

        {/* Security Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Trust Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center pt-8 border-t border-gray-200 dark:border-gray-700"
        >
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Learn more about our commitment to security and privacy
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link
              href="/privacy-policy"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Privacy Policy
            </Link>
            <Link
              href="/security-letter"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Security Statement
            </Link>
            <Link
              href="/terms-of-use"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Terms of Service
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
