/**
 * Pricing Configuration
 * 
 * This file contains the complete pricing tier configuration for PwezaCore,
 * implementing pricing psychology principles with a 4-tier structure.
 * 
 * Pricing Strategy:
 * - Starter (500 UGX/student): Entry point
 * - Professional (1,000 UGX/student): TARGET TIER - "Best Value"
 * - Premium (2,500 UGX/student): ANCHOR PRICE - creates perceived value
 * - Enterprise (Custom): For large institutions
 */

import type {
  PricingConfig,
  PricingTierConfig,
  TierId,
} from '@/types/pricing';

/**
 * Default pricing configuration
 * 
 * The Premium tier serves as a decoy/anchor to make Professional appear as
 * exceptional value. The 2.5x price difference creates strong anchoring effect.
 */
export const PRICING_CONFIG: PricingConfig = {
  currency: 'UGX',
  billingPeriod: 'term',
  tiers: [
    {
      id: 'starter',
      name: 'Starter',
      displayName: 'Starter',
      pricePerStudent: 500,
      transformationBenefits: [
        'Get started with essential school management',
        'Eliminate manual report card creation',
        'Keep parents informed automatically',
      ],
      featureBundles: [
        {
          id: 'starter-core',
          name: 'Core Management',
          features: [
            'Up to 100 students',
            'Student records & attendance',
            'Basic report cards',
            'Parent portal access',
            'Email support',
          ],
        },
      ],
      cta: {
        text: 'Start Free Trial',
        href: '/register?tier=starter',
        variant: 'outline',
      },
      emphasis: 'low',
      order: 1,
      isRecommended: false,
      isAnchor: false,
    },
    {
      id: 'professional',
      name: 'Professional',
      displayName: 'Professional',
      pricePerStudent: 1000,
      badge: {
        text: 'Best Value',
        variant: 'primary',
      },
      transformationBenefits: [
        'Save 15+ hours per week on admin tasks',
        'Generate professional reports in minutes',
        'Engage parents with automated updates',
        'Make data-driven decisions with analytics',
      ],
      featureBundles: [
        {
          id: 'pro-unlimited',
          name: 'Unlimited Growth',
          features: [
            'Unlimited students',
            'Unlimited teachers & staff',
            'Unlimited classes & subjects',
          ],
        },
        {
          id: 'pro-analytics',
          name: 'Complete Analytics Suite',
          features: [
            'Advanced performance analytics',
            'Custom report builder',
            'Trend analysis & insights',
            'Export to Excel/PDF',
          ],
        },
        {
          id: 'pro-automation',
          name: 'Time-Saving Automation',
          features: [
            'Automated report generation',
            'Bulk SMS & email notifications',
            'Automated student promotions',
            'Receipt generation',
          ],
        },
        {
          id: 'pro-support',
          name: 'Priority Support',
          features: [
            'Priority email support',
            'Phone support',
            'Dedicated onboarding',
            'Training resources',
          ],
        },
      ],
      cta: {
        text: 'Start Saving Time',
        href: '/register?tier=professional',
        variant: 'primary',
      },
      emphasis: 'high',
      order: 2,
      isRecommended: true,
      isAnchor: false,
    },
    {
      id: 'premium',
      name: 'Premium',
      displayName: 'Premium',
      pricePerStudent: 2500,
      badge: {
        text: 'Complete Solution',
        variant: 'premium',
      },
      transformationBenefits: [
        'Transform your school into a data-driven institution',
        'Provide parents with real-time insights',
        'Streamline every aspect of school operations',
        'Access AI-powered insights and recommendations',
      ],
      featureBundles: [
        {
          id: 'premium-everything',
          name: 'Everything in Professional, plus:',
          features: [],
        },
        {
          id: 'premium-advanced',
          name: 'Advanced Features',
          features: [
            'AI-powered exam generation',
            'AI lesson plan assistant',
            'Predictive analytics',
            'Custom integrations API',
          ],
        },
        {
          id: 'premium-finance',
          name: 'Complete Finance Suite',
          features: [
            'Advanced fee management',
            'Payment gateway integration',
            'Financial reporting & forecasting',
            'Budget planning tools',
          ],
        },
        {
          id: 'premium-library',
          name: 'Digital Library System',
          features: [
            'Library management',
            'Book tracking & cataloging',
            'Digital resources',
            'Reading analytics',
          ],
        },
        {
          id: 'premium-support',
          name: 'Premium Support Package',
          features: [
            '24/7 priority support',
            'Dedicated account manager',
            'Custom training sessions',
            'Quarterly strategy reviews',
          ],
        },
      ],
      cta: {
        text: 'Get Complete Solution',
        href: '/register?tier=premium',
        variant: 'primary',
      },
      emphasis: 'medium',
      order: 3,
      isRecommended: false,
      isAnchor: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      displayName: 'Enterprise',
      pricePerStudent: null,
      badge: {
        text: 'Custom Solution',
        variant: 'premium',
      },
      transformationBenefits: [
        'Custom solution for school networks and large institutions',
        'Dedicated infrastructure and support',
        'Tailored workflows and integrations',
        'Strategic partnership with PwezaCore team',
      ],
      featureBundles: [
        {
          id: 'enterprise-everything',
          name: 'Everything in Premium, plus:',
          features: [],
        },
        {
          id: 'enterprise-custom',
          name: 'Enterprise Features',
          features: [
            'Multi-school management',
            'Custom feature development',
            'SSO & advanced security',
            'Dedicated infrastructure',
            'SLA guarantees',
            'On-premise deployment option',
          ],
        },
        {
          id: 'enterprise-support',
          name: 'Enterprise Support',
          features: [
            'Dedicated success team',
            'Custom onboarding program',
            'Ongoing strategic consulting',
            'Priority feature requests',
          ],
        },
      ],
      cta: {
        text: 'Contact Sales',
        href: '/contact?tier=enterprise',
        variant: 'outline',
      },
      emphasis: 'medium',
      order: 4,
      isRecommended: false,
      isAnchor: false,
    },
  ],
};

/**
 * Get pricing tier by ID
 */
export function getPricingTier(tierId: TierId): PricingTierConfig | undefined {
  return PRICING_CONFIG.tiers.find((tier) => tier.id === tierId);
}

/**
 * Get recommended tier
 */
export function getRecommendedTier(): PricingTierConfig | undefined {
  return PRICING_CONFIG.tiers.find((tier) => tier.isRecommended);
}

/**
 * Get anchor tier
 */
export function getAnchorTier(): PricingTierConfig | undefined {
  return PRICING_CONFIG.tiers.find((tier) => tier.isAnchor);
}

/**
 * Get all tiers sorted by order
 */
export function getAllTiers(): PricingTierConfig[] {
  return [...PRICING_CONFIG.tiers].sort((a, b) => a.order - b.order);
}
