import { useState } from 'react';
import {
  Calendar,
  Clock,
  FlaskConical,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  X,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';
import { LiquidGlassSelect } from '@/components/ui/LiquidGlassSelect';

interface LabSession {
  id: string;
  labName: 'Chemistry Lab' | 'Physics Lab' | 'Biology Lab' | 'ICT / Computer Lab';
  subject: string;
  className: string;
  teacherName: string;
  experimentTitle: string;
  timeSlot: string;
  hazardLevel: 'Low' | 'Moderate' | 'High (Flammable/Acid)';
  status: 'Upcoming' | 'In Session' | 'Completed';
  studentCount: number;
}

const INITIAL_SESSIONS: LabSession[] = [
  {
    id: 's-1',
    labName: 'Chemistry Lab',
    subject: 'Chemistry',
    className: 'Senior 4 East',
    teacherName: 'Mr. Kato Brian',
    experimentTitle: 'Volumetric Acid-Base Titration (0.1M HCl vs 0.1M NaOH)',
    timeSlot: '08:30 AM - 10:00 AM',
    hazardLevel: 'High (Flammable/Acid)',
    status: 'Completed',
    studentCount: 42,
  },
  {
    id: 's-2',
    labName: 'Biology Lab',
    subject: 'Biology',
    className: 'Senior 3 West',
    teacherName: 'Ms. Nabirye Sarah',
    experimentTitle: 'Food Nutrient Tests (Starch, Reducing Sugars & Protein with Biuret)',
    timeSlot: '10:30 AM - 12:00 PM',
    hazardLevel: 'Moderate',
    status: 'In Session',
    studentCount: 38,
  },
  {
    id: 's-3',
    labName: 'Physics Lab',
    subject: 'Physics',
    className: 'Senior 4 North',
    teacherName: 'Mr. Musoke David',
    experimentTitle: 'Determination of Focal Length using Concave Mirrors & Optical Benches',
    timeSlot: '02:00 PM - 03:30 PM',
    hazardLevel: 'Low',
    status: 'Upcoming',
    studentCount: 40,
  },
  {
    id: 's-4',
    labName: 'ICT / Computer Lab',
    subject: 'Computer Studies',
    className: 'Senior 2 East',
    teacherName: 'Mr. Mukasa Paul',
    experimentTitle: 'Spreadsheet Formulas & Relational Database Table Creation',
    timeSlot: '03:45 PM - 05:00 PM',
    hazardLevel: 'Low',
    status: 'Upcoming',
    studentCount: 45,
  },
];

export default function LabSchedulePage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [sessions, setSessions] = useState<LabSession[]>(INITIAL_SESSIONS);
  const [labFilter, setLabFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [newLab, setNewLab] = useState<'Chemistry Lab' | 'Physics Lab' | 'Biology Lab' | 'ICT / Computer Lab'>('Chemistry Lab');
  const [newClass, setNewClass] = useState('');
  const [newTeacher, setNewTeacher] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newHazard, setNewHazard] = useState<'Low' | 'Moderate' | 'High (Flammable/Acid)'>('Low');
  const [newCount, setNewCount] = useState('35');

  const filtered = sessions.filter((s) => labFilter === 'All' || s.labName === labFilter);

  function handleAddSession(e: React.FormEvent) {
    e.preventDefault();
    if (!newClass.trim() || !newTitle.trim()) return;

    const item: LabSession = {
      id: `s-${Date.now()}`,
      labName: newLab,
      subject: newLab.split(' ')[0],
      className: newClass.trim(),
      teacherName: newTeacher.trim() || 'Assigned Instructor',
      experimentTitle: newTitle.trim(),
      timeSlot: newTime.trim() || 'TBD',
      hazardLevel: newHazard,
      status: 'Upcoming',
      studentCount: parseInt(newCount, 10) || 30,
    };

    setSessions([...sessions, item]);
    setShowAddModal(false);
    setNewClass('');
    setNewTeacher('');
    setNewTitle('');
    setNewTime('');
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#0ea5e9', background: 'rgba(14, 165, 233, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Practical Sessions
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>UNEB & Term Practicals Schedule</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Practicals & Lab Booking Timetable
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Book lab rooms, prepare reagent sets, and review hazardous material readiness.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#0ea5e9',
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
          <span>Book Lab Practical</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {['All', 'Chemistry Lab', 'Physics Lab', 'Biology Lab', 'ICT / Computer Lab'].map((lab) => (
          <button
            key={lab}
            type="button"
            onClick={() => setLabFilter(lab)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: `1px solid ${labFilter === lab ? '#0ea5e9' : tk.cardBorder}`,
              background: labFilter === lab ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
              color: labFilter === lab ? '#0ea5e9' : tk.subText,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {lab}
          </button>
        ))}
      </div>

      {/* Sessions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {filtered.map((s) => (
          <div
            key={s.id}
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
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'rgba(14, 165, 233, 0.12)',
                    color: '#0ea5e9',
                  }}
                >
                  {s.labName}
                </span>

                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background:
                      s.status === 'In Session'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : s.status === 'Upcoming'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(148, 163, 184, 0.15)',
                    color:
                      s.status === 'In Session'
                        ? '#10b981'
                        : s.status === 'Upcoming'
                        ? '#f59e0b'
                        : tk.subText,
                  }}
                >
                  {s.status}
                </span>
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
                {s.experimentTitle}
              </h3>

              <div style={{ fontSize: 12, color: tk.subText, marginBottom: 12 }}>
                {s.className} • Instructor: <span style={{ color: tk.text }}>{s.teacherName}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tk.text }}>
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{s.timeSlot}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: tk.subText }}>
                  <Users className="w-3.5 h-3.5" />
                  <span>{s.studentCount} candidates</span>
                </div>
              </div>

              <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: s.hazardLevel.startsWith('High') ? '#f43f5e' : '#f59e0b' }} />
                <span style={{ color: s.hazardLevel.startsWith('High') ? '#f43f5e' : tk.subText, fontWeight: 600 }}>
                  Safety: {s.hazardLevel}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      <NativeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Schedule Practical Lab Session"
        subtitle="Book laboratory workstation stations, practical topic, and safety precautions"
        icon={FlaskConical}
        size="lg"
      >
        <form onSubmit={handleAddSession} className="space-y-4">
          <div className="relative z-[45] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Laboratory Station
            </label>
            <LiquidGlassSelect
              value={newLab}
              onChange={(val) => setNewLab(val as any)}
              options={[
                { value: 'Chemistry Lab', label: 'Chemistry Laboratory' },
                { value: 'Physics Lab', label: 'Physics & Biomechanics Lab' },
                { value: 'Biology Lab', label: 'Biology & Anatomy Lab' },
                { value: 'ICT / Computer Lab', label: 'ICT & E-Learning Lab' },
              ]}
            />
          </div>

          <div className="relative z-[40]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Practical / Experiment Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Volumetric Acid-Base Titration (0.1M HCl vs NaOH)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-[35]">
            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Class / Cohort *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Nursing Year 2 / Senior 4 East"
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Tutor / Instructor in Charge
              </label>
              <input
                type="text"
                placeholder="e.g. Mr. Kato Brian"
                value={newTeacher}
                onChange={(e) => setNewTeacher(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-[30] focus-within:z-[50]">
            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Time Slot / Duration
              </label>
              <input
                type="text"
                placeholder="e.g. 09:00 AM - 10:30 AM"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
              />
            </div>

            <div className="relative z-[32]">
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Hazard & Safety Level
              </label>
              <LiquidGlassSelect
                value={newHazard}
                onChange={(val) => setNewHazard(val as any)}
                options={[
                  { value: 'Low', label: 'Low Risk (Dry / Non-hazardous)' },
                  { value: 'Moderate', label: 'Moderate (Bunsen / Stains)' },
                  { value: 'High (Flammable/Acid)', label: 'High (Concentrated Acid / Flammables)' },
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all"
            >
              Save Booking
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
