import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const PRICING_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    pricePerStudent: 500,
    badge: null,
    features: [
      'Student & Staff Management',
      'Basic Report Cards',
      'Fee Tracking',
      'Parent Communication',
      'Email Support',
    ],
    gradient: 'from-gray-500 to-gray-600',
    cta: 'Get Started',
  },
  {
    id: 'professional',
    name: 'Professional',
    pricePerStudent: 1000,
    badge: 'Best Value',
    features: [
      'Everything in Starter',
      'Advanced Report Cards',
      'SMS & WhatsApp Integration',
      'Attendance Tracking',
      'AI Exam Generator',
      'Priority Support',
    ],
    gradient: 'from-blue-500 to-blue-600',
    cta: 'Start Saving Time',
    recommended: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    pricePerStudent: 2500,
    badge: 'Complete Solution',
    features: [
      'Everything in Professional',
      'Multi-School Management',
      'Custom Branding',
      'Advanced Analytics',
      'API Access',
      'Dedicated Account Manager',
    ],
    gradient: 'from-purple-500 to-purple-600',
    cta: 'Get Complete Solution',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    pricePerStudent: null,
    badge: 'Custom',
    features: [
      'Everything in Premium',
      'Custom Integrations',
      'On-Premise Deployment',
      'SLA Guarantee',
      'Training & Onboarding',
      '24/7 Phone Support',
    ],
    gradient: 'from-indigo-500 to-indigo-600',
    cta: 'Contact Sales',
  },
];

export function PricingCalculatorSection() {
  const [studentCount, setStudentCount] = useState(300);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTotal = (pricePerStudent: number | null) => {
    if (pricePerStudent === null) return null;
    return pricePerStudent * studentCount;
  };

  return (
    <div>
      {/* Slider Calculator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 mb-12 max-w-4xl mx-auto"
      >
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Calculate Your Cost
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Adjust the slider to see pricing for your school size
          </p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <label className="text-lg font-semibold text-gray-900 dark:text-white">
              Number of Students
            </label>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {studentCount.toLocaleString()}
            </div>
          </div>

          {/* Slider */}
          <input
            type="range"
            min="0"
            max="5000"
            step="50"
            value={studentCount}
            onChange={(e) => setStudentCount(parseInt(e.target.value))}
            className="w-full h-3 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(studentCount / 5000) * 100}%, #e5e7eb ${(studentCount / 5000) * 100}%, #e5e7eb 100%)`,
            }}
          />

          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-2">
            <span>0</span>
            <span>1,250</span>
            <span>2,500</span>
            <span>3,750</span>
            <span>5,000</span>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Prices shown are per term. Most schools have 3 terms per year.
        </div>
      </motion.div>

      {/* Pricing Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PRICING_TIERS.map((tier, index) => {
          const total = calculateTotal(tier.pricePerStudent);
          
          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 ${
                tier.recommended
                  ? 'ring-2 ring-blue-600 dark:ring-blue-400 scale-105'
                  : ''
              }`}
            >
              {/* Badge */}
              {tier.badge && (
                <div
                  className={`absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-sm font-semibold text-white ${
                    tier.recommended
                      ? 'bg-blue-600'
                      : 'bg-gradient-to-r ' + tier.gradient
                  }`}
                >
                  {tier.badge}
                </div>
              )}

              {/* Tier Name */}
              <div className="text-center mb-6 mt-2">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {tier.name}
                </h3>

                {/* Price */}
                {tier.pricePerStudent !== null ? (
                  <>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {formatCurrency(tier.pricePerStudent)} per student
                    </div>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {total !== null ? formatCurrency(total) : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      per term
                    </div>
                  </>
                ) : (
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    Custom Pricing
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
                  >
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link
                to={
                  tier.id === 'enterprise'
                    ? '/contact'
                    : `/register?tier=${tier.id}`
                }
                className="block"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    tier.recommended
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {tier.cta}
                </motion.button>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
