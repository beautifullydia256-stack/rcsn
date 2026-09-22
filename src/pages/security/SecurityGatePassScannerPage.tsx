import { useState, useEffect } from 'react';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Clock,
  Building2,
  LogOut as ExitIcon,
  LogIn as EntryIcon,
  Phone,
  ShieldCheck,
  Award,
  Utensils,
  History,
  XCircle,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';
import { verifyCardCode } from '@/features/student-cards/services/studentCardService';
import type { CardVerificationResult } from '@/features/student-cards/types';

interface VerifiedGatePass {
  serialNumber: string;
  studentName: string;
  className: string;
  admissionNo: string;
  destination: string;
  reason: string;
  departureTime: string;
  expectedReturnTime: string;
  guardianName: string;
  guardianPhone: string;
  approver: string;
  status: 'Approved' | 'Currently Out' | 'Returned' | 'Invalid / Expired';
}

const SAMPLE_GATE_PASSES: Record<string, VerifiedGatePass> = {
  'GP-2026-0814': {
    serialNumber: 'GP-2026-0814',
    studentName: 'Grace Nakato',
    className: 'Primary 5 Blue',
    admissionNo: 'ADM-2024-082',
    destination: 'Case Medical Center, Kampala',
    reason: 'Dental appointment and orthodontic check-up',
    departureTime: 'Today, 09:30 AM',
    expectedReturnTime: 'Today, 02:30 PM',
    guardianName: 'Mrs. Mary Nakato',
    guardianPhone: '+256 772 123 456',
    approver: 'Head Teacher (Namyalo Sarah)',
    status: 'Currently Out',
  },
  'GP-2026-0815': {
    serialNumber: 'GP-2026-0815',
    studentName: 'Kasule Brian',
    className: 'Senior 4 East',
    admissionNo: 'ADM-2023-144',
    destination: 'Centenary Bank Masaka Branch',
    reason: 'Clear school fees draft with parent at bank counter',
    departureTime: 'Today, 10:00 AM',
    expectedReturnTime: 'Today, 01:00 PM',
    guardianName: 'Mr. John Kasule',
    guardianPhone: '+256 701 443 890',
    approver: 'Administrator (Kato Paul)',
    status: 'Returned',
  },
  'GP-2026-0816': {
    serialNumber: 'GP-2026-0816',
    studentName: 'Aisha Nakimera',
    className: 'Senior 3 West',
    admissionNo: 'ADM-2024-098',
    destination: 'Home Residence (Entebbe)',
    reason: 'Attending funeral of paternal grandmother',
    departureTime: 'Today, 11:30 AM',
    expectedReturnTime: 'Tomorrow, 05:00 PM',
    guardianName: 'Mr. Bashir Nakimera',
    guardianPhone: '+256 782 555 120',
    approver: 'Head Teacher (Namyalo Sarah)',
    status: 'Approved',
  },
};

interface ScanHistoryEntry {
  id: string;
  time: string;
  code: string;
  studentName: string;
  type: string;
  result: 'valid' | 'expired' | 'revoked' | 'invalid';
  message: string;
}

