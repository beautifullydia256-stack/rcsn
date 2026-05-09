'use client';

/**
 * PricingSection Component
 * 
 * Main pricing section that integrates the calculator and tier cards.
 * Displays 4-tier pricing structure with interactive calculator.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PricingCalculator } from './PricingCalculator';
import { PricingTierCard } from './PricingTierCard';
import { getAllTiers } from '@/lib/pricing/pricing-config';
import { calculateTierPrice } from '@/lib/pricing/pricing-calculator';
import type { PricingSectionProps } from '@/types/pricing';

export function PricingSection({ className = '' }: PricingSectionProps) {
  const [studentCount, setStudentCount] = useState<number>(300);
  const tiers = getAllTiers();

  const handleStudentCountChange = (count: number) => {
    setStudentCount(count);
  };

  return (
    <section
      id="pricing"
      className={`py-16 lg:py-24 bg-white dark:bg-slate-900 transition-colors duration-300 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Choose the plan that fits your school. No hidden fees, no surprises.
          </p>
        </motion.div>

        {/* Pricing Calculator */}
        <div className="mb-12">
          <PricingCalculator
            defaultStudentCount={studentCount}
            onStudentCountChange={handleStudentCountChange}
          />
        </div>

        {/* Pricing Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {tiers.map((tier) => {
            const calculatedTotal =
              tier.pricePerStudent !== null
                ? calculateTierPrice(studentCount, tier.pricePerStudent)
                : 0;

            return (
              <PricingTierCard
                key={tier.id}
                tier={tier}
                calculatedTotal={calculatedTotal}
                studentCount={studentCount}
                isRecommended={tier.isRecommended}
                isAnchor={tier.isAnchor}
              />
            );
          })}
        </div>

        {/* Additional Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600 dark:text-gray-400">
            All plans include free updates, secure data storage, and email support.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Need help choosing?{' '}
            <a
              href="/contact"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Contact our team
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
