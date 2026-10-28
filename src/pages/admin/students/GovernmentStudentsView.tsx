import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { downloadStudentListPdf } from '@/lib/adminPdfDownload';
import { resolveDisciplineDisplayStatus } from '@/components/admin/students/StudentDisciplineSection';
import {
  Search,
  Plus,
  RefreshCw,
  Download,
  Printer,
  CreditCard,
  Phone,
  GraduationCap,
  Zap,
  Upload,
} from 'lucide-react';
import { GovTableLoader } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

interface StudentListRow {
  student_id: string;
  name: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  current_class: string | null;
  status?: string | null;
  admission_number?: string | null;
  admission_date?: string | null;
  date_of_birth?: string | null;
  student_phone?: string | null;
  student_email?: string | null;
  guardian_phone?: string | null;
  guardian_name?: string | null;
  guardian_relationship?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
  discipline_deactivated_at?: string | null;
  suspension_open?: boolean | null;
}

interface GovernmentStudentsViewProps {
  userId?: string;
  schoolId: string | null;
  schoolName: string | null;
  isTertiary: boolean;
  q: string;
  setQ: (val: string) => void;
  sortKey: string;
  setSortKey: (val: any) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  classFilter: string;
  setClassFilter: (val: string) => void;
  classOptions: string[];
  pageSlice: StudentListRow[];
  filteredSorted: StudentListRow[];
  safePage: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  totalPages: number;
  startIdx: number;
  endIdx: number;
  loading: boolean;
  warningIdSet: Set<string>;
  openAddStudentModal: () => void;
  setExportOpen: (open: boolean) => void;
  setImportOpen?: (open: boolean) => void;
  setBulkAddOpen?: (open: boolean) => void;
  displayFullName?: (r: StudentListRow) => string;
  formatGovDate?: (iso?: string | null) => string;
}

