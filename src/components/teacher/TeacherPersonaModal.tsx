import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Check,
  X,
  BookOpen,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  GraduationCap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { useTeacherPersonaStore, SimulatedTeacher } from '@/store/teacherPersonaStore';
import { useSchoolType } from '@/hooks/useSchoolType';

interface TeacherPersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export default function TeacherPersonaModal({
  isOpen,
  onClose,
  title = 'Presentation Mode: Select Teacher Persona',
  subtitle = 'Choose a teacher from this institution to simulate and preview their dashboard, timetable, assigned classes, and marks entry.',
}: TeacherPersonaModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const { isTertiary } = useSchoolType();

  const user = useAuthStore((s) => s.user);
  const schoolId =
    useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;

  const { simulatedTeacher, setSimulatedTeacher, clearSimulatedTeacher } = useTeacherPersonaStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all teachers in this school
  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['school-teachers-for-simulation', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const [tRes, tcsRes] = await Promise.all([
        supabase
          .from('teachers')
          .select('teacher_id, name, email, phone, subjects_taught')
          .eq('school_id', schoolId)
          .order('name'),
        supabase
          .from('teacher_class_subjects')
          .select('teacher_id, class_name, subject')
          .eq('school_id', schoolId),
      ]);

      const tcsMap = new Map<string, { classes: Set<string>; subjects: Set<string> }>();
      (tcsRes.data || []).forEach((row: any) => {
        if (!tcsMap.has(row.teacher_id)) {
          tcsMap.set(row.teacher_id, { classes: new Set(), subjects: new Set() });
        }
        const entry = tcsMap.get(row.teacher_id)!;
        if (row.class_name) entry.classes.add(row.class_name);
        if (row.subject) entry.subjects.add(row.subject);
      });

      return (tRes.data || []).map((t: any) => {
        const stats = tcsMap.get(t.teacher_id);
        const subjectsFromTcs = stats ? Array.from(stats.subjects) : [];
        const classesFromTcs = stats ? Array.from(stats.classes) : [];
        const declaredSubjects = Array.isArray(t.subjects_taught)
          ? t.subjects_taught
          : typeof t.subjects_taught === 'string'
          ? t.subjects_taught.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];

        const combinedSubjects = Array.from(new Set([...subjectsFromTcs, ...declaredSubjects]));

        return {
          id: t.teacher_id,
          name: t.name,
          email: t.email || null,
          phone: t.phone || null,
          subjects: combinedSubjects,
          classesCount: classesFromTcs.length,
          classes: classesFromTcs,
        };
      });
    },
    enabled: isOpen && !!schoolId,
    staleTime: 60 * 1000,
  });

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase();
    return teachers.filter((t) => {
      const matchName = t.name?.toLowerCase().includes(q);
      const matchEmail = t.email?.toLowerCase().includes(q);
      const matchSubjects = t.subjects?.some((s: string) => s.toLowerCase().includes(q));
      return matchName || matchEmail || matchSubjects;
    });
  }, [teachers, searchQuery]);

  if (!isOpen) return null;

  const handleSelect = (teacher: SimulatedTeacher) => {
    setSimulatedTeacher(teacher);
    // Invalidate teacher queries so fresh context loads immediately
    queryClient.invalidateQueries({ queryKey: ['teacher'] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'context'] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'exam-results'] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'classes'] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'timetable'] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'students'] });
    onClose();
    navigate('/dashboard/teacher');
  };

  const handleExitSimulation = () => {
    clearSimulatedTeacher();
    queryClient.invalidateQueries({ queryKey: ['teacher'] });
    queryClient.invalidateQueries({ queryKey: ['teacher', 'context'] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{
          backgroundColor: t.panel,
          borderColor: t.stroke,
        }}
      >
        {/* Modal Header */}
        <div
          className="p-5 border-b relative"
          style={{
            backgroundColor: t.surfaceSubtle,
            borderColor: t.divider,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: t.goldDim,
                  borderColor: t.gold,
                  color: t.gold,
                }}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight" style={{ color: t.textHi }}>
                  {title}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: t.textMid }}>
                  {subtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border text-xs hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: t.fieldBg,
                borderColor: t.stroke,
                color: t.textLow,
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Active Simulation Status Banner */}
          {simulatedTeacher && (
            <div
              className="mt-3 p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs"
              style={{
                backgroundColor: 'rgba(61, 232, 160, 0.1)',
                borderColor: 'rgba(61, 232, 160, 0.3)',
                color: t.textHi,
              }}
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Currently simulating:{' '}
                  <strong className="text-emerald-400">{simulatedTeacher.name}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleExitSimulation}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border hover:bg-rose-500/20 text-rose-400 border-rose-500/30 transition-colors"
              >
                Exit Simulation
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div
          className="p-3 border-b"
          style={{
            backgroundColor: t.fieldBg,
            borderColor: t.divider,
          }}
        >
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5" style={{ color: t.textLow }} />
            <input
              type="text"
              placeholder={`Search ${isTertiary ? 'tutors and instructors' : 'teachers'} by name, email, or course unit...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none transition-all"
              style={{
                backgroundColor: t.surface,
                borderColor: t.stroke,
                color: t.textHi,
              }}
            />
          </div>
        </div>

        {/* Teachers List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {isLoading && (
            <div className="py-12 text-center text-xs" style={{ color: t.textLow }}>
              Loading institution educators...
            </div>
          )}

          {!isLoading && filteredTeachers.length === 0 && (
            <div className="py-12 text-center space-y-1">
              <Users className="w-8 h-8 mx-auto opacity-30" style={{ color: t.textLow }} />
              <div className="text-xs font-semibold" style={{ color: t.textHi }}>
                No instructors found
              </div>
              <div className="text-[11px]" style={{ color: t.textLow }}>
                {searchQuery ? 'Try matching another name or course code.' : 'No teachers registered in this school.'}
              </div>
            </div>
          )}

          {!isLoading &&
            filteredTeachers.map((teacher: any) => {
              const isSelected = simulatedTeacher?.id === teacher.id;
              const initials =
                teacher.name
                  ?.split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'TR';

              return (
                <div
                  key={teacher.id}
                  onClick={() => handleSelect(teacher)}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01] ${
                    isSelected ? 'ring-2 ring-emerald-500' : 'hover:border-emerald-500/50'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'rgba(61, 232, 160, 0.08)' : t.fieldBg,
                    borderColor: isSelected ? '#3DE8A0' : t.stroke,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border"
                      style={{
                        backgroundColor: t.surfaceSubtle,
                        borderColor: isSelected ? '#3DE8A0' : t.stroke,
                        color: isSelected ? '#3DE8A0' : t.textHi,
                      }}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs truncate" style={{ color: t.textHi }}>
                          {teacher.name}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Active Persona
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] truncate mt-0.5" style={{ color: t.textLow }}>
                        {teacher.email || teacher.phone || 'Staff Member'}
                      </div>

                      {teacher.subjects && teacher.subjects.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {teacher.subjects.slice(0, 3).map((sub: string, sIdx: number) => (
                            <span
                              key={sIdx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{
                                backgroundColor: t.surfaceSubtle,
                                color: t.textMid,
                                border: `1px solid ${t.stroke}`,
                              }}
                            >
                              {sub}
                            </span>
                          ))}
                          {teacher.subjects.length > 3 && (
                            <span className="text-[10px]" style={{ color: t.textLow }}>
                              +{teacher.subjects.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                      style={{
                        backgroundColor: isSelected ? '#3DE8A0' : t.surfaceSubtle,
                        color: isSelected ? '#000000' : t.textHi,
                        border: `1px solid ${isSelected ? '#3DE8A0' : t.stroke}`,
                      }}
                    >
                      <span>{isSelected ? 'Simulating' : 'Present As'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Modal Footer */}
        <div
          className="p-3 border-t flex items-center justify-between text-xs"
          style={{
            backgroundColor: t.surfaceSubtle,
            borderColor: t.divider,
            color: t.textLow,
          }}
        >
          <span>
            {teachers.length} total {isTertiary ? 'instructors' : 'teachers'} available for presentation
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg border font-semibold hover:opacity-90"
            style={{
              backgroundColor: t.fieldBg,
              borderColor: t.stroke,
              color: t.textMid,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
