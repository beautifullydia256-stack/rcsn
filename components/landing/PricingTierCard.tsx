'use client';

/**
 * PricingTierCard Component
 * 
 * Displays individual pricing tier with calculated price, transformation benefits,
 * feature bundles, and CTA. Implements visual hierarchy based on tier emphasis.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatUGX, getPricePerStudentText } from '@/lib/pricing/pricing-calculator';
import { trackTierInteraction } from '@/lib/pricing/pricing-analytics';
import type { PricingTierCardProps } from '@/types/pricing';

export function PricingTierCard({
  tier,
  calculatedTotal,
  studentCount,
  isRecommended,
  isAnchor,
  className = '',
}: PricingTierCardProps) {
  const handleCardClick = () => {
    trackTierInteraction({
      tierId: tier.id,
      action: 'click',
      studentCount,
      calculatedPrice: calculatedTotal,
    });
  };

  const handleCTAClick = () => {
    trackTierInteraction({
      tierId: tier.id,
      action: 'cta_click',
      studentCount,
      calculatedPrice: calculatedTotal,
    });
  };

  const handleMouseEnter = () => {
    trackTierInteraction({
      tierId: tier.id,
      action: 'hover',
    });
  };

  // Determine card styling based on emphasis
  const getCardClasses = () => {
    const baseClasses = 'relative bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 lg:p-8 transition-all duration-300 hover:-translate-y-1';
    
    if (tier.emphasis === 'high' || isRecommended) {
      return `${baseClasses} border-2 border-blue-600 dark:border-blue-400 scale-105 z-10 shadow-2xl`;
    }
    
    if (tier.emphasis === 'medium' || isAnchor) {
      return `${baseClasses} border border-indigo-300 dark:border-indigo-600 bg-gradient-to-b from-white to-indigo-50 dark:from-slate-800 dark:to-indigo-950`;
    }
    
    return `${baseClasses} border border-slate-200 dark:border-slate-700`;
  };

  // Get badge styling
  const getBadgeClasses = () => {
    if (!tier.badge) return '';
    
    switch (tier.badge.variant) {
      case 'primary':
        return 'bg-blue-600 text-white';
      case 'premium':
        return 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white';
      case 'success':
        return 'bg-green-600 text-white';
      default:
        return 'bg-blue-600 text-white';
    }
  };

  // Get CTA button styling
  const getCTAClasses = () => {
    switch (tier.cta.variant) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl';
      case 'secondary':
        return 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20';
      case 'outline':
        return 'bg-transparent text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20';
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      className={`${getCardClasses()} ${className}`}
      role="article"
      aria-labelledby={`tier-${tier.id}-name`}
    >
      {/* Badge */}
      {tier.badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${getBadgeClasses()}`}>
            {tier.badge.text}
          </span>
        </div>
      )}

      {/* Tier Name */}
      <h3
        id={`tier-${tier.id}-name`}
        className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2"
      >
        {tier.displayName}
      </h3>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent my-4" />

      {/* Price Display */}
      <div className="mb-6">
        {tier.pricePerStudent !== null ? (
          <>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
                {formatUGX(tier.pricePerStudent)}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              per student/term
            </p>
            
            {/* Calculated Total */}
            {calculatedTotal > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total for {studentCount} students:
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatUGX(calculatedTotal)}
                </p>
              </motion.div>
            )}
          </>
        ) : (
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Custom Pricing
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tailored to your needs
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent my-6" />

      {/* Transformation Benefits */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
          What You'll Achieve
        </h4>
        <ul className="space-y-2">
          {tier.transformationBenefits.map((benefit, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
            >
              <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{benefit}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent my-6" />

      {/* Feature Bundles */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
          Features Included
        </h4>
        <div className="space-y-4">
          {tier.featureBundles.map((bundle) => (
            <div key={bundle.id}>
              {bundle.name && bundle.features.length > 0 && (
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {bundle.name}
                </p>
              )}
              {bundle.features.length > 0 && (
                <ul className="space-y-1.5">
                  {bundle.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      <Link href={tier.cta.href} onClick={handleCTAClick}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${getCTAClasses()}`}
          aria-label={`${tier.cta.text} for ${tier.displayName} tier`}
        >
          {tier.cta.text}
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </Link>
    </motion.div>
  );
}
