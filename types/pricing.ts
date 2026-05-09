/**
 * Type definitions for Pricing Psychology Transformation
 * 
 * This file contains all TypeScript interfaces and types for the pricing system,
 * including tier configurations, calculator state, analytics events, and UI components.
 */

// ============================================================================
// Core Pricing Types
// ============================================================================

/**
 * Tier identifier for pricing tiers
 */
export type TierId = 'starter' | 'professional' | 'premium' | 'enterprise';

/**
 * Badge variant for tier badges
 */
export type BadgeVariant = 'success' | 'primary' | 'premium';

/**
 * CTA button variant
 */
export type CTAVariant = 'primary' | 'secondary' | 'outline';

/**
 * Tier emphasis level for visual hierarchy
 */
export type TierEmphasis = 'low' | 'medium' | 'high';

// ============================================================================
// Pricing Configuration
// ============================================================================

/**
 * Complete pricing configuration
 */
export interface PricingConfig {
  tiers: PricingTierConfig[];
  currency: string;
  billingPeriod: string;
  promotions?: PromotionConfig[];
}

/**
 * Individual pricing tier configuration
 */
export interface PricingTierConfig {
  id: TierId;
  name: string;
  displayName: string;
  pricePerStudent: number | null; // null for Enterprise
  badge?: BadgeConfig;
  transformationBenefits: string[];
  featureBundles: FeatureBundle[];
  cta: CTAConfig;
  emphasis: TierEmphasis;
  order: number;
  isRecommended: boolean;
  isAnchor: boolean;
}

/**
 * Badge configuration for tier cards
 */
export interface BadgeConfig {
  text: string;
  variant: BadgeVariant;
}

/**
 * Feature bundle grouping related features
 */
export interface FeatureBundle {
  id: string;
  name: string;
  description?: string;
  features: string[];
  icon?: string;
}

/**
 * Call-to-action button configuration
 */
export interface CTAConfig {
  text: string;
  href: string;
  variant: CTAVariant;
}

/**
 * Promotional pricing configuration
 */
export interface PromotionConfig {
  id: string;
  name: string;
  discountPercentage?: number;
  discountAmount?: number;
  startDate: Date;
  endDate: Date;
  applicableTiers: TierId[];
  urgencyMessage?: string;
}

// ============================================================================
// Component Props
// ============================================================================

/**
 * Props for PricingCalculator component
 */
export interface PricingCalculatorProps {
  defaultStudentCount?: number;
  onStudentCountChange?: (count: number) => void;
  className?: string;
}

/**
 * Props for PricingTierCard component
 */
export interface PricingTierCardProps {
  tier: PricingTierConfig;
  calculatedTotal: number;
  studentCount: number;
  isRecommended?: boolean;
  isAnchor?: boolean;
  className?: string;
}

/**
 * Props for PricingSection component
 */
export interface PricingSectionProps {
  className?: string;
}

/**
 * Props for HeroSection component
 */
export interface HeroSectionProps {
  headline: string;
  subheadline: string;
  primaryCTA: CTAButton;
  secondaryCTA?: CTAButton;
  backgroundVariant?: 'gradient' | 'image' | 'video';
}

/**
 * CTA button configuration for hero section
 */
export interface CTAButton {
  text: string;
  href: string;
  variant: 'primary' | 'secondary';
  icon?: React.ReactNode;
}

/**
 * Props for SocialProofBanner component
 */
export interface SocialProofBannerProps {
  stats: UsageStatistic[];
  variant?: 'banner' | 'inline';
}

/**
 * Usage statistic for social proof
 */
export interface UsageStatistic {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

/**
 * Props for EnhancedTestimonials component
 */
export interface EnhancedTestimonialsProps {
  testimonials: TestimonialData[];
  layout?: 'grid' | 'carousel';
}

/**
 * Testimonial data with quantifiable results
 */
export interface TestimonialData {
  id: string;
  quote: string;
  quantifiableResult: string;
  author: {
    name: string;
    role: string;
    school: string;
    photo?: string;
    schoolLogo?: string;
  };
  metrics?: {
    timeSaved?: string;
    efficiencyGain?: string;
    costReduction?: string;
    satisfactionScore?: number;
  };
  featured: boolean;
}

/**
 * Props for TrustSection component
 */
export interface TrustSectionProps {
  securityFeatures: SecurityFeature[];
  complianceStatements: string[];
  uptimeStats?: UptimeStats;
}

/**
 * Security feature for trust section
 */
export interface SecurityFeature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

/**
 * Uptime statistics
 */
export interface UptimeStats {
  percentage: number;
  lastIncident?: string;
}

// ============================================================================
// Calculator State
// ============================================================================

/**
 * Calculated prices for all tiers
 */
export interface TierPrices {
  starter?: number;
  professional?: number;
  premium?: number;
  enterprise?: null;
}

/**
 * Calculator validation result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// ============================================================================
// Content Types
// ============================================================================

/**
 * Transformation message for marketing content
 */
export interface TransformationMessage {
  id: string;
  category: 'hero' | 'benefit' | 'testimonial' | 'cta';
  headline: string;
  subheadline?: string;
  painPoint?: string;
  outcome?: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Pricing analytics event
 */
export interface PricingAnalyticsEvent {
  eventName: string;
  category: 'pricing' | 'calculator' | 'cta' | 'tier_selection';
  properties: Record<string, any>;
  timestamp: Date;
}

/**
 * Pricing event names
 */
export type PricingEventName =
  | 'pricing_section_viewed'
  | 'calculator_used'
  | 'student_count_changed'
  | 'tier_card_clicked'
  | 'tier_cta_clicked'
  | 'tier_comparison_opened'
  | 'pricing_page_scrolled'
  | 'tier_hovered';

/**
 * Calculator interaction for analytics
 */
export interface CalculatorInteraction {
  studentCount: number;
  calculatedPrices: {
    starter: number;
    professional: number;
    premium: number;
  };
  timeSpent: number;
}

/**
 * Tier interaction for analytics
 */
export interface TierInteraction {
  tierId: TierId;
  action: 'view' | 'hover' | 'click' | 'cta_click';
  studentCount?: number;
  calculatedPrice?: number;
}
