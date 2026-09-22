import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import {
  HeartPulse,
  BedDouble,
  AlertTriangle,
  Pill,
  Plus,
  Search,
  Clock,
  UserCheck,
  Phone,
  Thermometer,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowRight,
  Activity,
  FileSpreadsheet,
  Building2,
  Users,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

interface ClinicPatient {
  id: string;
  patient_name: string;
  patient_type: 'Student' | 'Staff' | 'Visitor';
  class_name?: string;
  admission_number?: string;
  complaint: string;
  temperature: string;
  treatment: string;
  bed_number?: string | null;
  status: 'Resting in Bed' | 'Discharged to Class' | 'Sent Home' | 'Referred to Hospital';
  parent_contact?: string;
  time_in: string;
  time_out?: string | null;
}

const DEFAULT_PATIENTS: ClinicPatient[] = [
  {
    id: 'c1',
    patient_name: 'Grace Nakato',
    patient_type: 'Student',
    class_name: 'Primary 5 Blue',
    admission_number: 'ADM-2024-082',
    complaint: 'High fever, severe headache and chills',
    temperature: '38.8°C',
    treatment: 'Coartem malaria dose, Paracetamol 500mg, Hydration',
    bed_number: 'Bed 2',
    status: 'Resting in Bed',
    parent_contact: '+256 772 123 456',
    time_in: new Date(Date.now() - 3600000 * 2.5).toISOString(),
  },
  {
    id: 'c2',
    patient_name: 'Joshua Kateregga',
    patient_type: 'Student',
    class_name: 'Senior 3 West',
    admission_number: 'ADM-2023-119',
    complaint: 'Right ankle sprain during PE sports session',
    temperature: '36.6°C',
    treatment: 'Cold compress, crepe bandage elevation, Ibuprofen',
    bed_number: null,
    status: 'Discharged to Class',
    parent_contact: '+256 701 987 654',
    time_in: new Date(Date.now() - 3600000 * 4).toISOString(),
    time_out: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'c3',
    patient_name: 'Florence Namukasa',
    patient_type: 'Student',
    class_name: 'Primary 3 Green',
    admission_number: 'ADM-2025-045',
    complaint: 'Abdominal cramps and mild nausea after lunch',
    temperature: '37.1°C',
    treatment: 'Buscopan, Oral Rehydration Salts (ORS)',
    bed_number: 'Bed 4',
    status: 'Resting in Bed',
    parent_contact: '+256 782 555 019',
    time_in: new Date(Date.now() - 3600000 * 1.2).toISOString(),
  },
  {
    id: 'c4',
    patient_name: 'Mr. Ronald Ssebaggala',
    patient_type: 'Staff',
    class_name: 'Science Dept',
    admission_number: 'STAFF-022',
    complaint: 'Migraine and fatigue',
    temperature: '36.8°C',
    treatment: 'Diclofenac + rest for 45 mins',
    bed_number: null,
    status: 'Discharged to Class',
    parent_contact: '+256 752 444 888',
    time_in: new Date(Date.now() - 3600000 * 5).toISOString(),
    time_out: new Date(Date.now() - 3600000 * 4.2).toISOString(),
  },
];

const ESSENTIAL_MEDICINES = [
  { item: 'Paracetamol 500mg', category: 'Analgesic', stock: '340 tabs', status: 'Adequate', alert: false },
  { item: 'Coartem (Artemether)', category: 'Antimalarial', stock: '18 doses', status: 'Low Stock', alert: true },
  { item: 'ORS Sachets', category: 'Hydration', stock: '85 packs', status: 'Adequate', alert: false },
  { item: 'Amoxicillin 250mg', category: 'Antibiotic', stock: '12 bottles', status: 'Adequate', alert: false },
  { item: 'Salbutamol Inhaler', category: 'Emergency Respiratory', stock: '2 units', status: 'Critical', alert: true },
  { item: 'Crepe Bandages & Gauze', category: 'First Aid Trauma', stock: '24 rolls', status: 'Adequate', alert: false },
];

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return iso.slice(11, 16);
  }
}

