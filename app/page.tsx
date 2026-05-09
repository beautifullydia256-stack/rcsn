'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { DefaultHeroSection } from '@/components/landing/HeroSection';
import { SocialProofBanner } from '@/components/landing/SocialProofBanner';
import { PricingSection } from '@/components/landing/PricingSection';
import { EnhancedTestimonials } from '@/components/landing/EnhancedTestimonials';
import { TrustSection } from '@/components/landing/TrustSection';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      <Script id="adsense-home" strategy="beforeInteractive" async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3223074412064973" crossOrigin="anonymous" />
      {/* Navigation */}
      <nav className="bg-white dark:bg-slate-800 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center"
            >
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="PwezaCore" width={28} height={28} className="rounded" />
                <h1 className="text-2xl font-bold text-blue-600">PwezaCore</h1>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <Link
                href="/library"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Library
              </Link>
              <Link
                href="/jobs"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Jobs
              </Link>
              <ThemeToggle />
              <Link
                href="/login"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Transformed */}
      <main>
        <DefaultHeroSection />
        
        {/* Social Proof Banner */}
        <SocialProofBanner />
        
        {/* Pricing Section - New */}
        <PricingSection />

        {/* Enhanced Testimonials - New */}
        <EnhancedTestimonials />

        {/* Trust Section - New */}
        <TrustSection />

        {/* Features Grid - Keeping existing */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg transition-colors duration-300"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Multi-Tenant Architecture</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Each school operates independently with secure data isolation and role-based access control.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg transition-colors duration-300"
          >
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Automated Processes</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Yearly student promotions, report generation, and notifications handled automatically.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg transition-colors duration-300"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Mobile Responsive</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Access your school management system from any device with our responsive design.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg transition-colors duration-300"
          >
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Analytics & Reports</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Comprehensive reporting and analytics to track student performance and school metrics.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg transition-colors duration-300"
          >
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Secure & Reliable</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Built with enterprise-grade security and reliability using Supabase and Next.js.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg transition-colors duration-300"
          >
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Fast & Modern</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Lightning-fast performance with modern UI/UX and smooth animations.
            </p>
          </motion.div>
        </motion.div>

        {/* Affiliate / Referral Program Section */}
        <section className="mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-8 sm:p-10 text-white shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-3">Join Our Affiliate Program</h2>
                <p className="text-white/90">
                  Become a PwezaCore affiliate. Get a unique promo code and earn commission whenever schools sign up using your code.
                </p>
              </div>
              <div className="flex md:justify-end">
                <Link href="/affiliate" className="inline-block">
                  <span className="bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition inline-flex items-center">Join Our Affiliate Program</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials / Social Proof Section */}
        <section className="mt-20">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">Trusted by Schools and Educators</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[{
              quote: 'PwezaCore transformed our reporting and attendance. We save hours every week.',
              name: 'Mr. Okello', role: 'Head Teacher', school: 'Sunrise Primary School', logo: '/placeholder-school-1.png'
            }, {
              quote: 'Parents love the portal and receipts. Setup was painless and support is great.',
              name: 'Ms. Nansubuga', role: 'Administrator', school: 'Greenfields High', logo: '/placeholder-school-2.png'
            }, {
              quote: 'Reliable, fast, and easy to use. Our teachers embraced it immediately.',
              name: 'Mrs. Achieng', role: 'Deputy Head', school: 'Lakeview Academy', logo: '/placeholder-school-3.png'
            }].map((t, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    {t.logo ? <Image src={t.logo} alt={t.school} width={40} height={40} /> : null}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t.role} · {t.school}</p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300">“{t.quote}”</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Pricing / Plans Overview Section */}
        <section className="mt-20">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">Simple, Transparent Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Free</h3>
              <p className="text-gray-600 dark:text-gray-300 mt-2">For small schools starting out</p>
              <ul className="mt-4 text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>Up to 20 students</li>
                <li>Reports & receipts</li>
                <li>Email support</li>
              </ul>
              <Link href="/register" className="block mt-6">
                <span className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">Sign Up</span>
              </Link>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border-2 border-blue-600">
              <span className="inline-block mb-2 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">Popular</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pro</h3>
              <p className="text-gray-600 dark:text-gray-300 mt-2">For growing schools with advanced needs</p>
              <ul className="mt-4 text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>Unlimited students</li>
                <li>Advanced analytics</li>
                <li>Priority support</li>
              </ul>
              <div className="flex gap-2 mt-6">
                <Link href="/register" className="w-1/2">
                  <span className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">Sign Up</span>
                </Link>
                <Link href="/contact" className="w-1/2">
                  <span className="block w-full text-center border border-blue-600 text-blue-600 py-2 rounded-lg hover:bg-blue-50 transition">Request Demo</span>
                </Link>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Enterprise</h3>
              <p className="text-gray-600 dark:text-gray-300 mt-2">For networks and complex requirements</p>
              <ul className="mt-4 text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>Custom onboarding</li>
                <li>SSO & integrations</li>
                <li>Dedicated success manager</li>
              </ul>
              <Link href="/contact" className="block mt-6">
                <span className="block w-full text-center border border-blue-600 text-blue-600 py-2 rounded-lg hover:bg-blue-50 transition">Request Demo</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Library / Resources Highlights */}
        <section className="mt-20">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">Latest Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[{
              title: 'Attendance Best Practices', desc: 'Simple steps to ensure accurate, WiFi-backed attendance tracking.', href: '/library'
            }, {
              title: 'Report Cards in Minutes', desc: 'Generate professional reports and receipts without bottlenecks.', href: '/library'
            }, {
              title: 'Onboarding Guide', desc: 'From signup to go-live. A guided path for admins and teachers.', href: '/library'
            }].map((r, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{r.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-2">{r.desc}</p>
                <Link href={r.href} className="inline-block mt-4 text-blue-600 hover:text-blue-500">
                  Read more →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-20">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white">Can we migrate from our current system?</h3>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Yes. We provide guidance and templates to migrate your data smoothly.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white">Do you have a mobile app?</h3>
              <p className="text-gray-600 dark:text-gray-300 mt-2">A mobile experience is supported, with native apps on our roadmap.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white">How are payments and receipts handled?</h3>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Receipts are generated in-app. Payment integrations can be configured per school.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white">Is our data secure and private?</h3>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Yes. Read our <Link className="text-blue-600" href="/security-letter">Security Statement</Link> and{' '}
                <Link className="text-blue-600" href="/privacy-policy">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Newsletter / Updates Signup */}
        <section className="mt-20">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 sm:p-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white text-center">Subscribe for Updates</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-2 text-center">
              Get new features, guides, and best practices straight to your inbox.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="mt-6 max-w-xl mx-auto flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="you@school.com"
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-gray-900 dark:text-white"
              />
              <button className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition">Subscribe</button>
            </form>
          </div>
        </section>

        {/* Call-to-Action Section */}
        <section className="mt-20">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 sm:p-10 text-white text-center shadow-lg">
            <h2 className="text-3xl font-bold">Ready to streamline your school?</h2>
            <p className="mt-2 text-white/90">Get started for free today.</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <span className="inline-block border border-white text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition">Get Started Free</span>
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* Floating Affiliate CTA (Optional) */}
      <Link href="/affiliate" className="fixed bottom-6 right-6 z-40" aria-label="Become an Affiliate">
        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="rounded-full shadow-lg bg-blue-600 text-white px-5 py-3 inline-block">
          Become an Affiliate
        </motion.span>
      </Link>

      {/* Global footer renders via FooterGate in layout */}
    </div>
  );
}
