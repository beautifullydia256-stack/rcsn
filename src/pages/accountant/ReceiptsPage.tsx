import { useNavigate } from "react-router-dom";

export default function ReceiptsPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Receipts</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          Back to Dashboard
        </button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
        Receipt list and PDF download — use Payments to record; receipts generated automatically.
      </div>
    </div>
  );
}
