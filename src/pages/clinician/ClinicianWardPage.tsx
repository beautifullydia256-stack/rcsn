import { useState } from 'react';
import {
  BedDouble,
  HeartPulse,
  Thermometer,
  Clock,
  UserCheck,
  AlertCircle,
  Plus,
  CheckCircle2,
  Calendar,
  Phone,
  ArrowRight,
  X,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';

interface WardBed {
  bedNumber: number;
  isOccupied: boolean;
  patientName?: string;
  className?: string;
  admissionNo?: string;
  diagnosis?: string;
  admittedAt?: string;
  temp?: string;
  pulse?: string;
  ivInfusion?: string;
  guardianPhone?: string;
  notes?: string;
}

const INITIAL_BEDS: WardBed[] = [
  {
    bedNumber: 1,
    isOccupied: true,
    patientName: 'Grace Nakato',
    className: 'Primary 5 Blue',
    admissionNo: 'ADM-2024-082',
    diagnosis: 'Acute Malaria (Severe rigors & fever)',
    admittedAt: '08:30 AM (Today)',
    temp: '38.8°C',
    pulse: '98 bpm',
    ivInfusion: 'Dextrose Saline 500ml running at 30 drops/min',
    guardianPhone: '+256 772 123 456',
    notes: 'Vitals review scheduled every 2 hours. Sponge bathed at 09:00 AM.',
  },
  {
    bedNumber: 2,
    isOccupied: true,
    patientName: 'Florence Namukasa',
    className: 'Primary 3 Green',
    admissionNo: 'ADM-2025-045',
    diagnosis: 'Asthmatic Bronchospasm Attack',
    admittedAt: '10:15 AM (Today)',
    temp: '37.1°C',
    pulse: '88 bpm',
    ivInfusion: 'None (Nebulized with Salbutamol)',
    guardianPhone: '+256 782 555 120',
    notes: 'Oxygen saturation monitored at 96%. Re-evaluate wheeze at 12:00 PM.',
  },
  {
    bedNumber: 3,
    isOccupied: false,
  },
  {
    bedNumber: 4,
    isOccupied: true,
    patientName: 'David Kiggundu',
    className: 'Senior 1 North',
    admissionNo: 'ADM-2025-102',
    diagnosis: 'Severe Food-Borne Gastroenteritis (Dehydration)',
    admittedAt: '07:45 AM (Today)',
    temp: '37.6°C',
    pulse: '92 bpm',
    ivInfusion: 'Ringers Lactate 1000ml Infusion',
    guardianPhone: '+256 701 443 890',
    notes: 'Tolerating oral rehydration salts slowly. Stool frequency reducing.',
  },
  {
    bedNumber: 5,
    isOccupied: false,
  },
  {
    bedNumber: 6,
    isOccupied: false,
  },
];

export default function ClinicianWardPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [beds, setBeds] = useState<WardBed[]>(INITIAL_BEDS);
  const [selectedBed, setSelectedBed] = useState<WardBed | null>(null);

  const occupiedCount = beds.filter((b) => b.isOccupied).length;
  const availableCount = beds.length - occupiedCount;

  function handleDischarge(bedNumber: number) {
    setBeds(
      beds.map((b) =>
        b.bedNumber === bedNumber
          ? { bedNumber, isOccupied: false }
          : b
      )
    );
    setSelectedBed(null);
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#06b6d4', background: 'rgba(6, 182, 212, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Inpatient Sickbay
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Ward Bed Monitoring Matrix</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Inpatient Ward (Beds 1 – 6)
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Live bed occupancy, intravenous drips, vital trends, and discharge authorizations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 8,
              background: cardGrad(isDark),
              border: `1px solid ${tk.cardBorder}`,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span style={{ color: '#10b981' }}>{availableCount} Beds Free</span>
            <span style={{ color: tk.subText }}>•</span>
            <span style={{ color: '#f59e0b' }}>{occupiedCount} Beds Occupied</span>
          </div>
        </div>
      </div>

      {/* 6 Bed Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 30 }}>
        {beds.map((b) => (
          <div
            key={b.bedNumber}
            style={{
              background: cardGrad(isDark),
              border: `1.5px solid ${b.isOccupied ? 'rgba(245, 158, 11, 0.35)' : tk.cardBorder}`,
              borderRadius: 14,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              boxShadow: b.isOccupied ? '0 4px 16px rgba(245, 158, 11, 0.08)' : 'none',
            }}
          >
            <div>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: b.isOccupied ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BedDouble
                      className="w-5 h-5"
                      style={{ color: b.isOccupied ? '#f59e0b' : '#10b981' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: tk.text, fontFamily: SORA }}>
                      Bed {b.bedNumber}
                    </div>
                    <div style={{ fontSize: 11, color: tk.subText }}>General Ward Block A</div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 99,
                    background: b.isOccupied ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: b.isOccupied ? '#f59e0b' : '#10b981',
                  }}
                >
                  {b.isOccupied ? 'Occupied' : 'Vacant'}
                </span>
              </div>

              {b.isOccupied ? (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: tk.text, marginBottom: 2 }}>
                    {b.patientName}
                  </div>
                  <div style={{ fontSize: 12, color: tk.subText, marginBottom: 10 }}>
                    {b.className} • {b.admissionNo}
                  </div>

                  <div
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: 8,
                      padding: 10,
                      marginBottom: 12,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: tk.text, marginBottom: 4 }}>
                      Diagnosis: <span style={{ fontWeight: 400, color: tk.subText }}>{b.diagnosis}</span>
                    </div>
                    {b.ivInfusion && (
                      <div style={{ color: '#06b6d4', fontWeight: 600 }}>
                        IV / Treatment: <span style={{ fontWeight: 400 }}>{b.ivInfusion}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Thermometer className="w-4 h-4 text-rose-400" />
                      <span style={{ color: tk.text, fontWeight: 600 }}>{b.temp}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HeartPulse className="w-4 h-4 text-emerald-400" />
                      <span style={{ color: tk.text, fontWeight: 600 }}>{b.pulse}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: tk.subText, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Admitted: {b.admittedAt}</span>
                  </div>

                  {b.guardianPhone && (
                    <div style={{ fontSize: 11, color: tk.subText, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Phone className="w-3.5 h-3.5" />
                      <span>Guardian: {b.guardianPhone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '24px 0', textAlign: 'center', color: tk.subText }}>
                  <p style={{ fontSize: 13, margin: '0 0 8px' }}>Bed is sanitized and ready for patient admission.</p>
                  <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Available for emergency intake</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ marginTop: 18, borderTop: `1px solid ${tk.cardBorder}`, paddingTop: 12 }}>
              {b.isOccupied ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedBed(b)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: `1px solid ${tk.cardBorder}`,
                      color: tk.text,
                      padding: '6px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    View Chart
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDischarge(b.bedNumber)}
                    style={{
                      background: '#10b981',
                      border: 'none',
                      color: '#ffffff',
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Discharge
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  style={{
                    width: '100%',
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${tk.cardBorder}`,
                    color: tk.subText,
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: 'default',
                  }}
                >
                  Bed Vacant
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Chart Detail Modal */}
      <NativeModal
        isOpen={!!selectedBed}
        onClose={() => setSelectedBed(null)}
        title={selectedBed ? `Bed ${selectedBed.bedNumber} Clinical Chart` : 'Clinical Chart'}
        subtitle={selectedBed?.patientName ? `${selectedBed.patientName} • ${selectedBed.className || 'Inpatient'}` : 'Inpatient Ward Record'}
        icon={BedDouble}
        size="lg"
      >
        {selectedBed && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4 bg-white/[0.04] border border-white/10 space-y-1">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                Medical Diagnosis
              </span>
              <p className="text-xs font-semibold text-white/90">
                {selectedBed.diagnosis || 'Under clinical observation'}
              </p>
            </div>

            <div className="rounded-2xl p-4 bg-cyan-500/10 border border-cyan-500/20 space-y-1">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                Intravenous / Prescription Plan
              </span>
              <p className="text-xs font-mono font-medium text-cyan-200">
                {selectedBed.ivInfusion || 'No active intravenous infusions'}
              </p>
            </div>

            <div className="rounded-2xl p-4 bg-white/[0.04] border border-white/10 space-y-1">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                Clinical Nursing Notes
              </span>
              <p className="text-xs text-white/75 leading-relaxed">
                {selectedBed.notes || 'Routine vitals stable; patient resting comfortably.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-3.5 bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
                  Recorded Temperature
                </span>
                <span className="text-base font-bold text-rose-400 mt-1 block font-mono">
                  {selectedBed.temp || '--'}
                </span>
              </div>
              <div className="rounded-2xl p-3.5 bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                  Pulse Rate
                </span>
                <span className="text-base font-bold text-emerald-400 mt-1 block font-mono">
                  {selectedBed.pulse || '--'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setSelectedBed(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
              >
                Close Chart
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDischarge(selectedBed.bedNumber);
                  setSelectedBed(null);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all"
              >
                Authorize Discharge
              </button>
            </div>
          </div>
        )}
      </NativeModal>
    </div>
  );
}
