import { Link } from "react-router-dom";
import { Download, Printer, Receipt, CreditCard, Wallet } from "lucide-react";

type Props = {
  onExport: () => void;
  onPrint: () => void;
  receiptsTo: string;
  paymentsTo: string;
  expensesTo: string;
  exportDisabled?: boolean;
};

export default function FinancialAnalyticsToolbar({
  onExport,
  onPrint,
  receiptsTo,
  paymentsTo,
  expensesTo,
  exportDisabled,
}: Props) {
  return (
    <div className="fa-toolbar print:hidden">
      <div className="fa-toolbar__actions">
        <button type="button" className="fa-btn fa-btn--secondary" onClick={onPrint}>
          <Printer className="fa-btn__ic" aria-hidden />
          Print
        </button>
        <button
          type="button"
          className="fa-btn fa-btn--primary"
          onClick={onExport}
          disabled={exportDisabled}
          title={exportDisabled ? "Load analytics first" : "Download CSV"}
        >
          <Download className="fa-btn__ic" aria-hidden />
          Export CSV
        </button>
      </div>
      <nav className="fa-toolbar__links" aria-label="Jump to detailed records">
        <Link to={receiptsTo} className="fa-link-chip">
          <Receipt className="fa-link-chip__ic" aria-hidden />
          Receipts
        </Link>
        <Link to={paymentsTo} className="fa-link-chip">
          <CreditCard className="fa-link-chip__ic" aria-hidden />
          Payments
        </Link>
        <Link to={expensesTo} className="fa-link-chip">
          <Wallet className="fa-link-chip__ic" aria-hidden />
          Expenses
        </Link>
      </nav>
    </div>
  );
}
