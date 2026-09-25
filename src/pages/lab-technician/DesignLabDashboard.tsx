import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import {
  FlaskConical,
  Laptop,
  AlertTriangle,
  Wrench,
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  Plus,
  Search,
  ShieldCheck,
  Building2,
  Sparkles,
  X,
  FileSpreadsheet,
  Flame,
  Zap,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';
import { getGreetingLastName } from '../../lib/roleTerminology';

interface LabSession {
  id: string;
  lab_name: 'Chemistry Lab' | 'Physics Lab' | 'Biology Lab' | 'ICT / Computer Lab';
  subject: string;
  class_name: string;
  teacher_name: string;
  experiment_title: string;
  start_time: string;
  end_time: string;
  hazard_level: 'Low' | 'Moderate' | 'High (Flammable/Acid)';
  status: 'Upcoming' | 'In Session' | 'Completed';
  student_count: number;
}

const DEFAULT_SESSIONS: LabSession[] = [
  {
    id: 'l1',
    lab_name: 'Chemistry Lab',
    subject: 'Chemistry',
    class_name: 'Senior 4 East',
    teacher_name: 'Mr. Kato Brian',
    experiment_title: 'Volumetric Acid-Base Titration (HCl vs NaOH)',
    start_time: '08:30 AM',
    end_time: '10:00 AM',
    hazard_level: 'High (Flammable/Acid)',
    status: 'Completed',
    student_count: 42,
  },
  {
    id: 'l2',
    lab_name: 'Biology Lab',
    subject: 'Biology',
    class_name: 'Senior 3 West',
    teacher_name: 'Ms. Nabirye Sarah',
    experiment_title: 'Microscopic Observation of Plant Cell Stomata',
    start_time: '10:30 AM',
    end_time: '12:00 PM',
    hazard_level: 'Low',
    status: 'In Session',
    student_count: 38,
  },
  {
    id: 'l3',
    lab_name: 'Physics Lab',
    subject: 'Physics',
    class_name: 'Senior 6 Science',
    teacher_name: 'Dr. Okello David',
    experiment_title: 'Verification of Ohm\'s Law & Potentiometer Wire Resistance',
    start_time: '02:00 PM',
    end_time: '03:30 PM',
    hazard_level: 'Moderate',
    status: 'Upcoming',
    student_count: 31,
  },
  {
    id: 'l4',
    lab_name: 'ICT / Computer Lab',
    subject: 'Computer Studies',
    class_name: 'Senior 2 Alpha',
    teacher_name: 'Mr. Wasswa Ivan',
    experiment_title: 'Database Schema Modeling & Relational Tables in MySQL',
    start_time: '03:45 PM',
    end_time: '05:00 PM',
    hazard_level: 'Low',
    status: 'Upcoming',
    student_count: 45,
  },
];

const LAB_REAGENTS = [
  { item: 'Hydrochloric Acid (HCl 1.0M)', lab: 'Chemistry Lab', stock: '2.5 Liters', status: 'Adequate', alert: false },
  { item: 'Sodium Hydroxide Pellets (NaOH)', lab: 'Chemistry Lab', stock: '250 grams', status: 'Low Stock', alert: true },
  { item: 'Phenolphthalein Indicator', lab: 'Chemistry Lab', stock: '500 ml', status: 'Adequate', alert: false },
  { item: 'Copper Calorimeters', lab: 'Physics Lab', stock: '28 units', status: 'Adequate', alert: false },
  { item: 'Compound Light Microscopes', lab: 'Biology Lab', stock: '22 functional', status: '2 in repair', alert: true },
  { item: 'Ethernet Patch Cables Cat6', lab: 'ICT Lab', stock: '6 spares', status: 'Low Stock', alert: true },
];

export default function DesignLabDashboard() {
  const navigate = useNavigate();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [selectedLab, setSelectedLab] = useState('ALL');
  const [sessions, setSessions] = useState<LabSession[]>(DEFAULT_SESSIONS);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [newSession, setNewSession] = useState({
    labName: 'Chemistry Lab' as LabSession['lab_name'],
    subject: 'Chemistry',
    className: '',
    teacherName: '',
    title: '',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    hazard: 'Moderate' as LabSession['hazard_level'],
    studentCount: 35,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const lastName = getGreetingLastName(user?.user_metadata?.name || user?.email?.split('@')[0], '');
  const today = new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Metrics
  const metrics = useMemo(() => {
    const totalSessions = sessions.length;
    const activeStudents = sessions
      .filter((s) => s.status === 'In Session')
      .reduce((sum, s) => sum + s.student_count, 0);
    const lowReagents = LAB_REAGENTS.filter((r) => r.alert).length;
    const pendingMaintenance = 3;
    return { totalSessions, activeStudents, lowReagents, pendingMaintenance };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.experiment_title.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        s.class_name.toLowerCase().includes(q) ||
        s.teacher_name.toLowerCase().includes(q);

      const matchLab = selectedLab === 'ALL' || s.lab_name === selectedLab;
      return matchSearch && matchLab;
    });
  }, [sessions, search, selectedLab]);

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSession.className.trim() || !newSession.title.trim()) return;

    const entry: LabSession = {
      id: `l_${Date.now()}`,
      lab_name: newSession.labName,
      subject: newSession.subject,
      class_name: newSession.className.trim(),
      teacher_name: newSession.teacherName.trim() || 'Class Teacher',
      experiment_title: newSession.title.trim(),
      start_time: newSession.startTime,
      end_time: newSession.endTime,
      hazard_level: newSession.hazard,
      status: 'Upcoming',
      student_count: Number(newSession.studentCount) || 30,
    };

    setSessions([...sessions, entry]);
    setShowBookingModal(false);
    setNewSession({
      labName: 'Chemistry Lab',
      subject: 'Chemistry',
      className: '',
      teacherName: '',
      title: '',
      startTime: '09:00 AM',
      endTime: '10:30 AM',
      hazard: 'Moderate',
      studentCount: 35,
    });
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
                backgroundColor: isDark ? 'rgba(79,142,247,0.15)' : 'rgba(37,99,235,0.12)',
                color: t.blue,
                fontFamily: SORA,
              }}
            >
              SCIENCE & ICT LABORATORIES
            </span>
            <span className="text-xs" style={{ color: t.textLow }}>• {today}</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
            style={{ fontFamily: SORA, color: t.textHi }}
          >
            {greeting}, {lastName ? `Lab Tech ${lastName}` : 'Laboratory Technician'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
            Manage practical sessions, chemical apparatus stock, computer lab equipment, and laboratory safety compliance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowBookingModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-[1.02] self-start md:self-auto"
          style={{
            background: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
            color: '#ffffff',
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Book Lab Session</span>
        </button>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Practicals Today */}
        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Practicals Today
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(79,142,247,0.15)' : 'rgba(37,99,235,0.1)',
                color: t.blue,
              }}
            >
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {metrics.totalSessions}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Scheduled science & ICT practicals
          </div>
        </div>

        {/* Active Students in Labs */}
        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Students in Labs Now
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.1)',
                color: t.mint,
              }}
            >
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {metrics.activeStudents}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Currently in active sessions
          </div>
        </div>

        {/* Reagent & Chemical Alerts */}
        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Chemical Stock Alerts
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(217,119,6,0.1)',
                color: t.gold,
              }}
            >
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {metrics.lowReagents}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Low reagent/re-order items
          </div>
        </div>

        {/* Equipment Maintenance */}
        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Maintenance Tasks
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(225,29,72,0.1)',
                color: t.red,
              }}
            >
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {metrics.pendingMaintenance}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Apparatus calibration / repairs
          </div>
        </div>
      </div>

      {/* Dual Column: Lab Timetable & Inventory Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lab Schedule (2 Cols) */}
        <div
          className="lg:col-span-2 p-5 rounded-2xl shadow-sm flex flex-col"
          style={{
            background: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: t.divider }}>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                Today's Laboratory Schedule
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedLab}
                onChange={(e) => setSelectedLab(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs outline-none cursor-pointer"
                style={{
                  backgroundColor: t.fieldBg,
                  border: `1px solid ${t.stroke}`,
                  color: t.textHi,
                }}
              >
                <option value="ALL">All Laboratories</option>
                <option value="Chemistry Lab">Chemistry Lab</option>
                <option value="Physics Lab">Physics Lab</option>
                <option value="Biology Lab">Biology Lab</option>
                <option value="ICT / Computer Lab">ICT / Computer Lab</option>
              </select>

              <div className="relative w-44">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: t.textLow }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter topic..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none"
                  style={{
                    backgroundColor: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                    color: t.textHi,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 divide-y" style={{ borderColor: t.divider }}>
            {filteredSessions.length === 0 ? (
              <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
                No practical sessions matching your filters.
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isCurrent = s.status === 'In Session';
                const isCompleted = s.status === 'Completed';

                return (
                  <div key={s.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5"
                        style={{
                          backgroundColor: isDark ? 'rgba(79,142,247,0.15)' : 'rgba(37,99,235,0.1)',
                          color: t.blue,
                        }}
                      >
                        {s.lab_name.includes('ICT') ? <Laptop className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color: t.textHi }}>
                            {s.experiment_title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">
                            {s.lab_name}
                          </span>
                        </div>

                        <div className="text-[11px] mt-1" style={{ color: t.textMid }}>
                          Class: <span className="font-semibold text-emerald-400">{s.class_name}</span> • Tutor: {s.teacher_name} • ({s.student_count} Students)
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{
                              backgroundColor: s.hazard_level.includes('High')
                                ? isDark
                                  ? 'rgba(239,68,68,0.15)'
                                  : 'rgba(225,29,72,0.1)'
                                : isDark
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(0,0,0,0.04)',
                              color: s.hazard_level.includes('High') ? t.red : t.textLow,
                            }}
                          >
                            Hazard: {s.hazard_level}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 self-end sm:self-center">
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                        style={{
                          backgroundColor: isCurrent
                            ? isDark
                              ? 'rgba(16,217,168,0.15)'
                              : 'rgba(16,185,129,0.12)'
                            : isCompleted
                            ? isDark
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(0,0,0,0.04)'
                            : isDark
                            ? 'rgba(79,142,247,0.15)'
                            : 'rgba(37,99,235,0.12)',
                          color: isCurrent ? t.mint : isCompleted ? t.textLow : t.blue,
                        }}
                      >
                        {isCurrent ? '• LIVE IN SESSION' : isCompleted ? 'Completed' : 'Upcoming'}
                      </span>
                      <div className="text-[11px] mt-1 font-mono" style={{ color: t.textHi }}>
                        {s.start_time} – {s.end_time}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Reagent & Apparatus Status */}
        <div className="space-y-6">
          {/* Reagent Inventory Quick Matrix */}
          <div
            className="p-5 rounded-2xl shadow-sm"
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                  Reagents & Stock Audit
                </span>
              </div>
            </div>

            <div className="mt-3 divide-y" style={{ borderColor: t.divider }}>
              {LAB_REAGENTS.map((r) => (
                <div key={r.item} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-semibold" style={{ color: t.textHi }}>{r.item}</div>
                    <div className="text-[10px]" style={{ color: t.textLow }}>{r.lab}</div>
                  </div>
                  <div className="text-right">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: r.alert
                          ? isDark
                            ? 'rgba(245,158,11,0.15)'
                            : 'rgba(217,119,6,0.1)'
                          : isDark
                          ? 'rgba(16,217,168,0.15)'
                          : 'rgba(16,185,129,0.1)',
                        color: r.alert ? t.gold : t.mint,
                      }}
                    >
                      {r.stock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Safety & Incident Protocol Card */}
          <div
            className="p-5 rounded-2xl shadow-sm"
            style={{
              background: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: t.divider }}>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
                Laboratory Safety Protocols
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs" style={{ color: t.textMid }}>
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-between">
                <span>Eye Wash & Safety Shower</span>
                <span className="text-emerald-500 font-bold">Passed Inspection</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-between">
                <span>CO2 Fire Extinguishers</span>
                <span className="text-emerald-500 font-bold">Fully Charged</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-between">
                <span>Chemical Fume Hood Exhaust</span>
                <span className="text-emerald-500 font-bold">Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Book Lab Session Modal */}
      {showBookingModal && (
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
                <FlaskConical className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold" style={{ fontFamily: SORA }}>
                  Schedule Laboratory Practical
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Laboratory Room *
                  </label>
                  <select
                    value={newSession.labName}
                    onChange={(e) => setNewSession({ ...newSession, labName: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  >
                    <option value="Chemistry Lab">Chemistry Lab</option>
                    <option value="Physics Lab">Physics Lab</option>
                    <option value="Biology Lab">Biology Lab</option>
                    <option value="ICT / Computer Lab">ICT / Computer Lab</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    value={newSession.subject}
                    onChange={(e) => setNewSession({ ...newSession, subject: e.target.value })}
                    placeholder="e.g. Chemistry"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Experiment / Practical Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSession.title}
                    onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                    placeholder="e.g. Qualitative Analysis of Metal Cations"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Class / Cohort *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSession.className}
                    onChange={(e) => setNewSession({ ...newSession, className: e.target.value })}
                    placeholder="e.g. Senior 4 East"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Conducting Teacher
                  </label>
                  <input
                    type="text"
                    value={newSession.teacherName}
                    onChange={(e) => setNewSession({ ...newSession, teacherName: e.target.value })}
                    placeholder="e.g. Mr. Kato Brian"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={newSession.startTime}
                    onChange={(e) => setNewSession({ ...newSession, startTime: e.target.value })}
                    placeholder="09:00 AM"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    End Time
                  </label>
                  <input
                    type="text"
                    value={newSession.endTime}
                    onChange={(e) => setNewSession({ ...newSession, endTime: e.target.value })}
                    placeholder="10:30 AM"
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Hazard Risk Level
                  </label>
                  <select
                    value={newSession.hazard}
                    onChange={(e) => setNewSession({ ...newSession, hazard: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  >
                    <option value="Low">Low Risk</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High (Flammable/Acid)">High (Flammable / Acidic)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                    Expected Students Count
                  </label>
                  <input
                    type="number"
                    value={newSession.studentCount}
                    onChange={(e) => setNewSession({ ...newSession, studentCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl outline-none"
                    style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: t.divider }}>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textMid }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg,#0ea5e9,#6366f1)',
                    color: '#ffffff',
                  }}
                >
                  Book Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
