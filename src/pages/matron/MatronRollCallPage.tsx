import { useEffect, useState, useMemo } from 'react';
import {
  Moon,
  CheckCircle2,
  Activity,
  Clock,
  AlertTriangle,
  Calendar,
  Save,
  Search,
  Filter,
  CheckCheck,
  Building2,
  Bed,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { useToast } from '@/components/Toast';
import {
  facilityAndLiabilityService,
  NightRollCallStatus,
  NightRollCallRecord,
} from '@/services/facilityAndLiabilityService';

interface RollCallStudent {
  student_id: string;
  name: string;
  admission_number?: string;
  current_class?: string;
  gender?: string;
  block_name?: string;
  room_number?: string;
  bed_number?: number | null;
  status: NightRollCallStatus;
  notes?: string;
}

export default function MatronRollCallPage() {
  const { schoolId, user } = useAuthStore();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const toast = useToast();

  const [rollDate, setRollDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<RollCallStudent[]>([]);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('female');

  const activeSchoolId = schoolId || 'e1b10000-0000-4000-a000-000000000001';

  const loadRoster = async () => {
    setLoading(true);
    try {
      const residents = await facilityAndLiabilityService.getResidentStudents(activeSchoolId);
      const existingCalls = facilityAndLiabilityService.getNightRollCalls(activeSchoolId, rollDate);
      const callMap = new Map<string, NightRollCallRecord>();
      for (const c of existingCalls) {
        callMap.set(c.student_id, c);
      }

      const merged: RollCallStudent[] = residents.map((r) => {
        const recorded = callMap.get(r.student_id);
        return {
          student_id: r.student_id,
          name: r.name,
          admission_number: r.admission_number,
          current_class: r.current_class,
          gender: r.gender,
          block_name: r.block_name,
          room_number: r.room_number,
          bed_number: r.bed_number,
          status: recorded ? recorded.status : 'present', // default to present for streamlined check
          notes: recorded?.notes || '',
        };
      });

      setStudents(merged);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoster();
  }, [activeSchoolId, rollDate]);

  const handleStatusChange = (studentId: string, newStatus: NightRollCallStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status: newStatus } : s))
    );
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, notes } : s))
    );
  };

  const handleMarkAllRemaining = (statusToSet: NightRollCallStatus) => {
    setStudents((prev) =>
      prev.map((s) => ({ ...s, status: statusToSet }))
    );
    toast.success(`Marked all residents as ${statusToSet === 'present' ? 'Present in Dorm' : statusToSet}`);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const recordsToSave = students.map((s) => ({
        school_id: activeSchoolId,
        roll_call_date: rollDate,
        student_id: s.student_id,
        student_name: s.name,
        admission_number: s.admission_number,
        current_class: s.current_class,
        block_name: s.block_name,
        room_number: s.room_number,
        bed_number: s.bed_number ?? undefined,
        status: s.status,
        notes: s.notes,
        recorded_by: user?.id,
      }));

      facilityAndLiabilityService.batchSaveRollCalls(recordsToSave);
      toast.success(`Night roll call for ${rollDate} saved successfully.`);
    } catch {
      toast.error('Failed to save roll call.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase();
      const matchQuery =
        !q ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.admission_number && s.admission_number.toLowerCase().includes(q)) ||
        (s.room_number && s.room_number.toLowerCase().includes(q));

      const matchGender =
        genderFilter === 'all' ||
        (genderFilter === 'female' && s.gender?.toLowerCase().startsWith('f')) ||
        (genderFilter === 'male' && s.gender?.toLowerCase().startsWith('m'));

      return matchQuery && matchGender;
    });
  }, [students, search, genderFilter]);

  // Status summaries
  const presentCount = students.filter((s) => s.status === 'present').length;
  const hospitalDutyCount = students.filter((s) => s.status === 'hospital_duty').length;
  const gatePassCount = students.filter((s) => s.status === 'gate_pass').length;
  const absentCount = students.filter((s) => s.status === 'absent').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Moon className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: tk.textHi }}>
                Nightly Hostel Roll Call
              </h1>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: tk.textLow }}>
                Account for every resident nurse. Distinguish hospital placements from absences.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border" style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}>
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={rollDate}
              onChange={(e) => setRollDate(e.target.value)}
              className="bg-transparent text-xs font-semibold outline-none text-slate-200"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Roll Call'}
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className="p-3.5 rounded-2xl border flex items-center justify-between"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">In Dorm</p>
              <p className="text-lg font-bold text-emerald-400">{presentCount}</p>
            </div>
          </div>
        </div>

        <div
          className="p-3.5 rounded-2xl border flex items-center justify-between"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Hospital Duty</p>
              <p className="text-lg font-bold text-sky-400">{hospitalDutyCount}</p>
            </div>
          </div>
        </div>

        <div
          className="p-3.5 rounded-2xl border flex items-center justify-between"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Gate Pass</p>
              <p className="text-lg font-bold text-amber-400">{gatePassCount}</p>
            </div>
          </div>
        </div>

        <div
          className="p-3.5 rounded-2xl border flex items-center justify-between"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Missing / Absent</p>
              <p className="text-lg font-bold text-rose-400">{absentCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Quick Batch Bar */}
      <div
        className="p-3.5 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
        style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search resident or room number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs border outline-none text-slate-200"
            style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-1 rounded-xl border text-xs" style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}>
            <button
              type="button"
              onClick={() => setGenderFilter('female')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                genderFilter === 'female' ? 'bg-rose-500 text-white' : 'text-slate-400'
              }`}
            >
              Girls Hostel (Matron)
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('male')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                genderFilter === 'male' ? 'bg-rose-500 text-white' : 'text-slate-400'
              }`}
            >
              Boys Hostel (Warden)
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                genderFilter === 'all' ? 'bg-rose-500 text-white' : 'text-slate-400'
              }`}
            >
              All Residents
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleMarkAllRemaining('present')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark All as In Dorm
          </button>
        </div>
      </div>

      {/* Roster & Check Grid */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm"
        style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
      >
        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
              Loading hostel resident roster for {rollDate}...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
              <p className="font-semibold text-sm">No residents found</p>
              <p className="text-xs text-slate-500 mt-1">Check search or gender filter.</p>
            </div>
          ) : (
            filtered.map((s) => (
              <div
                key={s.student_id}
                className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
              >
                {/* Student Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-indigo-500/20 text-rose-300 font-bold text-xs flex items-center justify-center border border-rose-500/20 shrink-0">
                    {s.name?.slice(0, 2).toUpperCase() || 'ST'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-100 text-sm truncate">{s.name}</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-500/15 text-slate-300">
                        #{s.admission_number || 'NO-ADM'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{s.current_class}</span>
                      <span>·</span>
                      <span className="font-semibold text-rose-300">
                        {s.room_number || 'Unassigned Room'}
                      </span>
                      {s.bed_number && (
                        <>
                          <span>·</span>
                          <span>Bed #{s.bed_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4 Quick Toggle Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(s.student_id, 'present')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      s.status === 'present'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Present in Dorm
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(s.student_id, 'hospital_duty')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      s.status === 'hospital_duty'
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                        : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Hospital Duty
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(s.student_id, 'gate_pass')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      s.status === 'gate_pass'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                        : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Gate Pass
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(s.student_id, 'absent')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      s.status === 'absent'
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse'
                        : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Absent / Missing
                  </button>

                  <input
                    type="text"
                    placeholder="Notes (ward / pass no)..."
                    value={s.notes || ''}
                    onChange={(e) => handleNotesChange(s.student_id, e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl text-xs border outline-none text-slate-200 w-36 sm:w-44 ml-1"
                    style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
