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
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import '@/styles/government-system.css';

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
    <AdminPageWrapper>
      <div className="space-y-4">
        {/* ── 1. TOP HEADER (GOVERNMENT DESIGN SYSTEM STANDARD) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans m-0">
              {isTertiary ? 'Programmes & Cohorts Registry' : 'Class Management Registry'}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
              {filteredClasses.length} {isTertiary ? (filteredClasses.length === 1 ? 'COHORT' : 'COHORTS') : (filteredClasses.length === 1 ? 'CLASS' : 'CLASSES')}
            </span>
          </div>

          {/* Action Button Group */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/students/stream-allocation')}
              className="gov-btn gov-btn-sm"
              title={isTertiary ? 'Intake & Set Allocation' : 'Stream Allocation'}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isTertiary ? 'Intake / Set Allocation' : 'Stream Allocation'}</span>
            </button>

            {isTertiary && (
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin/settings/assignments')}
                className="gov-btn gov-btn-sm"
                title="Tutor Course Unit Allocations"
              >
                <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                <span>Course Unit Allocations</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/settings')}
              className="gov-btn gov-btn-sm"
              title="Academic Settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* ── 2. METRIC SUMMARY BOXES (PLAIN, HIGH-DENSITY, NO FLUFF) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              {isTertiary ? 'Total Cohorts' : 'Total Classes'}
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {isLoading ? '…' : totalClasses}
            </div>
          </div>

          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              {isTertiary ? 'Trainees Enrolled' : 'Learners Enrolled'}
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {isLoading ? '…' : totalStudents.toLocaleString()}
            </div>
          </div>

          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              {isTertiary ? 'Designated Tutors' : 'Assigned Teachers'}
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {isLoading ? '…' : `${assignedCount} / ${totalClasses}`}
            </div>
          </div>

          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              {isTertiary ? 'Active Intakes / Sets' : 'Active Streams'}
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {isLoading ? '…' : totalStreams}
            </div>
          </div>
        </div>

        {/* ── 3. CONTROLS BAR ── */}
        <div className="gov-control-bar">
          <div className="gov-control-bar-left flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#555555] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={isTertiary ? 'Search programme, cohort code, or tutor…' : 'Search classes or assigned teachers…'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="gov-input pl-8 font-mono text-xs"
              />
            </div>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="gov-select w-auto text-xs"
              aria-label="Filter Level"
            >
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
              ).map((flt) => (
                <option key={flt.id} value={flt.id}>
                  {flt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── 4. HIGH-DENSITY COHORTS DATA TABLE ── */}
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded border border-[#CCCCCC] bg-[#EAEAEA]" />
            ))}
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="gov-card p-12 text-center text-xs text-[#555555]">
            {isTertiary ? 'No cohorts found matching search criteria.' : 'No classes found matching search criteria.'}
          </div>
        ) : (
          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>{isTertiary ? 'Cohort Code' : 'Class Code'}</th>
                  <th>{isTertiary ? 'Programme Title' : 'Academic Level'}</th>
                  <th>Level / Award</th>
                  <th>Enrolled Trainees</th>
                  <th>{isTertiary ? 'Intake Sets' : 'Streams'}</th>
                  <th>{isTertiary ? 'Designated Tutor' : 'Class Teacher'}</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((item) => {
                  const hasTeacher = Boolean(item.teacherName);
                  return (
                    <tr
                      key={item.name}
                      onClick={() => navigate(`/dashboard/admin/settings/classes/${encodeURIComponent(item.name)}`)}
                      className="cursor-pointer"
                    >
                      <td className="font-mono font-bold text-xs">
                        {item.name}
                      </td>
                      <td className="font-semibold text-xs text-[#111111]">
                        {item.programmeTitle || item.name}
                      </td>
                      <td>
                        <span className="gov-tag text-[10px]">
                          {item.awardLevel ? item.awardLevel.toUpperCase() : item.levelCategory.toUpperCase()}
                        </span>
                      </td>
                      <td className="font-mono text-xs font-bold">
                        {item.studentCount} {isTertiary ? 'Trainees' : 'Learners'}
                      </td>
                      <td>
                        {item.streams.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.streams.map((stream) => (
                              <span key={stream} className="gov-tag text-[10px]">
                                {stream}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#777777] text-xs italic">
                            {isTertiary ? 'Single Cohort' : 'Single Stream'}
                          </span>
                        )}
                      </td>
                      <td>
                        {hasTeacher ? (
                          <span className="font-medium text-xs text-[#111111]">
                            {item.teacherName}
                          </span>
                        ) : (
                          <span className="gov-tag gov-tag-rejected text-[10px]">
                            UNASSIGNED
                          </span>
                        )}
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/admin/settings/classes/${encodeURIComponent(item.name)}`)}
                          className="gov-btn gov-btn-sm"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
