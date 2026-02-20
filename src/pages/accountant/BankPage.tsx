import { useNavigate } from "react-router-dom";

export default function BankPage() {
  const navigate = useNavigate();
  return (
    <div className="ac-page-content mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="ac-text-primary text-2xl font-semibold">Bank & Cash</h1>
        <button
          type="button"
          onClick={() => navigate("/dashboard/accountant")}
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium"
        >
          Back to Dashboard
        </button>
      </div>
      <div className="ac-glass-card rounded-[18px] p-8 text-center ac-text-muted">
        Multiple accounts, reconciliation, deposits/withdrawals — Phase 5.
      </div>
    </div>
  );
}
