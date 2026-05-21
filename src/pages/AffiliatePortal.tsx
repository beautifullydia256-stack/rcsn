import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

type ReferralCode = {
  id: string;
  code: string;
  type: string;
  is_active: boolean;
  use_count: number;
};

type AffiliateData = {
  affiliate_id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  payment_info?: string;
  created_at: string;
  referral_codes: ReferralCode[];
  schools_referred: number;
  total_earned_ugx: number;
  earnings: {
    id: string;
    amount_cents: number;
    currency: string;
    status: string;
    created_at: string;
  }[];
};

export default function AffiliatePortal() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AffiliateData | null>(null);
  const [copied, setCopied] = useState('');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/affiliates/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Not found. Check your email and try again.');
        setData(null);
        return;
      }
      setData(json as AffiliateData);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  const fmtCurrency = (cents: number, currency = 'UGX') => {
    return `${currency} ${(cents).toLocaleString()}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-slate-900 dark:to-slate-950 text-gray-800 dark:text-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Affiliate Portal</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Enter your email to view your referral code, schools referred, and earnings.</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Not an affiliate yet?{' '}
            <Link to="/affiliate#signup" className="text-blue-600 hover:underline">Apply to join</Link>
          </p>
        </div>

        {!data ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white dark:bg-slate-800 shadow p-6 border border-slate-100 dark:border-slate-700"
          >
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Looking up...' : 'View My Dashboard'}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Profile card */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 shadow p-6 border border-slate-100 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{data.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{data.email}</p>
                  {data.phone && <p className="text-sm text-gray-500 dark:text-gray-400">{data.phone}</p>}
                </div>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${data.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {data.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Member since {new Date(data.created_at).toLocaleDateString()}</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 p-5 text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{data.schools_referred}</div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Schools Referred</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-5 text-center">
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {fmtCurrency(data.total_earned_ugx)}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Total Earned</div>
              </div>
            </div>

            {/* Referral codes */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 shadow p-6 border border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Your Referral Code{data.referral_codes.length !== 1 ? 's' : ''}</h3>
              {data.referral_codes.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No referral code assigned yet. Our team will assign one and notify you.</p>
              ) : (
                <div className="space-y-3">
                  {data.referral_codes.map((rc) => (
                    <div key={rc.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">{rc.code}</span>
                        <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">{rc.use_count} use{rc.use_count !== 1 ? 's' : ''}</span>
                        {!rc.is_active && <span className="ml-2 text-xs text-red-500">Inactive</span>}
                      </div>
                      <button
                        onClick={() => copyCode(rc.code)}
                        className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        {copied === rc.code ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Earnings history */}
            {data.earnings.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow p-6 border border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Earnings History</h3>
                <div className="space-y-2">
                  {data.earnings.map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{fmtCurrency(e.amount_cents, e.currency)}</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${e.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                          {e.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(e.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.payment_info && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 p-4 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium text-gray-700 dark:text-gray-200">Payout to:</span> {data.payment_info}
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => { setData(null); setEmail(''); }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                Look up a different email
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
