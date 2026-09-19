'use client';

/**
 * PricingCalculator Component
 * 
 * CRITICAL COMPONENT - User-requested centerpiece of the pricing transformation.
 * 
 * Interactive calculator that allows users to input student count and see
 * real-time pricing for all tiers. Implements input validation, error handling,
 * and responsive design with dark mode support.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Calculator, Lightbulb } from 'lucide-react';
import {
  calculateAllTierPrices,
  formatUGX,
  validateStudentCount,
  sanitizeStudentCount,
} from '@/lib/pricing/pricing-calculator';
import { trackCalculatorUsage, trackStudentCountChanged } from '@/lib/pricing/pricing-analytics';
import type { PricingCalculatorProps, TierPrices } from '@/types/pricing';

export function PricingCalculator({
  defaultStudentCount = 300,
  onStudentCountChange,
  className = '',
}: PricingCalculatorProps) {
  const [studentCount, setStudentCount] = useState<number>(defaultStudentCount);
  const [inputValue, setInputValue] = useState<string>(defaultStudentCount.toString());
  const [calculatedPrices, setCalculatedPrices] = useState<TierPrices>({});
  const [error, setError] = useState<string>('');
  const [startTime] = useState<number>(Date.now());

  // Calculate prices whenever student count changes
  useEffect(() => {
    const prices = calculateAllTierPrices(studentCount);
    setCalculatedPrices(prices);
  }, [studentCount]);

  // Track calculator usage on unmount
  useEffect(() => {
    return () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      if (calculatedPrices.starter && calculatedPrices.professional && calculatedPrices.premium) {
        trackCalculatorUsage({
          studentCount,
          calculatedPrices: {
            starter: calculatedPrices.starter,
            professional: calculatedPrices.professional,
            premium: calculatedPrices.premium,
          },
          timeSpent,
        });
      }
    };
  }, [studentCount, calculatedPrices, startTime]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Parse and validate
    const numValue = parseInt(value, 10);
    if (value === '' || isNaN(numValue)) {
      setError('');
      return;
    }

    const validation = validateStudentCount(numValue);
    if (!validation.isValid) {
      setError(validation.error || '');
      return;
    }

    setError('');
    setStudentCount(numValue);
    trackStudentCountChanged(numValue);
    onStudentCountChange?.(numValue);
  }, [onStudentCountChange]);

  // Handle increment
  const handleIncrement = useCallback(() => {
    const newCount = Math.min(studentCount + 10, 2000);
    setStudentCount(newCount);
    setInputValue(newCount.toString());
    setError('');
    trackStudentCountChanged(newCount);
    onStudentCountChange?.(newCount);
  }, [studentCount, onStudentCountChange]);

  // Handle decrement
  const handleDecrement = useCallback(() => {
    const newCount = Math.max(studentCount - 10, 1);
    setStudentCount(newCount);
    setInputValue(newCount.toString());
    setError('');
    trackStudentCountChanged(newCount);
    onStudentCountChange?.(newCount);
  }, [studentCount, onStudentCountChange]);

  // Handle blur - sanitize input
  const handleBlur = useCallback(() => {
    if (inputValue === '') {
      setInputValue(studentCount.toString());
      return;
    }

    const numValue = parseInt(inputValue, 10);
    if (isNaN(numValue)) {
      setInputValue(studentCount.toString());
      return;
    }

    const sanitized = sanitizeStudentCount(numValue);
    setStudentCount(sanitized);
    setInputValue(sanitized.toString());
    setError('');
    onStudentCountChange?.(sanitized);
  }, [inputValue, studentCount, onStudentCountChange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-xl p-8 lg:p-10 transition-colors duration-300 ${className}`}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Calculate Your Investment
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          See how much you'll invest per term based on your school size
        </p>
      </div>

      {/* Student Count Input */}
      <div className="mb-8">
        <label
          htmlFor="student-count"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Number of Students
        </label>
        <div className="flex items-center gap-3">
          {/* Decrement Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDecrement}
            disabled={studentCount <= 1}
            className="w-12 h-12 lg:w-14 lg:h-14 rounded-lg bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            aria-label="Decrease student count"
          >
            <Minus className="w-5 h-5" />
          </motion.button>

          {/* Input Field */}
          <div className="flex-1 relative">
            <input
              id="student-count"
              type="number"
              min="1"
              max="2000"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className="w-full h-14 lg:h-16 text-center text-2xl lg:text-3xl font-bold rounded-lg border-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
              aria-label="Number of students"
              aria-describedby="calculator-help"
              aria-invalid={!!error}
            />
          </div>

          {/* Increment Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleIncrement}
            disabled={studentCount >= 2000}
            className="w-12 h-12 lg:w-14 lg:h-14 rounded-lg bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            aria-label="Increase student count"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Help Text */}
        <p
          id="calculator-help"
          className="mt-2 text-sm text-gray-500 dark:text-gray-400"
        >
          Enter a number between 1 and 2,000 students
        </p>
      </div>

      {/* Calculated Prices */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Your Pricing Per Term:
        </h3>

        {/* Starter Tier */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg"
        >
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Starter</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              UGX 500/student
            </p>
          </div>
          <motion.p
            key={calculatedPrices.starter}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xl font-bold text-gray-900 dark:text-white"
          >
            {calculatedPrices.starter ? formatUGX(calculatedPrices.starter) : '—'}
          </motion.p>
        </motion.div>

        {/* Professional Tier - Best Value */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-600 dark:border-blue-400 rounded-lg"
        >
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 dark:text-white">Professional</p>
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">
                Best Value
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              UGX 1,000/student
            </p>
          </div>
          <motion.p
            key={calculatedPrices.professional}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xl font-bold text-blue-600 dark:text-blue-400"
          >
            {calculatedPrices.professional ? formatUGX(calculatedPrices.professional) : '—'}
          </motion.p>
        </motion.div>

        {/* Premium Tier */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg"
        >
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Premium</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              UGX 2,500/student
            </p>
          </div>
          <motion.p
            key={calculatedPrices.premium}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xl font-bold text-gray-900 dark:text-white"
          >
            {calculatedPrices.premium ? formatUGX(calculatedPrices.premium) : '—'}
          </motion.p>
        </motion.div>

        {/* Enterprise Tier */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg"
        >
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Enterprise</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Custom pricing
            </p>
          </div>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
            Contact Sales
          </p>
        </motion.div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <Lightbulb className="w-4 h-4 text-amber-500 inline-block mr-1.5 align-text-bottom" /><strong>Tip:</strong> Most schools with {studentCount} students choose the{' '}
          <strong>Professional</strong> tier for the best value and complete feature set.
        </p>
      </div>
    </motion.div>
  );
}
