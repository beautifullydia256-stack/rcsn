import { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { registerApiUrl } from '../../lib/registerApiOrigin';

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

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Change Phone Number</h2>
            {currentPhone && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Current: <span className="font-medium text-gray-700 dark:text-gray-300">{currentPhone}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {phase === 'enter-phone' && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter the teacher's new phone number. We'll text a verification code to it — the
              number is only saved once that code is confirmed.
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New phone number</label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleRequestCode(); }}
              placeholder="07XX XXX XXX"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm mb-3"
              autoFocus
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={close}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRequestCode()}
                disabled={loading || !newPhone.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending…' : 'Send code'}
              </button>
            </div>
          </>
        )}

        {phase === 'enter-code' && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter the 6-digit code sent to <strong className="text-gray-900 dark:text-gray-100">{newPhone.trim()}</strong>.
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleVerifyCode(); }}
              placeholder="123456"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm mb-3 tracking-widest"
              autoFocus
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPhase('enter-phone')}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleVerifyCode()}
                disabled={loading || !code.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying…' : 'Verify & save'}
              </button>
            </div>
          </>
        )}

        {phase === 'success' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">Done!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Phone number verified and saved</p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors text-sm"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
