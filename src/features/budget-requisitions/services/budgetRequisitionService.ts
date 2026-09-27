import { supabase } from '@/lib/supabase';
import type {
  BudgetRequisition,
  BudgetRequisitionItem,
  CreateRequisitionInput,
  MonthlyConsolidatedBudget,
  BudgetAdminApproval,
  QueryThreadEntry,
} from '../types';
import { fetchSchoolDepartments } from '@/features/departments/services/departmentService';

const LOCAL_STORAGE_REQS_KEY = 'pwezacore_budget_requisitions';
const LOCAL_STORAGE_CONSOLIDATED_KEY = 'pwezacore_consolidated_budgets';
const LOCAL_STORAGE_APPROVALS_KEY = 'pwezacore_budget_approvals';

function getLocalRequisitions(schoolId: string): BudgetRequisition[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_REQS_KEY}_${schoolId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRequisitions(schoolId: string, reqs: BudgetRequisition[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_REQS_KEY}_${schoolId}`, JSON.stringify(reqs));
  } catch (err) {
    console.error('Failed to save budget requisitions to localStorage', err);
  }
}

function getLocalConsolidatedBudgets(schoolId: string): MonthlyConsolidatedBudget[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_CONSOLIDATED_KEY}_${schoolId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalConsolidatedBudgets(schoolId: string, budgets: MonthlyConsolidatedBudget[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_CONSOLIDATED_KEY}_${schoolId}`, JSON.stringify(budgets));
  } catch (err) {
    console.error('Failed to save consolidated budgets to localStorage', err);
  }
}

