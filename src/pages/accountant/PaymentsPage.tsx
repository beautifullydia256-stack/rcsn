import { useEffect } from "react";
import { useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import { Banknote, Receipt } from "lucide-react";

type OutletContext = { openRecordPayment: (initialStudentId?: string) => void };

export default function PaymentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openRecordPayment } = useOutletContext() as OutletContext;
  const studentIdFromUrl = searchParams.get("student") ?? undefined;

  useEffect(() => {
    if (studentIdFromUrl) openRecordPayment(studentIdFromUrl);
  }, [studentIdFromUrl, openRecordPayment]);

  return (
    <div className="ac-page-content mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="ac-text-primary text-2xl font-semibold">Payments</h1>
        <button type="button" onClick={() => navigate("/dashboard/accountant")} className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium">
          Back to Dashboard
        </button>
      </div>
      <p className="ac-text-secondary mb-6 text-sm">
        Record money received from students. Allocate to unpaid invoices; a receipt is generated automatically. Use Outstanding Fees to follow up on balances.
      </p>

      <div className="ac-glass-card rounded-[18px] overflow-hidden border-2 border-dashed border-emerald-500/30 bg-emerald-500/5">
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 mb-4">
            <Banknote className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="ac-text-primary text-lg font-semibold mb-2">Record a payment</h2>
          <p className="ac-text-secondary text-sm max-w-md mb-6">
            Search for a student, see unpaid invoices, enter the amount and payment method (Cash, Bank, or Mobile Money). Payment is allocated to the oldest term first and a receipt is generated for printing.
          </p>
          <button
            type="button"
            onClick={() => openRecordPayment()}
            className="ac-glass-btn rounded-xl px-6 py-3 text-sm font-medium inline-flex items-center gap-2"
          >
            <Receipt className="h-5 w-5" />
            Record payment
          </button>
        </div>
      </div>

      <div className="mt-6 ac-glass-card rounded-[18px] p-4">
        <h3 className="ac-text-primary text-sm font-semibold mb-2">Quick links</h3>
        <ul className="ac-text-secondary text-sm space-y-1">
          <li>
            <button type="button" onClick={() => navigate("/dashboard/accountant/outstanding")} className="text-emerald-500 hover:underline">
              View Outstanding Fees
            </button>
            {" "}— follow up on who owes
          </li>
          <li>
            <button type="button" onClick={() => navigate("/dashboard/accountant/receipts")} className="text-emerald-500 hover:underline">
              View Receipts
            </button>
            {" "}— reprint or verify past payments
          </li>
        </ul>
      </div>
    </div>
  );
}
