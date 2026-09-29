import { describe, it, expect } from 'vitest';
import {
  computeWaterfallAllocation,
  aggregateWaterfallMetrics,
  type StudentFeeBreakdown,
} from '../feeAllocationWaterfall';

describe('computeWaterfallAllocation', () => {
  it('allocates 100% of partial payments to functional fees when payment < functional fee', () => {
    // Functional = 1,000,000; Tuition = 1,500,000; Paid = 600,000
    const result = computeWaterfallAllocation(1000000, 1500000, 600000);

    expect(result.functionalBilled).toBe(1000000);
    expect(result.baseTuitionBilled).toBe(1500000);
    expect(result.totalBilled).toBe(2500000);

    expect(result.functionalPaid).toBe(600000);
    expect(result.functionalBalance).toBe(400000);
    expect(result.isFunctionalCleared).toBe(false);

    expect(result.baseTuitionPaid).toBe(0);
    expect(result.baseTuitionBalance).toBe(1500000);
    expect(result.isTuitionCleared).toBe(false);

    expect(result.totalPaid).toBe(600000);
    expect(result.totalBalance).toBe(1900000);
    expect(result.clearanceStatus).toBe('FUNCTIONAL_PENDING');
  });

  it('clears functional fees 100% and leaves tuition intact when payment == functional fee', () => {
    const result = computeWaterfallAllocation(1000000, 1500000, 1000000);

    expect(result.functionalPaid).toBe(1000000);
    expect(result.functionalBalance).toBe(0);
    expect(result.isFunctionalCleared).toBe(true);

    expect(result.baseTuitionPaid).toBe(0);
    expect(result.baseTuitionBalance).toBe(1500000);
    expect(result.isTuitionCleared).toBe(false);

    expect(result.clearanceStatus).toBe('FUNCTIONAL_CLEARED_TUITION_PENDING');
  });

  it('clears functional fees 100% and credits remaining funds to base tuition when payment > functional fee', () => {
    // Functional = 1,000,000; Tuition = 1,500,000; Paid = 1,500,000
    const result = computeWaterfallAllocation(1000000, 1500000, 1500000);

    expect(result.functionalPaid).toBe(1000000);
    expect(result.functionalBalance).toBe(0);
    expect(result.isFunctionalCleared).toBe(true);

    expect(result.baseTuitionPaid).toBe(500000);
    expect(result.baseTuitionBalance).toBe(1000000);
    expect(result.isTuitionCleared).toBe(false);

    expect(result.totalPaid).toBe(1500000);
    expect(result.totalBalance).toBe(1000000);
    expect(result.clearanceStatus).toBe('FUNCTIONAL_CLEARED_TUITION_PENDING');
  });

  it('marks student as fully cleared when payment covers both functional and base tuition', () => {
    const result = computeWaterfallAllocation(1000000, 1500000, 2500000);

    expect(result.functionalPaid).toBe(1000000);
    expect(result.functionalBalance).toBe(0);
    expect(result.isFunctionalCleared).toBe(true);

    expect(result.baseTuitionPaid).toBe(1500000);
    expect(result.baseTuitionBalance).toBe(0);
    expect(result.isTuitionCleared).toBe(true);
    expect(result.isFullyCleared).toBe(true);

    expect(result.totalPaid).toBe(2500000);
    expect(result.totalBalance).toBe(0);
    expect(result.clearanceStatus).toBe('FULLY_CLEARED');
  });

  it('handles zero payment correctly', () => {
    const result = computeWaterfallAllocation(800000, 1200000, 0);

    expect(result.functionalPaid).toBe(0);
    expect(result.functionalBalance).toBe(800000);
    expect(result.baseTuitionPaid).toBe(0);
    expect(result.baseTuitionBalance).toBe(1200000);
    expect(result.clearanceStatus).toBe('FUNCTIONAL_PENDING');
  });
});

describe('aggregateWaterfallMetrics', () => {
  it('correctly aggregates student cohort metrics', () => {
    const sampleStudents: StudentFeeBreakdown[] = [
      {
        studentId: 's1',
        studentName: 'Alice Nakato',
        className: 'Diploma Nursing Y1S1',
        baseTuitionBilled: 1500000,
        leviesBilled: 600000,
        hostelBilled: 400000,
        functionalBilled: 1000000,
        totalBilled: 2500000,
        netBilled: 2500000,
        totalPaid: 2500000,
        functionalPaid: 1000000,
        baseTuitionPaid: 1500000,
        functionalBalance: 0,
        baseTuitionBalance: 0,
        totalBalance: 0,
        isFunctionalCleared: true,
        isTuitionCleared: true,
        isFullyCleared: true,
        clearanceStatus: 'FULLY_CLEARED',
      },
      {
        studentId: 's2',
        studentName: 'Bob Okello',
        className: 'Diploma Nursing Y1S1',
        baseTuitionBilled: 1500000,
        leviesBilled: 600000,
        hostelBilled: 400000,
        functionalBilled: 1000000,
        totalBilled: 2500000,
        netBilled: 2500000,
        totalPaid: 1200000,
        functionalPaid: 1000000,
        baseTuitionPaid: 200000,
        functionalBalance: 0,
        baseTuitionBalance: 1300000,
        totalBalance: 1300000,
        isFunctionalCleared: true,
        isTuitionCleared: false,
        isFullyCleared: false,
        clearanceStatus: 'FUNCTIONAL_CLEARED_TUITION_PENDING',
      },
      {
        studentId: 's3',
        studentName: 'Charlie Mukasa',
        className: 'Diploma Nursing Y1S1',
        baseTuitionBilled: 1500000,
        leviesBilled: 600000,
        hostelBilled: 400000,
        functionalBilled: 1000000,
        totalBilled: 2500000,
        netBilled: 2500000,
        totalPaid: 500000,
        functionalPaid: 500000,
        baseTuitionPaid: 0,
        functionalBalance: 500000,
        baseTuitionBalance: 1500000,
        totalBalance: 2000000,
        isFunctionalCleared: false,
        isTuitionCleared: false,
        isFullyCleared: false,
        clearanceStatus: 'FUNCTIONAL_PENDING',
      },
    ];

    const agg = aggregateWaterfallMetrics(sampleStudents);

    expect(agg.studentCount).toBe(3);
    expect(agg.totalBilled).toBe(7500000);
    expect(agg.totalPaid).toBe(4200000);
    expect(agg.totalBalance).toBe(3300000);

    expect(agg.functionalBilled).toBe(3000000);
    expect(agg.functionalPaid).toBe(2500000);
    expect(agg.functionalBalance).toBe(500000);
    expect(Math.round(agg.functionalCollectionRate)).toBe(83); // 2.5m / 3m = 83.3%

    expect(agg.baseTuitionBilled).toBe(4500000);
    expect(agg.baseTuitionPaid).toBe(1700000);
    expect(agg.baseTuitionBalance).toBe(2800000);

    expect(agg.fullyClearedCount).toBe(1);
    expect(agg.functionalClearedCount).toBe(2);
    expect(agg.functionalPendingCount).toBe(1);
  });
});
