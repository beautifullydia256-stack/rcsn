import type { SchoolDepartment } from '@/features/departments/types';

export type RequisitionStatus =
  | 'draft'
  | 'pending_accounts_tier1'
  | 'queried_accounts_tier1'
  | 'pending_accounts_tier2'
  | 'queried_accounts_tier2'
  | 'pending_admin_inclusion'
  | 'accepted_into_proposed_budget'
  | 'declined';

export interface QueryThreadEntry {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  stage: 'tier1' | 'tier2' | 'admin' | 'reply';
  message: string;
  created_at: string;
}

export interface BudgetRequisitionItem {
  id: string;
  requisition_id: string;
  item_name: string;
  category: string;
  unit_of_measure: string;
  quantity_requested: number;
  estimated_unit_cost: number;
  total_estimated_cost: number;
  justification?: string;
  supplier_quote_ref?: string;
  admin_adjusted_quantity?: number;
  admin_adjusted_unit_cost?: number;
  is_accepted: boolean;
  query_thread: QueryThreadEntry[];
}

export interface BudgetRequisition {
  id: string;
  school_id: string;
  department_id: string;
  department?: SchoolDepartment;
  requisition_number: string;
  budget_month: string; // YYYY-MM-DD
  is_supplementary: boolean;
  supplementary_reason?: string;
  total_amount: number;
  status: RequisitionStatus;
  created_by: string;
  creator_name?: string;
  creator_role?: string;
  tier1_reviewed_by?: string;
  tier1_reviewer_name?: string;
  tier1_reviewed_at?: string;
  tier1_notes?: string;
  tier2_reviewed_by?: string;
  tier2_reviewer_name?: string;
  tier2_reviewed_at?: string;
  tier2_notes?: string;
  admin_accepted_by?: string;
  admin_accepted_at?: string;
  items?: BudgetRequisitionItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateRequisitionItemInput {
  item_name: string;
  category: string;
  unit_of_measure: string;
  quantity_requested: number;
  estimated_unit_cost: number;
  justification?: string;
  supplier_quote_ref?: string;
}

export interface CreateRequisitionInput {
  school_id: string;
  department_id: string;
  budget_month: string;
  is_supplementary?: boolean;
  supplementary_reason?: string;
  created_by: string;
  creator_name?: string;
  creator_role?: string;
  items: CreateRequisitionItemInput[];
}

export type ConsolidatedBudgetStatus =
  | 'proposed'
  | 'under_review'
  | 'confirmed'
  | 'rejected';

export interface BudgetAdminApproval {
  id: string;
  consolidated_budget_id: string;
  school_id: string;
  admin_user_id: string;
  admin_name: string;
  admin_title: string;
  approved_at: string;
  digital_signature_hash: string;
  comments?: string;
}

export interface MonthlyConsolidatedBudget {
  id: string;
  school_id: string;
  budget_month: string;
  total_inflow_projected: number;
  total_budget_requested: number;
  total_budget_approved: number;
  status: ConsolidatedBudgetStatus;
  required_admin_approvals: number;
  current_approval_count: number;
  confirmed_at?: string;
  created_at: string;
  approvals?: BudgetAdminApproval[];
  requisitions?: BudgetRequisition[];
}
