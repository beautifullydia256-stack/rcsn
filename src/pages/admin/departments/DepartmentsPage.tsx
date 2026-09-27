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
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'border-color 0.15s ease',
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
        {createModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '520px',
                borderRadius: '20px',
                background: t.panel,
                border: `1px solid ${t.strokeHi}`,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.divider}` }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: t.textHi }}>
                  Create New Institutional Department
                </h2>
                <p style={{ fontSize: '12px', color: t.textMid, margin: '4px 0 0 0' }}>
                  Define a customized functional department with autonomous budgeting and stores.
                </p>
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textMid, marginBottom: '6px' }}>
                    Department Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Midwifery Community Outreach Unit"
                    value={newDept.name}
                    onChange={(e) => setNewDept((p) => ({ ...p, name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: t.fieldBg,
                      border: `1px solid ${t.stroke}`,
                      color: t.textHi,
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textMid, marginBottom: '6px' }}>
                      Department Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DEPT_OUTREACH"
                      value={newDept.code}
                      onChange={(e) => setNewDept((p) => ({ ...p, code: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: t.fieldBg,
                        border: `1px solid ${t.stroke}`,
                        color: t.textHi,
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textMid, marginBottom: '6px' }}>
                      Budget Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BDG-OUT-09"
                      value={newDept.budget_code}
                      onChange={(e) => setNewDept((p) => ({ ...p, budget_code: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: t.fieldBg,
                        border: `1px solid ${t.stroke}`,
                        color: t.textHi,
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textMid, marginBottom: '6px' }}>
                    Select Representative Icon
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {Object.keys(ICON_MAP).map((iconKey) => {
                      const IconCmp = ICON_MAP[iconKey];
                      const isSelected = newDept.icon === iconKey;
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          onClick={() => setNewDept((p) => ({ ...p, icon: iconKey }))}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: isSelected ? `2px solid ${t.mint}` : `1px solid ${t.stroke}`,
                            background: isSelected ? (isDark ? 'rgba(16, 217, 168, 0.2)' : '#DCFCE7') : t.fieldBg,
                            color: isSelected ? t.mint : t.textMid,
                            cursor: 'pointer',
                          }}
                        >
                          <IconCmp size={18} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textMid, marginBottom: '6px' }}>
                    Description & Core Function
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe operational responsibilities, consumables required, or clinical outreach goals..."
                    value={newDept.description}
                    onChange={(e) => setNewDept((p) => ({ ...p, description: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: t.fieldBg,
                      border: `1px solid ${t.stroke}`,
                      color: t.textHi,
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: '16px 24px',
                  borderTop: `1px solid ${t.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: `1px solid ${t.stroke}`,
                    background: 'transparent',
                    color: t.textMid,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newDept.name.trim() || createDeptMutation.isPending}
                  onClick={() => createDeptMutation.mutate(newDept)}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: t.ctaGradA,
                    color: t.ctaText,
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: !newDept.name.trim() || createDeptMutation.isPending ? 'not-allowed' : 'pointer',
                    opacity: !newDept.name.trim() || createDeptMutation.isPending ? 0.5 : 1,
                  }}
                >
                  {createDeptMutation.isPending ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Assign Staff Portfolio */}
        {assignModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '500px',
                borderRadius: '20px',
                background: t.panel,
                border: `1px solid ${t.strokeHi}`,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${t.divider}` }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: t.textHi }}>
                  Assign Staff Department Portfolio
                </h2>
                <p style={{ fontSize: '12px', color: t.textMid, margin: '4px 0 0 0' }}>
                  Grants dynamic sidebar and requisition capabilities for the selected department.
                </p>
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textMid, marginBottom: '6px' }}>
                    Select Staff Member / Tutor *
                  </label>
                  <select
                    value={assignForm.userId}
                    onChange={(e) => setAssignForm((p) => ({ ...p, userId: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: t.fieldBg,
                      border: `1px solid ${t.stroke}`,
                      color: t.textHi,
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    {staffMembers.map((st) => (
                      <option key={st.teacher_id} value={st.teacher_id}>
                        {st.name} ({st.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textMid, marginBottom: '6px' }}>
                    Department to Assign *
                  </label>
                  <select
                    value={assignForm.departmentId}
                    onChange={(e) => setAssignForm((p) => ({ ...p, departmentId: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: t.fieldBg,
                      border: `1px solid ${t.stroke}`,
                      color: t.textHi,
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: t.textMid, marginBottom: '6px' }}>
                    Role in Department
                  </label>
                  <select
                    value={assignForm.roleInDepartment}
                    onChange={(e) => setAssignForm((p) => ({ ...p, roleInDepartment: e.target.value as any }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: t.fieldBg,
                      border: `1px solid ${t.stroke}`,
                      color: t.textHi,
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    <option value="manager">Head of Department / Lead Manager</option>
                    <option value="assistant">Assistant Manager / Officer</option>
                    <option value="member">Department Member</option>
                  </select>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: isDark ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
                    border: `1px solid ${t.divider}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={assignForm.canRequisition}
                      onChange={(e) => setAssignForm((p) => ({ ...p, canRequisition: e.target.checked }))}
                    />
                    <span style={{ fontWeight: 600 }}>Allow drafting monthly budget requisitions for this department</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={assignForm.canApproveDept}
                      onChange={(e) => setAssignForm((p) => ({ ...p, canApproveDept: e.target.checked }))}
                    />
                    <span style={{ fontWeight: 600 }}>Allow endorsing daily store indents before storekeeper dispatch</span>
                  </label>
                </div>
              </div>

              <div
                style={{
                  padding: '16px 24px',
                  borderTop: `1px solid ${t.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: `1px solid ${t.stroke}`,
                    background: 'transparent',
                    color: t.textMid,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!assignForm.userId || !assignForm.departmentId || assignMutation.isPending}
                  onClick={() => assignMutation.mutate(assignForm)}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: t.ctaGradA,
                    color: t.ctaText,
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: !assignForm.userId || !assignForm.departmentId || assignMutation.isPending ? 'not-allowed' : 'pointer',
                    opacity: !assignForm.userId || !assignForm.departmentId || assignMutation.isPending ? 0.5 : 1,
                  }}
                >
                  {assignMutation.isPending ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
