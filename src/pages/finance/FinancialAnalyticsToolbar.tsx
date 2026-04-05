import { Link } from "react-router-dom";
import { FileDown, FileSpreadsheet, Printer, Receipt, CreditCard, Wallet } from "lucide-react";

type Props = {
  onExportPdf: () => void;
  onExportExcel: () => void;
  onPrint: () => void;
  receiptsTo: string;
  paymentsTo: string;
  expensesTo: string;
  pdfDisabled?: boolean;
  excelDisabled?: boolean;
};

export default function FinancialAnalyticsToolbar({
  onExportPdf,
  onExportExcel,
  onPrint,
  receiptsTo,
  paymentsTo,
  expensesTo,
  pdfDisabled,
  excelDisabled,
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
          onClick={onExportExcel}
          disabled={excelDisabled}
          title={excelDisabled ? "Load analytics first" : "Download Microsoft Excel workbook (.xlsx)"}
        >
          <FileSpreadsheet className="fa-btn__ic" aria-hidden />
          Export Excel
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
