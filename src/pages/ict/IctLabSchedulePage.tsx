import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  Clock,
  Plus,
  Users,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  Monitor,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import NativeModal from '@/components/NativeModal';

interface LabSchedule {
  id: string;
  title: string;
  tutor_name: string;
  class_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  pcs_needed: number;
  session_type: string; // 'practical', 'lecture', 'cbt_exam', 'research'
  status: string; // 'confirmed', 'pending', 'cancelled'
  created_at: string;
}

export default function IctLabSchedulePage() {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId) || 'e1b10000-0000-4000-a000-000000000001';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');

  // Form State
  const [title, setTitle] = useState('');
  const [tutorName, setTutorName] = useState('');
  const [className, setClassName] = useState('Diploma Nursing Year 1');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [pcsNeeded, setPcsNeeded] = useState(30);
  const [sessionType, setSessionType] = useState('practical');

const SCHEDULE_LOCAL_KEY = 'rcsn_ict_lab_schedules';

function getInitialLocalSchedules(): LabSchedule[] {
  try {
    const raw = localStorage.getItem(SCHEDULE_LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const today = new Date().toISOString().slice(0, 10);
  const sample: LabSchedule[] = [
    {
      id: 'local-sch-1',
      title: 'Digital Anatomy Simulation Lab',
      tutor_name: 'Dr. Mukasa David',
      class_name: 'Diploma Nursing Year 1',
      session_date: today,
      start_time: '09:00',
      end_time: '11:00',
      pcs_needed: 30,
      session_type: 'practical',
      status: 'confirmed',
      created_at: new Date().toISOString(),
    },
    {
      id: 'local-sch-2',
      title: 'Pharmacology Online Research & CBT Practice',
      tutor_name: 'Sr. Nabukenya Grace',
      class_name: 'Diploma Midwifery Year 2',
      session_date: today,
      start_time: '14:00',
      end_time: '16:00',
      pcs_needed: 25,
      session_type: 'cbt_exam',
      status: 'confirmed',
      created_at: new Date().toISOString(),
    },
  ];
  try { localStorage.setItem(SCHEDULE_LOCAL_KEY, JSON.stringify(sample)); } catch {}
  return sample;
}

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['ict-lab-schedules', schoolId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('ict_lab_schedules')
          .select('*')
          .eq('school_id', schoolId)
          .order('session_date', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) return data as LabSchedule[];
      } catch {}
      return getInitialLocalSchedules();
    },
  });

  const addScheduleMutation = useMutation({
    mutationFn: async () => {
      const newEntry: LabSchedule = {
        id: `local-sch-${Date.now()}`,
        title,
        tutor_name: tutorName,
        class_name: className,
        session_date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        pcs_needed: Number(pcsNeeded),
        session_type: sessionType,
        status: 'confirmed',
        created_at: new Date().toISOString(),
      };
      try {
        await supabase.from('ict_lab_schedules').insert({
          school_id: schoolId,
          title: newEntry.title,
          tutor_name: newEntry.tutor_name,
          class_name: newEntry.class_name,
          session_date: newEntry.session_date,
          start_time: newEntry.start_time,
          end_time: newEntry.end_time,
          pcs_needed: newEntry.pcs_needed,
          session_type: newEntry.session_type,
          status: newEntry.status,
        });
      } catch {}
      const current = getInitialLocalSchedules();
      current.unshift(newEntry);
      try { localStorage.setItem(SCHEDULE_LOCAL_KEY, JSON.stringify(current)); } catch {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ict-lab-schedules', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['ict-schedules-kpi', schoolId] });
      setIsModalOpen(false);
      setTitle('');
      setTutorName('');
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await supabase.from('ict_lab_schedules').delete().eq('id', id);
      } catch {}
      const current = getInitialLocalSchedules();
      const next = current.filter((s) => s.id !== id);
      try { localStorage.setItem(SCHEDULE_LOCAL_KEY, JSON.stringify(next)); } catch {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ict-lab-schedules', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['ict-schedules-kpi', schoolId] });
    },
  });

  const filtered = schedules.filter((s) => {
    if (filterType === 'all') return true;
    return s.session_type === filterType;
  });

  return (
    <AdminPageWrapper
      eyebrow="LAB LOGISTICS & TIMETABLES"
      title="Computer Lab Schedule"
      subtitle="Schedule practical sessions, clinical informatics lectures, and UNMEB CBT mock examinations."
    >
      {/* Controls Bar */}
      <div className={`${adminCardClass} flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold ${
              filterType === 'all'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            All Bookings ({schedules.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('practical')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold ${
              filterType === 'practical'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            Practicals
          </button>
          <button
            type="button"
            onClick={() => setFilterType('cbt_exam')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold ${
              filterType === 'cbt_exam'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            CBT E-Exams
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Book Lab Session
        </button>
      </div>

      {/* Bookings Table */}
      <div className={adminCardClass}>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading lab calendar...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <CalendarCheck className="h-8 w-8 mx-auto mb-2 text-slate-500" />
              No lab sessions scheduled matching this filter.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Session Title</th>
                  <th className="pb-3">Class / Target</th>
                  <th className="pb-3">Tutor In-Charge</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Time Window</th>
                  <th className="pb-3">PCs Allocated</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 font-bold text-white">{s.title}</td>
                    <td className="py-3 text-slate-300">{s.class_name}</td>
                    <td className="py-3 text-slate-300">{s.tutor_name}</td>
                    <td className="py-3 font-mono text-slate-300">{s.session_date}</td>
                    <td className="py-3 font-mono text-slate-300">{s.start_time} - {s.end_time}</td>
                    <td className="py-3 text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <Monitor className="h-3 w-3 text-slate-400" /> {s.pcs_needed} Stations
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 uppercase tracking-wide">
                        {s.session_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteScheduleMutation.mutate(s.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                        title="Cancel Booking"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {isModalOpen && (
        <NativeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Schedule Computer Lab Session"
          size="md"
        >
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-300">Session Title</label>
              <input
                type="text"
                placeholder="e.g. Health Informatics & Biostatistics"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Tutor In-Charge</label>
                <input
                  type="text"
                  placeholder="e.g. Mr. Ssekandi Ronald"
                  value={tutorName}
                  onChange={(e) => setTutorName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Class / Cohort</label>
                <input
                  type="text"
                  placeholder="e.g. Certificate Nursing Yr 1"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Date</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Session Type</label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                >
                  <option value="practical">Practical Session</option>
                  <option value="cbt_exam">CBT E-Exam Drill</option>
                  <option value="lecture">Lecture / Demo</option>
                  <option value="research">Student Research</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Stations Needed</label>
                <input
                  type="number"
                  value={pcsNeeded}
                  onChange={(e) => setPcsNeeded(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!title || !tutorName}
                onClick={() => addScheduleMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </NativeModal>
      )}
    </AdminPageWrapper>
  );
}