export default function DesignClinicDashboard() {
  const navigate = useNavigate();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<ClinicPatient[]>(DEFAULT_PATIENTS);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    type: 'Student' as 'Student' | 'Staff' | 'Visitor',
    className: '',
    complaint: '',
    temperature: '37.0°C',
    treatment: '',
    bed: '',
    status: 'Resting in Bed' as ClinicPatient['status'],
    parentPhone: '',
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Metrics
  const metrics = useMemo(() => {
    const treatedToday = patients.length;
    const restingInBed = patients.filter((p) => p.status === 'Resting in Bed').length;
    const referred = patients.filter((p) => p.status === 'Referred to Hospital').length;
    const lowSupplies = ESSENTIAL_MEDICINES.filter((m) => m.alert).length;
    return { treatedToday, restingInBed, referred, lowSupplies };
  }, [patients]);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.patient_name.toLowerCase().includes(q) ||
        p.complaint.toLowerCase().includes(q) ||
        (p.class_name && p.class_name.toLowerCase().includes(q)) ||
        p.treatment.toLowerCase().includes(q)
    );
  }, [patients, search]);

  const handleLogPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name.trim() || !newPatient.complaint.trim()) return;

    const entry: ClinicPatient = {
      id: `c_${Date.now()}`,
      patient_name: newPatient.name.trim(),
      patient_type: newPatient.type,
      class_name: newPatient.className.trim() || undefined,
      complaint: newPatient.complaint.trim(),
      temperature: newPatient.temperature.trim() || '37.0°C',
      treatment: newPatient.treatment.trim() || 'First aid triage',
      bed_number: newPatient.bed.trim() || null,
      status: newPatient.status,
      parent_contact: newPatient.parentPhone.trim() || undefined,
      time_in: new Date().toISOString(),
    };

    setPatients([entry, ...patients]);
    setShowLogModal(false);
    setNewPatient({
      name: '',
      type: 'Student',
      className: '',
      complaint: '',
      temperature: '37.0°C',
      treatment: '',
      bed: '',
      status: 'Resting in Bed',
      parentPhone: '',
    });
  };

  const handleDischarge = (id: string) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'Discharged to Class',
              bed_number: null,
              time_out: new Date().toISOString(),
            }
          : p
      )
    );
  };

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-none"
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
        fontFamily: INTER,
      }}
    >
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
              style={{
                backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(225,29,72,0.12)',
                color: t.red,
                fontFamily: SORA,
              }}
            >
              SCHOOL SICKBAY & CLINIC
            </span>
            <span className="text-xs" style={{ color: t.textLow }}>• {today}</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
            style={{ fontFamily: SORA, color: t.textHi }}
          >
            {greeting}, Health Clinician
          </h1>
          <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
            Monitor student health triage, sickbay bed occupancy, medications, and emergency referrals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-[1.02] self-start md:self-auto"
          style={{
            background: 'linear-gradient(135deg,#ef4444,#f43f5e)',
            color: '#ffffff',
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Log Clinic Visit</span>
        </button>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Treated Today */}
        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Treated Today
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.1)',
                color: t.mint,
              }}
            >
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {metrics.treatedToday}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Students & staff attended
          </div>
        </div>

        {/* Resting in Sickbay Beds */}
        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              In Sickbay Beds
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(217,119,6,0.1)',
                color: t.gold,
              }}
            >
              <BedDouble className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {metrics.restingInBed} / 6
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Active bed ward occupancy
          </div>
        </div>

        {/* Emergency Referrals */}
        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Emergency Cases
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(225,29,72,0.1)',
                color: t.red,
              }}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {metrics.referred}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Hospital referral / parents called
          </div>
        </div>

        {/* Low Medicine Alerts */}
        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Supply Alerts
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(147,51,234,0.1)',
                color: '#a855f7',
              }}
            >
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {metrics.lowSupplies}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Medicines needing re-stocking
          </div>
        </div>
      </div>

      {/* Dual Column: Patient Register + Sickbay Beds / Dispensary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patients Register Table (2 Cols) */}
        <div
          className="lg:col-span-2 p-5 rounded-2xl shadow-sm flex flex-col"
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: t.divider }}>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                Today's Clinic Register & Triage
              </span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.textLow }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, symptoms..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none"
                style={{
                  backgroundColor: t.fieldBg,
                  border: `1px solid ${t.stroke}`,
                  color: t.textHi,
                }}
              />
            </div>
          </div>

          <div className="mt-3 divide-y overflow-x-auto" style={{ borderColor: t.divider }}>
            {filteredPatients.length === 0 ? (
              <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
                No patient logs matching your search.
              </div>
            ) : (
              filteredPatients.map((p) => {
                const isResting = p.status === 'Resting in Bed';
                const isDischarged = p.status === 'Discharged to Class';
                const isReferred = p.status === 'Referred to Hospital';

                return (
                  <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5"
                        style={{
                          backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(225,29,72,0.1)',
                          color: t.red,
                        }}
                      >
                        {p.patient_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color: t.textHi }}>
                            {p.patient_name}
                          </span>
                          {p.class_name && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">
                              {p.class_name}
                            </span>
                          )}
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold"
                            style={{
                              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                              color: t.textMid,
                            }}
                          >
                            Temp: {p.temperature}
                          </span>
                        </div>

                        <div className="text-[11px] mt-1" style={{ color: t.textMid }}>
                          <span className="font-semibold text-rose-400">Symptoms:</span> {p.complaint}
                        </div>
                        <div className="text-[11px]" style={{ color: t.textLow }}>
                          <span className="font-semibold text-emerald-500">Treatment:</span> {p.treatment}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: isResting
                              ? isDark
                                ? 'rgba(245,158,11,0.15)'
                                : 'rgba(217,119,6,0.12)'
                              : isDischarged
                              ? isDark
                                ? 'rgba(16,217,168,0.15)'
                                : 'rgba(16,185,129,0.12)'
                              : isDark
                              ? 'rgba(239,68,68,0.15)'
                              : 'rgba(225,29,72,0.12)',
                            color: isResting ? t.gold : isDischarged ? t.mint : t.red,
                          }}
                        >
                          {p.bed_number ? `${p.status} (${p.bed_number})` : p.status}
                        </span>
                        <div className="text-[10px] mt-0.5" style={{ color: t.textLow }}>
                          In: {fmtTime(p.time_in)}
                        </div>
                      </div>

                      {isResting && (
                        <button
                          type="button"
                          onClick={() => handleDischarge(p.id)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
                          style={{
                            backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                            color: t.mint,
                            border: `1px solid ${t.mint}`,
                          }}
                        >
                          Discharge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Sickbay Beds & Medical Dispensary Inventory */}
        <div className="space-y-6">
          {/* Sickbay Ward Beds */}
          <div
            className="p-5 rounded-2xl shadow-sm"
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
              <div className="flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                  Ward Beds Layout
                </span>
              </div>
              <span className="text-xs" style={{ color: t.textLow }}>6 Beds</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-3">
              {[1, 2, 3, 4, 5, 6].map((num) => {
                const bedLabel = `Bed ${num}`;
                const patient = patients.find((p) => p.bed_number === bedLabel && p.status === 'Resting in Bed');
                const isOccupied = !!patient;

                return (
                  <div
                    key={num}
                    className="p-3 rounded-xl flex flex-col justify-between"
                    style={{
                      backgroundColor: isOccupied
                        ? isDark
                          ? 'rgba(245,158,11,0.1)'
                          : 'rgba(217,119,6,0.08)'
                        : isDark
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${isOccupied ? t.gold : t.divider}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: isOccupied ? t.gold : t.textMid }}>
                        {bedLabel}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: isOccupied ? t.gold : '#10b981' }}
                      />
                    </div>
                    <div className="text-[11px] mt-1 truncate" style={{ color: isOccupied ? t.textHi : t.textLow }}>
                      {isOccupied ? patient.patient_name : 'Available'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dispensary Medicines */}
          <div
            className="p-5 rounded-2xl shadow-sm"
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                  Emergency First-Aid Stock
                </span>
              </div>
            </div>

            <div className="mt-3 divide-y" style={{ borderColor: t.divider }}>
              {ESSENTIAL_MEDICINES.map((m) => (
                <div key={m.item} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-semibold" style={{ color: t.textHi }}>{m.item}</div>
                    <div className="text-[10px]" style={{ color: t.textLow }}>{m.category}</div>
                  </div>
                  <div className="text-right">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: m.alert
                          ? isDark
                            ? 'rgba(239,68,68,0.15)'
                            : 'rgba(225,29,72,0.1)'
                          : isDark
                          ? 'rgba(16,217,168,0.15)'
                          : 'rgba(16,185,129,0.1)',
                        color: m.alert ? t.red : t.mint,
                      }}
                    >
                      {m.stock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Log Clinic Visit Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-500" />
                <h2 className="text-lg font-bold" style={{ fontFamily: SORA }}>
                  Log Clinic Consultation
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogPatient} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    placeholder="Student or staff member name"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Patient Category
                  </label>
                  <select
                    value={newPatient.type}
                    onChange={(e) => setNewPatient({ ...newPatient, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  >
                    <option value="Student">Student</option>
                    <option value="Staff">Staff Member</option>
                    <option value="Visitor">Visitor</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Class / Department
                  </label>
                  <input
                    type="text"
                    value={newPatient.className}
                    onChange={(e) => setNewPatient({ ...newPatient, className: e.target.value })}
                    placeholder="e.g. Primary 6 Blue"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Body Temperature (°C)
                  </label>
                  <input
                    type="text"
                    value={newPatient.temperature}
                    onChange={(e) => setNewPatient({ ...newPatient, temperature: e.target.value })}
                    placeholder="e.g. 37.8°C"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Assign Ward Bed
                  </label>
                  <select
                    value={newPatient.bed}
                    onChange={(e) => setNewPatient({ ...newPatient, bed: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  >
                    <option value="">No Bed (Walking Outpatient)</option>
                    <option value="Bed 1">Bed 1</option>
                    <option value="Bed 2">Bed 2</option>
                    <option value="Bed 3">Bed 3</option>
                    <option value="Bed 4">Bed 4</option>
                    <option value="Bed 5">Bed 5</option>
                    <option value="Bed 6">Bed 6</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Chief Complaint / Symptoms *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPatient.complaint}
                    onChange={(e) => setNewPatient({ ...newPatient, complaint: e.target.value })}
                    placeholder="e.g. Vomiting, stomach pain, dizziness"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Treatment & Medication Administered
                  </label>
                  <input
                    type="text"
                    value={newPatient.treatment}
                    onChange={(e) => setNewPatient({ ...newPatient, treatment: e.target.value })}
                    placeholder="e.g. Paracetamol, rest, clean bandage"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Outcome Status
                  </label>
                  <select
                    value={newPatient.status}
                    onChange={(e) => setNewPatient({ ...newPatient, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  >
                    <option value="Resting in Bed">Resting in Bed</option>
                    <option value="Discharged to Class">Discharged to Class</option>
                    <option value="Sent Home">Sent Home with Guardian</option>
                    <option value="Referred to Hospital">Referred to Outside Hospital</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Parent Emergency Phone
                  </label>
                  <input
                    type="text"
                    value={newPatient.parentPhone}
                    onChange={(e) => setNewPatient({ ...newPatient, parentPhone: e.target.value })}
                    placeholder="07..."
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: t.divider }}>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textMid }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg,#ef4444,#f43f5e)',
                    color: '#ffffff',
                  }}
                >
                  Save Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
