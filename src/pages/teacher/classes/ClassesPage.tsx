import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTeacherContext } from '../useTeacherContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  GraduationCap,
  BookOpen,
  Users,
  Award,
  ArrowLeft,
  CalendarCheck,
  FileSpreadsheet,
  Search,
  Sparkles,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';

type ClassInfo = {
  class_name: string;
  subjects: string[];
  is_class_teacher: boolean;
  stream_name?: string | null;
  student_count?: number;
};

export default function TeacherClassesPage() {
  const navigate = useNavigate();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const { schoolId, teacherId, isLoading: ctxLoading } = useTeacherContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'class_teacher' | 'stream'>('all');

  // Fetch classes and subjects assigned to this teacher
  const { data: rawClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ['teacher', 'classes-full', schoolId ?? '', teacherId ?? ''],
    queryFn: async (): Promise<ClassInfo[]> => {
      if (!schoolId || !teacherId) return [];
      const [ctRes, tcsRes, studentsRes] = await Promise.all([
        supabase
          .from('class_teachers')
          .select('class_name')
          .eq('school_id', schoolId)
          .eq('teacher_id', teacherId),
        supabase
          .from('teacher_class_subjects')
          .select('class_name, subject, stream_name')
          .eq('school_id', schoolId)
          .eq('teacher_id', teacherId),
        supabase
          .from('students')
          .select('current_class')
          .eq('school_id', schoolId)
          .eq('status', 'active'),
      ]);

      // Calculate student counts per class
      const countsByClass = new Map<string, number>();
      (studentsRes.data ?? []).forEach((s: { current_class?: string }) => {
        if (!s.current_class) return;
        countsByClass.set(s.current_class, (countsByClass.get(s.current_class) ?? 0) + 1);
      });

      const classTeacherSet = new Set((ctRes.data ?? []).map((r: { class_name: string }) => r.class_name));
      const byClass = new Map<string, Set<string>>();
      const streamByClass = new Map<string, string | null>();

      (tcsRes.data ?? []).forEach((r: { class_name: string; subject: string; stream_name?: string | null }) => {
        if (!byClass.has(r.class_name)) byClass.set(r.class_name, new Set());
        byClass.get(r.class_name)!.add(r.subject);
        if (r.stream_name && !streamByClass.has(r.class_name)) {
          streamByClass.set(r.class_name, r.stream_name);
        }
      });

      const allClasses = new Set([...classTeacherSet, ...byClass.keys()]);
      return Array.from(allClasses)
        .map((class_name) => ({
          class_name,
          subjects: Array.from(byClass.get(class_name) ?? []).sort(),
          is_class_teacher: classTeacherSet.has(class_name),
          stream_name: streamByClass.get(class_name) ?? null,
          student_count: countsByClass.get(class_name) ?? 0,
        }))
        .sort((a, b) => a.class_name.localeCompare(b.class_name));
    },
    enabled: !!schoolId && !!teacherId,
  });

  const isLoading = ctxLoading || classesLoading;

  // Derived metrics
  const totalClasses = rawClasses.length;
  const classTeacherCount = rawClasses.filter((c) => c.is_class_teacher).length;
  const totalStudents = rawClasses.reduce((sum, c) => sum + (c.student_count ?? 0), 0);
  const totalSubjects = useMemo(() => {
    const s = new Set<string>();
    rawClasses.forEach((c) => c.subjects.forEach((sub) => s.add(sub)));
    return s.size;
  }, [rawClasses]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return rawClasses.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.class_name.toLowerCase().includes(q) ||
        (c.stream_name && c.stream_name.toLowerCase().includes(q)) ||
        c.subjects.some((s) => s.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (filterMode === 'class_teacher') return c.is_class_teacher;
      if (filterMode === 'stream') return !!c.stream_name;
      return true;
    });
  }, [rawClasses, searchQuery, filterMode]);

  return (
    <div
      style={{
        background: t.bg,
        color: t.textPrimary,
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Header & Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <button
                type="button"
                onClick={() => navigate('/dashboard/teacher')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: t.textMuted,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <ArrowLeft size={14} />
                Dashboard
              </button>
              <span style={{ fontSize: '12px', color: t.textSub }}>/</span>
              <span style={{ fontSize: '12px', color: t.brandBlue, fontWeight: 600 }}>My Classes</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: t.textPrimary, margin: 0 }}>
              Classroom & Cohorts Hub
            </h1>
            <p style={{ fontSize: '13px', color: t.textMuted, margin: '4px 0 0 0' }}>
              Manage your assigned classes, subject allocations, student rolls, and assessment pipelines.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => navigate('/dashboard/teacher/attendance')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: t.brandMint,
                color: '#064E3B',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(61, 232, 160, 0.25)',
              }}
            >
              <CalendarCheck size={16} />
              Take Attendance
            </button>
          </div>
        </div>

        {/* 4 Summary POS KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Card 1: Assigned Classes */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Assigned Classes
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.textPrimary, marginTop: '4px' }}>
                {totalClasses}
              </div>
              <span style={{ fontSize: '12px', color: t.brandBlue, fontWeight: 500 }}>
                Across timetable allocations
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(120, 170, 255, 0.12)' : '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.brandBlue,
              }}
            >
              <GraduationCap size={24} />
            </div>
          </div>

          {/* Card 2: Class Teacher Directorship */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Class Teacher Roles
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.brandGold, marginTop: '4px' }}>
                {classTeacherCount}
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                {classTeacherCount > 0 ? 'Direct cohort oversight' : 'No master class assigned'}
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(245, 192, 68, 0.12)' : '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.brandGold,
              }}
            >
              <Award size={24} />
            </div>
          </div>

          {/* Card 3: Total Enrolled Pupils */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pupils Under Care
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.brandMint, marginTop: '4px' }}>
                {totalStudents}
              </div>
              <span style={{ fontSize: '12px', color: t.brandMint, fontWeight: 500 }}>
                Active learners registered
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(61, 232, 160, 0.12)' : '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.brandMint,
              }}
            >
              <Users size={24} />
            </div>
          </div>

          {/* Card 4: Subjects Handled */}
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Distinct Subjects
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#A855F7', marginTop: '4px' }}>
                {totalSubjects}
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                Active curriculum syllabus
              </span>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: isDark ? 'rgba(168, 85, 247, 0.12)' : '#F3E8FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#A855F7',
              }}
            >
              <BookOpen size={24} />
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: '14px',
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px' }}>
            <Search size={16} style={{ color: t.textSub }} />
            <input
              type="text"
              placeholder="Search by class name, stream, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: t.textPrimary,
                fontSize: '13px',
                width: '100%',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: t.textSub, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={12} /> Filter:
            </span>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterMode === 'all' ? t.brandBlue : t.card,
                color: filterMode === 'all' ? '#FFFFFF' : t.textMuted,
              }}
            >
              All ({totalClasses})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('class_teacher')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterMode === 'class_teacher' ? t.brandGold : t.card,
                color: filterMode === 'class_teacher' ? '#78350F' : t.textMuted,
              }}
            >
              Class Teacher ({classTeacherCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('stream')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterMode === 'stream' ? '#A855F7' : t.card,
                color: filterMode === 'stream' ? '#FFFFFF' : t.textMuted,
              }}
            >
              With Streams
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: `3px solid ${t.brandBlue}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '12px', fontSize: '14px', color: t.textMuted }}>Loading class structures and rosters...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredClasses.length === 0 && (
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: t.textSub,
              }}
            >
              <Layers size={28} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: t.textPrimary, margin: 0 }}>
              {searchQuery ? 'No matching classes found' : 'No classes assigned yet'}
            </h3>
            <p style={{ fontSize: '13px', color: t.textMuted, maxWidth: '420px', margin: '8px auto 0 auto' }}>
              {searchQuery
                ? 'Try adjusting your search criteria or clearing filters.'
                : 'Your timetable coordinator or school administrator has not assigned you to any classes or subjects yet.'}
            </p>
          </div>
        )}

        {/* Class Cards Grid */}
        {!isLoading && filteredClasses.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredClasses.map((c) => (
              <div
                key={c.class_name}
                style={{
                  background: t.card,
                  border: `1px solid ${c.is_class_teacher ? (isDark ? 'rgba(245, 192, 68, 0.4)' : '#FCD34D') : t.border}`,
                  borderRadius: '18px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: c.is_class_teacher ? '0 4px 20px rgba(245, 192, 68, 0.08)' : '0 2px 10px rgba(0,0,0,0.04)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
              >
                <div>
                  {/* Top line badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isDark ? 'rgba(120, 170, 255, 0.15)' : '#EFF6FF',
                          color: t.brandBlue,
                        }}
                      >
                        COHORT
                      </span>
                      {c.stream_name && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isDark ? 'rgba(168, 85, 247, 0.15)' : '#F3E8FF',
                            color: '#A855F7',
                          }}
                        >
                          Stream: {c.stream_name}
                        </span>
                      )}
                    </div>

                    {c.is_class_teacher && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isDark ? 'rgba(245, 192, 68, 0.2)' : '#FEF3C7',
                          color: isDark ? t.brandGold : '#92400E',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Award size={12} />
                        Class Teacher
                      </span>
                    )}
                  </div>

                  {/* Title & Pupil Count */}
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: t.textPrimary, margin: 0 }}>
                      {c.class_name}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 700, color: t.brandMint }}>
                      <Users size={14} />
                      {c.student_count} students
                    </div>
                  </div>

                  {/* Subjects Pill List */}
                  <div style={{ marginTop: '16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: t.textSub, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Subjects Allocated ({c.subjects.length})
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {c.subjects.length === 0 ? (
                        <span style={{ fontSize: '12px', color: t.textMuted, fontStyle: 'italic' }}>
                          General Class Teacher Oversight
                        </span>
                      ) : (
                        c.subjects.map((sub) => (
                          <span
                            key={sub}
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              background: t.surface,
                              border: `1px solid ${t.border}`,
                              color: t.textPrimary,
                              borderRadius: '6px',
                              padding: '4px 9px',
                            }}
                          >
                            {sub}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div
                  style={{
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: `1px solid ${t.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/teacher/attendance`)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: t.surface,
                      border: `1px solid ${t.border}`,
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: t.textPrimary,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <CalendarCheck size={14} style={{ color: t.brandMint }} />
                    Attendance
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/teacher/exam-results/class/${encodeURIComponent(c.class_name)}`)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: t.surface,
                      border: `1px solid ${t.border}`,
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: t.textPrimary,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <FileSpreadsheet size={14} style={{ color: t.brandBlue }} />
                    Marks
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/teacher/students`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '34px',
                      height: '34px',
                      background: t.surface,
                      border: `1px solid ${t.border}`,
                      borderRadius: '8px',
                      color: t.textMuted,
                      cursor: 'pointer',
                    }}
                    title="View Students Roster"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
