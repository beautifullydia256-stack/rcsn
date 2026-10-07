import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Plus,
  DollarSign,
  CheckCircle2,
  Monitor,
  Tv,
  CheckSquare,
  Clock,
  X,
  RefreshCw,
  Users,
  ShieldAlert,
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

export default function LabBreakagesPage() {
  const { schoolId, user } = useAuthStore();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const toast = useToast();

  const activeSchoolId = schoolId || 'e1b10000-0000-4000-a000-000000000001';

  const [activeTab, setActiveTab] = useState<'breakages' | 'clearances'>('breakages');
  const [breakages, setBreakages] = useState<StudentLiability[]>([]);
  const [clearances, setClearances] = useState<FacilityAccessRequest[]>([]);
  const [students, setStudents] = useState<{ student_id: string; name: string; admission_number?: string; current_class?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [itemBroken, setItemBroken] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [replacementFeeUGX, setReplacementFeeUGX] = useState('35000');
  const [circumstance, setCircumstance] = useState('');
  const [departmentType, setDepartmentType] = useState<'ict_lab' | 'science_lab'>('ict_lab');
  const [saving, setSaving] = useState(false);

  // Station assignment modal for approvals
  const [approvingRequest, setApprovingRequest] = useState<FacilityAccessRequest | null>(null);
  const [assignedStation, setAssignedStation] = useState('PC-01');

  const loadData = async () => {
    setLoading(true);
    try {
      const ictLiabs = facilityAndLiabilityService.getLiabilities(activeSchoolId, undefined, 'ict_lab');
      const sciLiabs = facilityAndLiabilityService.getLiabilities(activeSchoolId, undefined, 'science_lab');
      setBreakages([...ictLiabs, ...sciLiabs]);

      const reqs = facilityAndLiabilityService.getFacilityRequests(activeSchoolId, 'ict_lab');
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

  const handleRecordBreakage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !itemBroken.trim() || !replacementFeeUGX) {
      toast.error('Please select student, damaged item and replacement fee.');
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
        department: departmentType,
        itemDamaged: itemBroken.trim(),
        quantity: parseInt(quantity, 10) || 1,
        circumstance: circumstance.trim() || 'Recorded during lab session by technician',
        feeAmountUgx: Number(replacementFeeUGX) || 0,
        reportedBy: user?.id,
      });

      toast.success('Equipment damage recorded and attached to student ledger.');
      setShowAddModal(false);
      setSelectedStudentId('');
      setItemBroken('');
      setCircumstance('');
      setReplacementFeeUGX('35000');
      void loadData();
    } catch {
      toast.error('Failed to save equipment damage liability.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearLiability = (liabilityId: string) => {
    facilityAndLiabilityService.updateLiabilityStatus(liabilityId, 'cleared', user?.id);
    toast.success('Liability marked as cleared.');
    void loadData();
  };

  const handleApproveRequest = () => {
    if (!approvingRequest) return;
    facilityAndLiabilityService.updateFacilityRequestStatus(
      approvingRequest.id,
      'approved',
      assignedStation,
      undefined,
      user?.id
    );
    toast.success(`Access pass approved with station ${assignedStation}.`);
    setApprovingRequest(null);
    void loadData();
  };

  const handleRejectRequest = (requestId: string) => {
    facilityAndLiabilityService.updateFacilityRequestStatus(
      requestId,
      'rejected',
      undefined,
      'Prerequisites or clearance incomplete',
      user?.id
    );
    toast.success('Request rejected.');
    void loadData();
  };

  const totalPendingUGX = breakages
    .filter((b) => b.status === 'pending')
    .reduce((sum, b) => sum + Number(b.fee_amount_ugx || 0), 0);

  const filteredBreakages = breakages.filter(
    (b) =>
      !search ||
      (b.student_name && b.student_name.toLowerCase().includes(search.toLowerCase())) ||
      (b.admission_number && b.admission_number.toLowerCase().includes(search.toLowerCase())) ||
      (b.item_damaged && b.item_damaged.toLowerCase().includes(search.toLowerCase()))
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
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Monitor className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: tk.textHi }}>
                Laboratory Clearances &amp; Breakages
              </h1>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: tk.textLow }}>
                Approve student computer lab access passes and log damaged hardware directly to the student profile.
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
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-white bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Record Lab Breakage / Damage
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b" style={{ borderColor: tk.stroke }}>
        <button
          type="button"
          onClick={() => setActiveTab('breakages')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'breakages'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Equipment Breakages &amp; Liabilities</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/15 text-rose-400">
            {breakages.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clearances')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'clearances'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Student Lab Access Requests</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/15 text-sky-400">
            {clearances.filter((c) => c.status === 'pending').length} Pending
          </span>
        </button>
      </div>

      {activeTab === 'breakages' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div
              className="p-4 rounded-2xl border"
              style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
            >
              <p className="text-xs font-medium text-slate-400">Total Recorded Incidents</p>
              <p className="text-2xl font-bold mt-1" style={{ color: tk.textHi }}>
                {breakages.length}
              </p>
            </div>

            <div
              className="p-4 rounded-2xl border"
              style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
            >
              <p className="text-xs font-medium text-amber-400">Total Unsettled Surcharges (UGX)</p>
              <p className="text-2xl font-bold mt-1 text-amber-400">
                UGX {totalPendingUGX.toLocaleString()}
              </p>
            </div>

            <div
              className="p-4 rounded-2xl border"
              style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
            >
              <p className="text-xs font-medium text-emerald-400">Cleared &amp; Replaced</p>
              <p className="text-2xl font-bold mt-1 text-emerald-400">
                {breakages.filter((b) => b.status === 'cleared').length}
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
                  placeholder="Search student or damaged item..."
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
                    <th className="py-3 px-4 font-semibold text-slate-400">Student</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Department</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Item Broken / Damaged</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Circumstance</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Surcharge Fee</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Status</th>
                    <th className="py-3 px-4 font-semibold text-slate-400 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredBreakages.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                        <p className="font-semibold text-sm">No lab breakages recorded</p>
                      </td>
                    </tr>
                  ) : (
                    filteredBreakages.map((b) => (
                      <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-100">{b.student_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">#{b.admission_number}</p>
                        </td>
                        <td className="py-3 px-4 capitalize text-slate-300">
                          {b.department.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 font-semibold text-rose-300">
                          {b.item_damaged} (Qty: {b.quantity})
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                          {b.circumstance}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-100">
                          UGX {Number(b.fee_amount_ugx).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          {b.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <Clock className="w-3 h-3" /> Billed to Ledger
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Cleared
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {b.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleClearLiability(b.id)}
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
                    <th className="py-3 px-4 font-semibold text-slate-400">Purpose / Reason</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Assigned Station</th>
                    <th className="py-3 px-4 font-semibold text-slate-400">Pass Status</th>
                    <th className="py-3 px-4 font-semibold text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredClearances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <CheckSquare className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
                        <p className="font-semibold text-sm">No access requests pending</p>
                      </td>
                    </tr>
                  ) : (
                    filteredClearances.map((c) => (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-100">{c.student_name}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">#{c.admission_number}</td>
                        <td className="py-3 px-4 text-slate-300">{c.current_class}</td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                          {c.request_notes || 'General Computer Lab Access'}
                        </td>
                        <td className="py-3 px-4">
                          {c.station_or_card_no ? (
                            <span className="font-mono font-bold text-sky-300">{c.station_or_card_no}</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {c.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </span>
                          ) : c.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <Clock className="w-3 h-3" /> Pending Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <X className="w-3 h-3" /> Rejected
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {c.status === 'pending' && (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setApprovingRequest(c)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
                              >
                                Approve Pass
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectRequest(c.id)}
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

      {/* Record Breakage Modal */}
      <NativeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Equipment Damage / Breakage"
        subtitle="Attaches liability to student ledger and bills replacement cost"
        icon={AlertTriangle}
        size="lg"
      >
        <form onSubmit={handleRecordBreakage} className="space-y-4">
          <div className="space-y-2 relative z-[45] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block">
              Responsible Trainee *
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
                { value: '', label: '— Select Responsible Trainee —' },
                ...students
                  .filter((s) =>
                    !studentSearch ||
                    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    (s.admission_number && s.admission_number.toLowerCase().includes(studentSearch.toLowerCase()))
                  )
                  .map((s) => ({
                    value: s.student_id,
                    label: `${s.name} (${s.admission_number || 'NO-ADM'}) • ${s.current_class || 'Class'}`,
                  })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-[40] focus-within:z-[50]">
            <div className="relative z-[42]">
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Facility / Department
              </label>
              <LiquidGlassSelect
                value={departmentType}
                onChange={(val) => setDepartmentType(val as any)}
                options={[
                  { value: 'ict_lab', label: 'ICT / Computer Laboratory' },
                  { value: 'science_lab', label: 'Clinical Skills & Science Lab' },
                ]}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Quantity Damaged
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="relative z-[35]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Damaged Equipment / Hardware Item *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. HP 24-inch LCD Monitor, Microscope Objective Lens, Glass Beaker 500ml"
              value={itemBroken}
              onChange={(e) => setItemBroken(e.target.value)}
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
            />
          </div>

          <div className="relative z-[30]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Assessed Replacement Cost (UGX) *
            </label>
            <input
              type="number"
              required
              value={replacementFeeUGX}
              onChange={(e) => setReplacementFeeUGX(e.target.value)}
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all font-mono"
            />
          </div>

          <div className="relative z-[25]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Circumstance &amp; Observation Details
            </label>
            <textarea
              rows={3}
              placeholder="Describe incident circumstance, instructor on duty, or witness statements..."
              value={circumstance}
              onChange={(e) => setCircumstance(e.target.value)}
              className="w-full bg-black/25 border border-white/20 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all resize-y"
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-lg shadow-rose-950/40 border border-rose-400/30 transition-all disabled:opacity-50"
            >
              {saving ? 'Recording...' : 'Attach Liability & Bill'}
            </button>
          </div>
        </form>
      </NativeModal>

      {/* Station Assignment Modal */}
      <NativeModal
        isOpen={!!approvingRequest}
        onClose={() => setApprovingRequest(null)}
        title="Assign Laboratory Workstation"
        subtitle={approvingRequest ? `Issue digital pass for ${approvingRequest.student_name}` : 'Laboratory Access Pass'}
        icon={Monitor}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Computer Workstation Identifier *
            </label>
            <input
              type="text"
              value={assignedStation}
              onChange={(e) => setAssignedStation(e.target.value)}
              placeholder="e.g. Station PC-04, PC-12"
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setApprovingRequest(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApproveRequest}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all"
            >
              Issue Digital Pass
            </button>
          </div>
        </div>
      </NativeModal>
    </div>
  );
}
