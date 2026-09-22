import { useState } from 'react';
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
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

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

const SAMPLE_PASSES: Record<string, VerifiedGatePass> = {
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

export default function SecurityGatePassScannerPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [inputCode, setInputCode] = useState('GP-2026-0816');
  const [activePass, setActivePass] = useState<VerifiedGatePass | null>(SAMPLE_PASSES['GP-2026-0816']);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (SAMPLE_PASSES[clean]) {
      setActivePass(SAMPLE_PASSES[clean]);
      setActionMessage(null);
    } else {
      setActivePass(null);
      setActionMessage('No active gate pass found with this code. Check spelling or request approval from administration.');
    }
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

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Gatehouse Terminal
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Perimeter Barcode & Serial Scanner</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Gate Pass Verification & Departure Scanner
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Enter or scan student pass serial code to verify official signature and record gate movements.
          </p>
        </div>
      </div>

      {/* Scanner Box */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 14, padding: 24, marginBottom: 24, maxWidth: 640 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <QrCode className="w-5 h-5" style={{ position: 'absolute', left: 12, top: 12, color: '#10b981' }} />
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Scan or enter Pass Code (e.g. GP-2026-0814)"
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
            style={{
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Verify Pass
          </button>
        </form>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 11, color: tk.subText }}>
          <span>Quick test codes:</span>
          {Object.keys(SAMPLE_PASSES).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setInputCode(code);
                setActivePass(SAMPLE_PASSES[code]);
                setActionMessage(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#10b981',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {actionMessage && (
        <div
          style={{
            maxWidth: 640,
            padding: 14,
            borderRadius: 10,
            marginBottom: 20,
            background: activePass ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${activePass ? '#10b981' : '#f43f5e'}`,
            color: activePass ? '#10b981' : '#f43f5e',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* Verified Pass Card */}
      {activePass && (
        <div
          style={{
            background: cardGrad(isDark),
            border: '2px solid #10b981',
            borderRadius: 16,
            padding: 24,
            maxWidth: 640,
            boxShadow: '0 8px 30px rgba(16, 185, 129, 0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: `1px solid ${tk.cardBorder}`, paddingBottom: 14 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', letterSpacing: 1 }}>
                VERIFIED ACTIVE PASS
              </span>
              <h2 style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, fontFamily: SORA, color: tk.text }}>
                {activePass.studentName}
              </h2>
              <div style={{ fontSize: 12, color: tk.subText }}>
                {activePass.className} • {activePass.admissionNo}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 99,
                  background:
                    activePass.status === 'Currently Out'
                      ? 'rgba(245,158,11,0.15)'
                      : activePass.status === 'Approved'
                      ? 'rgba(139,92,246,0.15)'
                      : 'rgba(16,185,129,0.15)',
                  color:
                    activePass.status === 'Currently Out'
                      ? '#f59e0b'
                      : activePass.status === 'Approved'
                      ? '#8b5cf6'
                      : '#10b981',
                }}
              >
                {activePass.status}
              </span>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: tk.subText, marginTop: 4 }}>
                {activePass.serialNumber}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, marginBottom: 16 }}>
            <div>
              <span style={{ color: tk.subText, fontSize: 11 }}>Destination:</span>
              <div style={{ fontWeight: 600, color: tk.text }}>{activePass.destination}</div>
            </div>
            <div>
              <span style={{ color: tk.subText, fontSize: 11 }}>Reason:</span>
              <div style={{ fontWeight: 600, color: tk.text }}>{activePass.reason}</div>
            </div>
            <div>
              <span style={{ color: tk.subText, fontSize: 11 }}>Departure Time:</span>
              <div style={{ fontWeight: 600, color: tk.text }}>{activePass.departureTime}</div>
            </div>
            <div>
              <span style={{ color: tk.subText, fontSize: 11 }}>Expected Return:</span>
              <div style={{ fontWeight: 700, color: '#f59e0b' }}>{activePass.expectedReturnTime}</div>
            </div>
            <div>
              <span style={{ color: tk.subText, fontSize: 11 }}>Parent / Guardian:</span>
              <div style={{ fontWeight: 600, color: tk.text }}>{activePass.guardianName}</div>
              <div style={{ fontSize: 11, color: tk.subText }}>{activePass.guardianPhone}</div>
            </div>
            <div>
              <span style={{ color: tk.subText, fontSize: 11 }}>Authorized by:</span>
              <div style={{ fontWeight: 600, color: '#10b981' }}>{activePass.approver}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, borderTop: `1px solid ${tk.cardBorder}`, paddingTop: 16 }}>
            {activePass.status === 'Approved' && (
              <button
                type="button"
                onClick={handleLogDeparture}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: '#f59e0b',
                  color: '#05080f',
                  border: 'none',
                  padding: '12px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <ExitIcon className="w-4 h-4" />
                <span>Log Departure (Exit Campus)</span>
              </button>
            )}

            {activePass.status === 'Currently Out' && (
              <button
                type="button"
                onClick={handleLogReturn}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <EntryIcon className="w-4 h-4" />
                <span>Log Student Return (Enter Campus)</span>
              </button>
            )}

            {activePass.status === 'Returned' && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 12, fontWeight: 600, width: '100%', textAlign: 'center' }}>
                Student has already returned and gate pass is concluded.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