export default function SecurityGatePassScannerPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [inputCode, setInputCode] = useState('GP-2026-0816');
  const [activePass, setActivePass] = useState<VerifiedGatePass | null>(SAMPLE_GATE_PASSES['GP-2026-0816']);
  const [activeServiceCard, setActiveServiceCard] = useState<CardVerificationResult | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);

  // Function to handle verification for both types of codes
  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const clean = inputCode.trim();
    if (!clean) return;

    setIsVerifying(true);
    setActionMessage(null);

    // 1. Check if it's a legacy or mock gate exit pass code (GP-...)
    const upper = clean.toUpperCase();
    if (SAMPLE_GATE_PASSES[upper]) {
      setActivePass(SAMPLE_GATE_PASSES[upper]);
      setActiveServiceCard(null);
      setIsVerifying(false);
      addHistory(upper, SAMPLE_GATE_PASSES[upper].studentName, 'Gate Pass', 'valid', 'Exit pass verified');
      return;
    }

    // 2. Query universal service card verification API
    try {
      const res = await verifyCardCode(clean, 'Gatehouse Terminal');
      if (res.found) {
        setActiveServiceCard(res);
        setActivePass(null);
        const name = res.student?.name || 'Student';
        const typeLabel = res.card?.title || 'Service Card';
        const scanRes = res.valid ? 'valid' : (res.status as ScanHistoryEntry['result']);
        addHistory(res.card?.card_number || clean, name, typeLabel, scanRes, res.message);
      } else {
        setActiveServiceCard(res);
        setActivePass(null);
        setActionMessage(res.message);
        addHistory(clean, 'Unknown', 'Access Card', 'invalid', res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setActionMessage(msg);
    } finally {
      setIsVerifying(false);
    }
  }

  function addHistory(code: string, studentName: string, type: string, result: ScanHistoryEntry['result'], message: string) {
    const entry: ScanHistoryEntry = {
      id: `sh-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      code,
      studentName,
      type,
      result,
      message,
    };
    setScanHistory((prev) => [entry, ...prev.slice(0, 19)]);
  }

  function handleLogDeparture() {
    if (!activePass) return;
    setActivePass({ ...activePass, status: 'Currently Out' });
    setActionMessage(`Departure logged at ${new Date().toLocaleTimeString()}! Gate barrier opened.`);
  }

  function handleLogReturn() {
    if (!activePass) return;
    setActivePass({ ...activePass, status: 'Returned' });
    setActionMessage(`Student return verified and recorded at ${new Date().toLocaleTimeString()}!`);
  }

  function handleLogAccessConfirmed() {
    if (!activeServiceCard?.card) return;
    setActionMessage(`Access Confirmed! Student admitted through gatehouse at ${new Date().toLocaleTimeString()}.`);
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Gatehouse Terminal
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Perimeter Barcode, Serial & QR Scanner</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Gate Pass & Service Card Verification Terminal
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Scan QR code or enter serial code to verify School Entrance Passes, Examination Cards, Meal Cards, or Exit Passes.
          </p>
        </div>
      </div>

      {/* Scanner Box */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 14, padding: 24, marginBottom: 24, maxWidth: 720 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <QrCode className="w-5 h-5" style={{ position: 'absolute', left: 12, top: 12, color: '#10b981' }} />
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Scan QR or enter Card Code (e.g. ENT-2026-0042, GP-2026-0814)"
              style={{
                width: '100%',
                padding: '10px 14px 10px 42px',
                borderRadius: 8,
                background: isDark ? '#1e293b' : '#f8fafc',
                border: `1.5px solid ${tk.cardBorder}`,
                color: tk.text,
                fontSize: 14,
                fontFamily: 'monospace',
                fontWeight: 700,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isVerifying}
            style={{
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              padding: '10px 22px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: isVerifying ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isVerifying ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 11, color: tk.subText }}>
          <span style={{ fontWeight: 600 }}>Quick sample test codes:</span>
          {Object.keys(SAMPLE_GATE_PASSES).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setInputCode(code);
                setActivePass(SAMPLE_GATE_PASSES[code]);
                setActiveServiceCard(null);
                setActionMessage(null);
              }}
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
                border: 'none',
                color: tk.text,
                padding: '3px 8px',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 10.5,
                cursor: 'pointer',
              }}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          style={{
            maxWidth: 720,
            background: actionMessage.includes('DENIED') || actionMessage.includes('EXPIRED') || actionMessage.includes('No active')
              ? 'rgba(244, 63, 94, 0.12)'
              : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${
              actionMessage.includes('DENIED') || actionMessage.includes('EXPIRED') || actionMessage.includes('No active')
                ? '#f43f5e'
                : '#10b981'
            }`,
            color: actionMessage.includes('DENIED') || actionMessage.includes('EXPIRED') || actionMessage.includes('No active')
              ? '#f43f5e'
              : '#10b981',
            padding: '12px 18px',
            borderRadius: 10,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {actionMessage.includes('DENIED') || actionMessage.includes('EXPIRED') || actionMessage.includes('No active') ? (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{actionMessage}</span>
        </div>
      )}

      {/* RESULT 1: STUDENT SERVICE ACCESS CARD RESULT */}
      {activeServiceCard && activeServiceCard.found && (
        <div
          style={{
            maxWidth: 720,
            background: cardGrad(isDark),
            border: `2px solid ${
              activeServiceCard.valid
                ? '#10b981'
                : activeServiceCard.status === 'expired'
                ? '#f43f5e'
                : '#e11d48'
            }`,
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 24,
            boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
          }}
        >
          {/* Card Status Header Banner */}
          <div
            style={{
              padding: '16px 24px',
              background: activeServiceCard.valid
                ? 'linear-gradient(90deg, #059669 0%, #047857 100%)'
                : activeServiceCard.status === 'expired'
                ? 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)'
                : 'linear-gradient(90deg, #e11d48 0%, #9f1239 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {activeServiceCard.valid ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-200" />
              ) : activeServiceCard.status === 'expired' ? (
                <AlertTriangle className="w-8 h-8 text-rose-200" />
              ) : (
                <XCircle className="w-8 h-8 text-rose-200" />
              )}
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {activeServiceCard.valid
                    ? 'VALID ACCESS GRANTED'
                    : activeServiceCard.status === 'expired'
                    ? 'EXPIRED ACCESS DENIED'
                    : 'CARD REVOKED / CANCELLED'}
                </div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  {activeServiceCard.message}
                </div>
              </div>
            </div>

            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 14,
                fontWeight: 800,
                background: 'rgba(0,0,0,0.25)',
                padding: '4px 10px',
                borderRadius: 6,
              }}
            >
              {activeServiceCard.card?.card_number}
            </div>
          </div>

          {/* Student & Card Body */}
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
              {/* Photo */}
              <div
                style={{
                  width: 80,
                  height: 90,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#334155',
                  flexShrink: 0,
                  border: `2px solid ${activeServiceCard.valid ? '#10b981' : '#f43f5e'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeServiceCard.student?.photo_url ? (
                  <img
                    src={activeServiceCard.student.photo_url}
                    alt={activeServiceCard.student.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ color: '#ffffff', fontSize: 24, fontWeight: 700 }}>
                    {(activeServiceCard.student?.name || 'S').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Student details */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
                    {activeServiceCard.student?.name}
                  </h2>
                </div>

                <div style={{ fontSize: 13, color: tk.subText, marginTop: 4 }}>
                  <span>Class: <strong style={{ color: tk.text }}>{activeServiceCard.student?.current_class || '—'}</strong></span>
                  {activeServiceCard.student?.stream && (
                    <span style={{ marginLeft: 10 }}>Stream: <strong style={{ color: tk.text }}>{activeServiceCard.student.stream}</strong></span>
                  )}
                  <span style={{ marginLeft: 10 }}>Admission: <strong style={{ color: tk.text }}>{activeServiceCard.student?.admission_number || '—'}</strong></span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: 'rgba(16,185,129,0.15)',
                      color: '#10b981',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {activeServiceCard.card?.card_type === 'entrance' ? (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    ) : activeServiceCard.card?.card_type === 'examination' ? (
                      <Award className="w-3.5 h-3.5" />
                    ) : (
                      <Utensils className="w-3.5 h-3.5" />
                    )}
                    <span>{activeServiceCard.card?.title}</span>
                  </span>

                  {activeServiceCard.card?.card_type === 'entrance' && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: (activeServiceCard.card.fee_percentage_at_issuance ?? 0) >= 100 ? '#dcfce7' : '#fef3c7',
                        color: (activeServiceCard.card.fee_percentage_at_issuance ?? 0) >= 100 ? '#166534' : '#92400e',
                      }}
                    >
                      Fees: {activeServiceCard.card.fee_percentage_at_issuance}% Paid
                      {activeServiceCard.card.min_fee_percent_required > 0
                        ? ` (Required: ≥${activeServiceCard.card.min_fee_percent_required}%)`
                        : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Validity Information Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                padding: 14,
                borderRadius: 10,
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <span style={{ color: tk.subText, display: 'block' }}>Date Issued:</span>
                <strong style={{ color: tk.text }}>
                  {activeServiceCard.card?.issue_date ? new Date(activeServiceCard.card.issue_date).toLocaleDateString() : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: tk.subText, display: 'block' }}>Expiry Date & Time:</span>
                <strong style={{ color: activeServiceCard.valid ? '#10b981' : '#f43f5e' }}>
                  {activeServiceCard.card?.expiry_date ? new Date(activeServiceCard.card.expiry_date).toLocaleString() : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: tk.subText, display: 'block' }}>Parent / Guardian:</span>
                <strong style={{ color: tk.text }}>
                  {activeServiceCard.student?.guardian_name || '—'} {activeServiceCard.student?.guardian_phone ? `(${activeServiceCard.student.guardian_phone})` : ''}
                </strong>
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              {activeServiceCard.valid ? (
                <button
                  type="button"
                  onClick={handleLogAccessConfirmed}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Verified Entry & Log Movement</span>
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f43f5e', fontSize: 12, fontWeight: 600 }}>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Entry Denied. Direct student to the administration office for clearance.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESULT 2: GATE EXIT PASS RESULT */}
      {activePass && (
        <div
          style={{
            maxWidth: 720,
            background: cardGrad(isDark),
            border: `1px solid ${tk.cardBorder}`,
            borderRadius: 14,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981', fontSize: 13 }}>
                  {activePass.serialNumber}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background:
                      activePass.status === 'Currently Out'
                        ? 'rgba(245,158,11,0.15)'
                        : activePass.status === 'Approved'
                        ? 'rgba(16,185,129,0.15)'
                        : 'rgba(99,102,241,0.15)',
                    color:
                      activePass.status === 'Currently Out'
                        ? '#f59e0b'
                        : activePass.status === 'Approved'
                        ? '#10b981'
                        : '#6366f1',
                  }}
                >
                  {activePass.status}
                </span>
              </div>
              <h2 style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
                {activePass.studentName}
              </h2>
              <div style={{ fontSize: 12, color: tk.subText, marginTop: 2 }}>
                {activePass.className} • Adm: {activePass.admissionNo}
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: 11, color: tk.subText }}>
              <div>Authorized By:</div>
              <strong style={{ color: tk.text }}>{activePass.approver}</strong>
            </div>
          </div>

          <div style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', padding: 14, borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, color: tk.text, marginBottom: 4 }}>Destination: {activePass.destination}</div>
            <div style={{ color: tk.subText, fontSize: 12, marginBottom: 8 }}>Reason: {activePass.reason}</div>
            <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
              <div>Departure: <strong style={{ color: tk.text }}>{activePass.departureTime}</strong></div>
              <div>Expected Return: <strong style={{ color: '#f59e0b' }}>{activePass.expectedReturnTime}</strong></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            {activePass.status !== 'Currently Out' && (
              <button
                type="button"
                onClick={handleLogDeparture}
                style={{
                  background: '#f59e0b',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ExitIcon className="w-4 h-4" />
                <span>Log Student Departure</span>
              </button>
            )}

            {activePass.status === 'Currently Out' && (
              <button
                type="button"
                onClick={handleLogReturn}
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <EntryIcon className="w-4 h-4" />
                <span>Log Student Return</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* RECENT SCANS AUDIT LOG */}
      {scanHistory.length > 0 && (
        <div style={{ maxWidth: 720, marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <History className="w-4 h-4 text-emerald-400" />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: tk.text }}>Recent Verification Activity</h3>
          </div>

          <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
            {scanHistory.map((h, i) => (
              <div
                key={h.id || i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: i < scanHistory.length - 1 ? `1px solid ${tk.cardBorder}` : 'none',
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: tk.subText, fontFamily: 'monospace', fontSize: 11 }}>{h.time}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>{h.code}</span>
                  <span style={{ fontWeight: 600, color: tk.text }}>{h.studentName}</span>
                  <span style={{ fontSize: 11, color: tk.subText }}>({h.type})</span>
                </div>

                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    textTransform: 'uppercase',
                    background:
                      h.result === 'valid'
                        ? 'rgba(16,185,129,0.15)'
                        : 'rgba(244,63,94,0.15)',
                    color: h.result === 'valid' ? '#10b981' : '#f43f5e',
                  }}
                >
                  {h.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
