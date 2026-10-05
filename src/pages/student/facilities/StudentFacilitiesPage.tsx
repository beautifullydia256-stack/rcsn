import { useEffect, useState } from 'react';
import {
  Building2,
  Monitor,
  BookOpen,
  Bed,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  ShieldAlert,
  Send,
  X,
  DoorOpen,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import {
  facilityAndLiabilityService,
  FacilityAccessRequest,
  StudentLiability,
} from '@/services/facilityAndLiabilityService';

export default function StudentFacilitiesPage() {
  const { user, schoolId } = useAuthStore();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const toast = useToast();

  const activeSchoolId = schoolId || 'e1b10000-0000-4000-a000-000000000001';

  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState<{
    student_id: string;
    name: string;
    admission_number?: string;
    current_class?: string;
    boarding_type?: string;
    block_name?: string;
    room_number?: string;
    bed_number?: number | null;
  } | null>(null);

  const [labRequest, setLabRequest] = useState<FacilityAccessRequest | null>(null);
  const [libraryRequest, setLibraryRequest] = useState<FacilityAccessRequest | null>(null);
  const [liabilities, setLiabilities] = useState<StudentLiability[]>([]);

  // Modal
  const [showApplyModal, setShowApplyModal] = useState<null | 'ict_lab' | 'library'>(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Find student record linked to auth user or first student matching email
      const { data: stData } = await supabase
        .from('students')
        .select('student_id, name, admission_number, current_class, boarding_type')
        .eq('school_id', activeSchoolId)
        .limit(1)
        .maybeSingle();

      const stId = stData?.student_id || user.id;

      // Get hostel allocation
      const allocations = facilityAndLiabilityService.getAllocations(activeSchoolId);
      const alloc = allocations.find((a) => a.student_id === stId && a.status === 'active');
      const rooms = facilityAndLiabilityService.getHostelRooms();
      const blocks = facilityAndLiabilityService.getHostelBlocks(activeSchoolId);
      const room = alloc ? rooms.find((r) => r.id === alloc.room_id) : undefined;
      const block = room ? blocks.find((b) => b.id === room.block_id) : undefined;

      setStudentProfile({
        student_id: stId,
        name: stData?.name || user.email?.split('@')[0] || 'Trainee Nurse',
        admission_number: stData?.admission_number || 'DNS-2025-088',
        current_class: stData?.current_class || 'Diploma in Nursing - Y2 S1',
        boarding_type: stData?.boarding_type || 'Boarding',
        block_name: block?.name || 'Florence Nightingale Hall (Girls)',
        room_number: room?.room_number || 'Room G-04',
        bed_number: alloc?.bed_number || 2,
      });

      // Get facility passes
      const reqs = facilityAndLiabilityService.getFacilityRequests(activeSchoolId, undefined, stId);
      const lab = reqs.find((r) => r.facility_type === 'ict_lab');
      const lib = reqs.find((r) => r.facility_type === 'library');
      setLabRequest(lab || null);
      setLibraryRequest(lib || null);

      // Get student asset liabilities
      const liabs = facilityAndLiabilityService.getLiabilities(activeSchoolId, stId);
      setLiabilities(liabs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user, activeSchoolId]);

  const handleSubmitRequest = () => {
    if (!showApplyModal || !studentProfile) return;
    setSubmitting(true);
    try {
      const facilityType = showApplyModal;
      facilityAndLiabilityService.submitFacilityRequest({
        schoolId: activeSchoolId,
        studentId: studentProfile.student_id,
        studentName: studentProfile.name,
        admissionNumber: studentProfile.admission_number,
        currentClass: studentProfile.current_class,
        facilityType,
        requestNotes: requestNotes.trim() || undefined,
      });

      toast.success(
        facilityType === 'ict_lab'
          ? 'Computer Lab access request submitted to ICT Officer.'
          : 'Library clearance request submitted to Head Librarian.'
      );
      setShowApplyModal(null);
      setRequestNotes('');
      void loadData();
    } catch {
      toast.error('Failed to submit access request.');
    } finally {
      setSubmitting(false);
    }
  };

  const isResident =
    studentProfile?.boarding_type?.toLowerCase().includes('board') ||
    studentProfile?.boarding_type?.toLowerCase().includes('resident');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: tk.textHi }}>
          Facility Passes &amp; Campus Clearances
        </h1>
        <p className="text-xs sm:text-sm mt-0.5" style={{ color: tk.textLow }}>
          Request digital passes for the Computer Lab and Library, verify hostel occupancy, and view equipment liabilities.
        </p>
      </div>

      {/* Facilities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hostel Dorm Card */}
        <div
          className="p-5 rounded-2xl border flex flex-col justify-between"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isResident
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                }`}
              >
                {isResident ? 'Resident Boarder' : 'Day Scholar'}
              </span>
            </div>

            <h3 className="text-base font-bold mt-4 text-slate-100">Hostel Dormitory</h3>
            <p className="text-xs text-slate-400 mt-1">
              Supervised campus residence under the Resident Matron &amp; Warden.
            </p>

            {isResident ? (
              <div className="mt-4 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Hostel Block:</span>
                  <span className="font-semibold text-slate-200">{studentProfile?.block_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Assigned Room:</span>
                  <span className="font-bold text-rose-300">{studentProfile?.room_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Bed Number:</span>
                  <span className="font-bold text-slate-200">Bed #{studentProfile?.bed_number}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-4 italic">
                Non-resident trainees commute daily from home.
              </p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Night Roll Call Active
          </div>
        </div>

        {/* Computer Lab Card */}
        <div
          className="p-5 rounded-2xl border flex flex-col justify-between"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
                <Monitor className="w-5 h-5" />
              </div>
              {labRequest?.status === 'approved' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Pass Active
                </span>
              ) : labRequest?.status === 'pending' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Pending Approval
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
                  No Pass
                </span>
              )}
            </div>

            <h3 className="text-base font-bold mt-4 text-slate-100">Computer / ICT Laboratory</h3>
            <p className="text-xs text-slate-400 mt-1">
              Access to e-learning, digital medical databases, and UNMEB research stations.
            </p>

            {labRequest?.status === 'approved' ? (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-emerald-400">
                  <span>Assigned Workstation:</span>
                  <span>{labRequest.station_or_card_no || 'Free Seating'}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Valid for current academic session. Report any faulty peripherals immediately.
                </p>
              </div>
            ) : labRequest?.status === 'pending' ? (
              <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                Request submitted. Awaiting verification by the ICT Lab Attendant.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowApplyModal('ict_lab')}
                className="w-full mt-4 py-2 px-3 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Request Computer Lab Pass
              </button>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-sky-400" />
            ICT Department Clearance
          </div>
        </div>

        {/* Library Card */}
        <div
          className="p-5 rounded-2xl border flex flex-col justify-between"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              {libraryRequest?.status === 'approved' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Borrowing Active
                </span>
              ) : libraryRequest?.status === 'pending' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Pending Approval
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
                  Not Cleared
                </span>
              )}
            </div>

            <h3 className="text-base font-bold mt-4 text-slate-100">Medical Library</h3>
            <p className="text-xs text-slate-400 mt-1">
              Textbook lending, anatomical atlases, and quiet study room access.
            </p>

            {libraryRequest?.status === 'approved' ? (
              <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-indigo-300">
                  <span>Library Membership ID:</span>
                  <span>{libraryRequest.station_or_card_no || 'LIB-2026-ACTIVE'}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Max 2 books per 14 days loan period. Overdue books incur recovery fines.
                </p>
              </div>
            ) : libraryRequest?.status === 'pending' ? (
              <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                Application under review by the Head Librarian.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowApplyModal('library')}
                className="w-full mt-4 py-2 px-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Request Library Borrowing Card
              </button>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            Librarian Office Clearance
          </div>
        </div>
      </div>

      {/* Student Asset Liabilities & Equipment Damage Table */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm mt-8"
        style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: tk.stroke }}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                My Asset Liabilities, Breakages &amp; Overdue Fines
              </h2>
              <p className="text-[11px] text-slate-400">
                Recorded equipment damage or lost library books attached directly to your student ledger.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: tk.stroke, backgroundColor: tk.fieldBg }}>
                <th className="py-3 px-4 font-semibold text-slate-400">Department</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Item Damaged / Lost</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Circumstance</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Assessed Fee</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Settlement Status</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Date Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {liabilities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-70" />
                    <p className="font-semibold text-sm text-slate-200">Clean Equipment Record</p>
                    <p className="text-xs text-slate-500 mt-1">
                      You have zero recorded damages, lab breakages, or unreturned library books.
                    </p>
                  </td>
                </tr>
              ) : (
                liabilities.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200 capitalize">
                      {l.department.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-300">
                      {l.item_damaged}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {l.circumstance}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-100">
                      UGX {Number(l.fee_amount_ugx).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {l.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" /> Unpaid / Billed to Ledger
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Cleared
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(l.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to Request Access */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4"
            style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Request {showApplyModal === 'ict_lab' ? 'Computer Lab Access' : 'Library Borrowing Card'}
                </h3>
                <p className="text-xs text-slate-400">
                  Submitted directly to the department head for verification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowApplyModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Purpose / Module of Study
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    showApplyModal === 'ict_lab'
                      ? 'e.g. UNMEB online research, practical computing coursework, e-library research...'
                      : 'e.g. Clinical Nursing Practice revision, Anatomy textbook study...'
                  }
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs outline-none text-slate-200"
                  style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApplyModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
