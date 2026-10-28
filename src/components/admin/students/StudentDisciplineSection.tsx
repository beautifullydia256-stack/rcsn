"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, AlertCircle, RotateCcw } from "lucide-react";
import NativeModal from "@/components/NativeModal";

export type DisciplineDisplayStatus = "Active" | "Warned" | "Suspended" | "Deactivated" | "Deleted";

export function resolveDisciplineDisplayStatus(
  row: {
    deleted_at?: string | null;
    discipline_deactivated_at?: string | null;
    suspension_open?: boolean | null;
  },
  hasWarningRecord: boolean
): DisciplineDisplayStatus {
  if (row.deleted_at) return "Deleted";
  if (row.discipline_deactivated_at) return "Deactivated";
  if (row.suspension_open) return "Suspended";
  if (hasWarningRecord) return "Warned";
  return "Active";
}

function getGovTagClass(status: DisciplineDisplayStatus): string {
  switch (status) {
    case "Active":
      return "gov-tag-approved";
    case "Warned":
      return "gov-tag-warned";
    case "Suspended":
    case "Deleted":
      return "gov-tag-suspended";
    case "Deactivated":
    default:
      return "";
  }
}

type DisciplineRow = {
  record_id: string;
  created_at: string;
  action_type: string;
  notes: string;
  recorded_by: string | null;
  suspension_start_date?: string | null;
  suspension_end_date?: string | null;
};

type Props = {
  studentId: string;
  schoolId: string;
  studentSnapshot: {
    deleted_at?: string | null;
    discipline_deactivated_at?: string | null;
    suspension_open?: boolean | null;
    suspension_period_start?: string | null;
    suspension_period_end?: string | null;
  };
  initialHasWarning?: boolean;
  canManageDiscipline: boolean;
  isOwner: boolean;
  onStudentRefresh: () => Promise<void>;
};

export function StudentDisciplineStatusBadge({
  status,
}: {
  status: DisciplineDisplayStatus;
}) {
  return (
    <span className={`gov-tag ${getGovTagClass(status)}`}>
      {status}
    </span>
  );
}