function getLocalApprovals(schoolId: string): BudgetAdminApproval[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_APPROVALS_KEY}_${schoolId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalApprovals(schoolId: string, approvals: BudgetAdminApproval[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_APPROVALS_KEY}_${schoolId}`, JSON.stringify(approvals));
  } catch (err) {
    console.error('Failed to save approvals to localStorage', err);
  }
}

/**
 * Starter mock requisitions for Oxford School of Nursing & Midwifery if none exist
 */
function generateStarterRequisitions(schoolId: string, deptMap: Map<string, any>): BudgetRequisition[] {
  const depts = Array.from(deptMap.values());
  const kitchenDept = depts.find((d) => d.code === 'DEPT_KITCHEN_STORES') || depts[0];
  const skillsDept = depts.find((d) => d.code === 'DEPT_SKILLS_LAB') || depts[1] || depts[0];
  const ictDept = depts.find((d) => d.code === 'DEPT_ICT_LAB') || depts[2] || depts[0];

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const starters: BudgetRequisition[] = [
    {
      id: 'req-kitchen-oct-001',
      school_id: schoolId,
      department_id: kitchenDept?.id || 'dept-kitchen',
      department: kitchenDept,
      requisition_number: `REQ-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-STR-001`,
      budget_month: currentMonthStr,
      is_supplementary: false,
      total_amount: 8850000,
      status: 'pending_accounts_tier1',
      created_by: 'cook-user-id',
      creator_name: 'Head Chef Kigozi',
      creator_role: 'Catering In-Charge',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      items: [
        {
          id: 'item-str-1',
          requisition_id: 'req-kitchen-oct-001',
          item_name: 'Posho Super Fine (50kg Bags)',
          category: 'Food & Provisions',
          unit_of_measure: 'bags_50kg',
          quantity_requested: 35,
          estimated_unit_cost: 135000,
          total_estimated_cost: 4725000,
          justification: 'Monthly staple for 420 resident nursing students and interns.',
          supplier_quote_ref: 'QT-AGRO-2026-99',
          is_accepted: true,
          query_thread: [],
        },
        {
          id: 'item-str-2',
          requisition_id: 'req-kitchen-oct-001',
          item_name: 'Beans (Nambale / Yellow, 50kg Bags)',
          category: 'Food & Provisions',
          unit_of_measure: 'bags_50kg',
          quantity_requested: 20,
          estimated_unit_cost: 165000,
          total_estimated_cost: 3300000,
          justification: 'Protein nutrition requirement for student boarding lunch & supper.',
          supplier_quote_ref: 'QT-AGRO-2026-101',
          is_accepted: true,
          query_thread: [],
        },
        {
          id: 'item-str-3',
          requisition_id: 'req-kitchen-oct-001',
          item_name: 'Cooking Salt & Seasonings',
          category: 'Food & Provisions',
          unit_of_measure: 'boxes',
          quantity_requested: 10,
          estimated_unit_cost: 82500,
          total_estimated_cost: 825000,
          justification: 'Kitchen culinary stock for next 30 days.',
          is_accepted: true,
          query_thread: [],
        },
      ],
    },
    {
      id: 'req-skills-oct-002',
      school_id: schoolId,
      department_id: skillsDept?.id || 'dept-skills',
      department: skillsDept,
      requisition_number: `REQ-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-LAB-002`,
      budget_month: currentMonthStr,
      is_supplementary: false,
      total_amount: 5420000,
      status: 'pending_accounts_tier2',
      created_by: 'tutor-lab-id',
      creator_name: 'Sr. Nabawanuka Grace',
      creator_role: 'Skills Lab Instructor & Tutor',
      tier1_reviewed_by: 'acct-tier1-id',
      tier1_reviewer_name: 'Nalubega Prossy (Accounts Tier 1)',
      tier1_reviewed_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      tier1_notes: 'Market rates verified against Kampala surgical supplier quotes. Passed for Bursar endorsement.',
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      items: [
        {
          id: 'item-lab-1',
          requisition_id: 'req-skills-oct-002',
          item_name: 'Sterile Surgical Gloves & Cannulas 20G/22G',
          category: 'Medical Consumables',
          unit_of_measure: 'boxes',
          quantity_requested: 40,
          estimated_unit_cost: 45000,
          total_estimated_cost: 1800000,
          justification: 'Practical cannulation clinical assessments for Diploma Year 2 nurses.',
          supplier_quote_ref: 'QT-MED-8812',
          is_accepted: true,
          query_thread: [],
        },
        {
          id: 'item-lab-2',
          requisition_id: 'req-skills-oct-002',
          item_name: 'Anatomical Model Replacement Vein Tubing',
          category: 'Capital Equipment',
          unit_of_measure: 'sets',
          quantity_requested: 8,
          estimated_unit_cost: 290000,
          total_estimated_cost: 2320000,
          justification: 'Worn simulation arms in Room 3 requiring new vascular latex tubes.',
          supplier_quote_ref: 'QT-MED-8815',
          is_accepted: true,
          query_thread: [],
        },
        {
          id: 'item-lab-3',
          requisition_id: 'req-skills-oct-002',
          item_name: 'Disinfectant Jik & Methylated Spirit 5L',
          category: 'Consumables',
          unit_of_measure: 'jerrycans_20l',
          quantity_requested: 10,
          estimated_unit_cost: 130000,
          total_estimated_cost: 1300000,
          justification: 'Laboratory sanitation between clinical rotation shifts.',
          is_accepted: true,
          query_thread: [],
        },
      ],
    },
    {
      id: 'req-ict-oct-003',
      school_id: schoolId,
      department_id: ictDept?.id || 'dept-ict',
      department: ictDept,
      requisition_number: `REQ-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-ICT-003`,
      budget_month: currentMonthStr,
      is_supplementary: false,
      total_amount: 3200000,
      status: 'accepted_into_proposed_budget',
      created_by: 'ict-lead-id',
      creator_name: 'Eng. Mugisha Brian',
      creator_role: 'ICT Officer',
      tier1_reviewed_by: 'acct-tier1-id',
      tier1_reviewer_name: 'Nalubega Prossy (Accounts Tier 1)',
      tier1_reviewed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      tier2_reviewed_by: 'bursar-id',
      tier2_reviewer_name: 'Mr. Kato Denis (Chief Bursar)',
      tier2_reviewed_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      tier2_notes: 'Endorsed for monthly board quorum approval.',
      admin_accepted_by: 'principal-id',
      admin_accepted_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'item-ict-1',
          requisition_id: 'req-ict-oct-003',
          item_name: 'High-Yield HP LaserJet Toner 85A (Black)',
          category: 'Stationery & Printing',
          unit_of_measure: 'pieces',
          quantity_requested: 6,
          estimated_unit_cost: 180000,
          total_estimated_cost: 1080000,
          justification: 'Printing continuous assessment exam papers and UNMEB mock test booklets.',
          is_accepted: true,
          query_thread: [],
        },
        {
          id: 'item-ict-2',
          requisition_id: 'req-ict-oct-003',
          item_name: 'Campus Fiber Dedicated Bandwidth (1 Month)',
          category: 'Utility & Services',
          unit_of_measure: 'month',
          quantity_requested: 1,
          estimated_unit_cost: 2120000,
          total_estimated_cost: 2120000,
          justification: 'Student e-library research and UNMEB online registration portal access.',
          is_accepted: true,
          query_thread: [],
        },
      ],
    },
  ];

  return starters;
}

/**
 * Fetches all budget requisitions for a school, optionally filtered by department.
 */
export async function fetchBudgetRequisitions(
  schoolId: string,
  departmentId?: string
): Promise<BudgetRequisition[]> {
  const departments = await fetchSchoolDepartments(schoolId);
  const deptMap = new Map(departments.map((d) => [d.id, d]));

  try {
    let query = supabase
      .from('budget_requisitions')
      .select('*, items:budget_requisition_items(*)')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const enriched = data.map((r: any) => ({
        ...r,
        department: deptMap.get(r.department_id) || r.department,
      }));
      saveLocalRequisitions(schoolId, enriched);
      return enriched;
    }
  } catch (err) {
    console.warn('Supabase fetchBudgetRequisitions error:', err);
  }

  // Fallback to local storage or generate starters
  let localReqs = getLocalRequisitions(schoolId);
  if (localReqs.length === 0) {
    localReqs = generateStarterRequisitions(schoolId, deptMap);
    saveLocalRequisitions(schoolId, localReqs);
  }

  // Re-attach departments in case names changed
  const enriched = localReqs.map((r) => ({
    ...r,
    department: deptMap.get(r.department_id) || r.department,
  }));

  if (departmentId) {
    return enriched.filter((r) => r.department_id === departmentId);
  }
  return enriched;
}

/**
 * Creates a new departmental budget requisition.
 */
export async function createBudgetRequisition(
  input: CreateRequisitionInput
): Promise<BudgetRequisition> {
  const departments = await fetchSchoolDepartments(input.school_id);
  const targetDept = departments.find((d) => d.id === input.department_id);
  const deptCodeShort = targetDept?.code ? targetDept.code.replace('DEPT_', '').slice(0, 3) : 'GEN';

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const reqNum = `REQ-${yearMonth}-${deptCodeShort}-${randomSuffix}`;

  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.quantity_requested * item.estimated_unit_cost,
    0
  );

  const newRequisitionId = `req-${Date.now()}`;
  const items: BudgetRequisitionItem[] = input.items.map((i, idx) => ({
    id: `item-${Date.now()}-${idx}`,
    requisition_id: newRequisitionId,
    item_name: i.item_name,
    category: i.category,
    unit_of_measure: i.unit_of_measure,
    quantity_requested: i.quantity_requested,
    estimated_unit_cost: i.estimated_unit_cost,
    total_estimated_cost: i.quantity_requested * i.estimated_unit_cost,
    justification: i.justification,
    supplier_quote_ref: i.supplier_quote_ref,
    is_accepted: true,
    query_thread: [],
  }));

  const newRequisition: BudgetRequisition = {
    id: newRequisitionId,
    school_id: input.school_id,
    department_id: input.department_id,
    department: targetDept,
    requisition_number: reqNum,
    budget_month: input.budget_month,
    is_supplementary: input.is_supplementary || false,
    supplementary_reason: input.supplementary_reason,
    total_amount: totalAmount,
    status: 'pending_accounts_tier1',
    created_by: input.created_by,
    creator_name: input.creator_name || 'Staff Member',
    creator_role: input.creator_role || 'Department Member',
    items,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('budget_requisitions')
      .insert({
        school_id: input.school_id,
        department_id: input.department_id,
        requisition_number: reqNum,
        budget_month: input.budget_month,
        is_supplementary: input.is_supplementary || false,
        supplementary_reason: input.supplementary_reason,
        total_amount: totalAmount,
        status: 'pending_accounts_tier1',
        created_by: input.created_by,
      })
      .select()
      .single();

    if (!error && data) {
      newRequisition.id = data.id;
      // Insert items
      const insertItems = items.map((itm) => ({
        requisition_id: data.id,
        item_name: itm.item_name,
        category: itm.category,
        unit_of_measure: itm.unit_of_measure,
        quantity_requested: itm.quantity_requested,
        estimated_unit_cost: itm.estimated_unit_cost,
        justification: itm.justification,
        supplier_quote_ref: itm.supplier_quote_ref,
        is_accepted: true,
      }));
      await supabase.from('budget_requisition_items').insert(insertItems);
    }
  } catch (err) {
    console.warn('Supabase createBudgetRequisition fallback:', err);
  }

  const current = getLocalRequisitions(input.school_id);
  saveLocalRequisitions(input.school_id, [newRequisition, ...current]);
  return newRequisition;
}

/**
 * Approver Queries a Line Item & Returns Requisition back to Initiator
 */
export async function queryRequisitionItem(
  schoolId: string,
  requisitionId: string,
  itemId: string,
  reviewer: { id: string; name: string; role: string; stage: 'tier1' | 'tier2' },
  questionMessage: string
): Promise<BudgetRequisition> {
  const reqs = getLocalRequisitions(schoolId);
  const targetReq = reqs.find((r) => r.id === requisitionId);
  if (!targetReq) {
    throw new Error('Requisition not found');
  }

  const newQueryEntry: QueryThreadEntry = {
    id: `query-${Date.now()}`,
    author_id: reviewer.id,
    author_name: reviewer.name,
    author_role: reviewer.role,
    stage: reviewer.stage,
    message: questionMessage,
    created_at: new Date().toISOString(),
  };

  if (targetReq.items) {
    const item = targetReq.items.find((i) => i.id === itemId);
    if (item) {
      item.query_thread = [...(item.query_thread || []), newQueryEntry];
    }
  }

  // Update status to queried
  targetReq.status = reviewer.stage === 'tier1' ? 'queried_accounts_tier1' : 'queried_accounts_tier2';
  targetReq.updated_at = new Date().toISOString();

  saveLocalRequisitions(schoolId, reqs);
  return targetReq;
}

/**
 * Initiator Replies to an Approver's Query on a Line Item
 */
export async function replyToRequisitionQuery(
  schoolId: string,
  requisitionId: string,
  itemId: string,
  replier: { id: string; name: string },
  replyMessage: string,
  adjustedQuantity?: number,
  adjustedCost?: number
): Promise<BudgetRequisition> {
  const reqs = getLocalRequisitions(schoolId);
  const targetReq = reqs.find((r) => r.id === requisitionId);
  if (!targetReq) {
    throw new Error('Requisition not found');
  }

  const replyEntry: QueryThreadEntry = {
    id: `reply-${Date.now()}`,
    author_id: replier.id,
    author_name: replier.name,
    author_role: 'Department Initiator',
    stage: 'reply',
    message: replyMessage,
    created_at: new Date().toISOString(),
  };

  if (targetReq.items) {
    const item = targetReq.items.find((i) => i.id === itemId);
    if (item) {
      item.query_thread = [...(item.query_thread || []), replyEntry];
      if (adjustedQuantity !== undefined && !isNaN(adjustedQuantity)) {
        item.quantity_requested = adjustedQuantity;
      }
      if (adjustedCost !== undefined && !isNaN(adjustedCost)) {
        item.estimated_unit_cost = adjustedCost;
      }
      item.total_estimated_cost = item.quantity_requested * item.estimated_unit_cost;
    }
  }

  // Recompute total amount
  targetReq.total_amount = (targetReq.items || []).reduce((sum, i) => sum + i.total_estimated_cost, 0);

  // Return status to pending review
  if (targetReq.status === 'queried_accounts_tier1') {
    targetReq.status = 'pending_accounts_tier1';
  } else if (targetReq.status === 'queried_accounts_tier2') {
    targetReq.status = 'pending_accounts_tier2';
  }
  targetReq.updated_at = new Date().toISOString();

  saveLocalRequisitions(schoolId, reqs);
  return targetReq;
}

/**
 * Stage 1: Accounts Tier 1 Verification Officer Endorsement
 */
export async function reviewTier1Requisition(
  schoolId: string,
  requisitionId: string,
  reviewerId: string,
  reviewerName: string,
  notes: string,
  approved: boolean
): Promise<BudgetRequisition> {
  const reqs = getLocalRequisitions(schoolId);
  const targetReq = reqs.find((r) => r.id === requisitionId);
  if (!targetReq) throw new Error('Requisition not found');

  targetReq.tier1_reviewed_by = reviewerId;
  targetReq.tier1_reviewer_name = reviewerName;
  targetReq.tier1_reviewed_at = new Date().toISOString();
  targetReq.tier1_notes = notes;
  targetReq.status = approved ? 'pending_accounts_tier2' : 'declined';
  targetReq.updated_at = new Date().toISOString();

  saveLocalRequisitions(schoolId, reqs);
  return targetReq;
}

/**
 * Stage 2: Chief Accountant / Bursar Endorsement
 */
export async function reviewTier2Requisition(
  schoolId: string,
  requisitionId: string,
  reviewerId: string,
  reviewerName: string,
  notes: string,
  approved: boolean
): Promise<BudgetRequisition> {
  const reqs = getLocalRequisitions(schoolId);
  const targetReq = reqs.find((r) => r.id === requisitionId);
  if (!targetReq) throw new Error('Requisition not found');

  targetReq.tier2_reviewed_by = reviewerId;
  targetReq.tier2_reviewer_name = reviewerName;
  targetReq.tier2_reviewed_at = new Date().toISOString();
  targetReq.tier2_notes = notes;
  // If approved by Chief Accountant, it is accepted into the Proposed Monthly Budget!
  targetReq.status = approved ? 'accepted_into_proposed_budget' : 'declined';
  targetReq.updated_at = new Date().toISOString();

  saveLocalRequisitions(schoolId, reqs);
  return targetReq;
}

/**
 * Fetches or initializes the Consolidated Monthly Budget for the Executive Board Quorum
 */
export async function fetchMonthlyConsolidatedBudget(
  schoolId: string,
  budgetMonth: string // YYYY-MM-01
): Promise<MonthlyConsolidatedBudget> {
  const allReqs = await fetchBudgetRequisitions(schoolId);
  const acceptedReqs = allReqs.filter(
    (r) => r.status === 'accepted_into_proposed_budget' && r.budget_month === budgetMonth
  );

  const totalRequested = acceptedReqs.reduce((sum, r) => sum + r.total_amount, 0);

  const localBudgets = getLocalConsolidatedBudgets(schoolId);
  let budget = localBudgets.find((b) => b.budget_month === budgetMonth);

  const approvals = getLocalApprovals(schoolId).filter((a) => a.consolidated_budget_id === (budget?.id || 'b-temp'));

  if (!budget) {
    budget = {
      id: `budget-${budgetMonth}`,
      school_id: schoolId,
      budget_month: budgetMonth,
      total_inflow_projected: 48500000, // Projected tuition inflow for Oxford
      total_budget_requested: totalRequested,
      total_budget_approved: totalRequested,
      status: 'proposed',
      required_admin_approvals: 3,
      current_approval_count: approvals.length,
      created_at: new Date().toISOString(),
      approvals,
      requisitions: acceptedReqs,
    };
    saveLocalConsolidatedBudgets(schoolId, [...localBudgets, budget]);
  } else {
    budget.total_budget_requested = totalRequested;
    budget.total_budget_approved = totalRequested;
    budget.approvals = approvals;
    budget.current_approval_count = approvals.length;
    budget.requisitions = acceptedReqs;
  }

  return budget;
}

/**
 * Administrator Signs and Approves Consolidated Monthly Budget (Quorum mechanism)
 */
export async function signAndApproveConsolidatedBudget(
  schoolId: string,
  budgetId: string,
  admin: { id: string; name: string; title: string },
  comments?: string
): Promise<{ budget: MonthlyConsolidatedBudget; newlyConfirmed: boolean }> {
  const approvals = getLocalApprovals(schoolId);
  const alreadySigned = approvals.some(
    (a) => a.consolidated_budget_id === budgetId && a.admin_user_id === admin.id
  );

  if (alreadySigned) {
    throw new Error('This administrator has already signed the proposed budget.');
  }

  const hash = `SIG-${admin.id.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const newApproval: BudgetAdminApproval = {
    id: `appr-${Date.now()}`,
    consolidated_budget_id: budgetId,
    school_id: schoolId,
    admin_user_id: admin.id,
    admin_name: admin.name,
    admin_title: admin.title,
    approved_at: new Date().toISOString(),
    digital_signature_hash: hash,
    comments,
  };

  const updatedApprovals = [...approvals, newApproval];
  saveLocalApprovals(schoolId, updatedApprovals);

  const budgets = getLocalConsolidatedBudgets(schoolId);
  const targetBudget = budgets.find((b) => b.id === budgetId);
  if (!targetBudget) throw new Error('Budget not found');

  targetBudget.current_approval_count = updatedApprovals.filter(
    (a) => a.consolidated_budget_id === budgetId
  ).length;

  let newlyConfirmed = false;
  if (targetBudget.current_approval_count >= targetBudget.required_admin_approvals) {
    targetBudget.status = 'confirmed';
    targetBudget.confirmed_at = new Date().toISOString();
    newlyConfirmed = true;
  } else {
    targetBudget.status = 'under_review';
  }

  targetBudget.approvals = updatedApprovals.filter((a) => a.consolidated_budget_id === budgetId);
  saveLocalConsolidatedBudgets(schoolId, budgets);

  return { budget: targetBudget, newlyConfirmed };
}
