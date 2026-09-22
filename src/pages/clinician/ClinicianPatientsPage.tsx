import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  HeartPulse,
  Thermometer,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Building2,
  X,
  Stethoscope,
  Activity,
  BedDouble,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

interface PatientRecord {
  id: string;
  name: string;
  type: 'Student' | 'Staff' | 'Visitor';
  className?: string;
  admissionNo?: string;
  complaint: string;
  temp: string;
  bp: string;
  pulse: string;
  priority: 'High' | 'Medium' | 'Low';
  treatment: string;
  clinician: string;
  status: 'In Consultation' | 'Resting in Bed' | 'Discharged to Class' | 'Referred';
  timeIn: string;
}

const INITIAL_PATIENTS: PatientRecord[] = [
  {
    id: 'p-1',
    name: 'Grace Nakato',
    type: 'Student',
    className: 'Primary 5 Blue',
    admissionNo: 'ADM-2024-082',
    complaint: 'Severe headache, shivering chills, bodily malaise',
    temp: '38.8°C',
    bp: '110/72',
    pulse: '98 bpm',
    priority: 'High',
    treatment: 'Coartem malaria course dose 1, Paracetamol 500mg, oral rehydration',
    clinician: 'Dr. Sarah Nabatanzi',
    status: 'Resting in Bed',
    timeIn: '08:15 AM',
  },
  {
    id: 'p-2',
    name: 'Joshua Kateregga',
    type: 'Student',
    className: 'Senior 3 West',
    admissionNo: 'ADM-2023-119',
    complaint: 'Right lateral ankle sprain sustained in PE football drill',
    temp: '36.6°C',
    bp: '122/80',
    pulse: '76 bpm',
    priority: 'Medium',
    treatment: 'Ice pack compression, crepe bandage support, oral Ibuprofen 400mg',
    clinician: 'Dr. Sarah Nabatanzi',
    status: 'Discharged to Class',
    timeIn: '09:20 AM',
  },
  {
    id: 'p-3',
    name: 'Florence Namukasa',
    type: 'Student',
    className: 'Primary 3 Green',
    admissionNo: 'ADM-2025-045',
    complaint: 'Recurrent dry cough and wheezing after morning assembly',
    temp: '37.1°C',
    bp: '105/68',
    pulse: '88 bpm',
    priority: 'High',
    treatment: 'Salbutamol 2 puffs via spacer, rest 30 mins, chest auscultation',
    clinician: 'Nurse Ronald Magezi',
    status: 'Resting in Bed',
    timeIn: '10:05 AM',
  },
  {
    id: 'p-4',
    name: 'Mr. Kato Brian',
    type: 'Staff',
    className: 'Chemistry Dept',
    complaint: 'Sudden sharp epigastric abdominal pain, nausea',
    temp: '36.9°C',
    bp: '135/88',
    pulse: '84 bpm',
    priority: 'Medium',
    treatment: 'Antacid suspension 15ml, Omeprazole 20mg, observation',
    clinician: 'Dr. Sarah Nabatanzi',
    status: 'Discharged to Class',
    timeIn: '10:45 AM',
  },
  {
    id: 'p-5',
    name: 'Brian Ssemwogerere',
    type: 'Student',
    className: 'Senior 2 East',
    admissionNo: 'ADM-2024-201',
    complaint: 'Deep laceration on left palm from broken beaker glass',
    temp: '36.7°C',
    bp: '118/75',
    pulse: '82 bpm',
    priority: 'High',
    treatment: 'Wound irrigation with normal saline, antiseptic dressing, Tetanus toxoid booster prescribed',
    clinician: 'Nurse Ronald Magezi',
    status: 'Referred',
    timeIn: '11:15 AM',
  },
];

