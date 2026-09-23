import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useSchoolName } from '../../lib/useSchoolName';
import { useSchoolType } from '../../hooks/useSchoolType';
import { exportToPdf, exportToExcel, type ExportColumn } from '../../lib/exportUtils';
import {
  Users,
  GraduationCap,
  Briefcase,
  Building2,
  Search,
  Filter,
  Download,
  RefreshCw,
  Phone,
  Mail,
  MessageSquare,
  Copy,
  Check,
  LayoutGrid,
  List,
  X,
  ChevronRight,
  Shield,
  Calendar,
  UserCheck,
  ExternalLink,
  BookOpen,
  MapPin,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Clock,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

export type StaffCategory = 'all' | 'teaching' | 'non_teaching';

export interface UnifiedStaffMember {
  id: string;
  kind: 'teacher' | 'other_staff';
  name: string;
  role_title: string;
  category: 'teaching' | 'non_teaching';
  category_label: 'Teaching Faculty' | 'Support & Non-Teaching';
  department: string;
  phone: string | null;
  email: string | null;
  employee_id: string | null;
  national_id: string | null;
  photo_url: string | null;
  classes: string[];
  subjects: string[];
  hire_date: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address: string | null;
  notes: string | null;
}

const GRADIENTS = [
  'linear-gradient(135deg, #10d9a8, #3b82f6)',
  'linear-gradient(135deg, #6366f1, #a855f7)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #14b8a6, #06b6d4)',
  'linear-gradient(135deg, #ec4899, #8b5cf6)',
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #10b981, #059669)',
];

function getAvatarGrad(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

function getInitials(name: string): string {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function sanitizeWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  // Uganda format conversion if standard 9-10 digits starting with 0
  if (digits.startsWith('0') && digits.length === 10) {
    return `256${digits.slice(1)}`;
  }
  if (digits.length === 9) {
    return `256${digits}`;
  }
  return digits;
}

async function fetchCompleteStaffDirectory(schoolId: string): Promise<UnifiedStaffMember[]> {
  // Query teachers, other_staff_members, and teaching assignments concurrently
  const [teachersRes, otherStaffRes, classTeachersRes, classSubjectsRes] = await Promise.allSettled([
    supabase
      .from('teachers')
      .select('teacher_id, name, email, phone, department, employee_id, photo_url, date_of_hire, created_at')
      .eq('school_id', schoolId)
      .order('name'),
    supabase
      .from('other_staff_members')
      .select(
        'id, full_name, job_title, department, national_id, phone, email, staff_role, address, emergency_contact_name, emergency_contact_phone, notes, hire_date, photo_url, created_at'
      )
      .eq('school_id', schoolId)
      .order('full_name'),
    supabase
      .from('class_teachers')
      .select('teacher_id, class_name')
      .eq('school_id', schoolId),
    supabase
      .from('teacher_class_subjects')
      .select('teacher_id, class_name, subject')
      .eq('school_id', schoolId),
  ]);

  const teacherRows = teachersRes.status === 'fulfilled' && teachersRes.value.data ? teachersRes.value.data : [];
  const otherStaffRows = otherStaffRes.status === 'fulfilled' && otherStaffRes.value.data ? otherStaffRes.value.data : [];
  const ctRows = classTeachersRes.status === 'fulfilled' && classTeachersRes.value.data ? classTeachersRes.value.data : [];
  const csRows = classSubjectsRes.status === 'fulfilled' && classSubjectsRes.value.data ? classSubjectsRes.value.data : [];

  // Group classes and subjects by teacher ID
  const classesByTeacher: Record<string, Set<string>> = {};
  const subjectsByTeacher: Record<string, Set<string>> = {};

  const addClass = (tid: string, cls: string | null | undefined) => {
    if (!tid || !cls?.trim()) return;
    if (!classesByTeacher[tid]) classesByTeacher[tid] = new Set();
    classesByTeacher[tid].add(cls.trim());
  };

  const addSubject = (tid: string, sub: string | null | undefined) => {
    if (!tid || !sub?.trim()) return;
    if (!subjectsByTeacher[tid]) subjectsByTeacher[tid] = new Set();
    subjectsByTeacher[tid].add(sub.trim());
  };

  for (const r of ctRows) {
    const row = r as { teacher_id?: string; class_name?: string };
    if (row.teacher_id) addClass(row.teacher_id, row.class_name);
  }

  for (const r of csRows) {
    const row = r as { teacher_id?: string; class_name?: string; subject?: string };
    if (row.teacher_id) {
      addClass(row.teacher_id, row.class_name);
      addSubject(row.teacher_id, row.subject);
    }
  }

  // Map teachers
  const mappedTeachers: UnifiedStaffMember[] = teacherRows.map((t) => {
    const tid = t.teacher_id;
    const classes = classesByTeacher[tid] ? Array.from(classesByTeacher[tid]).sort() : [];
    const subjects = subjectsByTeacher[tid] ? Array.from(subjectsByTeacher[tid]).sort() : [];
    const subjectsLabel = subjects.length > 0 ? subjects.join(' & ') : 'General Faculty';
    const dept = t.department?.trim() || 'Academics & Teaching';

    return {
      id: tid,
      kind: 'teacher',
      name: t.name || 'Unnamed Teacher',
      role_title: t.department ? `${t.department} Instructor` : subjectsLabel,
      category: 'teaching',
      category_label: 'Teaching Faculty',
      department: dept,
      phone: t.phone || null,
      email: t.email || null,
      employee_id: t.employee_id || null,
      national_id: null,
      photo_url: t.photo_url || null,
      classes,
      subjects,
      hire_date: t.date_of_hire || null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      address: null,
      notes: null,
    };
  });

  // Map other staff members
  const mappedOtherStaff: UnifiedStaffMember[] = otherStaffRows.map((s) => {
    const dept = s.department?.trim() || 'Administration & Support';
    const role = s.job_title?.trim() || s.staff_role?.trim() || 'Support Staff';

    return {
      id: s.id,
      kind: 'other_staff',
      name: s.full_name || 'Unnamed Staff',
      role_title: role,
      category: 'non_teaching',
      category_label: 'Support & Non-Teaching',
      department: dept,
      phone: s.phone || null,
      email: s.email || null,
      employee_id: null,
      national_id: s.national_id || null,
      photo_url: s.photo_url || null,
      classes: [],
      subjects: [],
      hire_date: s.hire_date || null,
      emergency_contact_name: s.emergency_contact_name || null,
      emergency_contact_phone: s.emergency_contact_phone || null,
      address: s.address || null,
      notes: s.notes || null,
    };
  });

  // Combine and sort alphabetically by name
  return [...mappedTeachers, ...mappedOtherStaff].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

export default function StaffDirectoryPage() {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;
  const schoolName = useSchoolName();
  const { isTertiary } = useSchoolType();

  // State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<StaffCategory>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedStaff, setSelectedStaff] = useState<UnifiedStaffMember | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch Directory
  const {
    data: allStaff = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['secretary-staff-directory', schoolId],
    queryFn: () => (schoolId ? fetchCompleteStaffDirectory(schoolId) : Promise.resolve([])),
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
  });

  // Extract distinct departments
  const departmentList = useMemo(() => {
    const set = new Set<string>();
    allStaff.forEach((s) => {
      if (s.department) set.add(s.department.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allStaff]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allStaff.filter((s) => {
      // Category match
      if (categoryFilter === 'teaching' && s.category !== 'teaching') return false;
      if (categoryFilter === 'non_teaching' && s.category !== 'non_teaching') return false;

      // Department match
      if (departmentFilter !== 'ALL' && s.department.toLowerCase() !== departmentFilter.toLowerCase()) {
        return false;
      }

      // Search match
      if (!query) return true;
      return (
        s.name.toLowerCase().includes(query) ||
        s.role_title.toLowerCase().includes(query) ||
        s.department.toLowerCase().includes(query) ||
        (s.phone && s.phone.toLowerCase().includes(query)) ||
        (s.email && s.email.toLowerCase().includes(query)) ||
        (s.employee_id && s.employee_id.toLowerCase().includes(query)) ||
        s.classes.some((c) => c.toLowerCase().includes(query)) ||
        s.subjects.some((sub) => sub.toLowerCase().includes(query))
      );
    });
  }, [allStaff, categoryFilter, departmentFilter, search]);

  // Statistics
  const stats = useMemo(() => {
    const total = allStaff.length;
    const teachers = allStaff.filter((s) => s.category === 'teaching').length;
    const support = allStaff.filter((s) => s.category === 'non_teaching').length;
    const departments = departmentList.length;
    const withPhone = allStaff.filter((s) => !!s.phone).length;
    return { total, teachers, support, departments, withPhone };
  }, [allStaff, departmentList]);

  // Copy helper with feedback
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  // Export PDF
  const handleExportPdf = () => {
    const columns: ExportColumn[] = [
      { header: '#', key: 'index', width: 0.6, align: 'center' },
      { header: 'Full Name', key: 'name', width: 2.2 },
      { header: 'Category', key: 'category_label', width: 1.5 },
      { header: 'Role / Designation', key: 'role_title', width: 2.0 },
      { header: 'Department', key: 'department', width: 1.8 },
      { header: 'Phone Number', key: 'phone', width: 1.6 },
      { header: 'Email Address', key: 'email', width: 2.0 },
      { header: 'Staff ID', key: 'employee_id', width: 1.2 },
    ];

    const rows = filteredStaff.map((s, i) => ({
      index: i + 1,
      name: s.name,
      category_label: s.category_label,
      role_title: s.role_title,
      department: s.department,
      phone: s.phone || '—',
      email: s.email || '—',
      employee_id: s.employee_id || '—',
    }));

    exportToPdf({
      title: 'INSTITUTIONAL STAFF DIRECTORY',
      subtitle: `Official registry contact list for teaching and support personnel · ${filteredStaff.length} Records`,
      schoolName: schoolName || 'PwezaCore Educational Institution',
      columns,
      rows,
      filename: `Staff_Directory_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  // Export Excel
  const handleExportExcel = () => {
    const columns: ExportColumn[] = [
      { header: 'Staff Name', key: 'name' },
      { header: 'Category', key: 'category_label' },
      { header: 'Role / Title', key: 'role_title' },
      { header: 'Department', key: 'department' },
      { header: 'Phone', key: 'phone' },
      { header: 'Email', key: 'email' },
      { header: 'Employee ID', key: 'employee_id' },
      { header: 'Classes Taught', key: 'classes' },
      { header: 'Subjects', key: 'subjects' },
      { header: 'Emergency Contact Name', key: 'emergency_name' },
      { header: 'Emergency Phone', key: 'emergency_phone' },
    ];

    const rows = filteredStaff.map((s) => ({
      name: s.name,
      category_label: s.category_label,
      role_title: s.role_title,
      department: s.department,
      phone: s.phone || '',
      email: s.email || '',
      employee_id: s.employee_id || '',
      classes: s.classes.join(', '),
      subjects: s.subjects.join(', '),
      emergency_name: s.emergency_contact_name || '',
      emergency_phone: s.emergency_contact_phone || '',
    }));

    exportToExcel({
      title: 'Staff Directory',
      schoolName: schoolName || 'PwezaCore',
      columns,
      rows,
      filename: `Staff_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`,
    });
  };

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 min-h-screen"
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
        fontFamily: INTER,
      }}
    >
      {/* ── TOP HEADER & ACTION CONTROLS ────────────────────────────────────── */}
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
              Secretary Front Desk
            </span>
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.08)',
                color: t.blue,
              }}
            >
              Official Institutional Roster
            </span>
          </div>

          <h1
            className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight"
            style={{ fontFamily: SORA, color: t.textHi }}
          >
            Staff Directory
          </h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: t.textMid }}>
            Institutional contact directory, faculty assignments, and department contacts for reception and parent consultations.
          </p>
        </div>

        {/* Action Buttons: View Switch, Exports, Refresh */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Segmented View Switcher */}
          <div
            className="flex items-center p-1 rounded-xl shadow-sm"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: viewMode === 'grid' ? (isDark ? 'rgba(255,255,255,0.12)' : '#ffffff') : 'transparent',
                color: viewMode === 'grid' ? t.textHi : t.textLow,
                boxShadow: viewMode === 'grid' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: viewMode === 'table' ? (isDark ? 'rgba(255,255,255,0.12)' : '#ffffff') : 'transparent',
                color: viewMode === 'table' ? t.textHi : t.textLow,
                boxShadow: viewMode === 'table' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
          </div>

          {/* Export PDF */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={filteredStaff.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
            title="Download printable PDF directory"
          >
            <Download className="w-3.5 h-3.5" style={{ color: t.mint }} />
            <span>PDF Roster</span>
          </button>

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredStaff.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
            title="Download Excel / CSV spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" style={{ color: t.blue }} />
            <span>Excel</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} style={{ color: t.mint }} />
            <span className="hidden sm:inline">{isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── KPI STATS STRIP ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Staff */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: t.textLow }}>
              Total Workforce
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(61,232,160,0.15)' : 'rgba(16,185,129,0.12)',
                color: t.mint,
              }}
            >
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {isLoading ? '...' : stats.total}
          </div>
          <div className="text-xs mt-1 truncate" style={{ color: t.textMid }}>
            Active verified personnel
          </div>
        </div>

        {/* Teaching Faculty */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: t.textLow }}>
              Teaching Faculty
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.10)',
                color: t.blue,
              }}
            >
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {isLoading ? '...' : stats.teachers}
          </div>
          <div className="text-xs mt-1 truncate" style={{ color: t.textMid }}>
            Subject teachers & class tutors
          </div>
        </div>

        {/* Support Staff */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: t.textLow }}>
              Support & Admin
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(245,192,68,0.15)' : 'rgba(217,119,6,0.10)',
                color: t.gold,
              }}
            >
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {isLoading ? '...' : stats.support}
          </div>
          <div className="text-xs mt-1 truncate" style={{ color: t.textMid }}>
            Administration, clinic & auxiliary
          </div>
        </div>

        {/* Departments Represented */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: t.textLow }}>
              Departments
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(147,51,234,0.10)',
                color: '#a855f7',
              }}
            >
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {isLoading ? '...' : stats.departments}
          </div>
          <div className="text-xs mt-1 truncate" style={{ color: t.textMid }}>
            Active wings & academic units
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ───────────────────────────────────────── */}
      <div
        className="p-4 rounded-2xl shadow-sm space-y-3.5"
        style={{
          background: cardGrad(isDark),
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: t.textLow }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by staff name, role, department, phone, email, or staff ID..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-xs sm:text-sm transition-all focus:outline-none focus:ring-2"
              style={{
                backgroundColor: t.fieldBg,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:opacity-80"
                style={{ color: t.textLow }}
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter Dropdown */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold" style={{ color: t.textLow }}>
              <Filter className="w-3.5 h-3.5" />
              <span>Dept:</span>
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="py-2.5 px-3 rounded-xl text-xs font-medium cursor-pointer transition-all focus:outline-none"
              style={{
                backgroundColor: t.fieldBg,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
              }}
            >
              <option value="ALL">All Departments ({allStaff.length})</option>
              {departmentList.map((dept) => {
                const count = allStaff.filter((s) => s.department.toLowerCase() === dept.toLowerCase()).length;
                return (
                  <option key={dept} value={dept}>
                    {dept} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Category Pills & Count Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: t.divider }}>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: categoryFilter === 'all' ? t.chipOn : 'transparent',
                color: categoryFilter === 'all' ? t.mint : t.textMid,
                border: `1px solid ${categoryFilter === 'all' ? t.mintRing : 'transparent'}`,
              }}
            >
              All Staff ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('teaching')}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: categoryFilter === 'teaching' ? (isDark ? 'rgba(59,130,246,0.18)' : 'rgba(37,99,235,0.12)') : 'transparent',
                color: categoryFilter === 'teaching' ? t.blue : t.textMid,
                border: `1px solid ${categoryFilter === 'teaching' ? (isDark ? 'rgba(59,130,246,0.3)' : 'rgba(37,99,235,0.25)') : 'transparent'}`,
              }}
            >
              Teaching Faculty ({stats.teachers})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('non_teaching')}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: categoryFilter === 'non_teaching' ? (isDark ? 'rgba(245,192,68,0.18)' : 'rgba(217,119,6,0.12)') : 'transparent',
                color: categoryFilter === 'non_teaching' ? t.gold : t.textMid,
                border: `1px solid ${categoryFilter === 'non_teaching' ? (isDark ? 'rgba(245,192,68,0.3)' : 'rgba(217,119,6,0.25)') : 'transparent'}`,
              }}
            >
              Support & Admin ({stats.support})
            </button>
          </div>

          <div className="text-xs" style={{ color: t.textLow }}>
            Showing <strong>{filteredStaff.length}</strong> of {stats.total} staff members
          </div>
        </div>
      </div>

      {/* ── CONTENT AREA: GRID VIEW OR TABLE VIEW ──────────────────────────── */}
      {isLoading ? (
        <div
          className="p-12 text-center rounded-2xl flex flex-col items-center justify-center gap-3"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <RefreshCw className="w-8 h-8 animate-spin" style={{ color: t.mint }} />
          <div className="text-sm font-semibold" style={{ color: t.textHi }}>
            Loading institutional staff roster...
          </div>
          <div className="text-xs" style={{ color: t.textLow }}>
            Fetching faculty details, assigned classes, and contact records.
          </div>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div
          className="p-12 text-center rounded-2xl flex flex-col items-center justify-center gap-3"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(220,38,38,0.08)',
              color: t.red,
            }}
          >
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="text-base font-bold" style={{ fontFamily: SORA, color: t.textHi }}>
            No staff records found
          </div>
          <p className="text-xs max-w-md" style={{ color: t.textMid }}>
            {search || departmentFilter !== 'ALL' || categoryFilter !== 'all'
              ? 'No staff members match the selected search query or department filter. Try resetting your search terms.'
              : 'No staff members have been registered in the system yet.'}
          </p>
          {(search || departmentFilter !== 'ALL' || categoryFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDepartmentFilter('ALL');
                setCategoryFilter('all');
              }}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
              style={{
                backgroundColor: t.panel,
                border: `1px solid ${t.stroke}`,
                color: t.mint,
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID CARDS VIEW ────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((s) => {
            const initials = getInitials(s.name);
            const waNumber = sanitizeWhatsAppNumber(s.phone);
            const isTeaching = s.category === 'teaching';

            return (
              <div
                key={`${s.kind}-${s.id}`}
                className="p-5 rounded-2xl flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md relative overflow-hidden"
                style={{
                  background: cardGrad(isDark),
                  border: `1px solid ${t.stroke}`,
                }}
              >
                <div>
                  {/* Top Bar: Avatar + Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3">
                      {s.photo_url ? (
                        <img
                          src={s.photo_url}
                          alt={s.name}
                          className="w-12 h-12 rounded-2xl object-cover border"
                          style={{ borderColor: t.stroke }}
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-sm text-white shrink-0 shadow-sm"
                          style={{
                            background: getAvatarGrad(s.name),
                            fontFamily: SORA,
                          }}
                        >
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1"
                          style={{
                            backgroundColor: isTeaching
                              ? isDark
                                ? 'rgba(16,217,168,0.15)'
                                : 'rgba(16,185,129,0.12)'
                              : isDark
                              ? 'rgba(168,85,247,0.15)'
                              : 'rgba(147,51,234,0.10)',
                            color: isTeaching ? t.mint : '#a855f7',
                          }}
                        >
                          {isTeaching ? 'Teaching Faculty' : 'Support Staff'}
                        </span>
                        <h2
                          className="font-bold text-sm sm:text-base leading-tight truncate"
                          style={{ fontFamily: SORA, color: t.textHi }}
                          title={s.name}
                        >
                          {s.name}
                        </h2>
                      </div>
                    </div>

                    {s.employee_id && (
                      <span
                        className="text-[11px] font-mono px-2 py-0.5 rounded-md shrink-0 border"
                        style={{
                          backgroundColor: t.fieldBg,
                          borderColor: t.stroke,
                          color: t.textLow,
                        }}
                      >
                        {s.employee_id}
                      </span>
                    )}
                  </div>

                  {/* Role & Department */}
                  <div className="space-y-1 mb-3.5">
                    <div className="text-xs font-medium" style={{ color: t.textMid }}>
                      {s.role_title}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textLow }}>
                      <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: isTeaching ? t.blue : t.gold }} />
                      <span className="truncate">{s.department}</span>
                    </div>
                  </div>

                  {/* Class assignments (if teacher) */}
                  {isTeaching && s.classes.length > 0 && (
                    <div className="mb-3.5">
                      <div className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: t.textLow }}>
                        Assigned Classes ({s.classes.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {s.classes.slice(0, 4).map((c) => (
                          <span
                            key={c}
                            className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                            style={{
                              backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(37,99,235,0.08)',
                              color: t.blue,
                            }}
                          >
                            {c}
                          </span>
                        ))}
                        {s.classes.length > 4 && (
                          <span
                            className="text-[11px] px-1.5 py-0.5 rounded-md"
                            style={{ backgroundColor: t.fieldBg, color: t.textLow }}
                          >
                            +{s.classes.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contact Strip */}
                  <div
                    className="p-2.5 rounded-xl space-y-2 mb-3.5 text-xs"
                    style={{
                      backgroundColor: t.fieldBg,
                      border: `1px solid ${t.stroke}`,
                    }}
                  >
                    {/* Phone */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: t.mint }} />
                        {s.phone ? (
                          <a
                            href={`tel:${s.phone}`}
                            className="font-medium hover:underline truncate"
                            style={{ color: t.textHi }}
                          >
                            {s.phone}
                          </a>
                        ) : (
                          <span style={{ color: t.textLow }}>No phone recorded</span>
                        )}
                      </div>

                      {s.phone && (
                        <div className="flex items-center gap-1 shrink-0">
                          {waNumber && (
                            <a
                              href={`https://wa.me/${waNumber}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-md hover:opacity-80 transition-opacity"
                              style={{ color: '#22c55e' }}
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopy(s.phone!, `phone-${s.id}`)}
                            className="p-1 rounded-md hover:opacity-80 transition-opacity"
                            style={{ color: copiedKey === `phone-${s.id}` ? t.mint : t.textLow }}
                            title="Copy phone"
                          >
                            {copiedKey === `phone-${s.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-between gap-2 border-t pt-1.5" style={{ borderColor: t.divider }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: t.blue }} />
                        {s.email ? (
                          <a
                            href={`mailto:${s.email}`}
                            className="font-medium hover:underline truncate"
                            style={{ color: t.textHi }}
                            title={s.email}
                          >
                            {s.email}
                          </a>
                        ) : (
                          <span style={{ color: t.textLow }}>No email recorded</span>
                        )}
                      </div>

                      {s.email && (
                        <button
                          type="button"
                          onClick={() => handleCopy(s.email!, `email-${s.id}`)}
                          className="p-1 rounded-md hover:opacity-80 transition-opacity shrink-0"
                          style={{ color: copiedKey === `email-${s.id}` ? t.mint : t.textLow }}
                          title="Copy email"
                        >
                          {copiedKey === `email-${s.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <button
                  type="button"
                  onClick={() => setSelectedStaff(s)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all shadow-sm"
                  style={{
                    backgroundColor: t.panel,
                    border: `1px solid ${t.stroke}`,
                    color: t.textHi,
                  }}
                >
                  <span>View Full Profile & Dossier</span>
                  <ChevronRight className="w-3.5 h-3.5" style={{ color: t.mint }} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── FULL DATA TABLE VIEW ───────────────────────────────────────────── */
        <div
          className="rounded-2xl overflow-hidden shadow-sm border"
          style={{
            background: cardGrad(isDark),
            borderColor: t.stroke,
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr
                  className="border-b"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderColor: t.divider,
                  }}
                >
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]" style={{ color: t.textLow }}>
                    Staff Member
                  </th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]" style={{ color: t.textLow }}>
                    Category
                  </th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]" style={{ color: t.textLow }}>
                    Role & Department
                  </th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]" style={{ color: t.textLow }}>
                    Phone Contact
                  </th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]" style={{ color: t.textLow }}>
                    Email
                  </th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]" style={{ color: t.textLow }}>
                    Assignments / Coverage
                  </th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-right" style={{ color: t.textLow }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: t.divider }}>
                {filteredStaff.map((s) => {
                  const initials = getInitials(s.name);
                  const waNumber = sanitizeWhatsAppNumber(s.phone);
                  const isTeaching = s.category === 'teaching';

                  return (
                    <tr
                      key={`${s.kind}-${s.id}`}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        backgroundColor: 'transparent',
                      }}
                    >
                      {/* Member Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {s.photo_url ? (
                            <img
                              src={s.photo_url}
                              alt={s.name}
                              className="w-9 h-9 rounded-xl object-cover border"
                              style={{ borderColor: t.stroke }}
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs text-white shrink-0"
                              style={{
                                background: getAvatarGrad(s.name),
                                fontFamily: SORA,
                              }}
                            >
                              {initials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold truncate" style={{ color: t.textHi }}>
                              {s.name}
                            </div>
                            {s.employee_id && (
                              <div className="text-[11px] font-mono" style={{ color: t.textLow }}>
                                ID: {s.employee_id}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4">
                        <span
                          className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block"
                          style={{
                            backgroundColor: isTeaching
                              ? isDark
                                ? 'rgba(16,217,168,0.15)'
                                : 'rgba(16,185,129,0.12)'
                              : isDark
                              ? 'rgba(168,85,247,0.15)'
                              : 'rgba(147,51,234,0.10)',
                            color: isTeaching ? t.mint : '#a855f7',
                          }}
                        >
                          {isTeaching ? 'Teaching' : 'Support'}
                        </span>
                      </td>

                      {/* Role & Dept */}
                      <td className="py-3 px-4">
                        <div className="font-medium" style={{ color: t.textHi }}>
                          {s.role_title}
                        </div>
                        <div className="text-xs" style={{ color: t.textLow }}>
                          {s.department}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4">
                        {s.phone ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${s.phone}`}
                              className="font-medium hover:underline text-xs"
                              style={{ color: t.textHi }}
                            >
                              {s.phone}
                            </a>
                            {waNumber && (
                              <a
                                href={`https://wa.me/${waNumber}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded hover:opacity-80 transition-opacity"
                                style={{ color: '#22c55e' }}
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: t.textLow }}>
                            —
                          </span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4">
                        {s.email ? (
                          <a
                            href={`mailto:${s.email}`}
                            className="text-xs hover:underline truncate block max-w-[180px]"
                            style={{ color: t.blue }}
                            title={s.email}
                          >
                            {s.email}
                          </a>
                        ) : (
                          <span className="text-xs" style={{ color: t.textLow }}>
                            —
                          </span>
                        )}
                      </td>

                      {/* Coverage / Classes */}
                      <td className="py-3 px-4">
                        {isTeaching ? (
                          s.classes.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {s.classes.slice(0, 3).map((c) => (
                                <span
                                  key={c}
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(37,99,235,0.08)',
                                    color: t.blue,
                                  }}
                                >
                                  {c}
                                </span>
                              ))}
                              {s.classes.length > 3 && (
                                <span className="text-[10px]" style={{ color: t.textLow }}>
                                  +{s.classes.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: t.textLow }}>
                              General Faculty
                            </span>
                          )
                        ) : (
                          <span className="text-xs" style={{ color: t.textLow }}>
                            {s.department} Wing
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.phone && (
                            <button
                              type="button"
                              onClick={() => handleCopy(s.phone!, `tbl-phone-${s.id}`)}
                              className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                              style={{
                                backgroundColor: t.fieldBg,
                                color: copiedKey === `tbl-phone-${s.id}` ? t.mint : t.textLow,
                              }}
                              title="Copy Phone"
                            >
                              {copiedKey === `tbl-phone-${s.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedStaff(s)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm transition-all"
                            style={{
                              backgroundColor: t.panel,
                              border: `1px solid ${t.stroke}`,
                              color: t.textHi,
                            }}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── STAFF DOSSIER INSPECTION DRAWER ─────────────────────────────────── */}
      {selectedStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end"
          style={{
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setSelectedStaff(null)}
        >
          <div
            className="w-full max-w-md h-full overflow-y-auto p-6 space-y-6 shadow-2xl flex flex-col justify-between"
            style={{
              backgroundColor: t.panel,
              borderLeft: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        selectedStaff.category === 'teaching'
                          ? isDark
                            ? 'rgba(16,217,168,0.15)'
                            : 'rgba(16,185,129,0.12)'
                          : isDark
                          ? 'rgba(168,85,247,0.15)'
                          : 'rgba(147,51,234,0.10)',
                      color: selectedStaff.category === 'teaching' ? t.mint : '#a855f7',
                    }}
                  >
                    {selectedStaff.category_label}
                  </span>
                  {selectedStaff.employee_id && (
                    <span className="text-xs font-mono" style={{ color: t.textLow }}>
                      #{selectedStaff.employee_id}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStaff(null)}
                  className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: t.fieldBg,
                    color: t.textLow,
                  }}
                  title="Close Profile"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Profile Card Summary */}
              <div className="flex items-center gap-4">
                {selectedStaff.photo_url ? (
                  <img
                    src={selectedStaff.photo_url}
                    alt={selectedStaff.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2"
                    style={{ borderColor: t.mintRing }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-xl text-white shrink-0 shadow-sm"
                    style={{
                      background: getAvatarGrad(selectedStaff.name),
                      fontFamily: SORA,
                    }}
                  >
                    {getInitials(selectedStaff.name)}
                  </div>
                )}

                <div className="min-w-0">
                  <h2
                    className="text-lg font-extrabold leading-snug"
                    style={{ fontFamily: SORA, color: t.textHi }}
                  >
                    {selectedStaff.name}
                  </h2>
                  <div className="text-xs font-medium" style={{ color: t.textMid }}>
                    {selectedStaff.role_title}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: t.textLow }}>
                    <Building2 className="w-3.5 h-3.5" style={{ color: t.blue }} />
                    <span>{selectedStaff.department}</span>
                  </div>
                </div>
              </div>

              {/* Instant Communication Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                {selectedStaff.phone && (
                  <a
                    href={`tel:${selectedStaff.phone}`}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                      color: t.ctaText,
                    }}
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Staff</span>
                  </a>
                )}

                {sanitizeWhatsAppNumber(selectedStaff.phone) && (
                  <a
                    href={`https://wa.me/${sanitizeWhatsAppNumber(selectedStaff.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-all shadow-sm"
                    style={{
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                )}

                {selectedStaff.email && (
                  <a
                    href={`mailto:${selectedStaff.email}`}
                    className="col-span-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all shadow-sm"
                    style={{
                      backgroundColor: t.fieldBg,
                      border: `1px solid ${t.stroke}`,
                      color: t.textHi,
                    }}
                  >
                    <Mail className="w-4 h-4" style={{ color: t.blue }} />
                    <span>Send Email ({selectedStaff.email})</span>
                  </a>
                )}
              </div>

              {/* Detailed Information Tabs / Panels */}
              <div className="space-y-4">
                {/* Official Records */}
                <div
                  className="p-3.5 rounded-xl space-y-2.5 text-xs"
                  style={{
                    backgroundColor: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
                    Official Credentials & Registration
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px]" style={{ color: t.textLow }}>
                        Staff Category
                      </span>
                      <strong style={{ color: t.textHi }}>{selectedStaff.category_label}</strong>
                    </div>

                    <div>
                      <span className="block text-[10px]" style={{ color: t.textLow }}>
                        Department Wing
                      </span>
                      <strong style={{ color: t.textHi }}>{selectedStaff.department}</strong>
                    </div>

                    {selectedStaff.employee_id && (
                      <div>
                        <span className="block text-[10px]" style={{ color: t.textLow }}>
                          Employee Staff ID
                        </span>
                        <strong className="font-mono" style={{ color: t.textHi }}>
                          {selectedStaff.employee_id}
                        </strong>
                      </div>
                    )}

                    {selectedStaff.national_id && (
                      <div>
                        <span className="block text-[10px]" style={{ color: t.textLow }}>
                          National ID (NIN)
                        </span>
                        <strong className="font-mono" style={{ color: t.textHi }}>
                          {selectedStaff.national_id}
                        </strong>
                      </div>
                    )}

                    {selectedStaff.hire_date && (
                      <div>
                        <span className="block text-[10px]" style={{ color: t.textLow }}>
                          Date of Appointment
                        </span>
                        <strong style={{ color: t.textHi }}>{selectedStaff.hire_date}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Faculty Assignments (If Teacher) */}
                {selectedStaff.category === 'teaching' && (
                  <div
                    className="p-3.5 rounded-xl space-y-2.5 text-xs"
                    style={{
                      backgroundColor: t.fieldBg,
                      border: `1px solid ${t.stroke}`,
                    }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
                      Faculty Teaching Assignments
                    </div>

                    {selectedStaff.classes.length > 0 ? (
                      <div>
                        <span className="block text-[10px] mb-1.5" style={{ color: t.textLow }}>
                          Active Classes Taught:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedStaff.classes.map((c) => (
                            <span
                              key={c}
                              className="text-xs font-semibold px-2.5 py-1 rounded-md"
                              style={{
                                backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.10)',
                                color: t.blue,
                              }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs" style={{ color: t.textMid }}>
                        General subject instructor. No specific class roster mapped.
                      </div>
                    )}

                    {selectedStaff.subjects.length > 0 && (
                      <div className="border-t pt-2" style={{ borderColor: t.divider }}>
                        <span className="block text-[10px] mb-1" style={{ color: t.textLow }}>
                          Assigned Subjects:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {selectedStaff.subjects.map((sub) => (
                            <span
                              key={sub}
                              className="text-xs px-2 py-0.5 rounded-md"
                              style={{
                                backgroundColor: isDark ? 'rgba(16,217,168,0.12)' : 'rgba(16,185,129,0.08)',
                                color: t.mint,
                              }}
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Emergency Contact (Critical for Secretary Front Desk) */}
                <div
                  className="p-3.5 rounded-xl space-y-2 text-xs"
                  style={{
                    backgroundColor: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: t.textLow }}>
                    <Shield className="w-3.5 h-3.5" style={{ color: t.red }} />
                    <span>Emergency Contact Info</span>
                  </div>

                  {selectedStaff.emergency_contact_name || selectedStaff.emergency_contact_phone ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span style={{ color: t.textLow }}>Contact Name:</span>
                        <strong style={{ color: t.textHi }}>{selectedStaff.emergency_contact_name || '—'}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ color: t.textLow }}>Emergency Phone:</span>
                        {selectedStaff.emergency_contact_phone ? (
                          <a
                            href={`tel:${selectedStaff.emergency_contact_phone}`}
                            className="font-bold hover:underline"
                            style={{ color: t.mint }}
                          >
                            {selectedStaff.emergency_contact_phone}
                          </a>
                        ) : (
                          <span style={{ color: t.textLow }}>—</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: t.textLow }}>
                      No emergency contact details on file for this staff member.
                    </p>
                  )}
                </div>

                {/* Additional Notes / Office Location */}
                {(selectedStaff.address || selectedStaff.notes) && (
                  <div
                    className="p-3.5 rounded-xl space-y-1.5 text-xs"
                    style={{
                      backgroundColor: t.fieldBg,
                      border: `1px solid ${t.stroke}`,
                    }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
                      Location & Institutional Notes
                    </div>
                    {selectedStaff.address && (
                      <div className="flex items-start gap-1.5" style={{ color: t.textMid }}>
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: t.gold }} />
                        <span>{selectedStaff.address}</span>
                      </div>
                    )}
                    {selectedStaff.notes && (
                      <p className="text-xs italic" style={{ color: t.textLow }}>
                        "{selectedStaff.notes}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Bottom Close Button */}
            <div className="pt-4 border-t" style={{ borderColor: t.divider }}>
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
                style={{
                  backgroundColor: t.panel,
                  border: `1px solid ${t.stroke}`,
                  color: t.textHi,
                }}
              >
                Close Staff Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
