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
import NativeModal from '@/components/NativeModal';

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
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={Sparkles}
      size="2xl"
    >
      <div className="space-y-4">
        {/* Active Simulation Status Banner */}
        {simulatedTeacher && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <Check className="w-4 h-4 shrink-0" />
              <span>
                Currently simulating: <strong className="text-emerald-400 font-bold">{simulatedTeacher.name}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleExitSimulation}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
            >
              Exit Simulation
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-white/40" />
          <input
            type="text"
            placeholder={`Search ${isTertiary ? 'tutors and instructors' : 'teachers'} by name, email, or course unit...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
          />
        </div>

        {/* Teachers List */}
        <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
          {isLoading && (
            <div className="py-12 text-center text-xs text-white/50">
              Loading institution educators...
            </div>
          )}

          {!isLoading && filteredTeachers.length === 0 && (
            <div className="py-12 text-center space-y-1">
              <Users className="w-8 h-8 mx-auto text-white/30" />
              <div className="text-xs font-semibold text-white/80">
                No instructors found
              </div>
              <div className="text-[11px] text-white/50">
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
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01] ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-400 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                        isSelected
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                          : 'bg-white/10 border-white/15 text-white/90'
                      }`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs truncate text-white">
                          {teacher.name}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Active Persona
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] truncate mt-0.5 text-white/60">
                        {teacher.email || teacher.phone || 'Staff Member'}
                      </div>

                      {teacher.subjects && teacher.subjects.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {teacher.subjects.slice(0, 3).map((sub: string, sIdx: number) => (
                            <span
                              key={sIdx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 border border-white/10 text-white/70"
                            >
                              {sub}
                            </span>
                          ))}
                          {teacher.subjects.length > 3 && (
                            <span className="text-[10px] text-white/50">
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
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-400/30'
                          : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                      }`}
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
        <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-white/60">
          <span>
            {teachers.length} total {isTertiary ? 'instructors' : 'teachers'} available for presentation
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </NativeModal>
  );
}
