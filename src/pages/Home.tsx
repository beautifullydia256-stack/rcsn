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
            Uganda's #1 cloud-based school management system for primary and secondary schools—digitize records, automate report cards, track fees, and communicate with parents in one secure platform. From admissions to graduation, PwezaCore keeps everything connected.
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

        {/* Core Features Section - iOS Inspired Design */}
        <section className="mt-24">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            >
              Core Features
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
            >
              Education ERP Software for Schools — PwezaCore simplifies administration, improves communication, and manages academics, admissions, and finances efficiently with a unified ERP platform designed for schools.
            </motion.p>
          </div>

          {/* Hero Feature Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 sm:p-12 text-white shadow-2xl"
          >
            <div className="max-w-3xl">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">One system that runs your entire school</h3>
              <p className="text-lg text-white/90">
                PwezaCore is a complete school management system designed specifically for nursery, primary, and secondary schools in Uganda.
              </p>
            </div>
          </motion.div>

          {/* Features Grid - iOS 16 Style Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                emoji: '💰',
                title: 'Never Lose a Single Shilling Again',
                desc: 'Every payment is recorded, numbered, and receipted automatically. Unpaid balances carry forward on their own. Get a live list of every student who owes money — in seconds. No more guessing, no more disputes.',
                gradient: 'from-emerald-500 to-teal-500'
              },
              {
                emoji: '📄',
                title: 'Professional Report Cards in Minutes',
                desc: 'Generate beautiful, branded report cards for every student in one click. Grades, positions, teacher remarks, attendance, and outstanding fees — all automatically calculated. What took two weeks now takes 10 minutes.',
                gradient: 'from-blue-500 to-cyan-500'
              },
              {
                emoji: '💬',
                title: 'Parents Always Informed',
                desc: 'Send fee reminders, exam results, and school announcements directly to parents via SMS or WhatsApp. Parents stay informed. Payments improve. Trust in your school grows.',
                gradient: 'from-purple-500 to-pink-500'
              },
              {
                emoji: '📍',
                title: 'GPS & WiFi Teacher Attendance',
                desc: 'Teachers can only mark attendance when physically on school premises — verified by WiFi and GPS. See exactly who arrived, at what time, and who didn't show. Ghost teachers become impossible.',
                gradient: 'from-orange-500 to-red-500'
              },
              {
                emoji: '🤖',
                title: 'AI Tools That Save Teachers Hours',
                desc: 'Teachers generate complete exam papers and structured lesson plans using AI — in seconds. Better teaching quality, less stress, more time for students.',
                gradient: 'from-violet-500 to-purple-500'
              },
              {
                emoji: '📱',
                title: 'Works Even Without Internet',
                desc: 'The PwezaCore mobile app works fully offline. Teachers enter grades and record attendance even with no data. Everything syncs automatically when the connection returns.',
                gradient: 'from-indigo-500 to-blue-500'
              },
              {
                emoji: '🎓',
                title: 'PLE, UCE & UACE Grading Built In',
                desc: 'Uganda\'s official PLE, O-Level (UCE), and A-Level (UACE) grading scales are fully built in — correct aggregates, correct divisions. No other system understands Uganda\'s schools like this.',
                gradient: 'from-blue-600 to-indigo-600'
              },
              {
                emoji: '🏫',
                title: 'Multi-School Management',
                desc: 'Manage multiple school campuses from one secure login. Each school operates independently with secure data isolation and role-based access control for every staff member.',
                gradient: 'from-teal-500 to-emerald-500'
              },
              {
                emoji: '🪪',
                title: 'Student ID Card Generation',
                desc: 'Automatically generate professional, branded student ID cards — no more outsourcing. Saves real money every term and gives your school a more official, organized appearance.',
                gradient: 'from-pink-500 to-rose-500'
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-slate-700"
              >
                {/* Gradient accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} rounded-t-2xl`} />
                
                {/* Emoji icon with gradient background */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-2xl">{feature.emoji}</span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                  {feature.desc}
                </p>

                {/* Subtle hover effect overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none" />
              </motion.div>
            ))}
          </div>
        </section>

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
