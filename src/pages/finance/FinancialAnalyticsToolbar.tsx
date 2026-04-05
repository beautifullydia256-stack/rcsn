import { Link } from "react-router-dom";
import { Download, FileDown, Printer, Receipt, CreditCard, Wallet } from "lucide-react";

type Props = {
  onExportPdf: () => void;
  onExportCsv: () => void;
  onPrint: () => void;
  receiptsTo: string;
  paymentsTo: string;
  expensesTo: string;
  pdfDisabled?: boolean;
  csvDisabled?: boolean;
};

export default function FinancialAnalyticsToolbar({
  onExportPdf,
  onExportCsv,
  onPrint,
  receiptsTo,
  paymentsTo,
  expensesTo,
  pdfDisabled,
  csvDisabled,
}: Props) {
  return (
    <div className="fa-toolbar print:hidden">
      <div className="fa-toolbar__actions">
        <button
          type="button"
          className="fa-btn fa-btn--primary"
          onClick={onExportPdf}
          disabled={pdfDisabled}
          title={pdfDisabled ? "Load analytics first" : "Download a formatted PDF report"}
        >
          <FileDown className="fa-btn__ic" aria-hidden />
          Download PDF
        </button>
        <button
          type="button"
          className="fa-btn fa-btn--secondary"
          onClick={onExportCsv}
          disabled={csvDisabled}
          title={csvDisabled ? "Load analytics first" : "Download spreadsheet (CSV)"}
        >
          <Download className="fa-btn__ic" aria-hidden />
          Export CSV
        </button>
        <button
          type="button"
          className="fa-btn fa-btn--secondary"
          onClick={onPrint}
          title="Print this page (use your browser’s print dialog)"
        >
          <Printer className="fa-btn__ic" aria-hidden />
          Print
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
