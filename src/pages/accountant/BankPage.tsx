import { useNavigate } from "react-router-dom";

export default function BankPage() {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Bank & Cash</h1>
        <button
          type="button"
          onClick={() => navigate("/dashboard/accountant")}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Dashboard
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center text-gray-500">
        Multiple accounts, reconciliation, deposits/withdrawals — Phase 5.
      </div>
    </div>
  );
}
