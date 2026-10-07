import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Users,
  Search,
  CheckCircle2,
  Folder,
  Utensils,
  FlaskConical,
  Monitor,
  BookOpen,
  HeartPulse,
  Wrench,
  GraduationCap,
  Package,
  Layers,
  Shield,
  Trash2,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  fetchSchoolDepartments,
  createSchoolDepartment,
  updateSchoolDepartment,
  fetchStaffDepartmentAssignments,
  assignStaffToDepartment,
  removeStaffFromDepartment,
} from '@/features/departments/services/departmentService';
import type { SchoolDepartment, CreateDepartmentInput, AssignStaffInput } from '@/features/departments/types';
import { supabase } from '@/lib/supabase';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  Utensils,
  FlaskConical,
  Monitor,
  BookOpen,
  HeartPulse,
  Wrench,
  GraduationCap,
  Users,
  Package,
  Folder,
  Building2,
  Shield,
};

export default function DepartmentsPage() {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const schoolId = useAuthStore((s) => s.schoolId) || '';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'starter' | 'custom'>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDeptForAssign, setSelectedDeptForAssign] = useState<SchoolDepartment | null>(null);

  // Form states
  const [newDept, setNewDept] = useState<CreateDepartmentInput>({
    name: '',
    code: '',
    description: '',
    icon: 'Folder',
    budget_code: '',
  });

  const [assignForm, setAssignForm] = useState<AssignStaffInput>({
    userId: '',
    departmentId: '',
    roleInDepartment: 'manager',
    canRequisition: true,
    canApproveDept: false,
  });

  // Queries
  const { data: departments = [], isLoading: deptsLoading } = useQuery({
    queryKey: ['school-departments', schoolId],
    queryFn: () => (schoolId ? fetchSchoolDepartments(schoolId) : Promise.resolve([])),
    enabled: Boolean(schoolId),
  });

  const { data: assignments = [], isLoading: assignsLoading } = useQuery({
    queryKey: ['staff-department-assignments', schoolId],
    queryFn: () => (schoolId ? fetchStaffDepartmentAssignments(schoolId) : Promise.resolve([])),
    enabled: Boolean(schoolId),
  });

  // Fetch school teachers / staff for assigning
  const { data: staffMembers = [] } = useQuery({
    queryKey: ['school-teachers-for-dept', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      try {
        const { data, error } = await supabase
          .from('teachers')
          .select('teacher_id, name, email')
          .eq('school_id', schoolId)
          .order('name');
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase teachers fetch error:', err);
      }
      return [
        { teacher_id: 't-ssenyonjo', name: 'Dr. Patrick Ssenyonjo (Senior Lecturer)', email: 'p.ssenyonjo@oxyford.ac.ug' },
        { teacher_id: 't-namutebi', name: 'Sr. Florence Namutebi (Skills Lab Lead)', email: 'f.namutebi@oxyford.ac.ug' },
        { teacher_id: 't-nabbanja', name: 'Sr. Agnes Nabbanja (Midwifery Tutor)', email: 'a.nabbanja@oxyford.ac.ug' },
        { teacher_id: 't-alum', name: 'Sr. Beatrice Alum (Practicum Instructor)', email: 'b.alum@oxyford.ac.ug' },
        { teacher_id: 't-akello', name: 'Sr. Christine Akello (Community Health)', email: 'c.akello@oxyford.ac.ug' },
        { teacher_id: 't-chef-kigozi', name: 'Mr. Kigozi James (Head Chef)', email: 'catering@oxyford.ac.ug' },
        { teacher_id: 't-ict-mugisha', name: 'Eng. Brian Mugisha (ICT Lead)', email: 'ict@oxyford.ac.ug' },
      ];
    },
    enabled: Boolean(schoolId),
  });

  // Mutations
  const createDeptMutation = useMutation({
    mutationFn: (input: CreateDepartmentInput) => createSchoolDepartment(schoolId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-departments', schoolId] });
      setCreateModalOpen(false);
      setNewDept({ name: '', code: '', description: '', icon: 'Folder', budget_code: '' });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (input: AssignStaffInput) => {
      const selectedStaff = staffMembers.find((s) => s.teacher_id === input.userId);
      return assignStaffToDepartment(schoolId, input, {
        name: selectedStaff?.name,
        email: selectedStaff?.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-department-assignments', schoolId] });
      setAssignModalOpen(false);
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) => removeStaffFromDepartment(schoolId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-department-assignments', schoolId] });
    },
  });

  // Filtered departments
  const filteredDepts = useMemo(() => {
    return departments.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.code.toLowerCase().includes(search.toLowerCase()) ||
        (d.budget_code && d.budget_code.toLowerCase().includes(search.toLowerCase()));

      if (filterType === 'starter') return matchesSearch && d.is_starter;
      if (filterType === 'custom') return matchesSearch && !d.is_starter;
      return matchesSearch;
    });
  }, [departments, search, filterType]);

  const assignmentsByDept = useMemo(() => {
    const map = new Map<string, typeof assignments>();
    assignments.forEach((a) => {
      const current = map.get(a.department_id) || [];
      current.push(a);
      map.set(a.department_id, current);
    });
    return map;
  }, [assignments]);

  const totalAssignedStaff = useMemo(() => {
    const uniqueUserIds = new Set(assignments.map((a) => a.user_id));
    return uniqueUserIds.size;
  }, [assignments]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: t.screenBg,
        color: t.textHi,
        padding: '24px 28px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: isDark ? 'rgba(16, 217, 168, 0.15)' : '#DCFCE7',
                  color: t.mint,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building2 size={20} />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: t.textHi }}>
                School Departments & Staff Portfolios
              </h1>
            </div>
            <p style={{ fontSize: '13px', color: t.textMid, margin: 0 }}>
              Configure institutional departments, create custom units, and assign dynamic management portfolios to staff.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                setAssignForm({
                  userId: staffMembers[0]?.teacher_id || '',
                  departmentId: departments[0]?.id || '',
                  roleInDepartment: 'manager',
                  canRequisition: true,
                  canApproveDept: false,
                });
                setAssignModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                border: `1px solid ${t.stroke}`,
                background: t.panel,
                color: t.textHi,
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <UserCheck size={16} />
              Assign Staff Portfolio
            </button>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: t.ctaGradA,
                color: t.ctaText,
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(16, 217, 168, 0.25)',
              }}
            >
              <Plus size={16} />
              Create Custom Department
            </button>
          </div>
        </div>

        {/* 4 Overview KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark
                ? '0 10px 30px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.05)'
                : '0 10px 24px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: t.textLow, textTransform: 'uppercase' }}>
                Total Active Departments
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: t.textHi, marginTop: '4px' }}>
                {departments.length}
              </div>
              <div style={{ fontSize: '11px', color: t.mint, marginTop: '4px', fontWeight: 600 }}>
                {departments.filter((d) => d.is_starter).length} Starter · {departments.filter((d) => !d.is_starter).length} Custom
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6' }}>
              <Layers size={22} color={t.mint} />
            </div>
          </div>

          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark
                ? '0 10px 30px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.05)'
                : '0 10px 24px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: t.textLow, textTransform: 'uppercase' }}>
                Assigned Staff Portfolios
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: t.textHi, marginTop: '4px' }}>
                {assignments.length}
              </div>
              <div style={{ fontSize: '11px', color: t.gold, marginTop: '4px', fontWeight: 600 }}>
                Across {totalAssignedStaff} staff members
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6' }}>
              <Users size={22} color={t.gold} />
            </div>
          </div>

          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark
                ? '0 10px 30px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.05)'
                : '0 10px 24px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: t.textLow, textTransform: 'uppercase' }}>
                Department Requisitions
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: t.textHi, marginTop: '4px' }}>
                Active
              </div>
              <div style={{ fontSize: '11px', color: t.blue, marginTop: '4px', fontWeight: 600 }}>
                Stores & Lab budget streams
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6' }}>
              <Package size={22} color={t.blue} />
            </div>
          </div>

          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              background: t.panel,
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark
                ? '0 10px 30px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.05)'
                : '0 10px 24px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: t.textLow, textTransform: 'uppercase' }}>
                Sidebar Mode
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: t.textHi, marginTop: '8px' }}>
                Unified Dynamic
              </div>
              <div style={{ fontSize: '11px', color: t.mint, marginTop: '4px', fontWeight: 600 }}>
                Modular role composition
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6' }}>
              <Sparkles size={22} color={t.mint} />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '14px 20px',
            borderRadius: '14px',
            background: t.panel,
            border: `1px solid ${t.stroke}`,
            boxShadow: isDark
              ? '0 6px 20px rgba(0,0,0,0.2)'
              : '0 6px 18px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
            <Search size={18} color={t.textLow} />
            <input
              type="text"
              placeholder="Search departments by name, code or budget code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: t.textHi,
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(['all', 'starter', 'custom'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: filterType === type ? `1px solid ${t.mint}` : `1px solid ${t.stroke}`,
                  background: filterType === type ? (isDark ? 'rgba(16, 217, 168, 0.15)' : '#ECFDF5') : 'transparent',
                  color: filterType === type ? t.mint : t.textMid,
                  textTransform: 'capitalize',
                }}
              >
                {type === 'all' ? 'All Departments' : `${type} Units`}
              </button>
            ))}
          </div>
        </div>

        {/* Department Grid / List */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {filteredDepts.map((dept) => {
            const IconComponent = ICON_MAP[dept.icon || 'Folder'] || Folder;
            const deptStaff = assignmentsByDept.get(dept.id) || [];

            return (
              <div
                key={dept.id}
                style={{
                  borderRadius: '16px',
                  background: t.panel,
                  border: `1px solid ${t.stroke}`,
                  boxShadow: isDark
                    ? '0 10px 30px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.05)'
                    : '0 10px 24px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
                          color: t.mint,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <IconComponent size={22} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: t.textHi }}>
                          {dept.name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: t.textLow,
                              background: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {dept.code}
                          </span>
                          {dept.budget_code && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                color: t.gold,
                              }}
                            >
                              {dept.budget_code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: dept.is_starter
                          ? isDark
                            ? 'rgba(59, 130, 246, 0.15)'
                            : '#EFF6FF'
                          : isDark
                          ? 'rgba(168, 85, 247, 0.15)'
                          : '#FAF5FF',
                        color: dept.is_starter ? t.blue : '#9333EA',
                      }}
                    >
                      {dept.is_starter ? 'Starter' : 'Custom'}
                    </span>
                  </div>

                  {dept.description && (
                    <p style={{ fontSize: '12px', color: t.textMid, margin: '12px 0 0 0', lineHeight: 1.4 }}>
                      {dept.description}
                    </p>
                  )}
                </div>

                {/* Assigned Staff Section */}
                <div style={{ borderTop: `1px solid ${t.divider}`, paddingTop: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: t.textLow, textTransform: 'uppercase' }}>
                      Assigned Personnel ({deptStaff.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDeptForAssign(dept);
                        setAssignForm({
                          userId: staffMembers[0]?.teacher_id || '',
                          departmentId: dept.id,
                          roleInDepartment: 'manager',
                          canRequisition: true,
                          canApproveDept: false,
                        });
                        setAssignModalOpen(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: t.mint,
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={12} /> Assign
                    </button>
                  </div>

                  {deptStaff.length === 0 ? (
                    <div style={{ fontSize: '12px', color: t.textLow, fontStyle: 'italic', padding: '6px 0' }}>
                      No staff assigned yet. Requisitions will default to Chief Administrator.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {deptStaff.map((st) => (
                        <div
                          key={st.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: isDark ? 'rgba(16, 217, 168, 0.2)' : '#DCFCE7',
                                color: t.mint,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 800,
                              }}
                            >
                              {(st.user_name || 'U')[0]}
                            </div>
                            <span style={{ fontWeight: 600, color: t.textHi }}>
                              {st.user_name || st.user_email || 'Staff Member'}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB',
                                color: t.textLow,
                                textTransform: 'capitalize',
                              }}
                            >
                              {st.role_in_department}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeAssignmentMutation.mutate(st.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: t.red,
                              cursor: 'pointer',
                              padding: '2px 4px',
                            }}
                            title="Remove from department"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal: Create Custom Department */}
        <NativeModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create New Institutional Department"
          subtitle="Define a customized functional department with autonomous budgeting and stores."
          icon={Building2}
          size="lg"
        >
          <div className="p-6 flex flex-col space-y-4 text-white">
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Department Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Midwifery Community Outreach Unit"
                value={newDept.name}
                onChange={(e) => setNewDept((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white placeholder-white/40 focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm text-xs transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Department Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DEPT_OUTREACH"
                  value={newDept.code}
                  onChange={(e) => setNewDept((p) => ({ ...p, code: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white placeholder-white/40 focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm text-xs transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Budget Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BDG-OUT-09"
                  value={newDept.budget_code}
                  onChange={(e) => setNewDept((p) => ({ ...p, budget_code: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white placeholder-white/40 focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm text-xs transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Select Representative Icon
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {Object.keys(ICON_MAP).map((iconKey) => {
                  const IconCmp = ICON_MAP[iconKey];
                  const isSelected = newDept.icon === iconKey;
                  return (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => setNewDept((p) => ({ ...p, icon: iconKey }))}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-2 border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                          : 'border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <IconCmp size={18} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Description & Core Function
              </label>
              <textarea
                rows={3}
                placeholder="Describe operational responsibilities, consumables required, or clinical outreach goals..."
                value={newDept.description}
                onChange={(e) => setNewDept((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white placeholder-white/40 focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm text-xs transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] outline-none resize-none no-scrollbar"
              />
            </div>

            <div className="pt-3 border-t border-white/15 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold backdrop-blur-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newDept.name.trim() || createDeptMutation.isPending}
                onClick={() => createDeptMutation.mutate(newDept)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {createDeptMutation.isPending ? 'Creating...' : 'Create Department'}
              </button>
            </div>
          </div>
        </NativeModal>

        {/* Modal: Assign Staff Portfolio */}
        <NativeModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title="Assign Staff Department Portfolio"
          subtitle="Grants dynamic sidebar and requisition capabilities for the selected department."
          icon={UserCheck}
          size="md"
        >
          <div className="p-6 flex flex-col space-y-4 text-white">
            <div className="relative z-[35] focus-within:z-[50]">
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Select Staff Member / Tutor *
              </label>
              <LiquidGlassSelect
                value={assignForm.userId}
                onChange={(val) => setAssignForm((p) => ({ ...p, userId: val }))}
                options={staffMembers.map((st) => ({
                  value: st.teacher_id,
                  label: `${st.name} (${st.email || 'No email'})`,
                }))}
                placeholder="Select staff member..."
              />
            </div>

            <div className="relative z-[30] focus-within:z-[50]">
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Department to Assign *
              </label>
              <LiquidGlassSelect
                value={assignForm.departmentId}
                onChange={(val) => setAssignForm((p) => ({ ...p, departmentId: val }))}
                options={departments.map((d) => ({
                  value: d.id,
                  label: `${d.name} (${d.code || 'NO-CODE'})`,
                }))}
                placeholder="Select department..."
              />
            </div>

            <div className="relative z-[25] focus-within:z-[50]">
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Role in Department
              </label>
              <LiquidGlassSelect
                value={assignForm.roleInDepartment || 'member'}
                onChange={(val) => setAssignForm((p) => ({ ...p, roleInDepartment: val as any }))}
                options={[
                  { value: 'manager', label: 'Head of Department / Lead Manager' },
                  { value: 'assistant', label: 'Assistant Manager / Officer' },
                  { value: 'member', label: 'Department Member' },
                ]}
              />
            </div>

            <div className="p-3.5 rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm flex flex-col space-y-2.5">
              <label className="flex items-center gap-2.5 text-xs text-white/90 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignForm.canRequisition}
                  onChange={(e) => setAssignForm((p) => ({ ...p, canRequisition: e.target.checked }))}
                  className="rounded border-white/30 bg-black/30 text-emerald-500 focus:ring-emerald-400"
                />
                <span className="font-medium">Allow drafting monthly budget requisitions for this department</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-white/90 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignForm.canApproveDept}
                  onChange={(e) => setAssignForm((p) => ({ ...p, canApproveDept: e.target.checked }))}
                  className="rounded border-white/30 bg-black/30 text-emerald-500 focus:ring-emerald-400"
                />
                <span className="font-medium">Allow endorsing daily store indents before storekeeper dispatch</span>
              </label>
            </div>

            <div className="pt-3 border-t border-white/15 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold backdrop-blur-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!assignForm.userId || !assignForm.departmentId || assignMutation.isPending}
                onClick={() => assignMutation.mutate(assignForm)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {assignMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </NativeModal>

      </div>
    </div>
  );
}
