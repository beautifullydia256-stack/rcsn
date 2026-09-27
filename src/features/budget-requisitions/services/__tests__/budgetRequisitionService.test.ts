import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchBudgetRequisitions,
  createBudgetRequisition,
  queryRequisitionItem,
  replyToRequisitionQuery,
  reviewTier1Requisition,
  reviewTier2Requisition,
  fetchMonthlyConsolidatedBudget,
  signAndApproveConsolidatedBudget,
} from '../budgetRequisitionService';

describe('Budget Requisition Chain of Custody & Quorum Approval Tests', () => {
  const testSchoolId = 'test-school-oxford-001';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should create a budget requisition with calculated line item totals and Stage 1 pending status', async () => {
    const req = await createBudgetRequisition({
      school_id: testSchoolId,
      department_id: 'dept-skills-lab-01',
      budget_month: '2026-10-01',
      created_by: 'tutor-namutebi',
      creator_name: 'Sr. Florence Namutebi',
      creator_role: 'Skills Lab Lead',
      items: [
        {
          item_name: 'Cannula Sets 22G',
          category: 'Medical Consumables',
          unit_of_measure: 'boxes',
          quantity_requested: 20,
          estimated_unit_cost: 50000,
          justification: 'Semester practical OSCE assessments',
        },
        {
          item_name: 'Disinfectant Spirit 5L',
          category: 'Consumables',
          unit_of_measure: 'jerrycans_20l',
          quantity_requested: 5,
          estimated_unit_cost: 120000,
          justification: 'Room sanitation',
        },
      ],
    });

    expect(req).toBeDefined();
    // 20 * 50,000 + 5 * 120,000 = 1,000,000 + 600,000 = 1,600,000
    expect(req.total_amount).toBe(1600000);
    expect(req.status).toBe('pending_accounts_tier1');
    expect(req.items?.length).toBe(2);
    expect(req.requisition_number).toMatch(/^REQ-2026-\d{2}-/);
  });

  it('should support the Query & Return loop between Approver and Initiator with item revision', async () => {
    // 1. Create requisition
    const req = await createBudgetRequisition({
      school_id: testSchoolId,
      department_id: 'dept-ict-02',
      budget_month: '2026-10-01',
      created_by: 'ict-lead',
      creator_name: 'Eng. Brian Mugisha',
      creator_role: 'ICT Officer',
      items: [
        {
          item_name: 'LaserJet Toner',
          category: 'Stationery',
          unit_of_measure: 'pieces',
          quantity_requested: 10,
          estimated_unit_cost: 200000,
        },
      ],
    });

    const itemId = req.items![0].id;

    // 2. Accounts Tier 1 queries the item and sends back to initiator
    const queriedReq = await queryRequisitionItem(
      testSchoolId,
      req.id,
      itemId,
      {
        id: 'acct-reviewer-id',
        name: 'Nalubega Prossy',
        role: 'Accounts Tier 1 Officer',
        stage: 'tier1',
      },
      'Quantity of 10 cartridges exceeds monthly run-rate. Kindly reduce to 5.'
    );

    expect(queriedReq.status).toBe('queried_accounts_tier1');
    expect(queriedReq.items![0].query_thread.length).toBe(1);
    expect(queriedReq.items![0].query_thread[0].message).toContain('reduce to 5');

    // 3. Initiator replies with adjusted quantity (from 10 to 5)
    const revisedReq = await replyToRequisitionQuery(
      testSchoolId,
      req.id,
      itemId,
      {
        id: 'ict-lead',
        name: 'Eng. Brian Mugisha',
      },
      'Adjusted quantity to 5 cartridges as requested.',
      5, // new quantity
      200000
    );

    expect(revisedReq.status).toBe('pending_accounts_tier1');
    // Total should now be 5 * 200,000 = 1,000,000
    expect(revisedReq.total_amount).toBe(1000000);
    expect(revisedReq.items![0].quantity_requested).toBe(5);
    expect(revisedReq.items![0].query_thread.length).toBe(2);
  });

  it('should advance through Tier 1 and Tier 2 reviews into the Proposed Monthly Budget', async () => {
    const req = await createBudgetRequisition({
      school_id: testSchoolId,
      department_id: 'dept-lab',
      budget_month: '2026-10-01',
      created_by: 'lead',
      items: [
        {
          item_name: 'Test Tubes',
          category: 'General',
          unit_of_measure: 'boxes',
          quantity_requested: 10,
          estimated_unit_cost: 30000,
        },
      ],
    });

    // Stage 1 Verification
    const stage1Approved = await reviewTier1Requisition(
      testSchoolId,
      req.id,
      'officer-1',
      'Officer Nalubega',
      'Prices verified',
      true
    );
    expect(stage1Approved.status).toBe('pending_accounts_tier2');

    // Stage 2 Bursar Endorsement
    const stage2Approved = await reviewTier2Requisition(
      testSchoolId,
      req.id,
      'bursar-1',
      'Mr. Kato Denis (Chief Bursar)',
      'Endorsed for monthly board quorum',
      true
    );
    expect(stage2Approved.status).toBe('accepted_into_proposed_budget');

    // Check inclusion into Proposed Consolidated Monthly Budget
    const monthlyBudget = await fetchMonthlyConsolidatedBudget(testSchoolId, '2026-10-01');
    expect(monthlyBudget.requisitions?.some((r) => r.id === req.id)).toBe(true);
    expect(monthlyBudget.total_budget_requested).toBeGreaterThanOrEqual(300000);
  });

  it('should require a 3-of-N multi-admin quorum before activating the consolidated budget', async () => {
    const budgetMonth = '2026-10-01';
    const initialBudget = await fetchMonthlyConsolidatedBudget(testSchoolId, budgetMonth);
    expect(initialBudget.status).toBe('proposed');
    expect(initialBudget.required_admin_approvals).toBe(3);
    expect(initialBudget.current_approval_count).toBe(0);

    // Admin 1 Signs (e.g. Principal)
    const res1 = await signAndApproveConsolidatedBudget(
      testSchoolId,
      initialBudget.id,
      {
        id: 'admin-principal-id',
        name: 'Dr. Mukasa (Principal)',
        title: 'Principal / Academic Registrar',
      },
      'Approved for semester opening'
    );
    expect(res1.newlyConfirmed).toBe(false);
    expect(res1.budget.current_approval_count).toBe(1);
    expect(res1.budget.status).toBe('under_review');

    // Admin 2 Signs (e.g. Managing Director)
    const res2 = await signAndApproveConsolidatedBudget(
      testSchoolId,
      initialBudget.id,
      {
        id: 'admin-director-id',
        name: 'Mrs. Namubiru (Managing Director)',
        title: 'Director of Finance & Administration',
      },
      'Funds available from tuition fee collections'
    );
    expect(res2.newlyConfirmed).toBe(false);
    expect(res2.budget.current_approval_count).toBe(2);

    // Admin 3 Signs (e.g. Board Chair) - Reaching Quorum!
    const res3 = await signAndApproveConsolidatedBudget(
      testSchoolId,
      initialBudget.id,
      {
        id: 'admin-boardchair-id',
        name: 'Bishop Ssebunya (Board Chairman)',
        title: 'Chairman, Board of Governors',
      },
      'Confirmed by Board Executive Committee'
    );

    // Should now be officially confirmed and locked!
    expect(res3.newlyConfirmed).toBe(true);
    expect(res3.budget.current_approval_count).toBe(3);
    expect(res3.budget.status).toBe('confirmed');
    expect(res3.budget.confirmed_at).toBeDefined();

    // Verify digital signature hashes are recorded
    expect(res3.budget.approvals?.length).toBe(3);
    expect(res3.budget.approvals![0].digital_signature_hash).toMatch(/^SIG-/);
  });
});
