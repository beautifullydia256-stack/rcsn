/**
 * Transformation Messages
 * 
 * This file contains outcome-focused messaging for the landing page,
 * emphasizing transformation and results rather than features.
 */

import type { TransformationMessage } from '@/types/pricing';

/**
 * Transformation messages for various sections of the landing page
 */
export const TRANSFORMATION_MESSAGES: TransformationMessage[] = [
  {
    id: 'hero-main',
    category: 'hero',
    headline: 'Stop Spending Weekends on Report Cards',
    subheadline:
      'Join 150+ Ugandan schools saving 15+ hours per week on administrative tasks',
    painPoint: 'Manual report card generation takes days',
    outcome: 'Generate professional reports in minutes',
  },
  {
    id: 'hero-alt-1',
    category: 'hero',
    headline: 'Transform Your School Management',
    subheadline: 'From chaos to clarity in one platform',
    painPoint: 'Scattered systems and manual processes',
    outcome: 'Unified, automated school operations',
  },
  {
    id: 'hero-alt-2',
    category: 'hero',
    headline: 'Reclaim Your Time, Elevate Your School',
    subheadline:
      'Automate admin tasks and focus on what matters: student success',
    painPoint: 'Drowning in paperwork and manual data entry',
    outcome: 'Streamlined operations with automated workflows',
  },
  {
    id: 'benefit-time',
    category: 'benefit',
    headline: 'Save 15+ Hours Every Week',
    outcome:
      'Automated reports, attendance, and notifications free up your time for what matters',
  },
  {
    id: 'benefit-accuracy',
    category: 'benefit',
    headline: 'Eliminate Manual Errors',
    outcome:
      'Automated calculations and validations ensure accurate records every time',
  },
  {
    id: 'benefit-engagement',
    category: 'benefit',
    headline: 'Keep Parents Engaged',
    outcome:
      'Automated updates and portal access keep parents informed and involved',
  },
  {
    id: 'benefit-insights',
    category: 'benefit',
    headline: 'Make Data-Driven Decisions',
    outcome:
      'Real-time analytics and insights help you identify trends and improve outcomes',
  },
  {
    id: 'cta-final',
    category: 'cta',
    headline: 'Ready to Transform Your School?',
    subheadline: 'Join 150+ schools already saving time and improving outcomes',
  },
  {
    id: 'cta-pricing',
    category: 'cta',
    headline: 'Choose Your Plan',
    subheadline: 'Simple, transparent pricing that grows with your school',
  },
];

/**
 * Get transformation message by ID
 */
export function getTransformationMessage(
  id: string
): TransformationMessage | undefined {
  return TRANSFORMATION_MESSAGES.find((msg) => msg.id === id);
}

/**
 * Get transformation messages by category
 */
export function getTransformationMessagesByCategory(
  category: TransformationMessage['category']
): TransformationMessage[] {
  return TRANSFORMATION_MESSAGES.filter((msg) => msg.category === category);
}

/**
 * Get default hero message
 */
export function getDefaultHeroMessage(): TransformationMessage {
  return (
    getTransformationMessage('hero-main') || {
      id: 'hero-main',
      category: 'hero',
      headline: 'Stop Spending Weekends on Report Cards',
      subheadline:
        'Join 150+ Ugandan schools saving 15+ hours per week on administrative tasks',
    }
  );
}

/**
 * Get default CTA message
 */
export function getDefaultCTAMessage(): TransformationMessage {
  return (
    getTransformationMessage('cta-final') || {
      id: 'cta-final',
      category: 'cta',
      headline: 'Ready to Transform Your School?',
      subheadline: 'Join 150+ schools already saving time and improving outcomes',
    }
  );
}
