import React, { useState } from 'react';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import NativeModal from '@/components/NativeModal';
import { verifyCardCode } from '../services/studentCardService';
import type { CardVerificationResult } from '../types';

interface StudentCardScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannerLocation?: string;
  defaultRole?: string;
}

export const StudentCardScannerModal: React.FC<StudentCardScannerModalProps> = ({
  isOpen,
  onClose,
  scannerLocation = 'Examination Room',
}) => {
  const [inputCode, setInputCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<CardVerificationResult | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setIsVerifying(true);
    try {
      const res = await verifyCardCode(inputCode.trim(), scannerLocation);
      setResult(res);
    } finally {
      setIsVerifying(false);
    }
  }

  function handleReset() {
    setInputCode('');
    setResult(null);
  }

  return (
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      title="Verify Access Card"
      subtitle={`Location: ${scannerLocation}. Scan student QR code or enter serial code (e.g. EXM-2026-0189).`}
      icon={QrCode}
      size="md"
    >
      <div className="space-y-4">
        {/* Input */}
        <form onSubmit={handleVerify} className="flex gap-2.5">
          <input
            type="text"
            autoFocus
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Scan or enter code..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-sm font-mono font-bold tracking-wider focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner uppercase"
          />
          <button
            type="submit"
            disabled={isVerifying || !inputCode.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 border border-emerald-400/30 transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <span>Verify</span>
            )}
          </button>
        </form>

        {/* Verification Result */}
        {result && (
          <div
            className={`p-4 rounded-2xl border transition-all ${
              result.valid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : result.status === 'expired'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              {result.valid ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : result.status === 'expired' ? (
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
              )}
              <div>
                <div className="text-sm font-black tracking-wider uppercase">
                  {result.valid
                    ? 'ACCESS GRANTED'
                    : result.status === 'expired'
                    ? 'EXPIRED ACCESS DENIED'
                    : 'CARD REVOKED / INVALID'}
                </div>
                <div className="text-xs text-white/80 mt-0.5">{result.message}</div>
              </div>
            </div>

            {result.student && (
              <div className="flex gap-3 items-center bg-white/5 border border-white/10 p-3 rounded-xl">
                {result.student.photo_url ? (
                  <img
                    src={result.student.photo_url}
                    alt={result.student.name}
                    className="w-12 h-14 rounded-lg object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-12 h-14 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center font-bold text-sm">
                    {result.student.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-bold text-white text-sm">{result.student.name}</div>
                  <div className="text-xs text-white/60">
                    {result.student.current_class} {result.student.stream ? `· ${result.student.stream}` : ''} · Adm: {result.student.admission_number || '—'}
                  </div>
                  {result.card && (
                    <div className="text-xs text-emerald-400 font-semibold font-mono mt-1">
                      {result.card.title} ({result.card.card_number})
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
          {result ? (
            <button
              type="button"
              onClick={handleReset}
              className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 border border-emerald-400/30 transition-all text-center"
            >
              Scan Next Student Card
            </button>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
              >
                Close Scanner
              </button>
            </div>
          )}
        </div>
      </div>
    </NativeModal>
  );
};
