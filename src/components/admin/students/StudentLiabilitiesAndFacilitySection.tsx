"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Monitor,
  BookOpen,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/Toast";
import {
  facilityAndLiabilityService,
  StudentLiability,
  FacilityAccessRequest,
  HostelAllocation,
} from "@/services/facilityAndLiabilityService";
import NativeModal from "@/components/NativeModal";

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
  const [department, setDepartment] = useState<"ict_lab" | "science_lab" | "library" | "hostel">("ict_lab");
  const [itemDamaged, setItemDamaged] = useState("");
  const [feeAmountUgx, setFeeAmountUgx] = useState("35000");
  const [circumstance, setCircumstance] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    const liabs = facilityAndLiabilityService.getLiabilities(schoolId, studentId);
    setLiabilities(liabs);

    const reqs = facilityAndLiabilityService.getFacilityRequests(schoolId, undefined, studentId);
    const lab = reqs.find((r) => r.facility_type === "ict_lab");
    const lib = reqs.find((r) => r.facility_type === "library");
    setLabPass(lab || null);
    setLibPass(lib || null);

    const allocs = facilityAndLiabilityService.getAllocations(schoolId);
    const alloc = allocs.find((a) => a.student_id === studentId && a.status === "active");
    setAllocation(alloc || null);
  };

  useEffect(() => {
    loadData();
  }, [studentId, schoolId]);

  const handleRecordLiability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemDamaged.trim() || !feeAmountUgx) {
      toast.error("Please specify damaged item and assessed fee.");
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
        circumstance: circumstance.trim() || "Recorded from student profile audit",
        feeAmountUgx: Number(feeAmountUgx) || 0,
        reportedBy: user?.id,
      });

      toast.success("Liability recorded and billed to trainee ledger.");
      setShowAddModal(false);
      setItemDamaged("");
      setCircumstance("");
      setFeeAmountUgx("35000");
      loadData();
    } catch {
      toast.error("Failed to record liability.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearLiability = (id: string) => {
    facilityAndLiabilityService.updateLiabilityStatus(id, "cleared", user?.id);
    toast.success("Liability marked as cleared.");
    loadData();
  };

  const isResident =
    boardingType?.toLowerCase().includes("board") ||
    boardingType?.toLowerCase().includes("resident");

  const pendingLiabilities = liabilities.filter((l) => l.status === "pending");
  const totalPendingUGX = pendingLiabilities.reduce(
    (sum, l) => sum + Number(l.fee_amount_ugx || 0),
    0
  );

  return (
    <div className="gov-card p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#EAEAEA]">
        <div>
          <div className="text-xs font-bold font-mono text-[#111111] uppercase">
            Institutional Facilities &amp; Equipment Liabilities
          </div>
          <p className="text-[11px] font-mono text-[#777777] mt-0.5">
            Active facility clearance statuses, hostel residence, and equipment damage liabilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingLiabilities.length > 0 && (
            <span className="gov-tag gov-tag-suspended text-[10px]">
              Outstanding: UGX {totalPendingUGX.toLocaleString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="gov-btn gov-btn-sm gov-btn-primary"
          >
            <Plus className="w-3.5 h-3.5 mr-1 inline" /> Log Damage / Fine
          </button>
        </div>
      </div>

      {/* 3 Facility Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Hostel Residence */}
        <div className="p-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#555555] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#555555]" /> Hostel Residence
            </span>
            <span
              className={`gov-tag ${
                isResident ? "gov-tag-approved" : ""
              } text-[10px]`}
            >
              {isResident ? "Resident" : "Day Scholar"}
            </span>
          </div>
          <p className="text-xs font-mono font-bold text-[#111111]">
            {isResident
              ? allocation
                ? `Room ${allocation.room_number || "Assigned"}, Bed #${allocation.bed_number}`
                : "Room G-04 (Florence Nightingale)"
              : "Non-resident commuter"}
          </p>
        </div>

        {/* ICT Computer Lab */}
        <div className="p-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#555555] flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-[#555555]" /> Computer Lab
            </span>
            <span
              className={`gov-tag ${
                labPass?.status === "approved"
                  ? "gov-tag-approved"
                  : labPass?.status === "pending"
                  ? "gov-tag-warned"
                  : ""
              } text-[10px]`}
            >
              {labPass?.status === "approved"
                ? "Cleared"
                : labPass?.status === "pending"
                ? "Pending"
                : "Not Applied"}
            </span>
          </div>
          <p className="text-xs font-mono font-bold text-[#111111]">
            {labPass?.status === "approved"
              ? `Station ${labPass.station_or_card_no || "PC-04"}`
              : "No active pass"}
          </p>
        </div>

        {/* Medical Library */}
        <div className="p-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#555555] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#555555]" /> Medical Library
            </span>
            <span
              className={`gov-tag ${
                libPass?.status === "approved"
                  ? "gov-tag-approved"
                  : libPass?.status === "pending"
                  ? "gov-tag-warned"
                  : ""
              } text-[10px]`}
            >
              {libPass?.status === "approved"
                ? "Active Card"
                : libPass?.status === "pending"
                ? "Pending"
                : "Not Issued"}
            </span>
          </div>
          <p className="text-xs font-mono font-bold text-[#111111]">
            {libPass?.status === "approved"
              ? libPass.station_or_card_no || "LIB-2026-ACTIVE"
              : "Borrowing inactive"}
          </p>
        </div>
      </div>

      {/* Liabilities Table & Records */}
      <div>
        <div className="text-[11px] font-bold font-mono text-[#555555] uppercase pb-2 mb-2 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-[#555555]" />
          Equipment Breakages, Damages &amp; Lost Library Books
        </div>

        {liabilities.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-[#666666] bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg">
            Clean Institutional Asset Record — No damaged lab hardware, broken hostel property, or overdue library fines recorded.
          </div>
        ) : (
          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Item Damaged / Lost</th>
                  <th>Circumstance</th>
                  <th>Assessed Fee</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {liabilities.map((l) => (
                  <tr key={l.id}>
                    <td className="font-mono text-xs capitalize whitespace-nowrap">
                      {l.department.replace("_", " ")}
                    </td>
                    <td className="font-mono font-bold text-xs text-red-700">
                      {l.item_damaged}
                    </td>
                    <td className="text-xs max-w-xs truncate">
                      {l.circumstance}
                    </td>
                    <td className="font-mono font-bold text-xs">
                      UGX {Number(l.fee_amount_ugx).toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`gov-tag ${
                          l.status === "pending" ? "gov-tag-warned" : "gov-tag-approved"
                        } text-[10px]`}
                      >
                        {l.status === "pending" ? "BILLED TO LEDGER" : "CLEARED"}
                      </span>
                    </td>
                    <td className="text-right">
                      {l.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleClearLiability(l.id)}
                          className="gov-btn gov-btn-sm"
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
        subtitle="Adds institutional damage liability directly to student profile and ledger."
        icon={ShieldAlert}
        size="md"
        variant="government"
      >
        <form onSubmit={handleRecordLiability} className="p-5 space-y-4 text-xs font-sans">
          <div>
            <label className="block text-[11px] font-bold font-mono text-[#555555] uppercase tracking-wider mb-1.5">
              Department *
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as any)}
              className="gov-select text-xs"
            >
              <option value="ict_lab">Computer / ICT Laboratory</option>
              <option value="science_lab">Clinical Skills / Practical Lab</option>
              <option value="library">Medical Library</option>
              <option value="hostel">Hostel / Dormitory</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold font-mono text-[#555555] uppercase tracking-wider mb-1.5">
              Damaged Item / Missing Book Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Computer Monitor, Mouse, TV screen, Anatomy textbook"
              value={itemDamaged}
              onChange={(e) => setItemDamaged(e.target.value)}
              className="gov-input text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold font-mono text-[#555555] uppercase tracking-wider mb-1.5">
              Assessed Replacement / Repair Cost (UGX) *
            </label>
            <input
              type="number"
              value={feeAmountUgx}
              onChange={(e) => setFeeAmountUgx(e.target.value)}
              className="gov-input text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold font-mono text-[#555555] uppercase tracking-wider mb-1.5">
              Circumstance Notes
            </label>
            <textarea
              rows={2}
              placeholder="Describe incident circumstance..."
              value={circumstance}
              onChange={(e) => setCircumstance(e.target.value)}
              className="gov-textarea text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAEAEA]">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="gov-btn gov-btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="gov-btn gov-btn-sm gov-btn-primary"
            >
              {saving ? "Saving..." : "Attach Charge & Bill"}
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
