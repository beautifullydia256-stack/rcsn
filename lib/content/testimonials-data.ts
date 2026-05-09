/**
 * Testimonials Data
 * 
 * This file contains testimonial data with quantifiable results
 * for social proof and credibility building.
 */

import type { TestimonialData } from '@/types/pricing';

/**
 * Featured testimonials with quantifiable results
 */
export const TESTIMONIALS: TestimonialData[] = [
  {
    id: 'testimonial-1',
    quote:
      'PwezaCore transformed our reporting process. What used to take 3 days now takes 2 hours. Our teachers can focus on teaching instead of paperwork.',
    quantifiableResult: 'Reduced report generation from 3 days to 2 hours',
    author: {
      name: 'Mr. Okello David',
      role: 'Head Teacher',
      school: 'Sunrise Primary School, Kampala',
    },
    metrics: {
      timeSaved: '90% reduction in admin time',
      efficiencyGain: '15 hours saved per week',
    },
    featured: true,
  },
  {
    id: 'testimonial-2',
    quote:
      "Parents love the portal and automated receipts. We've seen a 40% increase in fee payment punctuality since implementing PwezaCore.",
    quantifiableResult: '40% improvement in fee payment punctuality',
    author: {
      name: 'Ms. Nansubuga Grace',
      role: 'School Administrator',
      school: 'Greenfields High School, Entebbe',
    },
    metrics: {
      efficiencyGain: '40% faster payments',
      satisfactionScore: 4.8,
    },
    featured: true,
  },
  {
    id: 'testimonial-3',
    quote:
      'Setup was painless and support is excellent. Our teachers embraced it immediately because it actually makes their work easier.',
    quantifiableResult: '100% teacher adoption in first month',
    author: {
      name: 'Mrs. Achieng Sarah',
      role: 'Deputy Head Teacher',
      school: 'Lakeview Academy, Jinja',
    },
    metrics: {
      satisfactionScore: 5.0,
    },
    featured: true,
  },
  {
    id: 'testimonial-4',
    quote:
      'The analytics dashboard helps us identify struggling students early. We can intervene before small issues become big problems.',
    quantifiableResult: 'Early intervention for 85% of at-risk students',
    author: {
      name: 'Mr. Musoke James',
      role: 'Academic Director',
      school: 'Excellence Secondary School, Mbarara',
    },
    metrics: {
      efficiencyGain: '85% early detection rate',
    },
    featured: false,
  },
  {
    id: 'testimonial-5',
    quote:
      'Automated SMS notifications keep parents informed without constant phone calls. Parent engagement has never been higher.',
    quantifiableResult: '60% increase in parent engagement',
    author: {
      name: 'Ms. Nakato Esther',
      role: 'Parent Liaison Officer',
      school: 'Bright Future Academy, Gulu',
    },
    metrics: {
      efficiencyGain: '60% more parent engagement',
    },
    featured: false,
  },
];

/**
 * Get featured testimonials
 */
export function getFeaturedTestimonials(): TestimonialData[] {
  return TESTIMONIALS.filter((testimonial) => testimonial.featured);
}

/**
 * Get all testimonials
 */
export function getAllTestimonials(): TestimonialData[] {
  return TESTIMONIALS;
}

/**
 * Get testimonial by ID
 */
export function getTestimonialById(id: string): TestimonialData | undefined {
  return TESTIMONIALS.find((testimonial) => testimonial.id === id);
}

/**
 * Get random testimonials
 */
export function getRandomTestimonials(count: number): TestimonialData[] {
  const shuffled = [...TESTIMONIALS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
