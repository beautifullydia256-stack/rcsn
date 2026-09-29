import { supabase } from "../../../lib/supabase";
import { formatAcademicPeriod, isTertiarySchool } from "../../../lib/academicPeriodTerminology";
import {
  computeWaterfallAllocation,
  type StudentFeeBreakdown,
  type WaterfallAllocationResult,
} from "../../../lib/feeAllocationWaterfall";

export const FUNCTIONAL_TRACKING_QUERY_KEY = ["accountant", "functional-tracking"] as const;

export interface FunctionalTrackingData {
  students: StudentFeeBreakdown[];
  termOptions: { id: string; label: string; isCurrent: boolean }[];
  classOptions: string[];
  isTertiary: boolean;
}

export async function fetchFunctionalTrackingData(schoolId: string): Promise<FunctionalTrackingData> {
  // First attempt: Server-side Database View (PostgreSQL View)
  try {
    const { data: viewData, error: viewErr } = await supabase
      .from("view_student_fee_waterfall")
      .select("*")
      .eq("school_id", schoolId);

    if (!viewErr && Array.isArray(viewData) && viewData.length > 0) {
      const termOptions = Array.from(
        new Map(
          viewData.map((r: any) => [
            r.term_id,
            { id: r.term_id, label: `Term ${r.term} (${r.year})`, isCurrent: false },
          ])
        ).values()
      );
      const classOptions = Array.from(new Set(viewData.map((r: any) => r.current_class).filter(Boolean))).sort() as string[];

      const students: StudentFeeBreakdown[] = viewData.map((r: any) => ({
        studentId: r.student_id,
        studentName: r.student_name,
        admissionNumber: r.admission_number || "—",
        className: r.current_class || "—",
        boardingType: r.boarding_type || "Day Scholar",
        baseTuitionBilled: Number(r.base_tuition_billed || 0),
        leviesBilled: Math.round(Number(r.functional_fees_billed || 0) * 0.6),
        hostelBilled: Math.round(Number(r.functional_fees_billed || 0) * 0.4),
        functionalBilled: Number(r.functional_fees_billed || 0),
        totalBilled: Number(r.total_fees || 0),
        netBilled: Number(r.total_fees || 0),
        totalPaid: Number(r.total_paid || 0),
        functionalPaid: Number(r.functional_fees_paid || 0),
        baseTuitionPaid: Number(r.base_tuition_paid || 0),
        functionalBalance: Number(r.functional_fees_balance || 0),
        baseTuitionBalance: Number(r.base_tuition_balance || 0),
        totalBalance: Number(r.total_balance || 0),
        isFunctionalCleared: Boolean(r.is_functional_cleared),
        isTuitionCleared: Number(r.base_tuition_balance || 0) === 0,
        isFullyCleared: Boolean(r.is_fully_cleared),
        clearanceStatus: r.clearance_status || "FUNCTIONAL_PENDING",
      }));

      return {
        students: students.sort((a, b) => a.studentName.localeCompare(b.studentName)),
        termOptions,
        classOptions,
        isTertiary: true,
      };
    }
  } catch {
    // Graceful fallback to client-side multi-table query
  }

  const [termsRes, feeRes, studentsRes, balancesRes, invoicesRes, schoolRes] = await Promise.all([
    supabase
      .from("school_terms")
      .select("id, term, year, is_current")
      .eq("school_id", schoolId)
      .order("year", { ascending: false })
      .order("term", { ascending: false }),
    supabase
      .from("school_fee_structure")
      .select("class_name, tuition_amount, boarding_tuition_amount")
      .eq("school_id", schoolId),
    supabase
      .from("students")
      .select("student_id, name, admission_number, current_class, boarding_type")
      .eq("school_id", schoolId)
      .is("deleted_at", null),
    supabase
      .from("student_balances")
      .select("student_id, term_id, total_fees, total_paid, balance")
      .eq("school_id", schoolId),
    supabase
      .from("student_invoices")
      .select("student_id, term_id, total_amount, bursary_discount, invoice_label")
      .eq("school_id", schoolId)
      .neq("status", "cancelled"),
    supabase
      .from("schools")
      .select("type")
      .eq("school_id", schoolId)
      .maybeSingle(),
  ]);

  const isTertiary = isTertiarySchool((schoolRes.data as { type?: string } | null)?.type);

  // Term options
  const termOptions = (termsRes.data || []).map((t: any) => ({
    id: t.id,
    label: formatAcademicPeriod(t.term, isTertiary, { year: t.year }),
    isCurrent: Boolean(t.is_current),
  }));

  const activeTerm = termOptions.find((t) => t.isCurrent) || termOptions[0];
  const activeTermId = activeTerm?.id;

  // Fee structure map
  const feeMap = new Map<string, { dayTuition: number; boardingTuition: number }>();
  (feeRes.data || []).forEach((f: any) => {
    const cName = (f.class_name || "").trim().toLowerCase();
    feeMap.set(cName, {
      dayTuition: Number(f.tuition_amount || 0),
      boardingTuition: Number(f.boarding_tuition_amount || f.tuition_amount || 0),
    });
  });

  // Balance map for current term
  const balanceMap = new Map<string, { total_paid: number; total_fees: number; balance: number }>();
  (balancesRes.data || []).forEach((b: any) => {
    if (activeTermId && b.term_id === activeTermId) {
      balanceMap.set(b.student_id, {
        total_paid: Number(b.total_paid || 0),
        total_fees: Number(b.total_fees || 0),
        balance: Number(b.balance || 0),
      });
    }
  });

  // Invoices map for current term
  const invoiceMap = new Map<string, { total_amount: number; bursary_discount: number }>();
  (invoicesRes.data || []).forEach((inv: any) => {
    if (activeTermId && inv.term_id === activeTermId) {
      invoiceMap.set(inv.student_id, {
        total_amount: Number(inv.total_amount || 0),
        bursary_discount: Number(inv.bursary_discount || 0),
      });
    }
  });

  const classSet = new Set<string>();
  const students: StudentFeeBreakdown[] = [];

  (studentsRes.data || []).forEach((st: any) => {
    const className = st.current_class || "—";
    if (className !== "—") classSet.add(className);

    const feeInfo = feeMap.get(className.trim().toLowerCase());
    const isBoarding = String(st.boarding_type || "").toLowerCase().includes("board");

    // Standard fee breakdown
    // In standard structure: tuition_amount = day total (base + levies), boarding_tuition = day + hostel
    // For standard allocation:
    // Functional fees = hostel (boarding difference) + levies portion (approx 35% of day tariff or flat levies)
    // Base tuition = pure teaching fee (approx 65% of day tariff)
    const dayTotal = feeInfo?.dayTuition || 0;
    const boardingTotal = feeInfo?.boardingTuition || dayTotal;
    const hostelFee = isBoarding ? Math.max(0, boardingTotal - dayTotal) : 0;

    // Levies portion (functional) vs Base Tuition:
    // Base tuition is typically ~60% of day fee, functional levies ~40%
    const leviesFee = Math.round(dayTotal * 0.4);
    const baseTuitionFee = Math.max(0, dayTotal - leviesFee);
    const functionalBilled = leviesFee + hostelFee;

    const bal = balanceMap.get(st.student_id);
    const inv = invoiceMap.get(st.student_id);

    const billedTotal = inv ? inv.total_amount : (isBoarding ? boardingTotal : dayTotal);
    const totalPaid = bal ? bal.total_paid : 0;

    // Run waterfall allocation
    const waterfall: WaterfallAllocationResult = computeWaterfallAllocation(
      functionalBilled,
      baseTuitionFee,
      totalPaid
    );

    students.push({
      studentId: st.student_id,
      studentName: st.name,
      admissionNumber: st.admission_number || "—",
      className,
      boardingType: isBoarding ? "Boarder" : "Day Scholar",
      baseTuitionBilled: baseTuitionFee,
      leviesBilled: leviesFee,
      hostelBilled: hostelFee,
      functionalBilled,
      totalBilled: functionalBilled + baseTuitionFee,
      netBilled: billedTotal,
      totalPaid: waterfall.totalPaid,
      functionalPaid: waterfall.functionalPaid,
      baseTuitionPaid: waterfall.baseTuitionPaid,
      functionalBalance: waterfall.functionalBalance,
      baseTuitionBalance: waterfall.baseTuitionBalance,
      totalBalance: waterfall.totalBalance,
      isFunctionalCleared: waterfall.isFunctionalCleared,
      isTuitionCleared: waterfall.isTuitionCleared,
      isFullyCleared: waterfall.isFullyCleared,
      clearanceStatus: waterfall.clearanceStatus,
    });
  });

  return {
    students: students.sort((a, b) => a.studentName.localeCompare(b.studentName)),
    termOptions,
    classOptions: Array.from(classSet).sort(),
    isTertiary,
  };
}
