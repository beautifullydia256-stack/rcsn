import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import { fetchFeeStructure, FEE_STRUCTURE_QUERY_KEY } from "./api/feeStructure";

const STALE_MS = 2 * 60 * 1000;

export default function FeeStructurePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const { data, isLoading } = useQuery({
    queryKey: [...FEE_STRUCTURE_QUERY_KEY, schoolId],
    queryFn: () => fetchFeeStructure(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_MS,
  });
  const fees = data?.fees ?? [];
  const lockedSet = data?.lockedClasses ?? new Set<string>();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const next: Record<string, string> = {};
    fees.forEach((r) => {
      next[r.id] = String(r.tuition_amount ?? "");
    });
    setEdits(next);
  }, [fees]);

  function setEdit(id: string, value: string) {
    setEdits((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSave(id: string) {
    if (!schoolId) return;
    const row = fees.find((f) => f.id === id);
    if (!row) return;
    const locked = lockedSet.has((row.class_name || "").trim().toLowerCase());
    if (locked) {
      setMessage({ type: "err", text: "This class has issued invoices; fee cannot be changed to preserve audit trail." });
      return;
    }
    const raw = edits[id] ?? "";
    const num = Number(raw.replace(/,/g, ""));
    if (Number.isNaN(num) || num < 0) {
      setMessage({ type: "err", text: "Enter a valid amount." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from("school_fee_structure")
        .update({ tuition_amount: num, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) throw error;
      setMessage({ type: "ok", text: "Fee updated." });
      queryClient.invalidateQueries({ queryKey: ["accountant"] });
    } catch (e: unknown) {
      setMessage({ type: "err", text: (e as Error).message || "Failed to update." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ac-page-content mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="ac-text-primary text-2xl font-semibold">Fee Structure</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium">
          Back to Dashboard
        </button>
      </div>
      <p className="ac-text-secondary mb-4 text-sm">
        Define what students are charged per class. Used when generating invoices. Once invoices exist for a class, that row is locked to avoid changing history.
      </p>
      {message && (
        <p className={`mb-4 text-sm ${message.type === "ok" ? "text-emerald-500" : "text-red-400"}`}>{message.text}</p>
      )}
      <div className="ac-glass-card overflow-hidden rounded-[18px]">
        {isLoading ? (
          <div className="ac-text-muted p-8">Loading…</div>
        ) : fees.length === 0 ? (
          <div className="ac-text-muted p-8 text-center">
            No fee structure. Add classes in Admin → Settings → Classes, then configure fees in Admin → Settings → Financial.
          </div>
        ) : (
          <div className="overflow-x-auto ac-table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Tuition amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((r) => {
                  const locked = lockedSet.has((r.class_name || "").trim().toLowerCase());
                  return (
                    <tr key={r.id}>
                      <td className="ac-cell-primary px-4 py-3">{r.class_name}</td>
                      <td className="px-4 py-3">
                        {locked ? (
                          <span className="ac-text-primary">{Number(r.tuition_amount).toLocaleString()}</span>
                        ) : (
                          <input
                            type="text"
                            value={edits[r.id] ?? ""}
                            onChange={(e) => setEdit(r.id, e.target.value)}
                            placeholder="0"
                            className="ac-input w-32"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {locked ? (
                          <span className="inline-flex rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">Locked (invoices issued)</span>
                        ) : (
                          <span className="ac-text-muted text-xs">Editable</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!locked && (
                          <button
                            type="button"
                            onClick={() => handleSave(r.id)}
                            disabled={saving}
                            className="ac-glass-btn rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                          >
                            Save
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
