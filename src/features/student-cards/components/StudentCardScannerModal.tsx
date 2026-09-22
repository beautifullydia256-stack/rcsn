import React, { useState } from 'react';
import {
  QrCode,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Award,
  Utensils,
  Search,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { getTokens, cardGrad } from '@/styles/posThemeTokens';
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
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [inputCode, setInputCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<CardVerificationResult | null>(null);

  if (!isOpen) return null;

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: isDark ? '#0f172a' : '#ffffff',
          border: `1px solid ${tk.cardBorder}`,
          borderRadius: 16,
          width: '100%',
          maxWidth: 500,
          padding: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrCode className="w-5 h-5 text-emerald-400" />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tk.text }}>
              Verify Access Card
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: tk.subText, cursor: 'pointer' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: 12, color: tk.subText }}>
          Location: <strong>{scannerLocation}</strong>. Scan student QR code or enter serial code (e.g. EXM-2026-0189).
        </p>

        {/* Input */}
        <form onSubmit={handleVerify} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            type="text"
            autoFocus
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Scan or enter code..."
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              background: isDark ? '#1e293b' : '#f8fafc',
              border: `1.5px solid ${tk.cardBorder}`,
              color: tk.text,
              fontSize: 14,
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          />
          <button
            type="submit"
            disabled={isVerifying || !inputCode.trim()}
            style={{
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: isVerifying ? 'wait' : 'pointer',
            }}
          >
            {isVerifying ? 'Checking...' : 'Verify'}
          </button>
        </form>

        {/* Verification Result */}
        {result && (
          <div
            style={{
              background: result.valid
                ? 'rgba(16,185,129,0.08)'
                : 'rgba(244,63,94,0.08)',
              border: `2px solid ${result.valid ? '#10b981' : '#f43f5e'}`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {result.valid ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-500 flex-shrink-0" />
              ) : result.status === 'expired' ? (
                <AlertTriangle className="w-7 h-7 text-rose-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-7 h-7 text-rose-500 flex-shrink-0" />
              )}
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: result.valid ? '#10b981' : '#f43f5e',
                  }}
                >
                  {result.valid
                    ? 'ACCESS GRANTED'
                    : result.status === 'expired'
                    ? 'EXPIRED ACCESS DENIED'
                    : 'CARD REVOKED / INVALID'}
                </div>
                <div style={{ fontSize: 12, color: tk.text, marginTop: 2 }}>{result.message}</div>
              </div>
            </div>

            {result.student && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: isDark ? '#1e293b' : '#ffffff', padding: 10, borderRadius: 8 }}>
                {result.student.photo_url ? (
                  <img
                    src={result.student.photo_url}
                    alt={result.student.name}
                    style={{ width: 44, height: 50, borderRadius: 6, objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: 44, height: 50, borderRadius: 6, background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {result.student.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, color: tk.text, fontSize: 14 }}>{result.student.name}</div>
                  <div style={{ fontSize: 11, color: tk.subText }}>
                    {result.student.current_class} {result.student.stream ? `• ${result.student.stream}` : ''} • Adm: {result.student.admission_number || '—'}
                  </div>
                  {result.card && (
                    <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 2 }}>
                      {result.card.title} ({result.card.card_number})
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reset button */}
        {result && (
          <button
            type="button"
            onClick={handleReset}
            style={{
              width: '100%',
              background: isDark ? '#1e293b' : '#f1f5f9',
              color: tk.text,
              border: `1px solid ${tk.cardBorder}`,
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Scan Next Student Card
          </button>
        )}
      </div>
    </div>
  );
};
