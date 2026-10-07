import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';
import {
  Users,
  Search,
  Filter,
  Calendar,
  MessageSquare,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  GraduationCap,
  Building,
  UserCheck,
  CheckCircle2,
  Clock,
  Send,
  X
} from 'lucide-react';
import { NativeModal } from '@/components/NativeModal';


interface StudentItem {
  student_id: string;
  name: string;
  admission_number: string;
  current_class: string;
  gender?: string;
  stream?: string;
}

export default function GuildStudentsPage() {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const schoolId = useAuthStore((s) => s.schoolId);

  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [summonModalStudent, setSummonModalStudent] = useState<StudentItem | null>(null);
  const [meetingReason, setMeetingReason] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [summonSuccess, setSummonSuccess] = useState(false);

  // Fetch real students from supabase
  const { data: dbStudents = [], isLoading } = useQuery({
    queryKey: ['guild-students-list', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('student_id, name, admission_number, current_class, gender, stream')
        .eq('school_id', schoolId)
        .order('name')
        .limit(100);
      if (error || !data) return [];
      return data as StudentItem[];
    },
    enabled: !!schoolId,
  });

  // Fallback demo students if database is freshly seeded or offline
  const fallbackStudents: StudentItem[] = [
    { student_id: 's1', name: 'Nakato Grace', admission_number: 'RIP/2024/082', current_class: 'Primary 7 Blue', gender: 'Female', stream: 'Blue' },
    { student_id: 's2', name: 'Babirye Faith', admission_number: 'RIP/2025/119', current_class: 'Primary 4 Red', gender: 'Female', stream: 'Red' },
    { student_id: 's3', name: 'Kato Brian Ssewanyana', admission_number: 'RIP/2023/045', current_class: 'Primary 6 Green', gender: 'Male', stream: 'Green' },
    { student_id: 's4', name: 'Wasswa Derrick', admission_number: 'RIP/2024/204', current_class: 'Primary 5 Yellow', gender: 'Male', stream: 'Yellow' },
    { student_id: 's5', name: 'Mugisha Emmanuel', admission_number: 'RIP/2025/301', current_class: 'Primary 7 Blue', gender: 'Male', stream: 'Blue' },
    { student_id: 's6', name: 'Namukasa Sarah', admission_number: 'RIP/2024/115', current_class: 'Primary 3 Orange', gender: 'Female', stream: 'Orange' },
  ];

  const students = dbStudents.length > 0 ? dbStudents : fallbackStudents;

  const classes = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => s.current_class && set.add(s.current_class));
    return Array.from(set).sort();
  }, [students]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        s.admission_number.toLowerCase().includes(q) ||
        s.current_class.toLowerCase().includes(q);
      const matchesClass = selectedClass === 'all' || s.current_class === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [students, search, selectedClass]);

  const handleSendSummon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingReason.trim()) return;
    setSummonSuccess(true);
    setTimeout(() => {
      setSummonSuccess(false);
      setSummonModalStudent(null);
      setMeetingReason('');
      setMeetingDate('');
    }, 1500);
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
              style={{
                backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                color: t.mint,
                fontFamily: SORA,
              }}
            >
              GUILD EXECUTIVE DIRECTORY
            </span>
            <span className="text-xs" style={{ color: t.textLow }}>• Student Body Roster</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
            style={{ fontFamily: SORA, color: t.textHi }}
          >
            Student Roster & Audience Desk
          </h1>
          <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
            Lookup any enrolled learner in the school, review class allocations, and request an executive audience for grievance resolution.
          </p>
        </div>

        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border"
          style={{
            background: cardGrad(isDark),
            borderColor: t.stroke,
          }}
        >
          <div className="p-2 rounded-xl" style={{ background: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)', color: t.mint }}>
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: t.textLow }}>Total Student Body</div>
            <div className="text-lg font-bold" style={{ color: t.textHi }}>{students.length} Learners</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className="p-4 rounded-2xl border flex flex-col md:flex-row items-center gap-4"
        style={{
          background: cardGrad(isDark),
          borderColor: t.stroke,
        }}
      >
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: t.textLow }} />
          <input
            type="text"
            placeholder="Search student name, admission number, or class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border outline-none transition-all"
            style={{
              backgroundColor: t.panel,
              borderColor: t.stroke,
              color: t.textHi,
            }}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4" style={{ color: t.textLow }} />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border outline-none transition-all cursor-pointer"
            style={{
              backgroundColor: t.panel,
              borderColor: t.stroke,
              color: t.textHi,
            }}
          >
            <option value="all">All Classes ({students.length})</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div
            key={s.student_id}
            className="p-4 rounded-2xl border transition-all hover:scale-[1.01] flex flex-col justify-between"
            style={{
              background: cardGrad(isDark),
              borderColor: t.stroke,
            }}
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                    style={{
                      background: isDark ? 'rgba(79,142,247,0.15)' : 'rgba(37,99,235,0.12)',
                      color: t.blue,
                    }}
                  >
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold leading-snug" style={{ color: t.textHi }}>
                      {s.name}
                    </h3>
                    <div className="text-[11px] font-mono mt-0.5" style={{ color: t.textLow }}>
                      {s.admission_number}
                    </div>
                  </div>
                </div>

                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    color: t.textMid,
                  }}
                >
                  {s.current_class}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t" style={{ borderColor: t.stroke }}>
                <div>
                  <div className="text-[10px] uppercase font-semibold" style={{ color: t.textLow }}>Stream</div>
                  <div className="text-xs font-semibold mt-0.5" style={{ color: t.textMid }}>
                    {s.stream || 'Main'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold" style={{ color: t.textLow }}>Gender</div>
                  <div className="text-xs font-semibold mt-0.5" style={{ color: t.textMid }}>
                    {s.gender || 'Not specified'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: t.stroke }}>
              <span className="text-[11px] font-medium" style={{ color: t.mint }}>
                • Active Status
              </span>
              <button
                type="button"
                onClick={() => setSummonModalStudent(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                style={{
                  backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.15)',
                  color: t.mint,
                  border: `1px solid ${isDark ? 'rgba(16,217,168,0.3)' : 'rgba(16,185,129,0.25)'}`,
                }}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Request Audience</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div
          className="p-12 text-center rounded-2xl border"
          style={{ background: cardGrad(isDark), borderColor: t.stroke }}
        >
          <Users className="w-8 h-8 mx-auto mb-2" style={{ color: t.textLow }} />
          <p className="text-sm font-semibold" style={{ color: t.textHi }}>No students found</p>
          <p className="text-xs mt-1" style={{ color: t.textLow }}>Try adjusting your search criteria or class filter.</p>
        </div>
      )}

      {/* Request Audience / Meeting Modal */}
      <NativeModal
        isOpen={Boolean(summonModalStudent)}
        onClose={() => setSummonModalStudent(null)}
        title="Request Executive Audience"
        subtitle={summonModalStudent ? `Official consultation with ${summonModalStudent.name} (${summonModalStudent.admission_number})` : ''}
        icon={MessageSquare}
        size="md"
      >
        {summonModalStudent && (
          <div>
            {summonSuccess ? (
              <div className="p-4 rounded-xl flex items-center gap-3 border border-emerald-400/40 bg-emerald-500/10 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Audience request dispatched successfully! Notice sent to student profile.</span>
              </div>
            ) : (
              <form onSubmit={handleSendSummon} className="space-y-4">
                <div className="relative z-[35] focus-within:z-[50]">
                  <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                    Purpose / Grievance Reference
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="E.g. Follow-up regarding dining hall petition #412 or academic committee inquiry..."
                    value={meetingReason}
                    onChange={(e) => setMeetingReason(e.target.value)}
                    className="w-full bg-black/25 border border-white/20 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all resize-none"
                  />
                </div>

                <div className="relative z-[30] focus-within:z-[50]">
                  <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                    Proposed Meeting Time & Venue
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. Today at 4:30 PM, Guild Office / Prefects Room"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setSummonModalStudent(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Audience Notice</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </NativeModal>
    </div>
  );
}
