import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { schoolCalendarTodayIso } from '@/lib/schoolCalendarDate';
import { resolveCurrentSchoolTerm, resolveActiveStudentIdsForTerm } from '@/lib/adminFinanceTerm';
import { useTeacherContext } from '../useTeacherContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  Users,
  GraduationCap,
  Search,
  ArrowLeft,
  Filter,
  CalendarCheck,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Download,
  BookOpen,
} from 'lucide-react';

type StudentRow = {
  student_id: string;
  name: string;
  current_class: string;
  admission_number?: string;
  gender?: string | null;
};

// Deterministic avatar color generation
function getAvatarColor(name: string, isDark: boolean): { bg: string; text: string } {
  const colors = [
    { bg: isDark ? '#1E3A8A' : '#DBEAFE', text: isDark ? '#93C5FD' : '#1D4ED8' },
    { bg: isDark ? '#064E3B' : '#D1FAE5', text: isDark ? '#6EE7B7' : '#047857' },
    { bg: isDark ? '#78350F' : '#FEF3C7', text: isDark ? '#FCD34D' : '#B45309' },
    { bg: isDark ? '#581C87' : '#F3E8FF', text: isDark ? '#D8B4FE' : '#6B21A8' },
    { bg: isDark ? '#831843' : '#FCE7F3', text: isDark ? '#F472B6' : '#BE185D' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function TeacherStudentsPage() {
  const navigate = useNavigate();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const { schoolId, classNames, isLoading: ctxLoading } = useTeacherContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['teacher', 'students-full', schoolId ?? '', classNames.join(',')],
    queryFn: async (): Promise<StudentRow[]> => {
      if (!schoolId || classNames.length === 0) return [];
      const today = schoolCalendarTodayIso();
      const term = await resolveCurrentSchoolTerm(supabase, schoolId, today);
      if (term) {
        const activeIds = await resolveActiveStudentIdsForTerm(supabase, schoolId, term, today);
        if (activeIds.size > 0) {
          const { data } = await supabase
            .from('students')
            .select('student_id, name, current_class, admission_number, gender')
            .eq('school_id', schoolId)
            .eq('status', 'active')
            .in('current_class', classNames)
            .in('student_id', Array.from(activeIds))
            .order('current_class')
            .order('name');
          return (data as StudentRow[]) ?? [];
        }
        return [];
      }
      const { data } = await supabase
        .from('students')
        .select('student_id, name, current_class, admission_number, gender')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .in('current_class', classNames)
        .order('current_class')
        .order('name');
      return (data as StudentRow[]) ?? [];
    },
    enabled: !!schoolId && classNames.length > 0,
  });

  const isLoading = ctxLoading || studentsLoading;

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.admission_number && s.admission_number.toLowerCase().includes(q)) ||
        s.current_class.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (selectedClassFilter !== 'all' && s.current_class !== selectedClassFilter) {
        return false;
      }
      return true;
    });
  }, [students, searchQuery, selectedClassFilter]);

  // Summary Metrics
  const totalStudents = students.length;
  const classesRepresented = useMemo(() => {
    const s = new Set(students.map((r) => r.current_class));
    return s.size;
  }, [students]);

  const avgClassSize = classesRepresented > 0 ? Math.round(totalStudents / classesRepresented) : 0;

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredStudents.length === 0) return;
    const header = ['Admission Number', 'Full Name', 'Class', 'Gender'];
    const rows = filteredStudents.map((s) => [
      `"${s.admission_number || 'N/A'}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.current_class}"`,
      `"${s.gender || 'N/A'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Students_Roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        
        {/* Header & Navigation */}
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
              <span style={{ fontSize: '12px', color: t.brandMint, fontWeight: 600 }}>My Students</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: t.textPrimary, margin: 0 }}>
              Learner Roster & Student Profiles
            </h1>
            <p style={{ fontSize: '13px', color: t.textMuted, margin: '4px 0 0 0' }}>
              Detailed directory of active pupils enrolled in your assigned classes and teaching streams.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredStudents.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: t.surface,
                border: `1px solid ${t.border}`,
                color: t.textPrimary,
                borderRadius: '10px',
                padding: '9px 15px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: filteredStudents.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filteredStudents.length === 0 ? 0.5 : 1,
              }}
            >
              <Download size={15} />
              Export Roster CSV
            </button>
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
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <CalendarCheck size={16} />
              Mark Attendance
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
          {/* Card 1: Total Learners */}
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
                Total Pupils
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.brandMint, marginTop: '4px' }}>
                {totalStudents}
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                Active in your classes
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

          {/* Card 2: Classes Represented */}
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
                Cohorts Active
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.brandBlue, marginTop: '4px' }}>
                {classesRepresented}
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                Distinct class sections
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

          {/* Card 3: Average Cohort Size */}
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
                Avg. Cohort Size
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: t.brandGold, marginTop: '4px' }}>
                {avgClassSize}
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                Pupils per classroom
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
              <Layers size={24} />
            </div>
          </div>

          {/* Card 4: Filter Match */}
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
                Current View
              </span>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#A855F7', marginTop: '4px' }}>
                {filteredStudents.length}
              </div>
              <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500 }}>
                Matching filter criteria
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

        {/* Search & Class Selector Pills */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: '16px',
            padding: '16px',
          }}
        >
          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={18} style={{ color: t.textSub }} />
            <input
              type="text"
              placeholder="Search student by name, admission number, or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: t.textPrimary,
                fontSize: '14px',
                width: '100%',
                outline: 'none',
              }}
            />
          </div>

          {/* Class Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: `1px solid ${t.border}` }}>
            <span style={{ fontSize: '12px', color: t.textSub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={12} /> Class Filter:
            </span>
            <button
              type="button"
              onClick={() => setSelectedClassFilter('all')}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: selectedClassFilter === 'all' ? t.brandMint : t.card,
                color: selectedClassFilter === 'all' ? '#064E3B' : t.textMuted,
              }}
            >
              All Classes ({totalStudents})
            </button>
            {classNames.map((c) => {
              const count = students.filter((s) => s.current_class === c).length;
              const isSelected = selectedClassFilter === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedClassFilter(c)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: isSelected ? t.brandBlue : t.card,
                    color: isSelected ? '#FFFFFF' : t.textMuted,
                  }}
                >
                  {c} ({count})
                </button>
              );
            })}
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
            <div style={{ display: 'inline-block', width: '32px', height: '32px', border: `3px solid ${t.brandMint}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '12px', fontSize: '14px', color: t.textMuted }}>Resolving student rosters and class enrollments...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredStudents.length === 0 && (
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
              <Users size={28} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: t.textPrimary, margin: 0 }}>
              {searchQuery ? 'No students match your search' : 'No students found in your classes'}
            </h3>
            <p style={{ fontSize: '13px', color: t.textMuted, maxWidth: '420px', margin: '8px auto 0 auto' }}>
              {searchQuery
                ? 'Check spelling or clear the search and class filter to see all enrolled learners.'
                : 'There are currently no active students assigned to the classes on your teaching timetable.'}
            </p>
          </div>
        )}

        {/* High-Grade POS Student Table */}
        {!isLoading && filteredStudents.length > 0 && (
          <div
            style={{
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: '18px',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: `1px solid ${t.border}`,
                      background: t.surface,
                      color: t.textSub,
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <th style={{ padding: '14px 20px' }}>Learner Profile</th>
                    <th style={{ padding: '14px 16px' }}>Admission Number</th>
                    <th style={{ padding: '14px 16px' }}>Enrolled Class</th>
                    <th style={{ padding: '14px 16px' }}>Gender</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, index) => {
                    const avatar = getAvatarColor(s.name, isDark);
                    const initials = s.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr
                        key={s.student_id}
                        style={{
                          borderBottom: index === filteredStudents.length - 1 ? 'none' : `1px solid ${t.border}`,
                          transition: 'background 0.1s ease',
                        }}
                      >
                        {/* Name with Avatar */}
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: avatar.bg,
                                color: avatar.text,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '13px',
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: t.textPrimary }}>
                                {s.name}
                              </div>
                              <div style={{ fontSize: '11px', color: t.textMuted }}>
                                ID: {s.student_id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Admission Number */}
                        <td style={{ padding: '14px 16px', color: t.textPrimary, fontWeight: 600 }}>
                          {s.admission_number || <span style={{ color: t.textSub, fontStyle: 'italic' }}>Pending</span>}
                        </td>

                        {/* Class */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: isDark ? 'rgba(120, 170, 255, 0.15)' : '#EFF6FF',
                              color: t.brandBlue,
                            }}
                          >
                            {s.current_class}
                          </span>
                        </td>

                        {/* Gender */}
                        <td style={{ padding: '14px 16px', color: t.textMuted, textTransform: 'capitalize' }}>
                          {s.gender || 'Unspecified'}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => navigate(`/dashboard/teacher/exam-results/class/${encodeURIComponent(s.current_class)}`)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 10px',
                                borderRadius: '7px',
                                background: t.surface,
                                border: `1px solid ${t.border}`,
                                color: t.brandBlue,
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <FileSpreadsheet size={13} />
                              Marks
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate('/dashboard/teacher/attendance')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 10px',
                                borderRadius: '7px',
                                background: t.surface,
                                border: `1px solid ${t.border}`,
                                color: t.brandMint,
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <CalendarCheck size={13} />
                              Attendance
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div
              style={{
                padding: '12px 20px',
                background: t.surface,
                borderTop: `1px solid ${t.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: t.textMuted,
              }}
            >
              <span>Showing {filteredStudents.length} of {totalStudents} active learners</span>
              <span>All records synced with official admission ledger</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
