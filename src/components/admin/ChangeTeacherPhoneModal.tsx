import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { registerApiUrl } from '../../lib/registerApiOrigin';
import NativeModal from '@/components/NativeModal';
import { Phone, CheckCircle2 } from 'lucide-react';

type Phase = 'enter-phone' | 'enter-code' | 'success';

export default function ChangeTeacherPhoneModal({
  open,
  onClose,
  teacherId,
  currentPhone,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  teacherId: string;
  currentPhone?: string | null;
  onChanged: (newPhone: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>('enter-phone');
  const [newPhone, setNewPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPhase('enter-phone');
    setNewPhone('');
    setCode('');
    setError(null);
    setLoading(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` };
  };

  const handleRequestCode = async () => {
    if (!newPhone.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(registerApiUrl('/api/admin?action=request-teacher-phone-change'), {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ teacherId, newPhone: newPhone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to send verification code');
        return;
      }
      setPhase('enter-code');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(registerApiUrl('/api/admin?action=verify-teacher-phone-change'), {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ teacherId, code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'Incorrect code');
        return;
      }
      setPhase('success');
      onChanged(data.phone as string);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const glassInputClass =
    'w-full min-h-[46px] rounded-xl border border-white/20 px-3.5 py-2.5 text-sm shadow-inner ' +
    'bg-black/25 text-white placeholder-white/40 backdrop-blur-sm ' +
    'focus:border-emerald-400 focus:bg-black/35 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 transition-all';
  const labelClass = 'mb-1.5 block text-[11px] font-bold text-white/70 uppercase tracking-wider';

  return (
    <NativeModal
      isOpen={open}
      onClose={close}
      title="Change Phone Number"
      subtitle={currentPhone ? `Current: ${currentPhone}` : undefined}
      icon={Phone}
      size="md"
    >
      <div className="space-y-4">
        {phase === 'enter-phone' && (
          <>
            <p className="text-xs text-white/70 leading-relaxed">
              Enter the teacher&apos;s new phone number. We&apos;ll text a verification code to it — the
              number is only saved once that code is confirmed.
            </p>
            <div>
              <label className={labelClass}>New phone number</label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleRequestCode(); }}
                placeholder="07XX XXX XXX"
                className={glassInputClass}
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-rose-300">{error}</p>}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-white/15">
              <button
                type="button"
                onClick={close}
                className="px-5 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/90 text-sm font-medium backdrop-blur-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRequestCode()}
                disabled={loading || !newPhone.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 border border-emerald-400/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send code'}
              </button>
            </div>
          </>
        )}

        {phase === 'enter-code' && (
          <>
            <p className="text-xs text-white/70 leading-relaxed">
              Enter the 6-digit code sent to <strong className="text-white">{newPhone.trim()}</strong>.
            </p>
            <div>
              <label className={labelClass}>Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleVerifyCode(); }}
                placeholder="123456"
                className={`${glassInputClass} tracking-widest text-center text-lg`}
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-rose-300">{error}</p>}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-white/15">
              <button
                type="button"
                onClick={() => setPhase('enter-phone')}
                className="px-5 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/90 text-sm font-medium backdrop-blur-sm transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleVerifyCode()}
                disabled={loading || !code.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 border border-emerald-400/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & save'}
              </button>
            </div>
          </>
        )}

        {phase === 'success' && (
          <>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/30">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-white text-sm">Done</p>
                <p className="text-xs text-white/70">Phone number verified and updated successfully.</p>
              </div>
            </div>
            <div className="pt-3">
              <button
                type="button"
                onClick={close}
                className="w-full px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 border border-emerald-400/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </NativeModal>
  );
}
