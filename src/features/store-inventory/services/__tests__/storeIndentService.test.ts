import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createDailyStoreIndent,
  fetchDailyStoreIndents,
  confirmIndentDispatch,
} from '../storeIndentService';

describe('Daily Store Indent & Headcount Requisition Tests', () => {
  const testSchoolId = 'test-school-oxford-001';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should create a daily store indent with fluctuating headcount and requested items', async () => {
    const indent = await createDailyStoreIndent(testSchoolId, {
      requestedForDate: '2026-10-02',
      targetHeadcount: 420,
      requestedBy: 'user-chef-kigozi',
      requesterName: 'Head Chef Kigozi',
      notes: 'Breakfast & lunch for on-campus nursing students (excluding 60 interns at hospital)',
      items: [
        {
          storeItemId: 'item-posho-50kg',
          itemName: 'Super Fine Posho',
          quantityRequested: 40,
          unitOfMeasure: 'kg',
        },
        {
          storeItemId: 'item-beans-50kg',
          itemName: 'Nambale Beans',
          quantityRequested: 25,
          unitOfMeasure: 'kg',
        },
      ],
    });

    expect(indent).toBeDefined();
    expect(indent.target_headcount).toBe(420);
    expect(indent.status).toBe('pending');
    expect(indent.requisition_number).toMatch(/^IND-20261002-/);
    expect(indent.items.length).toBe(2);
    expect(indent.items[0].quantity_requested).toBe(40);
    expect(indent.items[0].quantity_issued).toBe(0);

    const indents = await fetchDailyStoreIndents(testSchoolId);
    expect(indents.some((i) => i.id === indent.id)).toBe(true);
  });

  it('should confirm physical stock dispatch and record issued quantities', async () => {
    const indent = await createDailyStoreIndent(testSchoolId, {
      requestedForDate: '2026-10-02',
      targetHeadcount: 400,
      requestedBy: 'user-chef-kigozi',
      requesterName: 'Head Chef Kigozi',
      items: [
        {
          storeItemId: 'item-salt',
          itemName: 'Table Salt',
          quantityRequested: 5,
          unitOfMeasure: 'kg',
        },
      ],
    });

    const dispatched = await confirmIndentDispatch(
      testSchoolId,
      indent.id,
      'storekeeper-user-id',
      'Mr. Mukasa (Storekeeper)',
      {
        'item-salt': 5,
      }
    );

    expect(dispatched.status).toBe('issued');
    expect(dispatched.issued_by).toBe('storekeeper-user-id');
    expect(dispatched.issuer_name).toBe('Mr. Mukasa (Storekeeper)');
    expect(dispatched.items[0].quantity_issued).toBe(5);
    expect(dispatched.items[0].status).toBe('issued');
  });
});
