import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { loadOutstandingBalanceAggByStudentAllTerms } from '@/lib/adminFinanceTerm';
import { useAuthStore } from '@/store/authStore';
import { useSchoolType } from '@/hooks/useSchoolType';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { downloadParentListPdf } from '@/lib/adminPdfDownload';
import { getOfflineStudents, type CachedStudent } from '@/lib/offlineDb';
import {
  Search,
  Plus,
  RefreshCw,
  Download,
  Printer,
  Phone,
  Mail,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import '@/styles/government-system.css';

const PAGE_SIZE = 15;

function fmtUGX(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `UGX ${Math.round(n).toLocaleString()}`;
}

function parentMissingContact(email: string | null | undefined, phone: string | null | undefined): boolean {
  const e = String(email || '').trim();
  const p = String(phone || '').trim();
  return !e || !p;
}

function pickStr(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

function displayStudentName(s: Record<string, unknown>): string {
  const fn = String(s.first_name ?? '').trim();
  const mn = String(s.middle_name ?? '').trim();
  const ln = String(s.last_name ?? '').trim();
  const parts = [fn, mn, ln].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return String(s.name ?? '').trim() || '—';
}

function normalizeKey(str?: unknown): string {
  return String(str || '').trim().toLowerCase();
}

function extractDigits(phone?: unknown): string {
  return String(phone || '').replace(/\D/g, '').slice(-9);
}

export type ParentDirectoryRow = {
  parent_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  occupation: string | null;
  nin: string | null;
  students: { student_id: string; displayName: string; current_class: string }[];
  portal_active: boolean;
  has_linked_students: boolean;
  has_parent_user: boolean;
  created_at: string | null;
  childCount: number;
  totalOutstanding: number;
  hasOutstanding: boolean;
  missingContact: boolean;
};

export type ParentsStats = {
  totalParents: number;
  linkedParents: number;
  portalParents: number;
  unlinkedParents: number;
};

export async function fetchParentsDirectory(userId: string): Promise<{ rows: ParentDirectoryRow[]; stats: ParentsStats }> {
  const { data: userData } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  const schoolId = (userData?.school_id as string | undefined) || useAuthStore.getState().schoolId;
  if (!schoolId) {
    return { rows: [], stats: { totalParents: 0, linkedParents: 0, portalParents: 0, unlinkedParents: 0 } };
  }

  // 1. Fetch parents table, portal user accounts, and students with their guardian columns in parallel
  const [parentsRes, usersRes, studentsRes] = await Promise.all([
    supabase.from('parents').select('*').eq('school_id', schoolId),
    supabase.from('users').select('user_id, name, email, phone, is_active, created_at').eq('school_id', schoolId).eq('role', 'parent'),
    supabase
      .from('students')
      .select('student_id, name, first_name, middle_name, last_name, current_class, admission_number, guardian_name, guardian_relationship, guardian_phone, guardian_email, guardian_occupation, guardian_address, created_at')
      .eq('school_id', schoolId)
      .is('deleted_at', null),
  ]);

  const parentRows = parentsRes.data || [];
  const parentUsers = usersRes.data || [];
  const studentRows = studentsRes.data || [];

  // Offline fallback if network is unavailable or students table returns empty
  let offlineFallbackStudents: CachedStudent[] = [];
  if (!studentRows.length) {
    try {
      offlineFallbackStudents = await getOfflineStudents(schoolId);
    } catch {
      // ignore
    }
  }

  // Build lookup map for students
  const studentMap = new Map<string, Record<string, unknown>>();
  for (const st of studentRows) {
    studentMap.set(String(st.student_id), st as Record<string, unknown>);
  }
  for (const ost of offlineFallbackStudents) {
    if (!studentMap.has(ost.student_id)) {
      studentMap.set(ost.student_id, {
        student_id: ost.student_id,
        name: ost.student_name,
        current_class: ost.class_name,
        guardian_name: ost.parent_name,
        guardian_phone: ost.parent_phone,
      });
    }
  }

  const byUser = new Map((parentUsers || []).map((u) => [u.user_id as string, u as Record<string, unknown>]));
  const linkedParentIds = new Set<string>();
  const parentKeyMap = new Map<string, ParentDirectoryRow>();

  // 2. Process explicit rows from the `parents` table
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const r of parentRows) {
    const row = r as Record<string, unknown>;
    const pid = row.parent_id as string | undefined;
    if (!pid) continue;
    if (!groups.has(pid)) groups.set(pid, []);
    groups.get(pid)!.push(row);
  }

  for (const [pid, prow] of groups) {
    linkedParentIds.add(pid);
    const u = byUser.get(pid);
    const first = prow[0];
    const sidSet = new Set<string>();
    for (const x of prow) {
      const sid = x.student_id as string | undefined;
      if (sid) sidSet.add(sid);
    }
    const students = [...sidSet].map((sid) => {
      const st = studentMap.get(sid);
      return {
        student_id: sid,
        displayName: st ? displayStudentName(st) : '—',
        current_class: st ? String(st.current_class ?? '—') : '—',
      };
    });
    students.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const primary = prow.find((x) => x.is_primary_contact === true) || first;
    const name = pickStr(primary?.name) || pickStr(u?.name) || (students.length ? 'Guardian' : 'Parent');
    const email = pickStr(primary?.email) ?? pickStr(u?.email);
    const phone = pickStr(primary?.phone) ?? pickStr(u?.phone);
    const relationship = pickStr(primary?.relationship);
    const occupation = pickStr(primary?.occupation);
    const nin = pickStr(primary?.nin) ?? pickStr(primary?.national_id) ?? pickStr(primary?.national_identification_number);

    parentKeyMap.set(pid, {
      parent_id: pid,
      name,
      email,
      phone,
      relationship,
      occupation,
      nin,
      students,
      portal_active: u ? (u.is_active as boolean | undefined) !== false : false,
      has_linked_students: students.length > 0,
      has_parent_user: !!u,
      created_at: (pickStr(primary?.created_at) ?? pickStr(u?.created_at)) || null,
      childCount: students.length,
      totalOutstanding: 0,
      hasOutstanding: false,
      missingContact: parentMissingContact(email, phone),
    });
  }

  // 3. Process unlinked portal users
  for (const u of parentUsers) {
    const uid = u.user_id as string;
    if (linkedParentIds.has(uid) || parentKeyMap.has(uid)) continue;
    const ue = pickStr(u.email);
    const up = pickStr(u.phone);
    parentKeyMap.set(uid, {
      parent_id: uid,
      name: pickStr(u.name) || pickStr(u.email) || 'Parent',
      email: ue,
      phone: up,
      relationship: null,
      occupation: null,
      nin: null,
      students: [],
      portal_active: (u as { is_active?: boolean }).is_active !== false,
      has_linked_students: false,
      has_parent_user: true,
      created_at: pickStr(u.created_at),
      childCount: 0,
      totalOutstanding: 0,
      hasOutstanding: false,
      missingContact: parentMissingContact(ue, up),
    });
  }

  // 4. CRITICAL: Aggregate all guardians defined on student enrollment records
  // Build lookup index to attach students to existing parents or create unified guardian records
  const guardianLookup = new Map<string, ParentDirectoryRow>();

  for (const p of parentKeyMap.values()) {
    const digits = extractDigits(p.phone);
    if (digits) {
      guardianLookup.set(`${normalizeKey(p.name)}|${digits}`, p);
    }
    if (!guardianLookup.has(normalizeKey(p.name))) {
      guardianLookup.set(normalizeKey(p.name), p);
    }
  }

  // Loop through student rows and ensure their guardian appears in the directory
  for (const st of studentRows) {
    const sid = String(st.student_id);
    const gName = pickStr(st.guardian_name);
    const gPhone = pickStr(st.guardian_phone);
    const gEmail = pickStr(st.guardian_email);
    const gRel = pickStr(st.guardian_relationship) || 'Guardian';
    const gOcc = pickStr(st.guardian_occupation);

    // Skip students who genuinely have no guardian data entered
    if (!gName && !gPhone && !gEmail) continue;

    const guardianDisplayName = gName || 'Guardian';
    const digits = extractDigits(gPhone);
    const keyWithDigits = `${normalizeKey(guardianDisplayName)}|${digits}`;
    const keyNameOnly = normalizeKey(guardianDisplayName);

    let existing = (digits ? guardianLookup.get(keyWithDigits) : null) || guardianLookup.get(keyNameOnly);

    const studentSummary = {
      student_id: sid,
      displayName: displayStudentName(st as Record<string, unknown>),
      current_class: String(st.current_class ?? '—'),
    };

    if (existing) {
      if (!existing.students.some((s) => s.student_id === sid)) {
        existing.students.push(studentSummary);
        existing.childCount = existing.students.length;
        existing.has_linked_students = true;
      }
      if (!existing.phone && gPhone) existing.phone = gPhone;
      if (!existing.email && gEmail) existing.email = gEmail;
      if (!existing.relationship && gRel) existing.relationship = gRel;
      if (!existing.occupation && gOcc) existing.occupation = gOcc;
      existing.missingContact = parentMissingContact(existing.email, existing.phone);
    } else {
      const syntheticParentId = `guardian_${sid}`;
      const newGuardianRow: ParentDirectoryRow = {
        parent_id: syntheticParentId,
        name: guardianDisplayName,
        email: gEmail,
        phone: gPhone,
        relationship: gRel,
        occupation: gOcc,
        nin: null,
        students: [studentSummary],
        portal_active: false,
        has_linked_students: true,
        has_parent_user: false,
        created_at: pickStr(st.created_at) || null,
        childCount: 1,
        totalOutstanding: 0,
        hasOutstanding: false,
        missingContact: parentMissingContact(gEmail, gPhone),
      };

      parentKeyMap.set(syntheticParentId, newGuardianRow);
      if (digits) guardianLookup.set(keyWithDigits, newGuardianRow);
      guardianLookup.set(keyNameOnly, newGuardianRow);
    }
  }

  // Also include offline fallback students if online query didn't return them
  for (const ost of offlineFallbackStudents) {
    const sid = ost.student_id;
    const gName = pickStr(ost.parent_name);
    const gPhone = pickStr(ost.parent_phone);
    if (!gName && !gPhone) continue;

    const guardianDisplayName = gName || 'Guardian';
    const digits = extractDigits(gPhone);
    const keyWithDigits = `${normalizeKey(guardianDisplayName)}|${digits}`;
    const keyNameOnly = normalizeKey(guardianDisplayName);

    let existing = (digits ? guardianLookup.get(keyWithDigits) : null) || guardianLookup.get(keyNameOnly);
    const studentSummary = {
      student_id: sid,
      displayName: ost.student_name,
      current_class: ost.class_name || '—',
    };

    if (existing) {
      if (!existing.students.some((s) => s.student_id === sid)) {
        existing.students.push(studentSummary);
        existing.childCount = existing.students.length;
        existing.has_linked_students = true;
      }
      if (!existing.phone && gPhone) existing.phone = gPhone;
    } else {
      const syntheticParentId = `guardian_${sid}`;
      const newGuardianRow: ParentDirectoryRow = {
        parent_id: syntheticParentId,
        name: guardianDisplayName,
        email: null,
        phone: gPhone,
        relationship: 'Guardian',
        occupation: null,
        nin: null,
        students: [studentSummary],
        portal_active: false,
        has_linked_students: true,
        has_parent_user: false,
        created_at: null,
        childCount: 1,
        totalOutstanding: 0,
        hasOutstanding: false,
        missingContact: parentMissingContact(null, gPhone),
      };

      parentKeyMap.set(syntheticParentId, newGuardianRow);
      if (digits) guardianLookup.set(keyWithDigits, newGuardianRow);
      guardianLookup.set(keyNameOnly, newGuardianRow);
    }
  }

  // 5. Compute real-time outstanding balances across all linked students
  let balanceByStudent = new Map<string, { balance: number }>();
  try {
    balanceByStudent = await loadOutstandingBalanceAggByStudentAllTerms(supabase, schoolId);
  } catch {
    // fallback gracefully
  }

  const enrichedRows: ParentDirectoryRow[] = Array.from(parentKeyMap.values()).map((r) => {
    let totalOutstanding = 0;
    let hasOutstanding = false;
    for (const st of r.students) {
      const bal = Number(balanceByStudent.get(st.student_id)?.balance ?? 0);
      if (bal > 0.005) hasOutstanding = true;
      totalOutstanding += Math.max(0, bal);
    }
    return {
      ...r,
      totalOutstanding,
      hasOutstanding,
    };
  });

  const totalParents = enrichedRows.length;
  const linkedParents = enrichedRows.filter((r) => r.has_linked_students).length;
  const portalParents = enrichedRows.filter((r) => r.portal_active).length;
  const unlinkedParents = enrichedRows.filter((r) => !r.has_linked_students).length;

  return {
    rows: enrichedRows,
    stats: {
      totalParents,
      linkedParents,
      portalParents,
      unlinkedParents,
    },
  };
}

type SortKey = 'name-asc' | 'name-desc' | 'children' | 'outstanding' | 'recent';

export default function DesignParentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId);
  const { isTertiary } = useSchoolType();

  const [q, setQ] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name-asc');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: adminQueryKeys.parentsDesign(user?.id ?? ''),
    queryFn: () => fetchParentsDirectory(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: schoolData } = useQuery({
    queryKey: ['school-details', schoolId ?? ''],
    queryFn: async () => {
      const { data } = await supabase.from('schools').select('name').eq('school_id', schoolId!).single();
      return (data as { name?: string } | null)?.name ?? 'Rakai Community School of Nursing';
    },
    enabled: !!schoolId,
    staleTime: 60 * 60 * 1000,
  });

  const allRows = data?.rows ?? [];

  const filteredSorted = useMemo(() => {
    let out = [...allRows];
    const query = q.trim().toLowerCase();

    if (query) {
      out = out.filter((p) => {
        const studentMatch = p.students.some((s) => s.displayName.toLowerCase().includes(query));
        const classMatch = p.students.some((s) => s.current_class.toLowerCase().includes(query));
        return (
          (p.name || '').toLowerCase().includes(query) ||
          (p.email || '').toLowerCase().includes(query) ||
          (p.phone || '').includes(q.trim()) ||
          (p.nin || '').toLowerCase().includes(query) ||
          (p.occupation || '').toLowerCase().includes(query) ||
          studentMatch ||
          classMatch
        );
      });
    }

    // Relationship filter
    if (relationshipFilter !== 'all') {
      out = out.filter((p) => {
        const rel = (p.relationship || '').toLowerCase();
        if (relationshipFilter === 'mother') return rel.includes('mother');
        if (relationshipFilter === 'father') return rel.includes('father');
        if (relationshipFilter === 'guardian') return rel.includes('guardian');
        if (relationshipFilter === 'sponsor') return rel.includes('sponsor') || rel.includes('ngo');
        if (relationshipFilter === 'relative') return rel.includes('relative') || rel.includes('sibling');
        if (relationshipFilter === 'other') {
          return !rel.includes('mother') && !rel.includes('father') && !rel.includes('guardian') && !rel.includes('sponsor');
        }
        return true;
      });
    }

    // Status filter
    if (statusFilter === 'linked') out = out.filter((p) => p.has_linked_students);
    if (statusFilter === 'unlinked') out = out.filter((p) => !p.has_linked_students);
    if (statusFilter === 'portal') out = out.filter((p) => p.portal_active);
    if (statusFilter === 'no-portal') out = out.filter((p) => !p.portal_active);
    if (statusFilter === 'outstanding') out = out.filter((p) => p.hasOutstanding);
    if (statusFilter === 'missing_contact') out = out.filter((p) => p.missingContact);

    // Sorting
    out.sort((a, b) => {
      const an = (a.name || '').toLowerCase();
      const bn = (b.name || '').toLowerCase();
      switch (sortKey) {
        case 'name-desc':
          return bn.localeCompare(an);
        case 'children':
          return b.students.length - a.students.length || an.localeCompare(bn);
        case 'outstanding':
          return b.totalOutstanding - a.totalOutstanding || an.localeCompare(bn);
        case 'recent': {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        }
        case 'name-asc':
        default:
          return an.localeCompare(bn);
      }
    });

    return out;
  }, [allRows, q, relationshipFilter, statusFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = filteredSorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(safePage * PAGE_SIZE, filteredSorted.length);
  const pageSlice = filteredSorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleRefresh = () => {
    if (user?.id) {
      void queryClient.invalidateQueries({
        queryKey: adminQueryKeys.parentsDesign(user.id),
      });
    }
  };

  const handlePrint = () => {
    downloadParentListPdf(
      filteredSorted.map((r) => ({
        id: r.parent_id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        student_name: r.students.map((s) => s.displayName).join(', ') || '—',
        student_class: r.students.map((s) => s.current_class).join(', ') || '—',
        created_at: r.created_at,
      })),
      schoolData ?? undefined
    );
  };

  const handleExportCsv = () => {
    if (!filteredSorted.length) return;
    const headers = ['#', 'Full Name', 'Relationship', 'Linked Trainees', 'Phone', 'Email', 'NIN', 'Account Balance (UGX)', 'Portal Access'];
    const rows = filteredSorted.map((r, i) => [
      i + 1,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.relationship || 'Guardian').replace(/"/g, '""')}"`,
      `"${r.students.map((s) => `${s.displayName} (${s.current_class})`).join('; ').replace(/"/g, '""')}"`,
      `"${r.phone || ''}"`,
      `"${r.email || ''}"`,
      `"${r.nin || ''}"`,
      r.totalOutstanding > 0 ? r.totalOutstanding : 0,
      r.portal_active ? 'Active' : 'Inactive',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `parents-sponsors-registry-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminPageWrapper>
      <div className="space-y-4">
        {/* ── 1. TOP HEADER (MATCHING STUDENTS & TRAINEES REGISTRY) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans m-0">
              {isTertiary ? 'Parents & Sponsors Registry' : 'Parents & Guardians Registry'}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
              {filteredSorted.length} {filteredSorted.length === 1 ? 'RECORD' : 'RECORDS'}
            </span>
          </div>

          {/* Action Button Group */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Export */}
            <button
              type="button"
              className="gov-btn gov-btn-sm flex-1 sm:flex-initial justify-center whitespace-nowrap"
              onClick={handleExportCsv}
              title="Export registry to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {/* Print Roster */}
            <button
              type="button"
              className="gov-btn gov-btn-sm flex-1 sm:flex-initial justify-center whitespace-nowrap"
              onClick={handlePrint}
              title="Print official parent directory"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Roster</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              className="gov-btn gov-btn-sm flex-1 sm:flex-initial justify-center whitespace-nowrap"
              onClick={handleRefresh}
              title="Refresh database"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            {/* Add Parent / Sponsor Primary CTA */}
            <button
              type="button"
              className="gov-btn gov-btn-sm gov-btn-primary flex-1 sm:flex-initial justify-center whitespace-nowrap"
              onClick={() => navigate('/dashboard/admin/parents/add')}
              title={isTertiary ? 'Add New Guardian or Sponsor' : 'Add New Parent'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isTertiary ? 'Add Guardian / Sponsor' : 'Add Parent'}</span>
            </button>
          </div>
        </div>

        {/* ── 2. TOP CONTROL BAR (FRAMED IN SOLID BORDERS) ── */}
        <div className="gov-control-bar">
          <div className="gov-control-bar-left">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#555555] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                className="gov-input pl-8 font-mono text-xs"
                placeholder="Search by Name, Trainee name, Phone, Email, NIN, or Organization…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Relationship Filter */}
            <select
              className="gov-select w-auto text-xs"
              value={relationshipFilter}
              onChange={(e) => {
                setRelationshipFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter Relationship"
            >
              <option value="all">Role: All Relationships</option>
              <option value="mother">Role: Mother</option>
              <option value="father">Role: Father</option>
              <option value="guardian">Role: Legal Guardian</option>
              <option value="sponsor">Role: Sponsor / NGO</option>
              <option value="relative">Role: Relative</option>
              <option value="other">Role: Other</option>
            </select>

            {/* Status Filter */}
            <select
              className="gov-select w-auto text-xs"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter Status"
            >
              <option value="all">Status: All Records</option>
              <option value="linked">Status: Linked to Trainee</option>
              <option value="unlinked">Status: Unlinked (No Trainee)</option>
              <option value="portal">Status: Active Portal</option>
              <option value="no-portal">Status: Inactive Portal</option>
              <option value="outstanding">Status: Outstanding Balance</option>
              <option value="missing_contact">Status: Missing Contact</option>
            </select>

            {/* Sort Dropdown */}
            <select
              className="gov-select w-auto text-xs"
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value as SortKey);
                setPage(1);
              }}
              aria-label="Sort Records"
            >
              <option value="name-asc">Sort: Name (A–Z)</option>
              <option value="name-desc">Sort: Name (Z–A)</option>
              <option value="children">Sort: Most Trainees</option>
              <option value="outstanding">Sort: Highest Outstanding</option>
              <option value="recent">Sort: Enrollment Date</option>
            </select>
          </div>
        </div>

        {/* ── 3. DATA GRID TABLE (HIGH-DENSITY MINIMALIST DESIGN) ── */}
        <div className="gov-desktop-table-view">
          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Guardian / Sponsor Name</th>
                  <th>Relationship</th>
                  <th>Associated Trainee(s)</th>
                  <th>Contact Phone</th>
                  <th>Email Address</th>
                  <th>National ID / NIN</th>
                  <th>Financial Balance</th>
                  <th>Portal Access</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-[#555555]">
                      Loading official parents &amp; sponsors database...
                    </td>
                  </tr>
                ) : pageSlice.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-[#555555]">
                      No guardian or sponsor records matched the specified filters.
                    </td>
                  </tr>
                ) : (
                  pageSlice.map((r) => {
                    const hasStudents = r.students.length > 0;
                    return (
                      <tr key={r.parent_id}>
                        {/* 1. Full Name */}
                        <td className="font-semibold text-[#111111]">
                          <button
                            type="button"
                            className="text-left hover:text-emerald-700 hover:underline transition-colors block"
                            onClick={() => navigate(`/dashboard/admin/parents/${r.parent_id}`)}
                          >
                            {r.name}
                          </button>
                          {r.occupation && (
                            <div className="text-[10px] text-[#666666] font-normal truncate max-w-[200px]">
                              {r.occupation}
                            </div>
                          )}
                        </td>

                        {/* 2. Relationship */}
                        <td className="whitespace-nowrap">
                          <span className="gov-tag text-[10px]">
                            {r.relationship || 'Guardian'}
                          </span>
                        </td>

                        {/* 3. Linked Trainees */}
                        <td className="text-xs">
                          {hasStudents ? (
                            <div className="flex flex-col gap-1">
                              {r.students.map((st) => (
                                <button
                                  key={st.student_id}
                                  type="button"
                                  className="text-left flex items-center gap-1.5 hover:text-emerald-600 transition-colors"
                                  onClick={() => navigate(`/dashboard/admin/students/${st.student_id}`)}
                                  title="View Trainee Profile"
                                >
                                  <GraduationCap className="w-3 h-3 text-[#666666] shrink-0" />
                                  <span className="font-medium text-[#222222] truncate max-w-[150px]">
                                    {st.displayName}
                                  </span>
                                  <span className="text-[10px] font-mono text-[#888888]">
                                    ({st.current_class})
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-[#888888]">— None Linked —</span>
                          )}
                        </td>

                        {/* 4. Contact Phone */}
                        <td className="font-mono text-[11px] text-[#444444] whitespace-nowrap">
                          {r.phone ? (
                            <a
                              href={`tel:${r.phone.replace(/\s+/g, '')}`}
                              className="flex items-center gap-1 hover:text-emerald-700 transition-colors"
                            >
                              <Phone className="w-3 h-3 text-[#666666] shrink-0" />
                              <span>{r.phone}</span>
                            </a>
                          ) : (
                            <span className="text-[#888888]">—</span>
                          )}
                        </td>

                        {/* 5. Email */}
                        <td className="text-[11px] text-[#444444] font-mono">
                          {r.email ? (
                            <a
                              href={`mailto:${r.email}`}
                              className="flex items-center gap-1 hover:text-emerald-700 transition-colors truncate max-w-[170px]"
                              title={r.email}
                            >
                              <Mail className="w-3 h-3 text-[#666666] shrink-0" />
                              <span className="truncate">{r.email}</span>
                            </a>
                          ) : (
                            <span className="text-[#888888]">—</span>
                          )}
                        </td>

                        {/* 6. National ID / NIN */}
                        <td className="font-mono text-[11px] text-[#555555] whitespace-nowrap">
                          {r.nin || '—'}
                        </td>

                        {/* 7. Balance */}
                        <td className="whitespace-nowrap">
                          {r.totalOutstanding > 0 ? (
                            <span className="font-mono text-xs font-bold text-amber-700">
                              {fmtUGX(r.totalOutstanding)}
                            </span>
                          ) : (
                            <span className="gov-tag gov-tag-approved text-[10px]">CLEARED</span>
                          )}
                        </td>

                        {/* 8. Portal Access */}
                        <td className="whitespace-nowrap">
                          {r.portal_active ? (
                            <span className="gov-tag gov-tag-approved text-[10px]">ACTIVE</span>
                          ) : (
                            <span className="gov-tag text-[10px]">INACTIVE</span>
                          )}
                        </td>

                        {/* 9. Actions */}
                        <td className="whitespace-nowrap">
                          <button
                            type="button"
                            className="gov-btn gov-btn-sm"
                            onClick={() => navigate(`/dashboard/admin/parents/${r.parent_id}`)}
                            title="View Guardian Dossier"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 4. MOBILE CARDS VIEW (STACKED BORDER-DIVIDED CARD MODULES) ── */}
        <div className="gov-mobile-card-stack">
          {isLoading ? (
            <div className="gov-card p-6 text-center text-[#555555]">
              Loading guardian records...
            </div>
          ) : pageSlice.length === 0 ? (
            <div className="gov-card p-6 text-center text-[#555555]">
              No records found.
            </div>
          ) : (
            pageSlice.map((r) => (
              <div key={r.parent_id} className="gov-student-card-module">
                <div className="gov-student-card-header">
                  <span className="font-mono font-bold text-xs text-[#111111]">
                    {r.relationship || 'Guardian'}
                  </span>
                  {r.portal_active ? (
                    <span className="gov-tag gov-tag-approved text-[10px]">PORTAL ACTIVE</span>
                  ) : (
                    <span className="gov-tag text-[10px]">NO PORTAL</span>
                  )}
                </div>

                <div className="text-sm font-bold text-[#111111] uppercase tracking-wide">
                  {r.name}
                </div>

                {r.students.length > 0 && (
                  <div className="gov-student-card-row">
                    <span className="gov-student-card-label">Trainees:</span>
                    <span className="gov-student-card-val">
                      {r.students.map((s) => s.displayName).join(', ')}
                    </span>
                  </div>
                )}

                <div className="gov-student-card-row">
                  <span className="gov-student-card-label">Phone:</span>
                  <span className="gov-student-card-val font-mono">{r.phone || '—'}</span>
                </div>

                <div className="gov-student-card-row">
                  <span className="gov-student-card-label">Email:</span>
                  <span className="gov-student-card-val font-mono">{r.email || '—'}</span>
                </div>

                <div className="gov-student-card-row">
                  <span className="gov-student-card-label">Balance:</span>
                  <span className="gov-student-card-val font-mono font-bold">
                    {r.totalOutstanding > 0 ? fmtUGX(r.totalOutstanding) : 'CLEARED'}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#CCCCCC]">
                  <button
                    type="button"
                    className="gov-btn gov-btn-sm w-full justify-center"
                    onClick={() => navigate(`/dashboard/admin/parents/${r.parent_id}`)}
                  >
                    View Guardian File
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── 5. PAPER PAGINATION BAR ── */}
        {!isLoading && filteredSorted.length > 0 && (
          <div className="bg-[#FFFFFF] border border-[#CCCCCC] p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="font-mono text-[#555555]">
              SHOWING <strong className="text-[#111111]">{startIdx}</strong>–<strong className="text-[#111111]">{endIdx}</strong> OF{' '}
              <strong className="text-[#111111]">{filteredSorted.length}</strong> GUARDIANS &amp; SPONSORS
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="gov-btn gov-btn-sm font-mono"
                disabled={safePage <= 1}
                onClick={() => setPage(Math.max(1, safePage - 1))}
              >
                [PREV]
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`gov-btn gov-btn-sm font-mono ${n === safePage ? 'gov-btn-primary' : ''}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="gov-btn gov-btn-sm font-mono"
                disabled={safePage >= totalPages}
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              >
                [NEXT]
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