export default function ClinicianPatientsPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Student' | 'Staff'>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [patients, setPatients] = useState<PatientRecord[]>(INITIAL_PATIENTS);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'Student' | 'Staff' | 'Visitor'>('Student');
  const [newClass, setNewClass] = useState('');
  const [newAdm, setNewAdm] = useState('');
  const [newComplaint, setNewComplaint] = useState('');
  const [newTemp, setNewTemp] = useState('36.8°C');
  const [newBp, setNewBp] = useState('120/80');
  const [newPulse, setNewPulse] = useState('78 bpm');
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTreatment, setNewTreatment] = useState('');
  const [newStatus, setNewStatus] = useState<'In Consultation' | 'Resting in Bed' | 'Discharged to Class' | 'Referred'>('Discharged to Class');

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.complaint.toLowerCase().includes(search.toLowerCase()) ||
        (p.className && p.className.toLowerCase().includes(search.toLowerCase())) ||
        (p.admissionNo && p.admissionNo.toLowerCase().includes(search.toLowerCase()));
      const matchType = filterType === 'All' || p.type === filterType;
      const matchStatus = filterStatus === 'All' || p.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [patients, search, filterType, filterStatus]);

  function handleAddPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newComplaint.trim()) return;

    const record: PatientRecord = {
      id: `p-${Date.now()}`,
      name: newName.trim(),
      type: newType,
      className: newClass.trim() || undefined,
      admissionNo: newAdm.trim() || undefined,
      complaint: newComplaint.trim(),
      temp: newTemp.trim(),
      bp: newBp.trim(),
      pulse: newPulse.trim(),
      priority: newPriority,
      treatment: newTreatment.trim() || 'Prescription pending full clinical evaluation',
      clinician: 'Attending Clinician',
      status: newStatus,
      timeIn: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    setPatients([record, ...patients]);
    setShowAddModal(false);
    // reset
    setNewName('');
    setNewClass('');
    setNewAdm('');
    setNewComplaint('');
    setNewTreatment('');
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Outpatient Triage
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Daily Sickbay Register</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Triage & Patient Log
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Live record of students, teachers, and staff visits to the school sickbay.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
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
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Record Outpatient Visit</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>Total Visited Today</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: tk.text, fontFamily: SORA }}>{patients.length}</div>
          <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>All triage registered</div>
        </div>

        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>Currently in Bed</span>
            <BedDouble className="w-4 h-4 text-amber-500" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: tk.text, fontFamily: SORA }}>
            {patients.filter((p) => p.status === 'Resting in Bed').length}
          </div>
          <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>Under medical observation</div>
        </div>

        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>Discharged to Class</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-500" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: tk.text, fontFamily: SORA }}>
            {patients.filter((p) => p.status === 'Discharged to Class').length}
          </div>
          <div style={{ fontSize: 11, color: '#06b6d4', marginTop: 4 }}>Fit to resume lessons</div>
        </div>

        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>High Priority / Severe</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f43f5e', fontFamily: SORA }}>
            {patients.filter((p) => p.priority === 'High').length}
          </div>
          <div style={{ fontSize: 11, color: '#f43f5e', marginTop: 4 }}>Requires constant monitoring</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260 }}>
          <Search className="w-4 h-4" style={{ color: tk.subText }} />
          <input
            type="text"
            placeholder="Search patient name, admission no, symptoms, class..."
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

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
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
            <option value="All">All Categories</option>
            <option value="Student">Students Only</option>
            <option value="Staff">Staff Only</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
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
            <option value="All">All Statuses</option>
            <option value="Resting in Bed">Resting in Bed</option>
            <option value="Discharged to Class">Discharged to Class</option>
            <option value="Referred">Hospital Referred</option>
          </select>
        </div>
      </div>

      {/* Patient Table */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Patient</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Chief Complaint</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Vitals (Temp / BP)</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Treatment & Notes</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Priority</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: tk.subText }}>
                    No matching triage patients found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: tk.text }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: tk.subText }}>
                        {p.className || p.type} {p.admissionNo ? `• ${p.admissionNo}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', maxWidth: 220, color: tk.text }}>
                      {p.complaint}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tk.text, fontWeight: 600 }}>
                        <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                        <span>{p.temp}</span>
                      </div>
                      <div style={{ fontSize: 11, color: tk.subText, marginTop: 2 }}>
                        BP: {p.bp} | HR: {p.pulse}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', maxWidth: 240, fontSize: 12, color: tk.subText }}>
                      {p.treatment}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 99,
                          background:
                            p.priority === 'High'
                              ? 'rgba(244,63,94,0.15)'
                              : p.priority === 'Medium'
                              ? 'rgba(245,158,11,0.15)'
                              : 'rgba(16,185,129,0.15)',
                          color:
                            p.priority === 'High'
                              ? '#f43f5e'
                              : p.priority === 'Medium'
                              ? '#f59e0b'
                              : '#10b981',
                        }}
                      >
                        {p.priority}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background:
                            p.status === 'Resting in Bed'
                              ? 'rgba(245,158,11,0.1)'
                              : p.status === 'Discharged to Class'
                              ? 'rgba(16,185,129,0.1)'
                              : 'rgba(244,63,94,0.1)',
                          color:
                            p.status === 'Resting in Bed'
                              ? '#f59e0b'
                              : p.status === 'Discharged to Class'
                              ? '#10b981'
                              : '#f43f5e',
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: tk.subText, whiteSpace: 'nowrap' }}>
                      {p.timeIn}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Outpatient Visit Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: isDark ? '#0f172a' : '#ffffff',
              border: `1px solid ${tk.cardBorder}`,
              borderRadius: 16,
              width: '100%',
              maxWidth: 540,
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Stethoscope className="w-5 h-5 text-emerald-500" />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
                  New Outpatient Encounter
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: tk.subText, cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPatient} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Namyalo Mary"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: isDark ? '#1e293b' : '#f8fafc',
                    border: `1px solid ${tk.cardBorder}`,
                    color: tk.text,
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: isDark ? '#1e293b' : '#f8fafc',
                      border: `1px solid ${tk.cardBorder}`,
                      color: tk.text,
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Student">Student</option>
                    <option value="Staff">Staff / Teacher</option>
                    <option value="Visitor">Visitor</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Class / Dept
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Primary 6 Blue"
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: isDark ? '#1e293b' : '#f8fafc',
                      border: `1px solid ${tk.cardBorder}`,
                      color: tk.text,
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Chief Complaint / Symptoms *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe observed illness, injuries, or pains..."
                  value={newComplaint}
                  onChange={(e) => setNewComplaint(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: isDark ? '#1e293b' : '#f8fafc',
                    border: `1px solid ${tk.cardBorder}`,
                    color: tk.text,
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Temperature
                  </label>
                  <input
                    type="text"
                    value={newTemp}
                    onChange={(e) => setNewTemp(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: isDark ? '#1e293b' : '#f8fafc',
                      border: `1px solid ${tk.cardBorder}`,
                      color: tk.text,
                      fontSize: 12,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Blood Pressure
                  </label>
                  <input
                    type="text"
                    value={newBp}
                    onChange={(e) => setNewBp(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: isDark ? '#1e293b' : '#f8fafc',
                      border: `1px solid ${tk.cardBorder}`,
                      color: tk.text,
                      fontSize: 12,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: isDark ? '#1e293b' : '#f8fafc',
                      border: `1px solid ${tk.cardBorder}`,
                      color: tk.text,
                      fontSize: 12,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Treatment / Prescribed Medications
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol 500mg, rest for 1 hour"
                  value={newTreatment}
                  onChange={(e) => setNewTreatment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: isDark ? '#1e293b' : '#f8fafc',
                    border: `1px solid ${tk.cardBorder}`,
                    color: tk.text,
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Disposition / Action
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: isDark ? '#1e293b' : '#f8fafc',
                    border: `1px solid ${tk.cardBorder}`,
                    color: tk.text,
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Discharged to Class">Discharged to Class</option>
                  <option value="Resting in Bed">Admit to Inpatient Bed</option>
                  <option value="Referred">Transfer / Refer to External Hospital</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${tk.cardBorder}`,
                    color: tk.subText,
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#10b981',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Encounter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
