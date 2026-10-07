import { useState, useEffect } from 'react';
import {
  Clock,
  Search,
  DollarSign,
  Plus,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  X,
  RefreshCw,
  Users,
  CheckSquare,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { getTokens } from '@/styles/posThemeTokens';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import {
  facilityAndLiabilityService,
  StudentLiability,
  FacilityAccessRequest,
} from '@/services/facilityAndLiabilityService';
import NativeModal from '@/components/NativeModal';
import { LiquidGlassSelect } from '@/components/ui/LiquidGlassSelect';

export default function LibraryOverduePage() {
  const { schoolId, user } = useAuthStore();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const toast = useToast();

  const activeSchoolId = schoolId || 'e1b10000-0000-4000-a000-000000000001';

  const [activeTab, setActiveTab] = useState<'overdue' | 'clearances'>('overdue');
  const [liabilities, setLiabilities] = useState<StudentLiability[]>([]);
  const [clearances, setClearances] = useState<FacilityAccessRequest[]>([]);
  const [students, setStudents] = useState<{ student_id: string; name: string; admission_number?: string; current_class?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [fineAmountUgx, setFineAmountUgx] = useState('20000');
  const [circumstance, setCircumstance] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const libLiabs = facilityAndLiabilityService.getLiabilities(activeSchoolId, undefined, 'library');
      setLiabilities(libLiabs);

      const reqs = facilityAndLiabilityService.getFacilityRequests(activeSchoolId, 'library');
      setClearances(reqs);

      const { data: stData } = await supabase
        .from('students')
        .select('student_id, name, admission_number, current_class')
        .eq('school_id', activeSchoolId)
        .eq('status', 'active')
        .order('name');

      setStudents(stData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [activeSchoolId]);

  const handleRecordOverdue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !bookTitle.trim() || !fineAmountUgx) {
      toast.error('Please select student, book title, and fine amount.');
      return;
    }

    setSaving(true);
    try {
      const student = students.find((s) => s.student_id === selectedStudentId);
      await facilityAndLiabilityService.recordLiability({
        schoolId: activeSchoolId,
        studentId: selectedStudentId,
        studentName: student?.name,
        admissionNumber: student?.admission_number,
        currentClass: student?.current_class,
        department: 'library',
        itemDamaged: bookTitle.trim(),
        quantity: 1,
        circumstance: circumstance.trim() || 'Unreturned / overdue medical textbook past 14 days loan period',
        feeAmountUgx: Number(fineAmountUgx) || 0,
        reportedBy: user?.id,
      });

      toast.success('Library fine recorded and attached to student ledger.');
      setShowAddModal(false);
      setSelectedStudentId('');
      setBookTitle('');
      setCircumstance('');
      setFineAmountUgx('20000');
      void loadData();
    } catch {
      toast.error('Failed to save library charge.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearFine = (id: string) => {
    facilityAndLiabilityService.updateLiabilityStatus(id, 'cleared', user?.id);
    toast.success('Fine marked as settled.');
    void loadData();
  };

  const handleApproveLibraryCard = (requestId: string) => {
    const cardNo = `LIB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    facilityAndLiabilityService.updateFacilityRequestStatus(requestId, 'approved', cardNo, undefined, user?.id);
    toast.success(`Library card issued: ${cardNo}`);
    void loadData();
  };

  const handleRejectLibraryCard = (requestId: string) => {
    facilityAndLiabilityService.updateFacilityRequestStatus(requestId, 'rejected', undefined, 'Registration or clearance incomplete', user?.id);
    toast.success('Request declined.');
    void loadData();
  };

  const totalOutstanding = liabilities
    .filter((l) => l.status === 'pending')
    .reduce((sum, l) => sum + Number(l.fee_amount_ugx || 0), 0);

  const filteredLiabs = liabilities.filter(
    (l) =>
      !search ||
      (l.student_name && l.student_name.toLowerCase().includes(search.toLowerCase())) ||
      (l.item_damaged && l.item_damaged.toLowerCase().includes(search.toLowerCase())) ||
      (l.admission_number && l.admission_number.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredClearances = clearances.filter(
    (c) =>
      !search ||
      (c.student_name && c.student_name.toLowerCase().includes(search.toLowerCase())) ||
      (c.admission_number && c.admission_number.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: tk.textHi }}>
                Library Overdue Fines &amp; Student Cards
              </h1>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: tk.textLow }}>
                Enforce textbook returns, approve student borrower cards, and bill lost or overdue book penalties.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl border text-slate-400 hover:text-slate-200"
            style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Record Lost / Overdue Book Fine
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b" style={{ borderColor: tk.stroke }}>
        <button
          type="button"
          onClick={() => setActiveTab('overdue')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'overdue'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Overdue &amp; Lost Book Liabilities</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/15 text-indigo-400">
            {liabilities.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clearances')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'clearances'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Student Library Card Requests</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-400">
            {clearances.filter((c) => c.status === 'pending').length} Pending
          </span>
        </button>
      </div>

      {activeTab === 'overdue' && (
        <div className="space-y-6">
          {/* KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div
              className="p-4 rounded-2xl border"
              style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
            >
              <p className="text-xs font-medium text-slate-400">Total Defaulters Logged</p>
              <p className="text-2xl font-bold mt-1" style={{ color: tk.textHi }}>
                {liabilities.length}
              </p>
            </div>

            <div
              className="p-4 rounded-2xl border"
              style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
            >
              <p className="text-xs font-medium text-rose-400">Outstanding Fines (UGX)</p>
              <p className="text-2xl font-bold mt-1 text-rose-400">
                UGX {totalOutstanding.toLocaleString()}
              </p>
            </div>

            <div
              className="p-4 rounded-2xl border"
              style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
            >
              <p className="text-xs font-medium text-emerald-400">Recovered / Cleared</p>
              <p className="text-2xl font-bold mt-1 text-emerald-400">
                {liabilities.filter((l) => l.status === 'cleared').length}
              </p>
            </div>
          </div>

          {/* Table */}
          <div
            className="rounded-2xl border overflow-hidden shadow-sm"
            style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: tk.stroke }}>
              <div className="relative w-full max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student or book title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs border outline-none text-slate-200"
                  style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b" style={{ borderColor: tk.stroke, backgroundColor: tk.fieldBg }}>
                    <th className="py-3 px-4 font-semibold text-slate-400">Student Borrower</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Book Title / Accession</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Circumstance</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Fine Assessed</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Status</th>
                    <th className="py-3 px-4 font-semibold text-slate-400 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredLiabs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                        <p className="font-semibold text-sm">Zero overdue book penalties</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLiabs.map((l) => (
                      <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-100">{l.student_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">#{l.admission_number}</p>
                        </td>
                        <td className="py-3 px-4 font-semibold text-indigo-300">
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
                              <Clock className="w-3 h-3" /> Unpaid / Surcharged
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Cleared
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {l.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleClearFine(l.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                            >
                              Mark Cleared
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'clearances' && (
        <div className="space-y-4">
          <div
            className="rounded-2xl border overflow-hidden shadow-sm"
            style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b" style={{ borderColor: tk.stroke, backgroundColor: tk.fieldBg }}>
                    <th className="py-3 px-4 font-semibold text-slate-400">Student Name</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Admission No</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Class</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Study Reason</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Issued Card ID</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Card Status</th>
                    <th className="py-3 px-4 font-semibold text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredClearances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <CheckSquare className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
                        <p className="font-semibold text-sm">No library card requests pending</p>
                      </td>
                    </tr>
                  ) : (
                    filteredClearances.map((c) => (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-100">{c.student_name}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">#{c.admission_number}</td>
                        <td className="py-3 px-4 text-slate-300">{c.current_class}</td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                          {c.request_notes || 'Library Borrowing Card Application'}
                        </td>
                        <td className="py-3 px-4">
                          {c.station_or_card_no ? (
                            <span className="font-mono font-bold text-indigo-300">{c.station_or_card_no}</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {c.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Active Card
                            </span>
                          ) : c.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <Clock className="w-3 h-3" /> Pending Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <X className="w-3 h-3" /> Denied
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {c.status === 'pending' && (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApproveLibraryCard(c.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
                              >
                                Issue Card
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectLibraryCard(c.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Record Overdue / Lost Book Modal */}
      <NativeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Lost or Overdue Book Penalty"
        subtitle="Debits student billing statement and updates institutional library status"
        icon={BookOpen}
        size="md"
      >
        <form onSubmit={handleRecordOverdue} className="space-y-4">
          <div className="space-y-2 relative z-[45] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block">
              Responsible Trainee
            </label>
            <input
              type="text"
              placeholder="Search trainee name or admission number..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
            />
            <LiquidGlassSelect
              value={selectedStudentId}
              onChange={(val) => setSelectedStudentId(val)}
              options={[
                { value: '', label: '— Select Trainee —' },
                ...students
                  .filter((s) =>
                    !studentSearch ||
                    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    (s.admission_number && s.admission_number.toLowerCase().includes(studentSearch.toLowerCase()))
                  )
                  .map((s) => ({
                    value: s.student_id,
                    label: `${s.name} (${s.admission_number || 'NO-ADM'}) • ${s.current_class || 'Nursing'}`,
                  })),
              ]}
            />
          </div>

          <div className="relative z-[40] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Book Title & Accession Number
            </label>
            <input
              type="text"
              placeholder="e.g. Brunner & Suddarth's Textbook of Medical-Surgical Nursing (ACC-0914)"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
            />
          </div>

          <div className="relative z-[35] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Assessed Fine / Replacement Charge (UGX)
            </label>
            <input
              type="number"
              value={fineAmountUgx}
              onChange={(e) => setFineAmountUgx(e.target.value)}
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
            />
          </div>

          <div className="relative z-[30] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Circumstance Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Overdue 21 days past return due date; unreturned; pages torn..."
              value={circumstance}
              onChange={(e) => setCircumstance(e.target.value)}
              className="w-full bg-black/25 border border-white/20 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 disabled:opacity-50 transition-all"
            >
              {saving ? 'Recording...' : 'Attach Charge & Bill'}
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
