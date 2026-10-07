import { useState } from 'react';
import {
  Ambulance,
  Search,
  Plus,
  Hospital,
  Clock,
  Phone,
  CheckCircle2,
  FileSpreadsheet,
  Building2,
  AlertTriangle,
  X,
  ExternalLink,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';
import { LiquidGlassSelect } from '@/components/ui/LiquidGlassSelect';

interface ReferralRecord {
  id: string;
  patientName: string;
  type: 'Student' | 'Staff';
  className?: string;
  admissionNo?: string;
  referralHospital: string;
  reasonForReferral: string;
  urgency: 'Emergency / Siren' | 'Urgent Same-Day' | 'Scheduled Specialist';
  transportType: 'School Ambulance' | 'Administrative Vehicle' | 'Parent Collected';
  accompanyingNurse: string;
  parentNotified: boolean;
  status: 'In Transit' | 'Admitted at Facility' | 'Treated & Returned' | 'Discharged Home';
  timestamp: string;
  caseOutcomeNotes?: string;
}

const INITIAL_REFERRALS: ReferralRecord[] = [
  {
    id: 'ref-1',
    patientName: 'Brian Ssemwogerere',
    type: 'Student',
    className: 'Senior 2 East',
    admissionNo: 'ADM-2024-201',
    referralHospital: 'St. Francis Hospital Nsambya (Emergency Wing)',
    reasonForReferral: 'Deep palm laceration with severe bleeding, requires tendon assessment and surgical suturing',
    urgency: 'Emergency / Siren',
    transportType: 'School Ambulance',
    accompanyingNurse: 'Nurse Ronald Magezi',
    parentNotified: true,
    status: 'Admitted at Facility',
    timestamp: 'Today, 11:30 AM',
    caseOutcomeNotes: 'Underwent surgical exploration and closure. Recovering in general surgical ward.',
  },
  {
    id: 'ref-2',
    patientName: 'Kato Derrick',
    type: 'Student',
    className: 'Primary 7 Red',
    admissionNo: 'ADM-2022-019',
    referralHospital: 'Mulago National Referral Hospital',
    reasonForReferral: 'Suspected acute appendicitis with rebound tenderness in right lower quadrant',
    urgency: 'Emergency / Siren',
    transportType: 'Administrative Vehicle',
    accompanyingNurse: 'Dr. Sarah Nabatanzi',
    parentNotified: true,
    status: 'Treated & Returned',
    timestamp: '18 Sept 2026',
    caseOutcomeNotes: 'Diagnostic ultrasound completed. Conservative medical management successful.',
  },
  {
    id: 'ref-3',
    patientName: 'Ms. Namutebi Claire',
    type: 'Staff',
    referralHospital: 'Case Medical Center',
    reasonForReferral: 'Severe hypertensive crisis (BP 185/115 mmHg) unresponsive to sublingual anti-hypertensive',
    urgency: 'Urgent Same-Day',
    transportType: 'Administrative Vehicle',
    accompanyingNurse: 'Nurse Ronald Magezi',
    parentNotified: true,
    status: 'Discharged Home',
    timestamp: '12 Sept 2026',
    caseOutcomeNotes: 'Blood pressure stabilized under cardiology review.',
  },
];

export default function ClinicianReferralsPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [referrals, setReferrals] = useState<ReferralRecord[]>(INITIAL_REFERRALS);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'Student' | 'Staff'>('Student');
  const [newClass, setNewClass] = useState('');
  const [newHospital, setNewHospital] = useState('Mulago National Referral Hospital');
  const [newReason, setNewReason] = useState('');
  const [newUrgency, setNewUrgency] = useState<'Emergency / Siren' | 'Urgent Same-Day' | 'Scheduled Specialist'>('Urgent Same-Day');
  const [newTransport, setNewTransport] = useState<'School Ambulance' | 'Administrative Vehicle' | 'Parent Collected'>('School Ambulance');
  const [newNurse, setNewNurse] = useState('Nurse on Duty');

  const filtered = referrals.filter(
    (r) =>
      r.patientName.toLowerCase().includes(search.toLowerCase()) ||
      r.referralHospital.toLowerCase().includes(search.toLowerCase()) ||
      r.reasonForReferral.toLowerCase().includes(search.toLowerCase())
  );

  function handleAddReferral(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newReason.trim()) return;

    const record: ReferralRecord = {
      id: `ref-${Date.now()}`,
      patientName: newName.trim(),
      type: newType,
      className: newClass.trim() || undefined,
      referralHospital: newHospital,
      reasonForReferral: newReason.trim(),
      urgency: newUrgency,
      transportType: newTransport,
      accompanyingNurse: newNurse.trim(),
      parentNotified: true,
      status: 'In Transit',
      timestamp: `Today, ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
    };

    setReferrals([record, ...referrals]);
    setShowAddModal(false);
    setNewName('');
    setNewClass('');
    setNewReason('');
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              External Hospital Transfers
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Emergency Evacuation Register</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Hospital Referral Slips
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Official records of students and staff referred to tertiary hospitals and trauma centers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#f59e0b',
            color: '#05080f',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Issue Referral Slip</span>
        </button>
      </div>

      {/* Referrals Table */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Patient</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Hospital Destination</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Referral Reason</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Transport / Urgency</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Escort Nurse</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{r.patientName}</div>
                    <div style={{ fontSize: 11, color: tk.subText }}>{r.className || r.type} • {r.timestamp}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: tk.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Hospital className="w-4 h-4 text-cyan-400" />
                      <span>{r.referralHospital}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', maxWidth: 260, color: tk.text, fontSize: 12 }}>
                    {r.reasonForReferral}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: tk.text, fontSize: 12, fontWeight: 600 }}>{r.transportType}</div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background:
                          r.urgency.startsWith('Emergency')
                            ? 'rgba(244,63,94,0.15)'
                            : 'rgba(245,158,11,0.15)',
                        color:
                          r.urgency.startsWith('Emergency')
                            ? '#f43f5e'
                            : '#f59e0b',
                      }}
                    >
                      {r.urgency}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: tk.subText, fontSize: 12 }}>
                    {r.accompanyingNurse}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background:
                          r.status === 'In Transit'
                            ? 'rgba(245,158,11,0.15)'
                            : r.status === 'Admitted at Facility'
                            ? 'rgba(6,182,212,0.15)'
                            : 'rgba(16,185,129,0.15)',
                        color:
                          r.status === 'In Transit'
                            ? '#f59e0b'
                            : r.status === 'Admitted at Facility'
                            ? '#06b6d4'
                            : '#10b981',
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Referral Modal */}
      <NativeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create Hospital Referral Slip"
        subtitle="Authorize urgent external hospital transfer and medical evacuation"
        icon={Hospital}
        size="lg"
      >
        <form onSubmit={handleAddReferral} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-[45] focus-within:z-[50]">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Patient Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Brian Ssemwogerere"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
              />
            </div>

            <div className="relative z-[46]">
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Category
              </label>
              <LiquidGlassSelect
                value={newType}
                onChange={(val) => setNewType(val as any)}
                options={[
                  { value: 'Student', label: 'Trainee / Student' },
                  { value: 'Staff', label: 'Faculty / Staff' },
                ]}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Class / Department
              </label>
              <input
                type="text"
                placeholder="e.g. Senior 2 East / Nursing"
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="relative z-[40]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Destination Hospital / Facility *
            </label>
            <input
              type="text"
              required
              value={newHospital}
              onChange={(e) => setNewHospital(e.target.value)}
              placeholder="e.g. Mulago National Referral Hospital"
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
            />
          </div>

          <div className="relative z-[35]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Clinical Reasons for Referral *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Detail primary clinical findings, trauma, and specialized care required..."
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="w-full bg-black/25 border border-white/20 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-[30] focus-within:z-[50]">
            <div className="relative z-[32]">
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Transport Mode
              </label>
              <LiquidGlassSelect
                value={newTransport}
                onChange={(val) => setNewTransport(val as any)}
                options={[
                  { value: 'School Ambulance', label: 'School Ambulance (Priority)' },
                  { value: 'Administrative Vehicle', label: 'Administrative Vehicle' },
                  { value: 'Parent Collected', label: 'Parent / Guardian Collected' },
                ]}
              />
            </div>

            <div className="relative z-[31]">
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Urgency Classification
              </label>
              <LiquidGlassSelect
                value={newUrgency}
                onChange={(val) => setNewUrgency(val as any)}
                options={[
                  { value: 'Emergency / Siren', label: 'Emergency (Immediate Transit)' },
                  { value: 'Urgent Same-Day', label: 'Urgent Same-Day' },
                  { value: 'Scheduled Specialist', label: 'Scheduled Specialist Visit' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 shadow-lg shadow-amber-950/40 border border-amber-400/30 transition-all flex items-center gap-2"
            >
              <Ambulance className="w-4 h-4" />
              Issue Referral Slip
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
