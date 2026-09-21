"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

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

const STATUS_STYLES: Record<DisciplineDisplayStatus, string> = {
  Active:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:bg-emerald-500/20 dark:border-emerald-500/40",
  Warned:
    "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 dark:bg-amber-500/20 dark:border-amber-500/40",
  Suspended:
    "bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-500/30 dark:bg-orange-500/20 dark:border-orange-500/40",
  Deactivated:
    "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30 dark:bg-slate-500/20 dark:border-slate-500/50",
  Deleted:
    "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 dark:bg-red-500/20 dark:border-red-500/40",
};

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
  /** When true, parent already counted a warning row (avoids flicker before records load). */
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
    <span
      className={`inline-flex items-center rounded-lg border px-3 py-1 text-sm font-semibold ${STATUS_STYLES[status]}`}
    >
      Current status: {status}
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
    <motion.div
      id="discipline"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 scroll-mt-24 text-slate-900 dark:text-slate-100"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-white/10">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Discipline History &amp; Actions
          </h3>
          <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
            Timeline of all disciplinary actions (newest first).
          </p>
        </div>
        {canManageDiscipline && displayStatus !== "Deleted" && (
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition"
          >
            {isDeactivatedOnly ? "Archive student (deletion)" : "+ Add discipline action"}
          </button>
        )}
        {canManageDiscipline && isDeactivatedOnly && (
          <p className="text-amber-800 dark:text-amber-200 text-xs max-w-xl font-medium">
            Student is deactivated. You can only record a deletion (archive) from here; other actions are blocked.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.04] p-3 transition-colors">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">Warnings</div>
          <div className="text-slate-900 dark:text-white text-xl font-bold mt-1">{summary.warnings}</div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.04] p-3 transition-colors">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">Suspensions</div>
          <div className="text-slate-900 dark:text-white text-xl font-bold mt-1">{summary.suspensions}</div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.04] p-3 transition-colors">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">Current status</div>
          <div className="mt-1">
            <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[displayStatus]}`}>
              {displayStatus}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.04] p-3 transition-colors">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">Last action</div>
          <div className="text-slate-700 dark:text-white/90 text-xs font-medium mt-1">
            {summary.lastAt ? new Date(summary.lastAt).toLocaleString() : "—"}
          </div>
        </div>
      </div>

      {studentSnapshot.suspension_open &&
        (studentSnapshot.suspension_period_start || studentSnapshot.suspension_period_end) && (
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3.5 py-2.5 text-xs text-orange-900 dark:text-orange-100 font-medium">
            Scheduled suspension period: {studentSnapshot.suspension_period_start || "—"} →{" "}
            {studentSnapshot.suspension_period_end || "—"} (status stays suspended until staff ends it)
          </div>
        )}

      {displayStatus === "Deleted" && isOwner && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-2.5">
          <p className="text-red-900 dark:text-red-100 text-sm font-semibold">This student is archived (soft deleted).</p>
          <textarea
            className="w-full rounded-lg border border-red-300 dark:border-white/15 bg-white dark:bg-white/10 text-slate-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Optional note for restore log…"
            value={restoreNotes}
            onChange={(e) => setRestoreNotes(e.target.value)}
            rows={2}
          />
          <button
            type="button"
            disabled={saving}
            onClick={submitRestore}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2 text-sm shadow-sm transition"
          >
            {saving ? "Restoring…" : "Restore student (owner only)"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 dark:text-white/60 text-sm py-8 text-center">Loading discipline records…</div>
      ) : records.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-200 dark:border-white/15 rounded-xl bg-slate-50/50 dark:bg-white/[0.02]">
          <p className="text-sm font-medium text-slate-600 dark:text-white/70">No discipline records yet.</p>
          <p className="text-xs text-slate-400 dark:text-white/40 mt-1">Disciplinary warnings, suspensions, and notes recorded by staff will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {records.map((r) => (
            <li
              key={r.record_id}
              className="rounded-xl border border-slate-200/80 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.04] p-4 text-sm transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <span className="font-semibold capitalize text-violet-700 dark:text-violet-300">
                  {r.action_type.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-slate-500 dark:text-white/50">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-2.5 whitespace-pre-wrap text-slate-800 dark:text-white/90 leading-relaxed font-normal">
                {r.notes}
              </p>
              {(r.suspension_start_date || r.suspension_end_date) && (
                <div className="mt-2 rounded-lg bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 text-xs text-orange-900 dark:text-orange-200 font-medium">
                  Period: {r.suspension_start_date || "—"} → {r.suspension_end_date || "—"}
                </div>
              )}
              <p className="text-xs text-slate-400 dark:text-white/45 mt-2.5">
                Recorded by: {r.recorded_by ? namesByUser[r.recorded_by] || "Staff" : "—"}
              </p>
            </li>
          ))}
        </ul>
      )}

      {modalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="discipline-modal-title"
            className="fixed inset-0 z-[200] flex items-end justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:items-center"
            onClick={closeModal}
          >
            <div
              className="mb-auto mt-0 w-full max-w-md max-h-[min(92vh,640px)] flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 shadow-2xl sm:mb-0 sm:mt-0 text-slate-900 dark:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 px-5 py-4">
                <h3 id="discipline-modal-title" className="text-slate-900 dark:text-white font-semibold text-base">
                  Add discipline action
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-slate-400 hover:text-slate-600 dark:text-white/70 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition disabled:opacity-50"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-white/70">Action type</label>
                  <select
                    className="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                  >
                    {isDeactivatedOnly ? (
                      <option value="deletion">Deletion (archive)</option>
                    ) : (
                      <>
                        <option value="warning">Warning</option>
                        <option value="suspension" disabled={!!studentSnapshot.suspension_open}>
                          Suspension
                        </option>
                        <option value="lift_suspension" disabled={!studentSnapshot.suspension_open}>
                          End suspension
                        </option>
                        <option value="deactivation">Deactivation</option>
                        <option value="deletion">Deletion (archive)</option>
                      </>
                    )}
                  </select>
                </div>

                {actionType === "suspension" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-white/70">Start date</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        value={suspStart}
                        onChange={(e) => setSuspStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-white/70">End date</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        value={suspEnd}
                        onChange={(e) => setSuspEnd(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-white/70">Notes (required)</label>
                  <textarea
                    className="min-h-[100px] w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Description / context…"
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-white/40">Evidence attachment: coming soon.</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 dark:border-white/10 p-4">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 dark:border-white/15 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 px-4 py-2 text-sm font-medium text-slate-700 dark:text-white transition"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
                  onClick={submitAction}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </motion.div>
  );
}
