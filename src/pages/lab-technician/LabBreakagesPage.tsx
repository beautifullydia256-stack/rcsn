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
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleRecordBreakage}
            className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4"
            style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Record Equipment Damage / Breakage
                </h3>
                <p className="text-xs text-slate-400">
                  Directly attaches to student profile and debits institutional billing invoice.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Responsible Student (Select from Active Students)
                </label>
                <input
                  type="text"
                  placeholder="Filter student..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full p-2 rounded-xl border text-xs outline-none text-slate-200 mb-2"
                  style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
                />
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs outline-none text-slate-200"
                  style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
                >
                  <option value="">— Select Student —</option>
                  {students
                    .filter((s) =>
                      !studentSearch ||
                      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                      (s.admission_number && s.admission_number.toLowerCase().includes(studentSearch.toLowerCase()))
                    )
                    .map((s) => (
                      <option key={s.student_id} value={s.student_id}>
                        {s.name} (#{s.admission_number || 'NO-ADM'}) - {s.current_class}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Department
                  </label>
                  <select
                    value={departmentType}
                    onChange={(e) => setDepartmentType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border text-xs outline-none text-slate-200"
                    style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
                  >
                    <option value="ict_lab">ICT / Computer Lab</option>
                    <option value="science_lab">Clinical Skills / Science Lab</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs outline-none text-slate-200"
                    style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Damaged Hardware / Item Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. HP 24-inch LCD Monitor, USB Optical Mouse, Laboratory Glassware, TV Display"
                  value={itemBroken}
                  onChange={(e) => setItemBroken(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs outline-none text-slate-200"
                  style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Assessed Replacement / Repair Cost (UGX)
                </label>
                <input
                  type="number"
                  value={replacementFeeUGX}
                  onChange={(e) => setReplacementFeeUGX(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs outline-none text-slate-200"
                  style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Circumstance &amp; Observation Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe how the equipment was broken or damaged..."
                  value={circumstance}
                  onChange={(e) => setCircumstance(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs outline-none text-slate-200"
                  style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20 disabled:opacity-50"
              >
                {saving ? 'Recording...' : 'Attach Liability & Bill'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Station Assignment Modal */}
      {approvingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl space-y-4"
            style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100">
                Assign Workstation for {approvingRequest.student_name}
              </h3>
              <button
                type="button"
                onClick={() => setApprovingRequest(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Computer Station Number
              </label>
              <input
                type="text"
                value={assignedStation}
                onChange={(e) => setAssignedStation(e.target.value)}
                placeholder="e.g. Station PC-04, PC-12"
                className="w-full p-2.5 rounded-xl border text-xs outline-none text-slate-200"
                style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApprovingRequest(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveRequest}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20"
              >
                Issue Digital Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
