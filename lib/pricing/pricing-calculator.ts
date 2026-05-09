/**
 * Pricing Calculator Utilities
 * 
 * This file contains utility functions for calculating pricing,
 * formatting currency, and validating student count inputs.
 */

import type { TierPrices, ValidationResult } from '@/types/pricing';

/**
 * Calculate the total price for a tier based on student count
 * 
 * @param studentCount - Number of students
 * @param pricePerStudent - Price per student for the tier
 * @returns Total price for the tier
 */
export function calculateTierPrice(
  studentCount: number,
  pricePerStudent: number
): number {
  return studentCount * pricePerStudent;
}

/**
 * Calculate prices for all tiers
 * 
 * @param studentCount - Number of students
 * @returns Object with calculated prices for each tier
 */
export function calculateAllTierPrices(studentCount: number): TierPrices {
  return {
    starter: calculateTierPrice(studentCount, 500),
    professional: calculateTierPrice(studentCount, 1000),
    premium: calculateTierPrice(studentCount, 2500),
    enterprise: null, // Enterprise pricing is custom
  };
}

/**
 * Format amount in Ugandan Shillings with proper localization
 * 
 * @param amount - Amount to format
 * @returns Formatted currency string (e.g., "UGX 300,000")
 */
export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString('en-UG')}`;
}

/**
 * Format amount in Ugandan Shillings with short notation
 * 
 * @param amount - Amount to format
 * @returns Formatted currency string with K/M notation (e.g., "UGX 300K")
 */
export function formatUGXShort(amount: number): string {
  if (amount >= 1000000) {
    return `UGX ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `UGX ${(amount / 1000).toFixed(0)}K`;
  }
  return formatUGX(amount);
}

/**
 * Validate student count input
 * 
 * @param value - Student count to validate
 * @returns Validation result with error message if invalid
 */
export function validateStudentCount(value: number): ValidationResult {
  // Check if value is a number
  if (isNaN(value)) {
    return {
      isValid: false,
      error: 'Please enter a valid number',
    };
  }

  // Check if value is an integer
  if (!Number.isInteger(value)) {
    return {
      isValid: false,
      error: 'Please enter a whole number',
    };
  }

  // Check minimum value
  if (value < 1) {
    return {
      isValid: false,
      error: 'Must have at least 1 student',
    };
  }

  // Check maximum value
  if (value > 2000) {
    return {
      isValid: false,
      error: 'For schools with 2000+ students, please contact sales',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Sanitize student count input
 * Rounds to nearest integer and clamps to valid range
 * 
 * @param value - Raw input value
 * @returns Sanitized student count
 */
export function sanitizeStudentCount(value: number): number {
  // Round to nearest integer
  let sanitized = Math.round(value);

  // Clamp to valid range
  sanitized = Math.max(1, Math.min(2000, sanitized));

  return sanitized;
}

/**
 * Get example calculations for common school sizes
 * 
 * @returns Array of example calculations
 */
export function getExampleCalculations(): Array<{
  label: string;
  studentCount: number;
  prices: TierPrices;
}> {
  return [
    {
      label: 'Small School',
      studentCount: 100,
      prices: calculateAllTierPrices(100),
    },
    {
      label: 'Medium School',
      studentCount: 300,
      prices: calculateAllTierPrices(300),
    },
    {
      label: 'Large School',
      studentCount: 500,
      prices: calculateAllTierPrices(500),
    },
  ];
}

/**
 * Calculate savings compared to manual processes
 * Based on 15 hours saved per week at average admin hourly rate
 * 
 * @param studentCount - Number of students
 * @param tierPrice - Price per student for selected tier
 * @returns Estimated annual savings
 */
export function calculateEstimatedSavings(
  studentCount: number,
  tierPrice: number
): {
  totalCost: number;
  hoursSavedPerWeek: number;
  hoursSavedPerYear: number;
  estimatedSavings: number;
} {
  const totalCost = calculateTierPrice(studentCount, tierPrice);
  const hoursSavedPerWeek = 15; // From requirements
  const hoursSavedPerYear = hoursSavedPerWeek * 52;
  const avgAdminHourlyRate = 10000; // UGX (estimate)
  const estimatedSavings = hoursSavedPerYear * avgAdminHourlyRate;

  return {
    totalCost,
    hoursSavedPerWeek,
    hoursSavedPerYear,
    estimatedSavings,
  };
}

/**
 * Get price per student display text
 * 
 * @param pricePerStudent - Price per student
 * @returns Formatted display text
 */
export function getPricePerStudentText(pricePerStudent: number | null): string {
  if (pricePerStudent === null) {
    return 'Custom Pricing';
  }
  return `${formatUGX(pricePerStudent)}/student/term`;
}
