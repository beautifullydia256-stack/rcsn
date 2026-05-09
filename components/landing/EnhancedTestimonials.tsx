'use client';

/**
 * EnhancedTestimonials Component
 * 
 * Displays testimonials with quantifiable results and credibility indicators.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Quote, Star } from 'lucide-react';
import { getFeaturedTestimonials } from '@/lib/content/testimonials-data';
import type { EnhancedTestimonialsProps } from '@/types/pricing';

export function EnhancedTestimonials({
  testimonials = getFeaturedTestimonials(),
  layout = 'grid',
}: EnhancedTestimonialsProps) {
  return (
    <section className="py-16 lg:py-24 bg-gray-50 dark:bg-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Trusted by Schools Across Uganda
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            See how schools are transforming their operations with PwezaCore
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 lg:p-8 transition-all duration-300"
            >
              {/* Quote Icon */}
              <div className="mb-4">
                <Quote className="w-10 h-10 text-blue-600 dark:text-blue-400 opacity-50" />
              </div>

              {/* Quote */}
              <blockquote className="text-gray-700 dark:text-gray-300 mb-6 text-lg leading-relaxed">
                "{testimonial.quote}"
              </blockquote>

              {/* Quantifiable Result */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-600">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  📊 {testimonial.quantifiableResult}
                </p>
              </div>

              {/* Metrics */}
              {testimonial.metrics && (
                <div className="mb-6 space-y-2">
                  {testimonial.metrics.timeSaved && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ⏱️ {testimonial.metrics.timeSaved}
                    </p>
                  )}
                  {testimonial.metrics.efficiencyGain && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      📈 {testimonial.metrics.efficiencyGain}
                    </p>
                  )}
                  {testimonial.metrics.satisfactionScore && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < testimonial.metrics!.satisfactionScore!
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Author */}
              <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {testimonial.author.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.author.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {testimonial.author.role}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {testimonial.author.school}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