export default function GovernmentStudentsView({
  userId,
  schoolId,
  schoolName,
  isTertiary,
  q,
  setQ,
  sortKey,
  setSortKey,
  statusFilter,
  setStatusFilter,
  classFilter,
  setClassFilter,
  classOptions,
  pageSlice,
  filteredSorted,
  safePage,
  setPage,
  totalPages,
  startIdx,
  endIdx,
  loading,
  warningIdSet,
  openAddStudentModal,
  setExportOpen,
  setImportOpen,
  setBulkAddOpen,
  displayFullName = (r: StudentListRow) =>
    r.name || [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ') || 'Unnamed Trainee',
  formatGovDate = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toISOString().split('T')[0];
    } catch {
      return iso;
    }
  },
}: GovernmentStudentsViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    if (userId) {
      void queryClient.invalidateQueries({
        queryKey: adminQueryKeys.studentsDesign(userId, 'all'),
      });
    }
  };

  const getStatusBadge = (r: StudentListRow) => {
    const dStat = resolveDisciplineDisplayStatus(
      {
        deleted_at: r.deleted_at,
        discipline_deactivated_at: r.discipline_deactivated_at,
        suspension_open: r.suspension_open,
      },
      warningIdSet.has(r.student_id)
    );
    const raw = (r.status || dStat || 'Active').toLowerCase();

    if (raw === 'active') return <span className="gov-tag gov-tag-approved">ACTIVE</span>;
    if (raw === 'warned') return <span className="gov-tag gov-tag-warned">WARNED</span>;
    if (raw === 'suspended') return <span className="gov-tag gov-tag-suspended">SUSPENDED</span>;
    if (raw === 'deactivated' || raw === 'deleted') return <span className="gov-tag gov-tag-rejected">{raw.toUpperCase()}</span>;
    if (raw === 'graduated') return <span className="gov-tag">GRADUATED</span>;
    return <span className="gov-tag">{String(dStat || r.status || 'ACTIVE').toUpperCase()}</span>;
  };

  return (
    <div className="space-y-4">
      {/* ── 1. TOP HEADER (CLEAN, UNBOXED & RESPONSIVE) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans m-0">
            Student Management Registry
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
            {filteredSorted.length} {filteredSorted.length === 1 ? 'TRAINEE' : 'TRAINEES'}
          </span>
        </div>

        {/* Action Button Group */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Multiple Input */}
          {setBulkAddOpen && (
            <button
              type="button"
              className="gov-btn gov-btn-sm flex-1 sm:flex-initial justify-center whitespace-nowrap"
              onClick={() => setBulkAddOpen(true)}
              title="Bulk Multiple Input"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Multiple Input</span>
            </button>
          )}

          {/* Import */}
          {setImportOpen && schoolId && (
            <button
              type="button"
              className="gov-btn gov-btn-sm flex-1 sm:flex-initial justify-center whitespace-nowrap"
              onClick={() => setImportOpen(true)}
              title="Import students from spreadsheet"
            >
              <Upload className="w-3.5 h-3.5 text-teal-600" />
              <span>Import</span>
            </button>
          )}

          {/* Access Cards */}
          <button
            type="button"
            className="gov-btn gov-btn-sm flex-1 sm:flex-initial justify-center whitespace-nowrap"
            onClick={() => navigate('/dashboard/admin/cards')}
            title="Student ID / Access Cards"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Access Cards</span>
          </button>

          {/* Add Student / Trainee Primary CTA */}
          <button
            type="button"
            className="gov-btn gov-btn-sm gov-btn-primary flex-1 sm:flex-initial justify-center whitespace-nowrap"
            onClick={() => navigate('/dashboard/admin/students/add')}
            title={isTertiary ? 'Add New Trainee' : 'Add New Student'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isTertiary ? 'Add Trainee' : 'Add Student'}</span>
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
              placeholder="Search by Name, Student ID, Program, Phone, or Guardian…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Sort Dropdown */}
          <select
            className="gov-select w-auto text-xs"
            value={sortKey}
            onChange={(e) => {
              setSortKey(e.target.value as any);
              setPage(1);
            }}
            aria-label="Sort Records"
          >
            <option value="name-asc">Sort: Name (A–Z)</option>
            <option value="name-desc">Sort: Name (Z–A)</option>
            <option value="status">Sort: Status</option>
            <option value="id">Sort: Student ID</option>
            <option value="recent">Sort: Enrollment Date</option>
          </select>

          {/* Status Dropdown */}
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
            <option value="active">Status: Active</option>
            <option value="warned">Status: Warned</option>
            <option value="suspended">Status: Suspended</option>
            <option value="deactivated">Status: Deactivated</option>
            <option value="deleted">Status: Deleted</option>
            <option value="graduated">{isTertiary ? 'Status: Graduated Alumni' : 'Status: Graduated'}</option>
          </select>

          {/* Program Dropdown */}
          <select
            className="gov-select w-auto text-xs"
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter Program"
          >
            <option value="">Program: All Programs</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="gov-control-bar-right">
          {schoolId && (
            <button
              type="button"
              className="gov-btn gov-btn-sm"
              onClick={() => setExportOpen(true)}
              title="Export student data"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          )}

          <button
            type="button"
            className="gov-btn gov-btn-sm"
            onClick={() => downloadStudentListPdf(filteredSorted, classFilter, schoolName ?? undefined)}
            title="Print official student roster"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Roster</span>
          </button>

          <button
            type="button"
            className="gov-btn gov-btn-sm"
            onClick={handleRefresh}
            title="Refresh student database"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 3. STUDENT TABLE (HIGH-DENSITY DATA GRID) ── */}
      {/* Desktop Data Grid View */}
      <div className="gov-desktop-table-view">
        <div className="gov-table-container">
          <table className="gov-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Full Name</th>
                <th>DOB</th>
                <th>Registration Status</th>
                <th>Program</th>
                <th>Enrollment Date</th>
                <th>Contact Info</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <GovTableLoader colSpan={8} message="FETCHING VERIFIED STUDENT REGISTRY..." />
              ) : pageSlice.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[#555555]">
                    No student records matched the specified filters.
                  </td>
                </tr>
              ) : (
                pageSlice.map((r) => {
                  const studentId = r.admission_number || r.student_id.slice(0, 8).toUpperCase();
                  const fullName = displayFullName(r);
                  const dob = formatGovDate(r.date_of_birth);
                  const enrollmentDate = formatGovDate(r.admission_date || r.created_at);
                  const phone = r.student_phone || r.guardian_phone || '';
                  const email = r.student_email || '';
                  const program = r.current_class || 'General Nursing';

                  return (
                    <tr key={r.student_id}>
                      {/* 1. Student ID */}
                      <td className="font-mono font-bold text-[11px] whitespace-nowrap">
                        {studentId}
                      </td>

                      {/* 2. Full Name */}
                      <td className="font-semibold text-[#111111]">
                        <div>{fullName}</div>
                        {r.guardian_name && (
                          <div className="text-[10px] font-mono text-[#666666] font-normal flex items-center gap-1 mt-0.5">
                            <span className="text-[#888888]">Guardian:</span>
                            <span
                              className={
                                q.trim() && r.guardian_name.toLowerCase().includes(q.trim().toLowerCase())
                                  ? 'bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-semibold'
                                  : 'text-[#555555]'
                              }
                            >
                              {r.guardian_name}
                            </span>
                            {r.guardian_relationship && (
                              <span className="text-[#888888]">({r.guardian_relationship})</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 3. DOB */}
                      <td className="font-mono text-[11px] text-[#444444] whitespace-nowrap">
                        {dob}
                      </td>

                      {/* 4. Registration Status */}
                      <td className="whitespace-nowrap">
                        {getStatusBadge(r)}
                      </td>

                      {/* 5. Program */}
                      <td className="text-[12px] text-[#333333]">
                        {program}
                      </td>

                      {/* 6. Enrollment Date */}
                      <td className="font-mono text-[11px] text-[#555555] whitespace-nowrap">
                        {enrollmentDate}
                      </td>

                      {/* 7. Contact Info */}
                      <td className="text-[11px] font-mono text-[#444444] whitespace-nowrap">
                        {phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#555555] shrink-0" />
                            <span>{phone}</span>
                          </div>
                        ) : (
                          <div className="text-[#888888]">—</div>
                        )}
                        {email && <div className="text-[10px] text-[#666666]">{email}</div>}
                      </td>

                      {/* 8. Actions */}
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="gov-btn gov-btn-sm"
                            onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                            title="View student dossier"
                          >
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            className="gov-btn gov-btn-sm"
                            onClick={() => navigate('/dashboard/admin/cards')}
                            title="Student Pass"
                          >
                            <span>Pass</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. MOBILE ADAPTATION (STACKED BORDER-DIVIDED CARD MODULES) ── */}
      <div className="gov-mobile-card-stack">
        {loading ? (
          <div className="gov-card p-6 text-center text-[#555555]">
            Loading student records...
          </div>
        ) : pageSlice.length === 0 ? (
          <div className="gov-card p-6 text-center text-[#555555]">
            No student records found.
          </div>
        ) : (
          pageSlice.map((r) => {
            const studentId = r.admission_number || r.student_id.slice(0, 8).toUpperCase();
            const fullName = displayFullName(r);
            const dob = formatGovDate(r.date_of_birth);
            const enrollmentDate = formatGovDate(r.admission_date || r.created_at);
            const phone = r.student_phone || r.guardian_phone || '—';
            const program = r.current_class || 'General Nursing';

            return (
              <div key={r.student_id} className="gov-student-card-module">
                <div className="gov-student-card-header">
                  <span className="font-mono font-bold text-xs text-[#111111]">
                    ID: {studentId}
                  </span>
                  {getStatusBadge(r)}
                </div>

                <div className="text-sm font-bold text-[#111111] uppercase tracking-wide">
                  {fullName}
                </div>

                <div className="gov-student-card-row">
                  <span className="gov-student-card-label">DOB:</span>
                  <span className="gov-student-card-val font-mono">{dob}</span>
                </div>

                <div className="gov-student-card-row">
                  <span className="gov-student-card-label">Program:</span>
                  <span className="gov-student-card-val">{program}</span>
                </div>

                <div className="gov-student-card-row">
                  <span className="gov-student-card-label">Enrolled:</span>
                  <span className="gov-student-card-val font-mono">{enrollmentDate}</span>
                </div>

                <div className="gov-student-card-row">
                  <span className="gov-student-card-label">Contact:</span>
                  <span className="gov-student-card-val font-mono">{phone}</span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#CCCCCC]">
                  <button
                    type="button"
                    className="gov-btn gov-btn-sm flex-1 justify-center"
                    onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                  >
                    View File
                  </button>
                  <button
                    type="button"
                    className="gov-btn gov-btn-sm flex-1 justify-center"
                    onClick={() => navigate('/dashboard/admin/cards')}
                  >
                    Pass / ID
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 5. CLEAN PAPER PAGINATION BAR ── */}
      {!loading && filteredSorted.length > 0 && (
        <div className="bg-[#FFFFFF] border border-[#CCCCCC] p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="font-mono text-[#555555]">
            SHOWING <strong className="text-[#111111]">{startIdx}</strong>–<strong className="text-[#111111]">{endIdx}</strong> OF{' '}
            <strong className="text-[#111111]">{filteredSorted.length}</strong> TRAINEES
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
  );
}
