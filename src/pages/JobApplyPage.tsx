import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function JobApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [title, setTitle] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cover, setCover] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    void (async () => {
      const { data } = await supabase.from('jobs').select('title').eq('job_id', jobId).maybeSingle();
      if (data && typeof (data as { title?: string }).title === 'string') {
        setTitle((data as { title: string }).title);
      }
    })();
  }, [jobId]);

  if (!jobId) {
    return (
      <div className="min-h-screen p-6 text-slate-100">
        <p>Missing job.</p>
        <Link to="/jobs" className="text-sky-400">
          Back to jobs
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setMessage('Name and email are required');
      return;
    }
    setStatus('sending');
    setMessage(null);
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/apply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          cover_letter: cover.trim() || undefined,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(j.error || 'Could not send application');
        setStatus('err');
        return;
      }
      setStatus('ok');
      setMessage('Application received. The school will contact you if there is a match.');
    } catch {
      setMessage('Network error. Try again later.');
      setStatus('err');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-lg">
        <Link to="/jobs" className="text-sm text-sky-400 hover:underline">
          ← All jobs
        </Link>
        <motion.h1
          className="mt-4 text-2xl font-semibold"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Apply {title ? `— ${title}` : ''}
        </motion.h1>
        {status === 'ok' ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {message}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <div>
              <label className="text-xs text-slate-500">Full name *</label>
              <input
                className="mt-0.5 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Email *</label>
              <input
                type="email"
                className="mt-0.5 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Phone</label>
              <input
                className="mt-0.5 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Cover message</label>
              <textarea
                className="mt-0.5 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm"
                rows={4}
                value={cover}
                onChange={(e) => setCover(e.target.value)}
              />
            </div>
            {message && status === 'err' && (
              <p className="text-sm text-red-300" role="alert">
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {status === 'sending' ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
