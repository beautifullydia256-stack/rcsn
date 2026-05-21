import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { publicAssetUrl } from '@/lib/publicAssetUrl';

export default function AffiliatePage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', payment_info: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/affiliates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(typeof json.error === 'string' ? json.error : 'Submission failed. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-slate-900 dark:to-slate-950 text-gray-800 dark:text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white">
              Become a PwezaCore Affiliate!
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Earn commission by helping schools discover the easiest way to manage students, teachers, and administration.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/affiliate#signup" className="inline-block">
                <span className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">Join Now</span>
              </Link>
              <Link to="/affiliate#how" className="inline-block">
                <span className="inline-block border border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 dark:hover:bg-slate-800 transition">Learn More</span>
              </Link>
            </motion.div>
          </div>
          <div className="relative">
            <div className="aspect-video rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
              <img src={publicAssetUrl('opengraph-image.png')} alt="PwezaCore Affiliate" className="w-full h-full object-cover" />
            </div>
          </div>
        </section>

        <section id="how">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { t: 'Sign Up', d: 'Register and receive your unique referral link or promo code.', c: 'bg-blue-600' },
              { t: 'Share', d: 'Promote PwezaCore to schools, teachers, or your audience.', c: 'bg-indigo-600' },
              { t: 'Schools Join', d: 'Schools sign up using your code or link.', c: 'bg-violet-600' },
              { t: 'Earn', d: 'Get commission on every subscription. Paid monthly.', c: 'bg-emerald-600' },
            ].map((s, i) => (
              <motion.div key={s.t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="rounded-xl bg-white dark:bg-slate-800 shadow p-6 border border-slate-100 dark:border-slate-700">
                <div className={`w-10 h-10 ${s.c} rounded-lg mb-4`} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{s.t}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">Commission & Incentives</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="rounded-2xl bg-white dark:bg-slate-800 shadow p-6 border border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">How You Earn</h3>
              <ul className="mt-3 text-sm text-gray-600 dark:text-gray-300 list-disc pl-5 space-y-1">
                <li>Earn 20% of subscription fees for the first 12 months per school.</li>
                <li>Payouts processed monthly via your chosen payment method.</li>
                <li>Bonuses for performance milestones (e.g., 10+ active schools).</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-800 shadow p-6 border border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Commission Structure (Example)</h3>
              <div className="mt-4 grid grid-cols-3 text-sm text-gray-700 dark:text-gray-200">
                <div className="font-medium">Plan</div>
                <div className="font-medium">Your Cut</div>
                <div className="font-medium">Payout</div>
                <div>Free</div><div>—</div><div>—</div>
                <div>Pro</div><div>20% monthly</div><div>Monthly</div>
                <div>Enterprise</div><div>Custom</div><div>Monthly</div>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Note: These are sample figures; finalize your real terms.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">Why Join the Program?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { t: 'Passive Income', d: 'Earn recurring commission from schools you refer.' },
              { t: 'Affiliate Dashboard', d: 'Track referrals, clicks, and earnings in one place.' },
              { t: 'Marketing Materials', d: 'Access banners, email templates, and copy.' },
              { t: 'Transparent Terms', d: 'Clear rules, prompt support, monthly payouts.' },
            ].map((b, i) => (
              <motion.div key={b.t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="rounded-xl bg-white dark:bg-slate-800 shadow p-6 border border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">{b.t}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{b.d}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="signup" className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sign Up — It's free to join!</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Fill in your details and we'll contact you with your referral code and onboarding materials.</p>
          </div>
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl bg-white dark:bg-slate-800 shadow p-8 border border-slate-100 dark:border-slate-700 text-center">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Application received!</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">We've received your application. Our team will review it and contact you at <strong>{form.email}</strong> with your referral code and next steps.</p>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Once approved, use your referral code at <Link to="/affiliate-portal" className="text-blue-600 hover:underline">affiliate-portal</Link> to track your referrals and earnings.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleJoin} className="rounded-2xl bg-white dark:bg-slate-800 shadow p-6 border border-slate-100 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                    required
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                    required
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Phone (optional)</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                    placeholder="+256 700 000 000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Payment Info (optional)</label>
                  <input
                    value={form.payment_info}
                    onChange={(e) => setForm((f) => ({ ...f, payment_info: e.target.value }))}
                    placeholder="Mobile money / Bank details"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              {submitError && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">{submitError}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Join Now / Get Your Referral Code'}
              </button>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">We'll never share your details.</p>
            </form>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { q: 'How do I get paid?', a: 'Payouts are issued monthly via your saved payment method once you reach the threshold.' },
              { q: 'How do I track referrals?', a: 'Use your dashboard to see clicks, sign-ups, and commissions tied to your code.' },
              { q: 'Can I share my code online?', a: 'Yes, share on social media, email, blogs, or with schools directly.' },
              { q: 'Is there a cost to join?', a: 'No. It\'s free to join the affiliate program.' },
            ].map((f) => (
              <div key={f.q} className="rounded-xl bg-white dark:bg-slate-800 shadow p-6 border border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">{f.q}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{f.a}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">Read the <Link to="/affiliate-terms" className="text-blue-600">Affiliate Terms & Conditions</Link>.</p>
        </section>

        <section className="text-center">
          <Link to="/affiliate#signup" className="inline-block">
            <span className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">Join the Affiliate Program</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
