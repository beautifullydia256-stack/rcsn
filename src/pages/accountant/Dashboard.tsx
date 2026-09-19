import { useOutletContext } from "react-router-dom";
import PosFinanceDashboard from "../../components/finance/PosFinanceDashboard";

export default function AccountantDashboard() {
  const outletCtx =
    useOutletContext<{
      openRecordPayment?: (studentId?: string) => void;
      openRecordExpense?: () => void;
    }>() || {};

  return (
    <PosFinanceDashboard
      onOpenRecordPayment={outletCtx.openRecordPayment}
      onOpenRecordExpense={outletCtx.openRecordExpense}
    />
  );
}
