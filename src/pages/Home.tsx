import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  useEffect(() => {
    if (document.getElementById('adsense-home')) return;
    const s = document.createElement('script');
    s.id = 'adsense-home';
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3223074412064973';
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      {/* Navigation */}
      <nav className="bg-white dark:bg-slate-800 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center"
            >
              <Link to="/" className="flex items-center gap-2">
                <img src="/logo.png" alt="PwezaCore" width={28} height={28} className="rounded" />
                <h1 className="text-2xl font-bold text-blue-600">PwezaCore</h1>
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <Link
                to="/library"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Library
              </Link>
              <Link
                to="/jobs"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Jobs
              </Link>
              <ThemeToggle />
              <Link
                to="/login"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6"
          >
            The Smarter Way to
            <span className="text-blue-600 block">Run Your School</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto"
          >
            PwezaCore is a modern, multi-tenant SaaS platform designed to streamline school management
            for administrators, teachers, parents, and students.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/register">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Get Started Free
              </motion.span>
            </Link>
            <Link to="/library">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block border border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                Explore Library
              </motion.span>
            </Link>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {[
            { icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z', bg: 'bg-blue-100', color: 'text-blue-600', title: 'Multi-Tenant Architecture', desc: 'Each school operates independently with secure data isolation and role-based access control.' },
            { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-green-100', color: 'text-green-600', title: 'Automated Processes', desc: 'Yearly student promotions, report generation, and notifications handled automatically.' },
            { icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z', bg: 'bg-purple-100', color: 'text-purple-600', title: 'Mobile Responsive', desc: 'Access your school management system from any device with our responsive design.' },
            { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', bg: 'bg-yellow-100', color: 'text-yellow-600', title: 'Analytics & Reports', desc: 'Comprehensive reporting and analytics to track student performance and school metrics.' },
            { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', bg: 'bg-red-100', color: 'text-red-600', title: 'Secure & Reliable', desc: 'Built with enterprise-grade security and reliability using Supabase and Next.js.' },
            { icon: 'M13 10V3L4 14h7v7l9-11h-7z', bg: 'bg-indigo-100', color: 'text-indigo-600', title: 'Fast & Modern', desc: 'Lightning-fast performance with modern UI/UX and smooth animations.' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg transition-colors duration-300"
            >
              <div className={`w-12 h-12 ${f.bg} rounded-lg flex items-center justify-center mb-4`}>
                <svg className={`w-6 h-6 ${f.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Affiliate / Referral Program Section */}
        <section className="mt-20">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-8 sm:p-10 text-white shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-3">Join Our Affiliate Program</h2>
                <p className="text-white/90">
                  Become a PwezaCore affiliate. Get a unique promo code and earn commission whenever schools sign up using your code.
                </p>
              </div>
              <div className="flex md:justify-end">
                <Link to="/affiliate" className="inline-block">
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
            {[
              { quote: 'PwezaCore transformed our reporting and attendance. We save hours every week.', name: 'Mr. Okello', role: 'Head Teacher', school: 'Sunrise Primary School' },
              { quote: 'Parents love the portal and receipts. Setup was painless and support is great.', name: 'Ms. Nansubuga', role: 'Administrator', school: 'Greenfields High' },
              { quote: 'Reliable, fast, and easy to use. Our teachers embraced it immediately.', name: 'Mrs. Achieng', role: 'Deputy Head', school: 'Lakeview Academy' },
            ].map((t, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t.role} · {t.school}</p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300">"{t.quote}"</p>
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
              <Link to="/register" className="block mt-6">
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
                <Link to="/register" className="w-1/2">
                  <span className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">Sign Up</span>
                </Link>
                <Link to="/contact" className="w-1/2">
                  <span className="block w-full text-center border border-blue-600 text-blue-600 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">Request Demo</span>
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
              <Link to="/contact" className="block mt-6">
                <span className="block w-full text-center border border-blue-600 text-blue-600 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">Request Demo</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Library / Resources Highlights */}
        <section className="mt-20">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">Latest Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Attendance Best Practices', desc: 'Simple steps to ensure accurate, WiFi-backed attendance tracking.', href: '/library' },
              { title: 'Report Cards in Minutes', desc: 'Generate professional reports and receipts without bottlenecks.', href: '/library' },
              { title: 'Onboarding Guide', desc: 'From signup to go-live. A guided path for admins and teachers.', href: '/library' },
            ].map((r, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{r.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-2">{r.desc}</p>
                <Link to={r.href} className="inline-block mt-4 text-blue-600 hover:text-blue-500">
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
                Yes. Read our <Link to="/security-letter" className="text-blue-600">Security Statement</Link> and{' '}
                <Link to="/privacy-policy" className="text-blue-600">Privacy Policy</Link>.
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
              <button type="submit" className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition">Subscribe</button>
            </form>
          </div>
        </section>

        {/* Call-to-Action Section */}
        <section className="mt-20">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 sm:p-10 text-white text-center shadow-lg">
            <h2 className="text-3xl font-bold">Ready to streamline your school?</h2>
            <p className="mt-2 text-white/90">Get started for free today.</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <span className="inline-block border border-white text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition">Get Started Free</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Security & Compliance Badges */}
        <section className="mt-20">
          <div className="flex flex-wrap items-center justify-center gap-6 opacity-80">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">SSL</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">GDPR-ready</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">RLS / RBAC</span>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Affiliate CTA */}
      <Link to="/affiliate" className="fixed bottom-6 right-6 z-40" aria-label="Become an Affiliate">
        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="rounded-full shadow-lg bg-blue-600 text-white px-5 py-3 inline-block">
          Become an Affiliate
        </motion.span>
      </Link>
    </div>
  );
}
