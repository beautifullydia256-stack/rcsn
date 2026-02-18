import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";

type FeeRow = { id: string; class_name: string; tuition_amount: number };

export default function BillingPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;
    supabase
      .from("school_fee_structure")
      .select("id, class_name, tuition_amount")
      .eq("school_id", schoolId)
      .order("class_name")
      .then(({ data }) => {
        setFees((data || []) as FeeRow[]);
        setLoading(false);
      });
  }, [schoolId]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Invoices & Billing</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          Back to Dashboard
        </button>
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Fee structure (per class)</h2>
          <p className="mt-0.5 text-xs text-slate-500">Managed in Admin → Settings → Financial. Used for expected fees and billing.</p>
        </div>
        {loading ? (
          <div className="p-6 text-slate-500">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left font-medium text-slate-600">
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Tuition amount</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {fees.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-slate-400">No fee structure. Add in Admin settings.</td>
                  </tr>
                ) : (
                  fees.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{r.class_name}</td>
                      <td className="px-4 py-3">{Number(r.tuition_amount).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
        <strong>Coming next:</strong> Generate student invoices, bulk billing by class, extra charges (uniform, transport, meals), discounts/waivers, and student ledger. Use Payments to record fees until then.
      </div>
    </div>
  );
}
