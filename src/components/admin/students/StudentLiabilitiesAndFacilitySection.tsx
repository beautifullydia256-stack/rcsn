import { useState, useEffect } from 'react';
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
  DollarSign,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/Toast';
import {
  facilityAndLiabilityService,
  StudentLiability,
  FacilityAccessRequest,
  HostelAllocation,
} from '@/services/facilityAndLiabilityService';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';

interface Props {
  studentId: string;
  schoolId: string;
  studentName: string;
  admissionNumber?: string;
  currentClass?: string;
  boardingType?: string;
}

export default function StudentLiabilitiesAndFacilitySection({
  studentId,
  schoolId,
  studentName,
  admissionNumber,
  currentClass,
  boardingType,
}: Props) {
  const { user } = useAuthStore();
  const toast = useToast();

  const [liabilities, setLiabilities] = useState<StudentLiability[]>([]);
  const [labPass, setLabPass] = useState<FacilityAccessRequest | null>(null);
  const [libPass, setLibPass] = useState<FacilityAccessRequest | null>(null);
  const [allocation, setAllocation] = useState<HostelAllocation | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [department, setDepartment] = useState<'ict_lab' | 'science_lab' | 'library' | 'hostel'>('ict_lab');
  const [itemDamaged, setItemDamaged] = useState('');
  const [feeAmountUgx, setFeeAmountUgx] = useState('35000');
  const [circumstance, setCircumstance] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    const liabs = facilityAndLiabilityService.getLiabilities(schoolId, studentId);
    setLiabilities(liabs);

    const reqs = facilityAndLiabilityService.getFacilityRequests(schoolId, undefined, studentId);
    const lab = reqs.find((r) => r.facility_type === 'ict_lab');
    const lib = reqs.find((r) => r.facility_type === 'library');
    setLabPass(lab || null);
    setLibPass(lib || null);

    const allocs = facilityAndLiabilityService.getAllocations(schoolId);
    const alloc = allocs.find((a) => a.student_id === studentId && a.status === 'active');
    setAllocation(alloc || null);
  };

  useEffect(() => {
    loadData();
  }, [studentId, schoolId]);

  const handleRecordLiability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemDamaged.trim() || !feeAmountUgx) {
      toast.error('Please specify damaged item and assessed fee.');
      return;
    }

    setSaving(true);
    try {
      await facilityAndLiabilityService.recordLiability({
        schoolId,
        studentId,
        studentName,
        admissionNumber,
        currentClass,
        department,
        itemDamaged: itemDamaged.trim(),
        quantity: 1,
        circumstance: circumstance.trim() || 'Recorded from student profile audit',
        feeAmountUgx: Number(feeAmountUgx) || 0,
        reportedBy: user?.id,
      });

      toast.success('Liability recorded and added to billing invoice.');
      setShowAddModal(false);
      setItemDamaged('');
      setCircumstance('');
      setFeeAmountUgx('35000');
      loadData();
    } catch {
      toast.error('Failed to record liability.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearLiability = (id: string) => {
    facilityAndLiabilityService.updateLiabilityStatus(id, 'cleared', user?.id);
    toast.success('Liability marked as cleared.');
    loadData();
  };

  const isResident =
    boardingType?.toLowerCase().includes('board') ||
    boardingType?.toLowerCase().includes('resident');

  const pendingLiabilities = liabilities.filter((l) => l.status === 'pending');
  const totalPendingUGX = pendingLiabilities.reduce((sum, l) => sum + Number(l.fee_amount_ugx || 0), 0);

  return (
    <div className="w-full space-y-4 text-xs font-sans">
      {/* 3 Facility Summary Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Hostel Pill */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-rose-500" /> Hostel Residence
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isResident
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
              }`}
            >
              {isResident ? 'Resident' : 'Day Scholar'}
            </span>
          </div>
          {isResident ? (
            <p className="font-bold text-slate-900 dark:text-slate-100">
              {allocation ? `Room ${allocation.room_number || 'Assigned'}, Bed #${allocation.bed_number}` : 'Room G-04 (Florence Nightingale)'}
            </p>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 italic">Non-resident commuter</p>
          )}
        </div>

        {/* ICT Lab Pill */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-sky-500" /> Computer Lab
            </span>
            {labPass?.status === 'approved' ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                Cleared
              </span>
            ) : labPass?.status === 'pending' ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                Pending
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400">
                Not Applied
              </span>
            )}
          </div>
          <p className="font-bold text-slate-900 dark:text-slate-100">
            {labPass?.status === 'approved' ? `Station ${labPass.station_or_card_no || 'PC-04'}` : 'No active pass'}
          </p>
        </div>

        {/* Library Pill */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-semibold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Medical Library
            </span>
            {libPass?.status === 'approved' ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                Active Card
              </span>
            ) : libPass?.status === 'pending' ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                Pending
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400">
                Not Issued
              </span>
            )}
          </div>
          <p className="font-bold text-slate-900 dark:text-slate-100">
            {libPass?.status === 'approved' ? (libPass.station_or_card_no || 'LIB-2026-ACTIVE') : 'Borrowing inactive'}
          </p>
        </div>
      </div>

      {/* Liabilities & Breakages Table Section */}
      <div className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Equipment Breakages, Damages &amp; Lost Library Books
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Unsettled damage fines block student examination cards and clearance certificates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pendingLiabilities.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                Outstanding: UGX {totalPendingUGX.toLocaleString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Log Damage / Fine
            </button>
          </div>
        </div>

        {liabilities.length === 0 ? (
          <div className="py-6 text-center text-slate-400">
            <CheckCircle2 className="w-7 h-7 mx-auto mb-1.5 text-emerald-500 opacity-60" />
            <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
              Clean Institutional Asset Record
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              No damaged lab hardware, broken hostel property, or overdue library fines recorded.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-2 px-3">Department</th>
                  <th className="py-2 px-3">Item Damaged / Lost</th>
                  <th className="py-2 px-3">Circumstance</th>
                  <th className="py-2 px-3">Fee Amount</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {liabilities.map((l) => (
                  <tr key={l.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 capitalize">
                      {l.department.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-rose-600 dark:text-rose-300">
                      {l.item_damaged}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {l.circumstance}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                      UGX {Number(l.fee_amount_ugx).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      {l.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3" /> Billed to Ledger
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Cleared
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {l.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleClearLiability(l.id)}
                          className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors"
                        >
                          Mark Cleared
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal to Log Incident on Student */}
      <NativeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Record Breakage / Damage for ${studentName}`}
        subtitle="Adds charge directly to student profile and financial ledger."
        icon={ShieldAlert}
        size="md"
      >
        <form onSubmit={handleRecordLiability} className="space-y-4">
          <div className="relative z-[35] focus-within:z-[50]">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Department
            </label>
            <LiquidGlassSelect
              value={department}
              onChange={(val) => setDepartment(val as any)}
              options={[
                { value: 'ict_lab', label: 'Computer / ICT Laboratory' },
                { value: 'science_lab', label: 'Clinical Skills / Practical Lab' },
                { value: 'library', label: 'Medical Library' },
                { value: 'hostel', label: 'Hostel / Dormitory' },
              ]}
              placeholder="Select Department"
            />
          </div>

          <div className="relative z-[25] focus-within:z-[40]">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Damaged Item / Missing Book Name
            </label>
            <input
              type="text"
              placeholder="e.g. Computer Monitor, Mouse, TV screen, Anatomy textbook"
              value={itemDamaged}
              onChange={(e) => setItemDamaged(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
            />
          </div>

          <div className="relative z-[20] focus-within:z-[40]">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Assessed Replacement / Repair Cost (UGX)
            </label>
            <input
              type="number"
              value={feeAmountUgx}
              onChange={(e) => setFeeAmountUgx(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
            />
          </div>

          <div className="relative z-[15] focus-within:z-[40]">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Circumstance Notes
            </label>
            <textarea
              rows={2}
              placeholder="Describe incident circumstance..."
              value={circumstance}
              onChange={(e) => setCircumstance(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-lg shadow-rose-500/25 border border-rose-400/30 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Attach Charge & Bill'}
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