export default function StudentDisciplineSection({
  studentId,
  schoolId: _schoolId,
  studentSnapshot,
  canManageDiscipline,
  isOwner,
  onStudentRefresh,
  initialHasWarning = false,
}: Props) {
  const [records, setRecords] = useState<DisciplineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [namesByUser, setNamesByUser] = useState<Record<string, string>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionType, setActionType] = useState<string>("warning");
  const [notes, setNotes] = useState("");
  const [suspStart, setSuspStart] = useState("");
  const [suspEnd, setSuspEnd] = useState("");
  const [restoreNotes, setRestoreNotes] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("discipline_records")
        .select(
          "record_id, created_at, action_type, notes, recorded_by, suspension_start_date, suspension_end_date"
        )
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as DisciplineRow[];
      setRecords(rows);
      const ids = [...new Set(rows.map((r) => r.recorded_by).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: users } = await supabase.from("users").select("user_id, name").in("user_id", ids);
        const m: Record<string, string> = {};
        (users || []).forEach((u: { user_id: string; name: string }) => {
          m[u.user_id] = u.name || "—";
        });
        setNamesByUser(m);
      } else {
        setNamesByUser({});
      }
    } catch (e) {
      console.error(e);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const hasWarningRecord = useMemo(() => {
    if (records.length) return records.some((r) => r.action_type === "warning");
    return initialHasWarning;
  }, [records, initialHasWarning]);

  const displayStatus = resolveDisciplineDisplayStatus(studentSnapshot, hasWarningRecord);

  const summary = useMemo(() => {
    const warnings = records.filter((r) => r.action_type === "warning").length;
    const suspensions = records.filter((r) => r.action_type === "suspension").length;
    const last = records[0];
    return {
      warnings,
      suspensions,
      lastAt: last?.created_at ?? null,
    };
  }, [records]);

  const isDeactivatedOnly =
    !!studentSnapshot.discipline_deactivated_at && !studentSnapshot.deleted_at;

  const closeModal = useCallback(() => {
    if (saving) return;
    setModalOpen(false);
  }, [saving]);

  const openModal = () => {
    setNotes("");
    setSuspStart("");
    setSuspEnd("");
    if (isDeactivatedOnly) {
      setActionType("deletion");
    } else if (studentSnapshot.suspension_open) {
      setActionType("lift_suspension");
    } else {
      setActionType("warning");
    }
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  const submitAction = async () => {
    if (!notes.trim()) {
      alert("Notes are required.");
      return;
    }
    if (actionType === "deactivation") {
      if (!confirm("Deactivate this student? They will lose portal access until handled by support/policy.")) return;
    }
    if (actionType === "deletion") {
      if (
        !confirm(
          "Archive this student (soft delete)? They will be removed from active lists. Only an Owner can restore them."
        )
      )
        return;
    }
    if (actionType === "suspension") {
      if (!suspStart || !suspEnd) {
        alert("Suspension requires start and end dates.");
        return;
      }
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_add_discipline_action", {
        p_student_id: studentId,
        p_action_type: actionType,
        p_notes: notes.trim(),
        p_suspension_start: actionType === "suspension" ? suspStart : null,
        p_suspension_end: actionType === "suspension" ? suspEnd : null,
      });
      if (error) throw error;
      setModalOpen(false);
      await loadRecords();
      await onStudentRefresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to save discipline action");
    } finally {
      setSaving(false);
    }
  };

  const submitRestore = async () => {
    if (!confirm("Restore this archived student?")) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("owner_restore_soft_deleted_student", {
        p_student_id: studentId,
        p_notes: restoreNotes.trim() || "Restored by owner",
      });
      if (error) throw error;
      setRestoreNotes("");
      await loadRecords();
      await onStudentRefresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="discipline" className="gov-card p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#EAEAEA]">
        <div>
          <div className="text-xs font-bold font-mono text-[#111111] uppercase">
            Discipline History &amp; Actions
          </div>
          <p className="text-[11px] font-mono text-[#777777] mt-0.5">
            Official chronological timeline of student conduct, sanctions, and warnings.
          </p>
        </div>
        {canManageDiscipline && displayStatus !== "Deleted" && (
          <button
            type="button"
            onClick={openModal}
            className="gov-btn gov-btn-sm gov-btn-primary"
          >
            {isDeactivatedOnly ? "Archive Student (Deletion)" : "+ Add Discipline Action"}
          </button>
        )}
        {canManageDiscipline && isDeactivatedOnly && (
          <p className="text-amber-800 text-xs font-mono font-medium">
            Student is deactivated. You can only record a deletion (archive) from here.
          </p>
        )}
      </div>

      {/* 4 Metrics Summary Boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-lg text-center">
          <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#777777]">
            Warnings
          </div>
          <div className="text-xl font-bold font-mono text-[#111111] mt-1">
            {summary.warnings}
          </div>
        </div>

        <div className="p-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-lg text-center">
          <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#777777]">
            Suspensions
          </div>
          <div className="text-xl font-bold font-mono text-[#111111] mt-1">
            {summary.suspensions}
          </div>
        </div>

        <div className="p-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-lg text-center">
          <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#777777]">
            Current Status
          </div>
          <div className="mt-1">
            <span className={`gov-tag ${getGovTagClass(displayStatus)} text-[10px]`}>
              {displayStatus}
            </span>
          </div>
        </div>

        <div className="p-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-lg text-center">
          <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#777777]">
            Last Action
          </div>
          <div className="text-xs font-mono font-bold text-[#111111] mt-1.5 truncate">
            {summary.lastAt ? new Date(summary.lastAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
          </div>
        </div>
      </div>

      {/* Active Suspension Alert Banner */}
      {studentSnapshot.suspension_open &&
        (studentSnapshot.suspension_period_start || studentSnapshot.suspension_period_end) && (
          <div className="border border-orange-300 bg-[#FFF3E0] px-3.5 py-2.5 rounded-lg text-xs font-mono text-orange-950 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
            <span>
              <strong>Active Suspension Period:</strong> {studentSnapshot.suspension_period_start || "—"} →{" "}
              {studentSnapshot.suspension_period_end || "—"} (Official status remains Suspended until lifted by administration).
            </span>
          </div>
        )}

      {/* Archived Student Restore Box */}
      {displayStatus === "Deleted" && isOwner && (
        <div className="border border-red-300 bg-[#FFEBEE] p-4 rounded-lg space-y-2.5">
          <p className="text-red-900 text-xs font-mono font-bold">
            Notice: This student dossier has been archived (soft-deleted).
          </p>
          <textarea
            className="gov-textarea text-xs"
            placeholder="Official rationale for restoration log..."
            value={restoreNotes}
            onChange={(e) => setRestoreNotes(e.target.value)}
            rows={2}
          />
          <button
            type="button"
            disabled={saving}
            onClick={submitRestore}
            className="gov-btn gov-btn-sm gov-btn-primary"
          >
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
            {saving ? "Restoring..." : "Restore Student Dossier (Owner Authorization)"}
          </button>
        </div>
      )}

      {/* Disciplinary Table / Empty State */}
      {loading ? (
        <div className="p-6 text-center text-xs font-mono text-[#666666] bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg">
          Loading discipline records...
        </div>
      ) : records.length === 0 ? (
        <div className="p-6 text-center text-xs font-mono text-[#666666] bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg">
          No disciplinary records yet. Warnings, formal sanctions, and notes logged by staff will appear here.
        </div>
      ) : (
        <div className="gov-table-container">
          <table className="gov-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Sanction / Action</th>
                <th>Suspension Period</th>
                <th>Notes / Findings</th>
                <th>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const actionBadgeClass =
                  r.action_type === "warning"
                    ? "gov-tag-warned"
                    : r.action_type === "suspension"
                    ? "gov-tag-suspended"
                    : "";

                return (
                  <tr key={r.record_id}>
                    <td className="font-mono text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <span className={`gov-tag ${actionBadgeClass} text-[10px]`}>
                        {r.action_type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="font-mono text-xs whitespace-nowrap">
                      {r.suspension_start_date || r.suspension_end_date ? (
                        <span>
                          {r.suspension_start_date || "—"} → {r.suspension_end_date || "—"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-xs max-w-md">
                      <div className="whitespace-pre-wrap">{r.notes}</div>
                    </td>
                    <td className="font-mono text-xs text-[#666666] whitespace-nowrap">
                      {r.recorded_by ? namesByUser[r.recorded_by] || "Staff" : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Discipline Action Modal */}
      <NativeModal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Add Discipline Action"
        subtitle="Record official disciplinary sanction, suspension, or warning for this trainee."
        icon={ShieldAlert}
        size="md"
        variant="government"
      >
        <div className="p-5 space-y-4 text-xs font-sans">
          <div>
            <label className="block text-[11px] font-bold font-mono text-[#555555] uppercase tracking-wider mb-1.5">
              Action Type *
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="gov-select text-xs"
            >
              {isDeactivatedOnly ? (
                <option value="deletion">Deletion (Archive)</option>
              ) : (
                <>
                  <option value="warning">Formal Warning</option>
                  <option value="suspension" disabled={!!studentSnapshot.suspension_open}>
                    Suspension
                  </option>
                  <option value="lift_suspension" disabled={!studentSnapshot.suspension_open}>
                    End Suspension
                  </option>
                  <option value="deactivation">Deactivation</option>
                  <option value="deletion">Deletion (Archive)</option>
                </>
              )}
            </select>
          </div>

          {actionType === "suspension" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold font-mono text-[#555555] uppercase tracking-wider mb-1.5">
                  Start Date *
                </label>
                <input
                  type="date"
                  className="gov-input text-xs"
                  value={suspStart}
                  onChange={(e) => setSuspStart(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold font-mono text-[#555555] uppercase tracking-wider mb-1.5">
                  End Date *
                </label>
                <input
                  type="date"
                  className="gov-input text-xs"
                  value={suspEnd}
                  onChange={(e) => setSuspEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold font-mono text-[#555555] uppercase tracking-wider mb-1.5">
              Official Notes &amp; Findings (Required) *
            </label>
            <textarea
              className="gov-textarea text-xs min-h-[90px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Disciplinary committee context, incident details, or warning rationale..."
            />
          </div>

          <div className="pt-3 border-t border-[#EAEAEA] flex items-center justify-end gap-2.5">
            <button
              type="button"
              className="gov-btn gov-btn-sm"
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="gov-btn gov-btn-sm gov-btn-primary"
              onClick={submitAction}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Disciplinary Record"}
            </button>
          </div>
        </div>
      </NativeModal>
    </div>
  );
}
