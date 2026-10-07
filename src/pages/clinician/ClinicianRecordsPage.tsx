import { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  AlertTriangle,
  HeartPulse,
  Phone,
  ShieldAlert,
  Plus,
  User,
  Activity,
  X,
  Stethoscope,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';

interface MedicalAlertRecord {
  id: string;
  studentName: string;
  className: string;
  admissionNo: string;
  condition: string;
  conditionCategory: 'Asthma' | 'Sickle Cell' | 'Diabetes' | 'Epilepsy' | 'Severe Allergy' | 'Cardiac';
  severity: 'Critical' | 'Moderate' | 'Manageable';
  emergencyProtocol: string;
  medicationStored: string;
  parentContact: string;
  doctorNotes: string;
}

const INITIAL_ALERTS: MedicalAlertRecord[] = [
  {
    id: 'a-1',
    studentName: 'Florence Namukasa',
    className: 'Primary 3 Green',
    admissionNo: 'ADM-2025-045',
    condition: 'Chronic Bronchial Asthma (Cold & Exercise Induced)',
    conditionCategory: 'Asthma',
    severity: 'Critical',
    emergencyProtocol: 'Administer 2 puffs Salbutamol inhaler with spacer. If wheeze persists > 10 mins, give 4 puffs and contact parent immediately.',
    medicationStored: 'Salbutamol Inhaler (Labeled in Clinic Locker 3)',
    parentContact: 'Mrs. Namukasa Grace (+256 782 555 120)',
    doctorNotes: 'Excused from early morning cross-country running when weather is chilly.',
  },
  {
    id: 'a-2',
    studentName: 'Emmanuel Ssenkungu',
    className: 'Senior 2 East',
    admissionNo: 'ADM-2024-118',
    condition: 'Sickle Cell Anaemia (HbSS)',
    conditionCategory: 'Sickle Cell',
    severity: 'Critical',
    emergencyProtocol: 'Hydrate immediately with oral/IV fluids during crisis pain. Keep warm. Administer prescribed analgesics. Never apply cold packs.',
    medicationStored: 'Folic Acid, Hydroxyurea, Oral Paracetamol/Ibuprofen',
    parentContact: 'Mr. Ronald Ssenkungu (+256 772 889 001)',
    doctorNotes: 'Must be allowed unrestricted water access and restroom visits. Avoid rigorous athletics.',
  },
  {
    id: 'a-3',
    studentName: 'Maria Atuhaire',
    className: 'Senior 4 West',
    admissionNo: 'ADM-2023-054',
    condition: 'Severe Anaphylactic Peanut & Cashew Allergy',
    conditionCategory: 'Severe Allergy',
    severity: 'Critical',
    emergencyProtocol: 'Immediate intramuscular EpiPen (Epinephrine 0.3mg) to outer thigh on ingestion. Call emergency ambulance.',
    medicationStored: 'EpiPen Auto-Injector in Emergency Red Box',
    parentContact: 'Dr. Joseph Atuhaire (+256 701 998 776)',
    doctorNotes: 'Cafeteria staff notified: strict zero nut cross-contamination.',
  },
  {
    id: 'a-4',
    studentName: 'Trevor Kasozi',
    className: 'Primary 6 Red',
    admissionNo: 'ADM-2024-302',
    condition: 'Juvenile Type 1 Diabetes Mellitus',
    conditionCategory: 'Diabetes',
    severity: 'Moderate',
    emergencyProtocol: 'Test blood glucose if shaky or lethargic. If hypoglycemic (<4.0 mmol/L), give glucose sweets or fruit juice.',
    medicationStored: 'Glucometer + Glucagon Emergency Kit in Clinic Fridge',
    parentContact: 'Ms. Juliet Kasozi (+256 752 443 210)',
    doctorNotes: 'Mid-morning snack permitted at 10:30 AM before lessons.',
  },
];

export default function ClinicianRecordsPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [alerts, setAlerts] = useState<MedicalAlertRecord[]>(INITIAL_ALERTS);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedRecord, setSelectedRecord] = useState<MedicalAlertRecord | null>(null);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      const matchSearch =
        a.studentName.toLowerCase().includes(search.toLowerCase()) ||
        a.admissionNo.toLowerCase().includes(search.toLowerCase()) ||
        a.condition.toLowerCase().includes(search.toLowerCase()) ||
        a.className.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'All' || a.conditionCategory === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [alerts, search, categoryFilter]);

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Medical Alerts & Special Needs
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Confidential Health Directory</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Chronic Conditions & Allergies
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Instant reference for students with critical medical conditions, action protocols, and stored medications.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          background: cardGrad(isDark),
          border: `1px solid ${tk.cardBorder}`,
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260 }}>
          <Search className="w-4 h-4" style={{ color: tk.subText }} />
          <input
            type="text"
            placeholder="Search student name, admission number, asthma, allergy..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: tk.text,
              fontSize: 13,
              width: '100%',
              fontFamily: INTER,
            }}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            background: isDark ? '#1e293b' : '#ffffff',
            color: tk.text,
            border: `1px solid ${tk.cardBorder}`,
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontFamily: INTER,
          }}
        >
          <option value="All">All Medical Categories</option>
          <option value="Asthma">Asthma</option>
          <option value="Sickle Cell">Sickle Cell Anaemia</option>
          <option value="Severe Allergy">Severe Allergy / Anaphylaxis</option>
          <option value="Diabetes">Diabetes</option>
          <option value="Epilepsy">Epilepsy</option>
        </select>
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {filtered.map((r) => (
          <div
            key={r.id}
            style={{
              background: cardGrad(isDark),
              border: `1px solid ${tk.cardBorder}`,
              borderRadius: 14,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, border-color 0.15s ease',
            }}
            onClick={() => setSelectedRecord(r)}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background:
                      r.conditionCategory === 'Severe Allergy'
                        ? 'rgba(244,63,94,0.15)'
                        : r.conditionCategory === 'Sickle Cell'
                        ? 'rgba(168,85,247,0.15)'
                        : 'rgba(6,182,212,0.15)',
                    color:
                      r.conditionCategory === 'Severe Allergy'
                        ? '#f43f5e'
                        : r.conditionCategory === 'Sickle Cell'
                        ? '#a855f7'
                        : '#06b6d4',
                  }}
                >
                  {r.conditionCategory}
                </span>

                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(244,63,94,0.12)',
                    color: '#f43f5e',
                  }}
                >
                  {r.severity}
                </span>
              </div>

              <h3 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
                {r.studentName}
              </h3>
              <div style={{ fontSize: 12, color: tk.subText, marginBottom: 12 }}>
                {r.className} • {r.admissionNo}
              </div>

              <div
                style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 10,
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 600, color: tk.text }}>Primary Condition:</div>
                <div style={{ color: tk.subText, marginTop: 2 }}>{r.condition}</div>
              </div>

              <div style={{ fontSize: 12, marginBottom: 8 }}>
                <span style={{ fontWeight: 600, color: '#f59e0b' }}>Emergency Action: </span>
                <span style={{ color: tk.subText }}>{r.emergencyProtocol.slice(0, 95)}...</span>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${tk.cardBorder}`, paddingTop: 10, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: tk.subText }}>
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span>{r.parentContact}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Record Details Modal */}
      <NativeModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title={selectedRecord?.studentName || 'Student Medical Record'}
        subtitle={selectedRecord ? `${selectedRecord.className} • ${selectedRecord.admissionNo}` : undefined}
        icon={HeartPulse}
        size="lg"
      >
        {selectedRecord && (
          <div className="flex flex-col gap-3 text-white">
            <div className="p-3.5 rounded-xl border border-white/15 bg-black/25">
              <div className="text-xs font-semibold text-white/70">Condition Description</div>
              <div className="text-sm font-medium text-white mt-1">{selectedRecord.condition}</div>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/15">
              <div className="text-xs font-bold text-rose-300">Emergency Action Protocol</div>
              <div className="text-sm text-white/90 mt-1 leading-relaxed">
                {selectedRecord.emergencyProtocol}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-white/15 bg-black/25">
              <div className="text-xs font-semibold text-white/70">Medication Stored on Campus</div>
              <div className="text-sm font-bold text-emerald-400 mt-1">{selectedRecord.medicationStored}</div>
            </div>

            <div className="p-3.5 rounded-xl border border-white/15 bg-black/25">
              <div className="text-xs font-semibold text-white/70">Emergency Contact</div>
              <div className="text-sm font-medium text-white mt-1">{selectedRecord.parentContact}</div>
            </div>

            <div className="p-3.5 rounded-xl border border-white/15 bg-black/25">
              <div className="text-xs font-semibold text-white/70">Physician Guidance</div>
              <div className="text-sm text-white/80 mt-1">{selectedRecord.doctorNotes}</div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/15">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </NativeModal>
    </div>
  );
}
