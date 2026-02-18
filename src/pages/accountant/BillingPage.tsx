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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Invoices & Billing</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Back to Dashboard
        </button>
      </div>

      <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Fee structure (per class)</h2>
          <p className="text-xs text-gray-500 mt-0.5">Managed in Admin → Settings → Financial. Used for expected fees and billing.</p>
        </div>
        {loading ? (
          <div className="p-6 text-gray-500">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 font-medium border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Tuition amount</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {fees.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-gray-400">No fee structure. Add in Admin settings.</td>
                  </tr>
                ) : (
                  fees.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 font-medium">{r.class_name}</td>
                      <td className="px-4 py-3">{Number(r.tuition_amount).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-sm">
        <strong>Coming next:</strong> Generate student invoices, bulk billing by class, extra charges (uniform, transport, meals), discounts/waivers, and student ledger. Use Payments to record fees until then.
      </div>
    </div>
  );
}
