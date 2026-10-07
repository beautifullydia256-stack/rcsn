import { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Building2,
  Calendar,
  X,
  FileText,
} from 'lucide-react';
import { useUIStore } from '../../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../../styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';

interface StudentPassItem {
  id: string;
  serialNumber: string;
  destination: string;
  reason: string;
  departureTime: string;
  expectedReturnTime: string;
  status: 'Approved' | 'Currently Out' | 'Returned' | 'Pending Review' | 'Rejected';
  approvedBy?: string;
  createdDate: string;
}

const MY_PASSES: StudentPassItem[] = [
  {
    id: 'sp-1',
    serialNumber: 'GP-2026-0814',
    destination: 'Case Medical Center, Kampala',
    reason: 'Dental appointment and orthodontic check-up',
    departureTime: 'Today, 09:30 AM',
    expectedReturnTime: 'Today, 02:30 PM',
    status: 'Currently Out',
    approvedBy: 'Head Teacher (Namyalo Sarah)',
    createdDate: '22 Sept 2026',
  },
  {
    id: 'sp-2',
    serialNumber: 'GP-2026-0740',
    destination: 'Kampala Parents Clinic',
    reason: 'Eye check-up and new lens prescription',
    departureTime: '12 Sept 2026, 10:00 AM',
    expectedReturnTime: '12 Sept 2026, 04:00 PM',
    status: 'Returned',
    approvedBy: 'Head Teacher (Namyalo Sarah)',
    createdDate: '12 Sept 2026',
  },
];

export default function StudentGatePassPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [passes, setPasses] = useState<StudentPassItem[]>(MY_PASSES);
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Form
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [depTime, setDepTime] = useState('');
  const [retTime, setRetTime] = useState('');
  const [guardianContact, setGuardianContact] = useState('');

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!destination.trim() || !reason.trim()) return;

    const newPass: StudentPassItem = {
      id: `sp-${Date.now()}`,
      serialNumber: `GP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      destination: destination.trim(),
      reason: reason.trim(),
      departureTime: depTime.trim() || 'Tomorrow 09:00 AM',
      expectedReturnTime: retTime.trim() || 'Tomorrow 04:00 PM',
      status: 'Pending Review',
      createdDate: 'Today',
    };

    setPasses([newPass, ...passes]);
    setShowApplyModal(false);
    setDestination('');
    setReason('');
    setDepTime('');
    setRetTime('');
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Exit Permissions
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Campus Gate Pass</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            My Gate Passes & Exit Permissions
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Request permission to exit the school grounds for medical appointments, family matters, or bank visits.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowApplyModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Exit Permission</span>
        </button>
      </div>

      {/* Passes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {passes.map((p) => (
          <div
            key={p.id}
            style={{
              background: cardGrad(isDark),
              border: `1px solid ${tk.cardBorder}`,
              borderRadius: 14,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#10b981' }}>
                  {p.serialNumber}
                </span>

                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background:
                      p.status === 'Currently Out'
                        ? 'rgba(245,158,11,0.15)'
                        : p.status === 'Approved'
                        ? 'rgba(139,92,246,0.15)'
                        : p.status === 'Returned'
                        ? 'rgba(16,185,129,0.15)'
                        : 'rgba(148,163,184,0.15)',
                    color:
                      p.status === 'Currently Out'
                        ? '#f59e0b'
                        : p.status === 'Approved'
                        ? '#8b5cf6'
                        : p.status === 'Returned'
                        ? '#10b981'
                        : tk.subText,
                  }}
                >
                  {p.status}
                </span>
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
                {p.destination}
              </h3>

              <p style={{ fontSize: 12, color: tk.subText, margin: '0 0 12px', lineHeight: 1.4 }}>
                {p.reason}
              </p>

              <div style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 10 }}>
                <div style={{ color: tk.text }}>Departure: <span style={{ color: tk.subText }}>{p.departureTime}</span></div>
                <div style={{ color: '#f59e0b', marginTop: 2 }}>Expected Return: <span>{p.expectedReturnTime}</span></div>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${tk.cardBorder}`, paddingTop: 10, fontSize: 11, color: tk.subText }}>
              {p.approvedBy ? `Authorized by: ${p.approvedBy}` : 'Awaiting Head Teacher / Admin approval'}
            </div>
          </div>
        ))}
      </div>

      {/* Apply Modal */}
      <NativeModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Request Exit Permission"
        subtitle="Submit campus leave permission request for administration review"
        icon={ShieldCheck}
        size="lg"
      >
        <form onSubmit={handleApply} className="flex flex-col gap-3 text-white">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Destination Location *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Case Hospital, Kampala"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Reason for Exit *
            </label>
            <textarea
              rows={2}
              required
              placeholder="Clearly describe purpose of departure..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Departure Time
              </label>
              <input
                type="text"
                placeholder="e.g. 10:00 AM"
                value={depTime}
                onChange={(e) => setDepTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Expected Return
              </label>
              <input
                type="text"
                placeholder="e.g. 04:00 PM"
                value={retTime}
                onChange={(e) => setRetTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Parent / Guardian Phone for Verification *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. +256 772 123 456"
              value={guardianContact}
              onChange={(e) => setGuardianContact(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/15">
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition active:scale-95"
            >
              Submit Request
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
