import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  GraduationCap,
  Users,
  UserCheck,
  UserX,
  Layers,
  Search,
  ArrowRight,
  Sparkles,
  Settings,
  ChevronRight,
  School,
  BookOpen,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useUIStore } from '../../../store/uiStore';
import { useSchoolType, isTertiarySchool } from '@/hooks/useSchoolType';
import { getTokens, SORA, INTER } from '../../../styles/posThemeTokens';
import { canonicalClassNamesForSchoolType } from '../../../lib/schoolClassNames';
import { parseCohortKey } from '@/lib/tertiaryCurriculum';

const STALE_TIME_MS = 2 * 60 * 1000;

interface ClassItem {
  name: string;
  levelCategory: 'nursery' | 'primary' | 'secondary' | 'nursing' | 'midwifery' | 'other';
  awardLevel?: 'certificate' | 'diploma';
  programmeTitle?: string;
  studentCount: number;
  teacherId?: string;
  teacherName?: string;
  streams: string[];
}

export const fetchClassesPage = async (userIdOrSchoolId: string) => fetchClassesData(userIdOrSchoolId, null);
export async function fetchClassesData(schoolId: string, schoolType: any): Promise<ClassItem[]> {
  if (!schoolId) return [];

  const isTertiary = isTertiarySchool(schoolType);

  // 1. Get canonical classes based on school type
  const canonical = canonicalClassNamesForSchoolType(schoolType);

  // 2. Fetch all students to count enrollments and capture any custom class names
  const [studentsRes, teachersRes, classTeachersRes, streamsRes] = await Promise.all([
    supabase.from('students').select('student_id, current_class').eq('school_id', schoolId),
    supabase.from('teachers').select('teacher_id, name').eq('school_id', schoolId),
    supabase.from('class_teachers').select('class_name, teacher_id').eq('school_id', schoolId),
    supabase.from('class_streams').select('class_name, stream_name').eq('school_id', schoolId),
  ]);

  const students = studentsRes.data || [];
  const teachers = teachersRes.data || [];
  const classTeachers = classTeachersRes.data || [];
  const streams = streamsRes.data || [];

  // Teacher lookup map
  const teacherMap = new Map<string, string>();
  teachers.forEach((t) => teacherMap.set(t.teacher_id, t.name));

  // Class teacher lookup map
  const classTeacherMap = new Map<string, string>();
  classTeachers.forEach((ct) => {
    if (ct.class_name && ct.teacher_id) {
      classTeacherMap.set(ct.class_name, ct.teacher_id);
    }
  });

  // Class counts
  const studentCountMap = new Map<string, number>();
  const allClassesSet = new Set<string>(canonical);

  students.forEach((s) => {
    if (s.current_class) {
      allClassesSet.add(s.current_class);
      studentCountMap.set(s.current_class, (studentCountMap.get(s.current_class) || 0) + 1);
    }
  });

  // Streams map
  const streamsMap = new Map<string, string[]>();
  streams.forEach((st) => {
    if (st.class_name) {
      const arr = streamsMap.get(st.class_name) || [];
      if (st.stream_name && !arr.includes(st.stream_name)) {
        arr.push(st.stream_name);
      }
      streamsMap.set(st.class_name, arr);
    }
  });

  // Sort canonical classes in order, followed by custom
  const orderedList = Array.from(allClassesSet).sort((a, b) => {
    const idxA = canonical.indexOf(a);
    const idxB = canonical.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  return orderedList.map((name) => {
    const lower = name.toLowerCase();
    let levelCategory: 'nursery' | 'primary' | 'secondary' | 'nursing' | 'midwifery' | 'other' = 'other';
    let awardLevel: 'certificate' | 'diploma' | undefined = undefined;
    let programmeTitle: string | undefined = undefined;

    if (isTertiary || name.startsWith('CN') || name.startsWith('DN') || name.startsWith('CM') || name.startsWith('DM')) {
      const parsed = parseCohortKey(name);
      if (parsed) {
        programmeTitle = parsed.programmeName;
        awardLevel = parsed.programme?.awardLevel || (parsed.courseCode.startsWith('C') ? 'certificate' : 'diploma');
        levelCategory = parsed.courseCode.includes('N') ? 'nursing' : 'midwifery';
      } else if (lower.includes('midwif') || lower.includes('cm') || lower.includes('dm')) {
        levelCategory = 'midwifery';
        awardLevel = lower.includes('dip') ? 'diploma' : 'certificate';
      } else {
        levelCategory = 'nursing';
        awardLevel = lower.includes('dip') ? 'diploma' : 'certificate';
      }
    } else if (lower.includes('baby') || lower.includes('middle') || lower.includes('top') || lower.includes('nursery') || lower.includes('kg')) {
      levelCategory = 'nursery';
    } else if (lower.includes('primary') || lower.startsWith('p.') || lower.startsWith('p ')) {
      levelCategory = 'primary';
    } else if (lower.includes('senior') || lower.startsWith('s.') || lower.startsWith('s ')) {
      levelCategory = 'secondary';
    }

    const tId = classTeacherMap.get(name);
    return {
      name,
      levelCategory,
      awardLevel,
      programmeTitle,
      studentCount: studentCountMap.get(name) || 0,
      teacherId: tId,
      teacherName: tId ? teacherMap.get(tId) : undefined,
      streams: streamsMap.get(name) || [],
    };
  });
}

export default function SettingsClassesPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const { schoolType, isTertiary } = useSchoolType();

  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const { data: classes = [], isLoading } = useQuery<ClassItem[]>({
    queryKey: ['admin', 'settings', 'classes-redesign', schoolId, schoolType],
    queryFn: () => fetchClassesData(schoolId!, schoolType),
    enabled: Boolean(schoolId),
    staleTime: STALE_TIME_MS,
  });

  // KPIs
  const totalClasses = classes.length;
  const totalStudents = useMemo(() => classes.reduce((acc, c) => acc + c.studentCount, 0), [classes]);
  const assignedCount = useMemo(() => classes.filter((c) => Boolean(c.teacherName)).length, [classes]);
  const unassignedCount = totalClasses - assignedCount;
  const totalStreams = useMemo(() => classes.reduce((acc, c) => acc + c.streams.length, 0), [classes]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.programmeTitle && c.programmeTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.teacherName && c.teacherName.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      if (levelFilter === 'all') return true;
      if (levelFilter === 'unassigned') return !c.teacherName;
      if (levelFilter === 'certificate') return c.awardLevel === 'certificate';
      if (levelFilter === 'diploma') return c.awardLevel === 'diploma';
      return c.levelCategory === levelFilter;
    });
  }, [classes, searchQuery, levelFilter]);

  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 transition-colors"
      style={{ background: t.screenBg, color: t.textHi, fontFamily: INTER }}
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: t.mint }}
            />
            <span
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: t.mint }}
            >
              Academic Infrastructure
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight"
            style={{ color: t.textHi, fontFamily: SORA }}
          >
            {isTertiary ? 'Programmes & Cohorts' : 'Class Management'}
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: t.textMid }}>
            {isTertiary
              ? 'Manage academic programmes, semester cohorts, student enrollment capacity, and designate cohort class tutors.'
              : 'Configure class tiers, monitor enrollment capacity, track active streams, and designate head class tutors.'}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/students/stream-allocation')}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all border shadow-sm hover:scale-[1.01]"
            style={{
              background: t.panel,
              borderColor: t.stroke,
              color: t.textHi,
            }}
          >
            <Layers className="h-4 w-4" style={{ color: t.blue }} />
            <span>{isTertiary ? 'Intake / Set Allocation' : 'Stream Allocation'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/settings')}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all border shadow-sm hover:scale-[1.01]"
            style={{
              background: t.panel,
              borderColor: t.stroke,
              color: t.textMid,
            }}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* TERTIARY CONTEXTUAL GUIDANCE BANNER */}
      {isTertiary && (
        <div
          className="p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-sm"
          style={{ background: t.panel, borderColor: t.stroke }}
        >
          <div className="flex items-start gap-2.5">
            <BookOpen className="h-4 w-4 shrink-0 mt-0.5" style={{ color: t.mint }} />
            <div>
              <span className="font-bold" style={{ color: t.textHi }}>
                Cohort Tutors & Course Unit Allocations:
              </span>{' '}
              <span style={{ color: t.textMid }}>
                Designate a Cohort Tutor below to act as the head patron supervising a semester cohort. To assign tutors to individual lecture modules and course units, go to{' '}
              </span>
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin/settings/assignments')}
                className="font-bold underline hover:opacity-80 inline-flex items-center gap-1"
                style={{ color: t.mint }}
              >
                <span>Tutor ↔ Course Unit Allocations</span>
                <ArrowRight className="h-3 w-3 inline" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Classes / Cohorts */}
        <div
          className="rounded-2xl p-4 sm:p-5 border transition-all shadow-sm"
          style={{ background: t.panel, borderColor: t.stroke }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
              {isTertiary ? 'Total Cohorts' : 'Total Classes'}
            </span>
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center"
              style={{ background: t.mintDim, color: t.mint }}
            >
              <School className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tabular-nums" style={{ color: t.textHi, fontFamily: SORA }}>
            {isLoading ? '…' : totalClasses}
          </div>
          <p className="text-[11px] mt-1" style={{ color: t.textMid }}>
            {isTertiary ? 'Active programme cohorts configured' : 'Active cohort grades configured'}
          </p>
        </div>

        {/* Total Students */}
        <div
          className="rounded-2xl p-4 sm:p-5 border transition-all shadow-sm"
          style={{ background: t.panel, borderColor: t.stroke }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
              {isTertiary ? 'Students Enrolled' : 'Learners Enrolled'}
            </span>
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center"
              style={{ background: t.blueDim, color: t.blue }}
            >
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tabular-nums" style={{ color: t.textHi, fontFamily: SORA }}>
            {isLoading ? '…' : totalStudents.toLocaleString()}
          </div>
          <p className="text-[11px] mt-1" style={{ color: t.textMid }}>
            {isTertiary ? 'Active student nurses & midwives' : 'Active students across all classes'}
          </p>
        </div>

        {/* Assigned Teachers / Tutors */}
        <div
          className="rounded-2xl p-4 sm:p-5 border transition-all shadow-sm"
          style={{ background: t.panel, borderColor: t.stroke }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
              {isTertiary ? 'Designated Tutors' : 'Assigned Teachers'}
            </span>
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center"
              style={{ background: t.mintDim, color: t.mint }}
            >
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tabular-nums" style={{ color: t.mint, fontFamily: SORA }}>
            {isLoading ? '…' : assignedCount}
            <span className="text-sm font-semibold ml-1.5 opacity-70" style={{ color: t.textMid }}>
              / {totalClasses}
            </span>
          </div>
          <p className="text-[11px] mt-1" style={{ color: t.textMid }}>
            {unassignedCount > 0
              ? isTertiary
                ? `${unassignedCount} missing cohort tutor`
                : `${unassignedCount} missing class teacher`
              : isTertiary
              ? '100% tutor coverage'
              : '100% staff coverage'}
          </p>
        </div>

        {/* Streams Configured */}
        <div
          className="rounded-2xl p-4 sm:p-5 border transition-all shadow-sm"
          style={{ background: t.panel, borderColor: t.stroke }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
              {isTertiary ? 'Active Intakes & Sets' : 'Active Streams'}
            </span>
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center"
              style={{ background: t.goldDim, color: t.gold }}
            >
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tabular-nums" style={{ color: t.gold, fontFamily: SORA }}>
            {isLoading ? '…' : totalStreams}
          </div>
          <p className="text-[11px] mt-1" style={{ color: t.textMid }}>
            {isTertiary ? 'Sub-streams and intake sets active' : 'Sub-streams and cohorts active'}
          </p>
        </div>
      </div>

      {/* SEARCH AND FILTER CONTROLS */}
      <div
        className="rounded-2xl p-4 border flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-sm"
        style={{ background: t.panel, borderColor: t.stroke }}
      >
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: t.textLow }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isTertiary ? 'Search programme, cohort or tutor…' : 'Search classes or assigned teachers…'}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl transition-all focus:outline-none"
            style={{
              background: t.fieldBg,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(isTertiary
            ? [
                { id: 'all', label: 'All Cohorts' },
                { id: 'nursing', label: 'Nursing (CN / DN)' },
                { id: 'midwifery', label: 'Midwifery (CM / DM)' },
                { id: 'certificate', label: 'Certificate' },
                { id: 'diploma', label: 'Diploma' },
                { id: 'unassigned', label: 'Needs Cohort Tutor' },
              ]
            : [
                { id: 'all', label: 'All Classes' },
                { id: 'nursery', label: 'Nursery / Early Years' },
                { id: 'primary', label: 'Primary' },
                { id: 'secondary', label: 'Secondary' },
                { id: 'unassigned', label: 'Needs Teacher' },
              ]
          ).map((flt) => {
            const active = levelFilter === flt.id;
            return (
              <button
                key={flt.id}
                type="button"
                onClick={() => setLevelFilter(flt.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border"
                style={{
                  background: active ? t.mintDim : 'transparent',
                  borderColor: active ? t.mintRing : t.stroke,
                  color: active ? t.mint : t.textMid,
                }}
              >
                {flt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CLASSES GRID */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl p-5 border animate-pulse h-44"
              style={{ background: t.panel, borderColor: t.stroke }}
            />
          ))}
        </div>
      ) : filteredClasses.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center border space-y-3 shadow-sm"
          style={{ background: t.panel, borderColor: t.stroke }}
        >
          <BookOpen className="h-10 w-10 mx-auto opacity-30" style={{ color: t.textMid }} />
          <h3 className="text-base font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
            {isTertiary ? 'No cohorts found' : 'No classes found'}
          </h3>
          <p className="text-xs max-w-sm mx-auto" style={{ color: t.textMid }}>
            {isTertiary
              ? 'No cohorts match your current search query or filter. Clear the search term to view all cohorts.'
              : 'No classes match your current search query or level filter. Clear the search term to view all classes.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setLevelFilter('all');
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: t.mintDim, color: t.mint }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((item) => {
            const hasTeacher = Boolean(item.teacherName);
            return (
              <div
                key={item.name}
                onClick={() => navigate(`/dashboard/admin/settings/classes/${encodeURIComponent(item.name)}`)}
                className="group cursor-pointer rounded-2xl p-5 border transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.01] flex flex-col justify-between"
                style={{
                  background: t.panel,
                  borderColor: t.stroke,
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background:
                          item.awardLevel === 'certificate' || item.levelCategory === 'nursery'
                            ? t.goldDim
                            : item.awardLevel === 'diploma' || item.levelCategory === 'primary'
                            ? t.mintDim
                            : item.levelCategory === 'secondary'
                            ? t.blueDim
                            : t.fieldBg,
                        color:
                          item.awardLevel === 'certificate' || item.levelCategory === 'nursery'
                            ? t.gold
                            : item.awardLevel === 'diploma' || item.levelCategory === 'primary'
                            ? t.mint
                            : item.levelCategory === 'secondary'
                            ? t.blue
                            : t.textMid,
                      }}
                    >
                      {item.awardLevel ? item.awardLevel.toUpperCase() : item.levelCategory}
                    </span>

                    <span
                      className="flex items-center gap-1.5 text-xs font-bold tabular-nums"
                      style={{ color: t.textHi }}
                    >
                      <Users className="h-3.5 w-3.5" style={{ color: t.textLow }} />
                      <span>
                        {item.studentCount} {isTertiary ? (item.studentCount === 1 ? 'Student' : 'Students') : (item.studentCount === 1 ? 'Learner' : 'Learners')}
                      </span>
                    </span>
                  </div>

                  {/* Class / Cohort Name */}
                  <h3
                    className="text-lg font-bold group-hover:text-emerald-500 dark:group-hover:text-[#3DE8A0] transition-colors"
                    style={{ color: t.textHi, fontFamily: SORA }}
                  >
                    {item.name}
                  </h3>
                  {item.programmeTitle && (
                    <div className="text-[11px] font-medium mt-0.5" style={{ color: t.textMid }}>
                      {item.programmeTitle}
                    </div>
                  )}

                  {/* Streams / Sets */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {item.streams.length > 0 ? (
                      item.streams.map((stream) => (
                        <span
                          key={stream}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium border"
                          style={{
                            background: t.fieldBg,
                            borderColor: t.stroke,
                            color: t.textMid,
                          }}
                        >
                          {stream}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] italic" style={{ color: t.textLow }}>
                        {isTertiary ? 'Single unified cohort' : 'Single stream'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Cohort Tutor / Class Teacher */}
                <div
                  className="mt-5 pt-3.5 border-t flex items-center justify-between"
                  style={{ borderColor: t.divider }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0"
                      style={{
                        background: hasTeacher ? t.mintDim : t.redDim,
                        color: hasTeacher ? t.mint : t.red,
                      }}
                    >
                      {hasTeacher ? item.teacherName!.charAt(0).toUpperCase() : <UserX className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
                        {isTertiary ? 'Cohort Tutor' : 'Class Teacher'}
                      </div>
                      <div
                        className="text-xs font-semibold truncate"
                        style={{ color: hasTeacher ? t.textHi : t.red }}
                      >
                        {hasTeacher ? item.teacherName : 'Unassigned'}
                      </div>
                    </div>
                  </div>

                  <ArrowRight
                    className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
                    style={{ color: t.textLow }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
