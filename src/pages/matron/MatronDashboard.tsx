import { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Search,
  Building2,
  Bed,
  Moon,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Filter,
  RefreshCw,
  DoorOpen,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  facilityAndLiabilityService,
  NightRollCallStatus,
} from '@/services/facilityAndLiabilityService';

interface ResidentItem {
  student_id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  admission_number?: string;
  current_class?: string;
  gender?: string;
  boarding_type?: string;
  student_phone?: string;
  block_name?: string;
  room_number?: string;
  bed_number?: number | null;
}

export default function MatronDashboard() {
  const { schoolId } = useAuthStore();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState<ResidentItem[]>([]);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all');
  const [todayCalls, setTodayCalls] = useState<Record<string, NightRollCallStatus | 'pending'>>({});

  const activeSchoolId = schoolId || 'e1b10000-0000-4000-a000-000000000001';
  const todayStr = new Date().toISOString().slice(0, 10);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await facilityAndLiabilityService.getResidentStudents(activeSchoolId);
      setResidents(res as ResidentItem[]);

      const calls = facilityAndLiabilityService.getNightRollCalls(activeSchoolId, todayStr);
      const callMap: Record<string, NightRollCallStatus> = {};
      for (const c of calls) {
        callMap[c.student_id] = c.status;
      }
      setTodayCalls(callMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [activeSchoolId]);

  const filteredResidents = useMemo(() => {
    return residents.filter((r) => {
      const q = search.toLowerCase();
      const matchQuery =
        !q ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.admission_number && r.admission_number.toLowerCase().includes(q)) ||
        (r.current_class && r.current_class.toLowerCase().includes(q)) ||
        (r.room_number && r.room_number.toLowerCase().includes(q));

      const matchGender =
        genderFilter === 'all' ||
        (genderFilter === 'female' && r.gender?.toLowerCase().startsWith('f')) ||
        (genderFilter === 'male' && r.gender?.toLowerCase().startsWith('m'));

      return matchQuery && matchGender;
    });
  }, [residents, search, genderFilter]);

  // Statistics
  const totalCount = residents.length;
  const femaleCount = residents.filter((r) => r.gender?.toLowerCase().startsWith('f')).length;
  const maleCount = residents.filter((r) => r.gender?.toLowerCase().startsWith('m')).length;

  let presentCount = 0;
  let hospitalCount = 0;
  let gatePassCount = 0;
  let absentCount = 0;

  for (const r of residents) {
    const st = todayCalls[r.student_id];
    if (st === 'present') presentCount++;
    else if (st === 'hospital_duty') hospitalCount++;
    else if (st === 'gate_pass') gatePassCount++;
    else if (st === 'absent') absentCount++;
  }

  const unassignedCount = residents.filter((r) => !r.room_number || r.room_number.includes('Unassigned')).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: tk.textHi }}>
            Hostel Resident Directory
          </h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: tk.textLow }}>
            Verified resident nursing students boarding on campus. Non-residents are excluded.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors shadow-sm"
            style={{
              backgroundColor: tk.panel,
              borderColor: tk.stroke,
              color: tk.textMid,
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div
          className="p-4 rounded-2xl border backdrop-blur-sm"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Total Residents</span>
            <Users className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold mt-2" style={{ color: tk.textHi }}>
            {totalCount}
          </div>
          <div className="text-[11px] mt-1 text-slate-400">
            {femaleCount} Females · {maleCount} Males
          </div>
        </div>

        <div
          className="p-4 rounded-2xl border backdrop-blur-sm"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <div className="flex items-center justify-between text-xs font-medium text-emerald-400">
            <span>Present in Dorm</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold mt-2 text-emerald-400">
            {presentCount}
          </div>
          <div className="text-[11px] mt-1 text-slate-400">
            Accounted in beds
          </div>
        </div>

        <div
          className="p-4 rounded-2xl border backdrop-blur-sm"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <div className="flex items-center justify-between text-xs font-medium text-sky-400">
            <span>Hospital Night Duty</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold mt-2 text-sky-400">
            {hospitalCount}
          </div>
          <div className="text-[11px] mt-1 text-slate-400">
            Clinical attachment
          </div>
        </div>

        <div
          className="p-4 rounded-2xl border backdrop-blur-sm"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <div className="flex items-center justify-between text-xs font-medium text-amber-400">
            <span>Approved Gate Pass</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold mt-2 text-amber-400">
            {gatePassCount}
          </div>
          <div className="text-[11px] mt-1 text-slate-400">
            Off-campus pass
          </div>
        </div>

        <div
          className="p-4 rounded-2xl border backdrop-blur-sm"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <div className="flex items-center justify-between text-xs font-medium text-rose-400">
            <span>Absent / Unaccounted</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold mt-2 text-rose-400">
            {absentCount}
          </div>
          <div className="text-[11px] mt-1 text-slate-400">
            Pending roll call / missing
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="p-4 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
        style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, admission number, class or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border transition-colors outline-none"
            style={{
              backgroundColor: tk.fieldBg,
              borderColor: tk.stroke,
              color: tk.textHi,
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 rounded-xl border" style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}>
            <button
              type="button"
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                genderFilter === 'all'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Residents
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('female')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                genderFilter === 'female'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Girls (Matron)
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('male')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                genderFilter === 'male'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Boys (Warden)
            </button>
          </div>
        </div>
      </div>

      {/* Resident Table */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm"
        style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: tk.stroke, backgroundColor: tk.fieldBg }}>
                <th className="py-3.5 px-4 font-semibold text-slate-400">Student</th>
                <th className="py-3.5 px-4 font-semibold text-slate-400">Class / Program</th>
                <th className="py-3.5 px-4 font-semibold text-slate-400">Hostel Allocation</th>
                <th className="py-3.5 px-4 font-semibold text-slate-400">Bed No.</th>
                <th className="py-3.5 px-4 font-semibold text-slate-400">Today Roll Call</th>
                <th className="py-3.5 px-4 font-semibold text-slate-400 text-right">Emergency Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading resident directory...
                  </td>
                </tr>
              ) : filteredResidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
                    <p className="font-semibold text-sm">No resident students found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {search ? 'Try adjusting your search filters.' : 'Ensure student profiles have residency set to "Resident / Boarding".'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredResidents.map((st) => {
                  const callStatus = todayCalls[st.student_id] || 'pending';
                  const isAssigned = st.room_number && !st.room_number.includes('Unassigned');

                  return (
                    <tr
                      key={st.student_id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500/20 to-indigo-500/20 text-rose-300 font-bold text-xs flex items-center justify-center border border-rose-500/20 shrink-0">
                            {st.name?.slice(0, 2).toUpperCase() || 'ST'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-100 truncate">{st.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              #{st.admission_number || 'NO-ADM'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-300">
                        {st.current_class || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {isAssigned ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <DoorOpen className="w-3.5 h-3.5" />
                            <span>{st.room_number}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-3 h-3" /> Unassigned Bed
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {st.bed_number ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-200">
                            <Bed className="w-3.5 h-3.5 text-slate-400" /> Bed #{st.bed_number}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {callStatus === 'present' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Present in Dorm
                          </span>
                        )}
                        {callStatus === 'hospital_duty' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                            <Activity className="w-3.5 h-3.5" /> Hospital Night Duty
                          </span>
                        )}
                        {callStatus === 'gate_pass' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5" /> Approved Gate Pass
                          </span>
                        )}
                        {callStatus === 'absent' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <AlertTriangle className="w-3.5 h-3.5" /> Absent / Missing
                          </span>
                        )}
                        {callStatus === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            <Moon className="w-3.5 h-3.5" /> Not Marked
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {st.student_phone ? (
                          <a
                            href={`tel:${st.student_phone}`}
                            className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold"
                          >
                            <Phone className="w-3 h-3" />
                            {st.student_phone}
                          </a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
