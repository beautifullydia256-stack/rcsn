/**
 * Pricing Analytics
 * 
 * This file contains analytics tracking functions for pricing interactions.
 * Tracks calculator usage, tier interactions, and conversion events.
 * 
 * IMPORTANT: No PII (Personally Identifiable Information) should be tracked.
 * Do not track emails, school names, or any personal data.
 */

import type {
  PricingEventName,
  CalculatorInteraction,
  TierInteraction,
} from '@/types/pricing';

/**
 * Track a pricing-related event
 * 
 * @param eventName - Name of the event
 * @param properties - Event properties (no PII)
 */
export function trackPricingEvent(
  eventName: PricingEventName,
  properties: Record<string, any>
): void {
  // Ensure we're in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  // Add timestamp
  const eventData = {
    ...properties,
    timestamp: new Date().toISOString(),
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', eventName, eventData);
  }

  // Send to analytics provider (Google Analytics, Mixpanel, etc.)
  // Example: Google Analytics 4
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventData);
  }

  // Example: Custom analytics endpoint
  // fetch('/api/analytics/track', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ eventName, properties: eventData }),
  // }).catch(err => {
  //   // Fail silently - don't block user experience
  //   console.error('Analytics error:', err);
  // });
}

/**
 * Track calculator usage
 * 
 * @param interaction - Calculator interaction data
 */
export function trackCalculatorUsage(interaction: CalculatorInteraction): void {
  trackPricingEvent('calculator_used', {
    student_count: interaction.studentCount,
    starter_price: interaction.calculatedPrices.starter,
    professional_price: interaction.calculatedPrices.professional,
    premium_price: interaction.calculatedPrices.premium,
    time_spent_seconds: interaction.timeSpent,
  });
}

/**
 * Track tier interaction
 * 
 * @param interaction - Tier interaction data
 */
export function trackTierInteraction(interaction: TierInteraction): void {
  const eventName =
    interaction.action === 'cta_click' ? 'tier_cta_clicked' : 'tier_card_clicked';

  trackPricingEvent(eventName, {
    tier_id: interaction.tierId,
    action: interaction.action,
    student_count: interaction.studentCount,
    calculated_price: interaction.calculatedPrice,
  });
}

/**
 * Track pricing section view
 */
export function trackPricingSectionViewed(): void {
  trackPricingEvent('pricing_section_viewed', {
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    page_url: typeof window !== 'undefined' ? window.location.href : '',
  });
}

/**
 * Track student count change
 * 
 * @param studentCount - New student count
 */
export function trackStudentCountChanged(studentCount: number): void {
  trackPricingEvent('student_count_changed', {
    student_count: studentCount,
  });
}

/**
 * Track tier comparison opened
 */
export function trackTierComparisonOpened(): void {
  trackPricingEvent('tier_comparison_opened', {});
}

/**
 * Track pricing page scroll depth
 * 
 * @param depth - Scroll depth percentage (0-100)
 */
export function trackPricingPageScrolled(depth: number): void {
  trackPricingEvent('pricing_page_scrolled', {
    scroll_depth_percent: depth,
  });
}

/**
 * Track tier hover
 * 
 * @param tierId - ID of the tier being hovered
 */
export function trackTierHovered(tierId: string): void {
  trackPricingEvent('tier_hovered', {
    tier_id: tierId,
  });
}

/**
 * Initialize analytics tracking
 * Call this on page load
 */
export function initPricingAnalytics(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Track initial page view
  trackPricingSectionViewed();

  // Set up scroll depth tracking
  let maxScrollDepth = 0;
  const scrollHandler = () => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    const scrollDepth = Math.round(
      ((scrollTop + windowHeight) / documentHeight) * 100
    );

    if (scrollDepth > maxScrollDepth) {
      maxScrollDepth = scrollDepth;

      // Track at 25%, 50%, 75%, 100%
      if (
        scrollDepth >= 25 &&
        scrollDepth < 50 &&
        maxScrollDepth < 50
      ) {
        trackPricingPageScrolled(25);
      } else if (
        scrollDepth >= 50 &&
        scrollDepth < 75 &&
        maxScrollDepth < 75
      ) {
        trackPricingPageScrolled(50);
      } else if (
        scrollDepth >= 75 &&
        scrollDepth < 100 &&
        maxScrollDepth < 100
      ) {
        trackPricingPageScrolled(75);
      } else if (scrollDepth >= 100) {
        trackPricingPageScrolled(100);
      }
    }
  };

  window.addEventListener('scroll', scrollHandler, { passive: true });

  // Clean up on unmount
  return () => {
    window.removeEventListener('scroll', scrollHandler);
  };
}
