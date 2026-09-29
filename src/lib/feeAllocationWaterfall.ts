/**
 * Fee Allocation Waterfall Utility
 *
 * Implements the priority rule:
 * 1. Functional Fees (Standard Institutional Levies + Hostel / Boarding Fees)
 *    MUST be satisfied 100% first before any funds credit Base Tuition.
 * 2. Base Tuition (Instructional/Academic teaching fee) is satisfied only
 *    after Functional Fees balance reaches 0 UGX.
 */

export interface StudentFeeBreakdown {
  studentId: string;
  studentName: string;
  admissionNumber?: string | null;
  className: string;
  intakeCohort?: string | null;
  boardingType?: 'Day Scholar' | 'Boarder' | string;
  
  // Gross & Billed
  baseTuitionBilled: number;
  leviesBilled: number;
  hostelBilled: number;
  functionalBilled: number; // levies + hostel
  totalBilled: number;      // functional + baseTuition

  // Concessions / Discounts
  discountType?: 'percentage' | 'fixed' | 'full_bursary' | 'none';
  discountPercentage?: number;
  discountAmount?: number;
  discountReason?: string;
  netBilled: number;

  // Payments & Waterfall
  totalPaid: number;
  functionalPaid: number;
  baseTuitionPaid: number;

  // Balances
  functionalBalance: number;
  baseTuitionBalance: number;
  totalBalance: number;

  // Status
  isFunctionalCleared: boolean;
  isTuitionCleared: boolean;
  isFullyCleared: boolean;
  clearanceStatus: 'FUNCTIONAL_PENDING' | 'FUNCTIONAL_CLEARED_TUITION_PENDING' | 'FULLY_CLEARED';
}

export interface WaterfallAllocationResult {
  functionalBilled: number;
  baseTuitionBilled: number;
  totalBilled: number;

  totalPaid: number;
  functionalPaid: number;
  baseTuitionPaid: number;

  functionalBalance: number;
  baseTuitionBalance: number;
  totalBalance: number;

  isFunctionalCleared: boolean;
  isTuitionCleared: boolean;
  isFullyCleared: boolean;
  clearanceStatus: 'FUNCTIONAL_PENDING' | 'FUNCTIONAL_CLEARED_TUITION_PENDING' | 'FULLY_CLEARED';
}

/**
 * Computes exact waterfall allocation for a single billing and payment record.
 * 
 * @param functionalBilled Total functional fees (standard levies + boarding/hostel)
 * @param baseTuitionBilled Pure academic teaching/instructional fee
 * @param totalPaid Gross total payments credited to this student
 */
export function computeWaterfallAllocation(
  functionalBilled: number,
  baseTuitionBilled: number,
  totalPaid: number
): WaterfallAllocationResult {
  const safeFuncBilled = Math.max(0, Number(functionalBilled) || 0);
  const safeTuitionBilled = Math.max(0, Number(baseTuitionBilled) || 0);
  const safePaid = Math.max(0, Number(totalPaid) || 0);

  // 1. Functional Fees 100% priority
  const functionalPaid = Math.min(safePaid, safeFuncBilled);
  const functionalBalance = Math.max(0, safeFuncBilled - functionalPaid);

  // 2. Base Tuition from remainder
  const remainderForTuition = Math.max(0, safePaid - functionalPaid);
  const baseTuitionPaid = Math.min(remainderForTuition, safeTuitionBilled);
  const baseTuitionBalance = Math.max(0, safeTuitionBilled - baseTuitionPaid);

  const isFunctionalCleared = functionalBalance === 0;
  const isTuitionCleared = baseTuitionBalance === 0;
  const isFullyCleared = isFunctionalCleared && isTuitionCleared;

  let clearanceStatus: WaterfallAllocationResult['clearanceStatus'] = 'FUNCTIONAL_PENDING';
  if (isFullyCleared) {
    clearanceStatus = 'FULLY_CLEARED';
  } else if (isFunctionalCleared) {
    clearanceStatus = 'FUNCTIONAL_CLEARED_TUITION_PENDING';
  }

  return {
    functionalBilled: safeFuncBilled,
    baseTuitionBilled: safeTuitionBilled,
    totalBilled: safeFuncBilled + safeTuitionBilled,
    totalPaid: safePaid,
    functionalPaid,
    baseTuitionPaid,
    functionalBalance,
    baseTuitionBalance,
    totalBalance: functionalBalance + baseTuitionBalance,
    isFunctionalCleared,
    isTuitionCleared,
    isFullyCleared,
    clearanceStatus,
  };
}

/**
 * Calculates aggregate totals for a list of student fee breakdowns.
 */
export function aggregateWaterfallMetrics(items: StudentFeeBreakdown[]) {
  let totalBilled = 0;
  let totalPaid = 0;
  let totalBalance = 0;

  let functionalBilled = 0;
  let functionalPaid = 0;
  let functionalBalance = 0;

  let baseTuitionBilled = 0;
  let baseTuitionPaid = 0;
  let baseTuitionBalance = 0;

  let functionalClearedCount = 0;
  let fullyClearedCount = 0;
  let functionalPendingCount = 0;

  for (const item of items) {
    totalBilled += item.totalBilled;
    totalPaid += item.totalPaid;
    totalBalance += item.totalBalance;

    functionalBilled += item.functionalBilled;
    functionalPaid += item.functionalPaid;
    functionalBalance += item.functionalBalance;

    baseTuitionBilled += item.baseTuitionBilled;
    baseTuitionPaid += item.baseTuitionPaid;
    baseTuitionBalance += item.baseTuitionBalance;

    if (item.isFullyCleared) {
      fullyClearedCount++;
      functionalClearedCount++;
    } else if (item.isFunctionalCleared) {
      functionalClearedCount++;
    } else {
      functionalPendingCount++;
    }
  }

  const functionalCollectionRate = functionalBilled > 0 ? (functionalPaid / functionalBilled) * 100 : 0;
  const tuitionCollectionRate = baseTuitionBilled > 0 ? (baseTuitionPaid / baseTuitionBilled) * 100 : 0;
  const overallCollectionRate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;

  return {
    studentCount: items.length,
    totalBilled,
    totalPaid,
    totalBalance,
    functionalBilled,
    functionalPaid,
    functionalBalance,
    functionalCollectionRate,
    baseTuitionBilled,
    baseTuitionPaid,
    baseTuitionBalance,
    tuitionCollectionRate,
    overallCollectionRate,
    functionalClearedCount,
    fullyClearedCount,
    functionalPendingCount,
  };
}
