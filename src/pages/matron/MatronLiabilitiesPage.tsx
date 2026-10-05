import { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Plus,
  DollarSign,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  X,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { useToast } from '@/components/Toast';
import {
  facilityAndLiabilityService,
  StudentLiability,
} from '@/services/facilityAndLiabilityService';

export default function MatronLiabilitiesPage() {
  const { schoolId, user } = useAuthStore();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const toast = useToast();

  const activeSchoolId = schoolId || 'e1b10000-0000-4000-a000-000000000001';

  const [liabilities, setLiabilities] = useState<StudentLiability[]>([]);
  const [residents, setResidents] = useState<{ student_id: string; name: string; admission_number?: string; current_class?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [itemDamaged, setItemDamaged] = useState('');
  const [feeAmountUgx, setFeeAmountUgx] = useState('50000');
  const [circumstance, setCircumstance] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const liabs = facilityAndLiabilityService.getLiabilities(activeSchoolId, undefined, 'hostel');
      setLiabilities(liabs);
      const res = await facilityAndLiabilityService.getResidentStudents(activeSchoolId);
      setResidents(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [activeSchoolId]);

  const handleRecordDamage = async () => {
    if (!selectedStudentId || !itemDamaged.trim() || !feeAmountUgx) {
      toast.error('Please fill in student, damaged item, and fee amount.');
      return;
    }

    setSaving(true);
    try {
      const student = residents.find((r) => r.student_id === selectedStudentId);
      await facilityAndLiabilityService.recordLiability({
        schoolId: activeSchoolId,
        studentId: selectedStudentId,
        studentName: student?.name,
        admissionNumber: student?.admission_number,
        currentClass: student?.current_class,
        department: 'hostel',
        itemDamaged: itemDamaged.trim(),
        quantity: 1,
        circumstance: circumstance.trim() || 'Reported by hostel matron / warden inspection',
        feeAmountUgx: Number(feeAmountUgx) || 0,
        reportedBy: user?.id,
      });

      toast.success('Hostel breakage liability recorded and billed to student ledger.');
      setShowModal(false);
      setSelectedStudentId('');
      setItemDamaged('');
      setCircumstance('');
      setFeeAmountUgx('50000');
      void loadData();
    } catch {
      toast.error('Failed to record breakage.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = liabilities.filter(
    (l) =>
      !search ||
      (l.student_name && l.student_name.toLowerCase().includes(search.toLowerCase())) ||
      (l.item_damaged && l.item_damaged.toLowerCase().includes(search.toLowerCase())) ||
      (l.admission_number && l.admission_number.toLowerCase().includes(search.toLowerCase()))
  );

  const totalOutstandingUGX = liabilities
    .filter((l) => l.status === 'pending')
    .reduce((sum, l) => sum + Number(l.fee_amount_ugx || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: tk.textHi }}>
                Hostel Damages &amp; Breakages
              </h1>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: tk.textLow }}>
                Record damaged mattresses, windows, fixtures, or locks. Automatically bills the student.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-white bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Log Hostel Damage / Fee
        </button>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div
          className="p-4 rounded-2xl border"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <p className="text-xs font-medium text-slate-400">Total Recorded Incidents</p>
          <p className="text-2xl font-bold mt-1" style={{ color: tk.textHi }}>
            {liabilities.length}
          </p>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <p className="text-xs font-medium text-amber-400">Pending Recovery (UGX)</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">
            UGX {totalOutstandingUGX.toLocaleString()}
          </p>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
        >
          <p className="text-xs font-medium text-emerald-400">Cleared / Settled</p>
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
              placeholder="Search by student or damaged item..."
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
                <th className="py-3 px-4 font-semibold text-slate-400">Damaged Item</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Circumstance</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Assessed Fee</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Status</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Recorded Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading hostel liabilities...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                    <p className="font-semibold text-sm">No hostel damages recorded</p>
                    <p className="text-xs text-slate-500 mt-1">
                      All dorm rooms and fixtures are currently in good condition.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-100">{l.student_name || 'Resident Student'}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        #{l.admission_number || 'NO-ADM'}
                      </p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-rose-300">
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
                          <Clock className="w-3 h-3" /> Pending Recovery
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

      {/* Modal to Log Damage */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4"
            style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Record Hostel Damage / Breakage
                </h3>
                <p className="text-xs text-slate-400">
                  Attaches directly to the student profile and adds a debit surcharge to billing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Responsible Resident Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs outline-none text-slate-200"
                  style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
                >
                  <option value="">— Select Student —</option>
                  {residents.map((r) => (
                    <option key={r.student_id} value={r.student_id}>
                      {r.name} (#{r.admission_number || 'NO-ADM'}) - {r.current_class}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Damaged Hostel Item / Fixture
                </label>
                <input
                  type="text"
                  placeholder="e.g. Foam Mattress, Room Window Glass, Door Lock Cylinder"
                  value={itemDamaged}
                  onChange={(e) => setItemDamaged(e.target.value)}
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
                  value={feeAmountUgx}
                  onChange={(e) => setFeeAmountUgx(e.target.value)}
                  className="w-full p-2.5 rounded-xl border text-xs outline-none text-slate-200"
                  style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Incident Circumstance &amp; Observation
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain how the item was broken or destroyed..."
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
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordDamage}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20 disabled:opacity-50"
              >
                {saving ? 'Recording...' : 'Attach Liability & Bill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
