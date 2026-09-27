import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  Building2,
  ArrowRight,
  ShieldCheck,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  TrendingUp,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  fetchBudgetRequisitions,
  createBudgetRequisition,
  queryRequisitionItem,
  replyToRequisitionQuery,
  reviewTier1Requisition,
  reviewTier2Requisition,
} from '@/features/budget-requisitions/services/budgetRequisitionService';
import { fetchSchoolDepartments } from '@/features/departments/services/departmentService';
import type {
  BudgetRequisition,
  BudgetRequisitionItem,
  RequisitionStatus,
} from '@/features/budget-requisitions/types';
import { useToast } from '@/components/Toast';

function fmtUGX(amount: number) {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_CONFIG: Record<
  RequisitionStatus,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  draft: {
    label: 'Draft',
    bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    text: 'text-slate-600',
    icon: Clock,
  },
  pending_accounts_tier1: {
    label: 'Stage 1: Accounts Verification',
    bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    text: 'text-blue-600',
    icon: Clock,
  },
  queried_accounts_tier1: {
    label: 'Queried by Accounts Tier 1',
    bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    text: 'text-amber-600',
    icon: AlertTriangle,
  },
  pending_accounts_tier2: {
    label: 'Stage 2: Chief Bursar Endorsement',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-600',
    icon: ShieldCheck,
  },
  queried_accounts_tier2: {
    label: 'Queried by Chief Bursar',
    bg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
    text: 'text-orange-600',
    icon: AlertTriangle,
  },
  pending_admin_inclusion: {
    label: 'Pending Admin Inclusion',
    bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    text: 'text-purple-600',
    icon: Clock,
  },
  accepted_into_proposed_budget: {
    label: 'Accepted in Proposed Budget',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-600',
    icon: CheckCircle2,
  },
  declined: {
    label: 'Declined',
    bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    text: 'text-rose-600',
    icon: X,
  },
};

const CATEGORIES = [
  'Food & Provisions',
  'Medical Consumables',
  'Laboratory Reagents',
  'Capital Equipment',
  'Stationery & Printing',
  'Sanitation & Cleaning',
  'Facility Maintenance',
  'Utility & Services',
  'General',
];

const UNITS = ['pieces', 'boxes', 'kg', 'bags_50kg', 'jerrycans_20l', 'liters', 'sets', 'reams', 'vials', 'month'];

export default function BudgetRequisitionsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [queryModalItem, setQueryModalItem] = useState<{
    reqId: string;
    item: BudgetRequisitionItem;
    stage: 'tier1' | 'tier2';
  } | null>(null);
  const [queryText, setQueryText] = useState('');

  const [replyModalItem, setReplyModalItem] = useState<{
    reqId: string;
    item: BudgetRequisitionItem;
  } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [adjustedQty, setAdjustedQty] = useState<string>('');
  const [adjustedUnitCost, setAdjustedUnitCost] = useState<string>('');

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['school-departments', schoolId],
    queryFn: () => (schoolId ? fetchSchoolDepartments(schoolId) : Promise.resolve([])),
    enabled: Boolean(schoolId),
  });

  // Fetch requisitions
  const { data: requisitions = [], isLoading } = useQuery({
    queryKey: ['budget-requisitions', schoolId],
    queryFn: () => (schoolId ? fetchBudgetRequisitions(schoolId) : Promise.resolve([])),
    enabled: Boolean(schoolId),
  });

  // Form State for New Requisition
  const [formDeptId, setFormDeptId] = useState<string>('');
  const [formMonth, setFormMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [formIsSupplementary, setFormIsSupplementary] = useState(false);
  const [formSupplementaryReason, setFormSupplementaryReason] = useState('');
  const [formItems, setFormItems] = useState<
    Array<{
      item_name: string;
      category: string;
      unit_of_measure: string;
      quantity_requested: number;
      estimated_unit_cost: number;
      justification: string;
      supplier_quote_ref: string;
    }>
  >([
    {
      item_name: '',
      category: 'Food & Provisions',
      unit_of_measure: 'pieces',
      quantity_requested: 1,
      estimated_unit_cost: 0,
      justification: '',
      supplier_quote_ref: '',
    },
  ]);

  // Derived filter
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((r) => {
      const matchDept = selectedDeptFilter === 'all' || r.department_id === selectedDeptFilter;
      const matchStatus = selectedStatusFilter === 'all' || r.status === selectedStatusFilter;
      const matchQuery =
        !searchQuery.trim() ||
        r.requisition_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.creator_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.items || []).some((i) => i.item_name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchDept && matchStatus && matchQuery;
    });
  }, [requisitions, selectedDeptFilter, selectedStatusFilter, searchQuery]);

  // Summary counts
  const stageStats = useMemo(() => {
    const tier1 = requisitions.filter(
      (r) => r.status === 'pending_accounts_tier1' || r.status === 'queried_accounts_tier1'
    ).length;
    const tier2 = requisitions.filter(
      (r) => r.status === 'pending_accounts_tier2' || r.status === 'queried_accounts_tier2'
    ).length;
    const accepted = requisitions.filter(
      (r) => r.status === 'accepted_into_proposed_budget'
    ).length;
    const totalProposedUGX = requisitions
      .filter((r) => r.status === 'accepted_into_proposed_budget')
      .reduce((sum, r) => sum + r.total_amount, 0);

    return { tier1, tier2, accepted, totalProposedUGX };
  }, [requisitions]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createBudgetRequisition,
    onSuccess: () => {
      toast.success('Budget Requisition submitted to Accounts Tier 1 successfully!');
      queryClient.invalidateQueries({ queryKey: ['budget-requisitions', schoolId] });
      setCreateModalOpen(false);
      // Reset form
      setFormItems([
        {
          item_name: '',
          category: 'Food & Provisions',
          unit_of_measure: 'pieces',
          quantity_requested: 1,
          estimated_unit_cost: 0,
          justification: '',
          supplier_quote_ref: '',
        },
      ]);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit requisition');
    },
  });

  const queryMutation = useMutation({
    mutationFn: async ({
      reqId,
      itemId,
      stage,
      message,
    }: {
      reqId: string;
      itemId: string;
      stage: 'tier1' | 'tier2';
      message: string;
    }) => {
      if (!schoolId) return;
      return queryRequisitionItem(
        schoolId,
        reqId,
        itemId,
        {
          id: user?.id || 'admin-id',
          name: user?.user_metadata?.name || user?.email || 'Accounts Reviewer',
          role: stage === 'tier1' ? 'Accounts Tier 1 Officer' : 'Chief Bursar',
          stage,
        },
        message
      );
    },
    onSuccess: () => {
      toast.success('Query sent back to department initiator successfully.');
      queryClient.invalidateQueries({ queryKey: ['budget-requisitions', schoolId] });
      setQueryModalItem(null);
      setQueryText('');
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({
      reqId,
      itemId,
      message,
      qty,
      cost,
    }: {
      reqId: string;
      itemId: string;
      message: string;
      qty?: number;
      cost?: number;
    }) => {
      if (!schoolId) return;
      return replyToRequisitionQuery(
        schoolId,
        reqId,
        itemId,
        {
          id: user?.id || 'initiator-id',
          name: user?.user_metadata?.name || user?.email || 'Initiator',
        },
        message,
        qty,
        cost
      );
    },
    onSuccess: () => {
      toast.success('Response & revisions submitted back to Accounts review pipeline.');
      queryClient.invalidateQueries({ queryKey: ['budget-requisitions', schoolId] });
      setReplyModalItem(null);
      setReplyText('');
      setAdjustedQty('');
      setAdjustedUnitCost('');
    },
  });

  const tier1ReviewMutation = useMutation({
    mutationFn: async ({
      reqId,
      notes,
      approved,
    }: {
      reqId: string;
      notes: string;
      approved: boolean;
    }) => {
      if (!schoolId) return;
      return reviewTier1Requisition(
        schoolId,
        reqId,
        user?.id || 'acct-tier1',
        user?.user_metadata?.name || user?.email || 'Accounts Tier 1',
        notes,
        approved
      );
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.approved
          ? 'Requisition verified & forwarded to Chief Bursar (Stage 2)!'
          : 'Requisition marked as declined.'
      );
      queryClient.invalidateQueries({ queryKey: ['budget-requisitions', schoolId] });
    },
  });

  const tier2ReviewMutation = useMutation({
    mutationFn: async ({
      reqId,
      notes,
      approved,
    }: {
      reqId: string;
      notes: string;
      approved: boolean;
    }) => {
      if (!schoolId) return;
      return reviewTier2Requisition(
        schoolId,
        reqId,
        user?.id || 'bursar',
        user?.user_metadata?.name || user?.email || 'Chief Bursar',
        notes,
        approved
      );
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.approved
          ? 'Requisition endorsed! Now included in the Proposed Monthly Consolidated Budget.'
          : 'Requisition declined.'
      );
      queryClient.invalidateQueries({ queryKey: ['budget-requisitions', schoolId] });
    },
  });

  const handleAddItemRow = () => {
    setFormItems([
      ...formItems,
      {
        item_name: '',
        category: 'Food & Provisions',
        unit_of_measure: 'pieces',
        quantity_requested: 1,
        estimated_unit_cost: 0,
        justification: '',
        supplier_quote_ref: '',
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const computedFormTotal = useMemo(() => {
    return formItems.reduce((acc, i) => acc + (i.quantity_requested || 0) * (i.estimated_unit_cost || 0), 0);
  }, [formItems]);

  const handleSubmitNewRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    if (!formDeptId) {
      toast.error('Please select the requesting department');
      return;
    }
    const validItems = formItems.filter((i) => i.item_name.trim() && i.quantity_requested > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one line item with a name and quantity');
      return;
    }

    createMutation.mutate({
      school_id: schoolId,
      department_id: formDeptId,
      budget_month: formMonth,
      is_supplementary: formIsSupplementary,
      supplementary_reason: formIsSupplementary ? formSupplementaryReason : undefined,
      created_by: user?.id || 'staff-id',
      creator_name: user?.user_metadata?.name || user?.email || 'Department Lead',
      creator_role: 'Department In-Charge',
      items: validItems,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Departmental Budget Requisitions
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Multi-stage institutional chain of custody: Department Drafting ➔ Accounts Tier 1 ➔ Chief Bursar ➔ Board Approval
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (departments.length > 0 && !formDeptId) {
              setFormDeptId(departments[0].id);
            }
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Department Requisition</span>
        </button>
      </div>

      {/* Pipeline Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Stage 1: Verification
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {stageStats.tier1}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Pending Accounts Tier 1 validation
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Stage 2: Endorsement
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {stageStats.tier2}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            With Chief Bursar / Senior Accountant
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Accepted for Board
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {stageStats.accepted}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Ready in Proposed Monthly Budget
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Proposed Total Sum
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
            {fmtUGX(stageStats.totalProposedUGX)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Awaiting 3-Admin Quorum Lock
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-sm backdrop-blur-md flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by requisition number, department, requester, or item..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="pending_accounts_tier1">Stage 1: Accounts Verification</option>
            <option value="queried_accounts_tier1">Queried by Accounts Tier 1</option>
            <option value="pending_accounts_tier2">Stage 2: Chief Bursar Endorsement</option>
            <option value="queried_accounts_tier2">Queried by Chief Bursar</option>
            <option value="accepted_into_proposed_budget">Accepted into Proposed Budget</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </div>

      {/* Requisitions List */}
      <div className="space-y-4">
        {filteredRequisitions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
            <FileText className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No Requisitions Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No monthly budget requisitions match your active filter. Click &ldquo;New Department
              Requisition&rdquo; to draft one.
            </p>
          </div>
        ) : (
          filteredRequisitions.map((req) => {
            const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusCfg.icon;
            const isExpanded = expandedReqId === req.id;
            const hasQueriedItems = (req.items || []).some((i) => (i.query_thread || []).length > 0);

            return (
              <div
                key={req.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm overflow-hidden transition-all duration-200"
              >
                {/* Requisition Header Bar */}
                <div
                  onClick={() => setExpandedReqId(isExpanded ? null : req.id)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      <Building2 className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                          {req.requisition_number}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {req.department?.name || 'Department'}
                        </span>
                        {req.is_supplementary && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
                            Supplementary
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>Requested by {req.creator_name || 'Department Head'}</span>
                        <span>·</span>
                        <span>Month: {req.budget_month}</span>
                        <span>·</span>
                        <span>{(req.items || []).length} items</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0">
                    <div className="text-right">
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {fmtUGX(req.total_amount)}
                      </div>
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusCfg.bg}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        <span>{statusCfg.label}</span>
                      </div>
                    </div>

                    <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details & Actions */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800/80 p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                    {/* Stage Audit Notes Banner */}
                    {(req.tier1_notes || req.tier2_notes) && (
                      <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 text-xs space-y-1">
                        {req.tier1_notes && (
                          <div className="text-blue-900 dark:text-blue-300">
                            <strong>Stage 1 (Verification) Note:</strong> {req.tier1_notes}
                            <span className="text-blue-700 dark:text-blue-400 ml-1">
                              ({req.tier1_reviewer_name})
                            </span>
                          </div>
                        )}
                        {req.tier2_notes && (
                          <div className="text-indigo-900 dark:text-indigo-300">
                            <strong>Stage 2 (Bursar) Note:</strong> {req.tier2_notes}
                            <span className="text-indigo-700 dark:text-indigo-400 ml-1">
                              ({req.tier2_reviewer_name})
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Bar for Approvers & Initiators */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1 pb-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Line Items Breakdown
                      </span>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Stage 1 Actions */}
                        {req.status === 'pending_accounts_tier1' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const notes = prompt('Enter verification notes (optional):', 'Verified against supplier quotes');
                                if (notes !== null) {
                                  tier1ReviewMutation.mutate({
                                    reqId: req.id,
                                    notes: notes || 'Verified',
                                    approved: true,
                                  });
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verify & Pass to Bursar (Stage 2)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Decline this requisition entirely?')) {
                                  tier1ReviewMutation.mutate({
                                    reqId: req.id,
                                    notes: 'Declined during Stage 1 review',
                                    approved: false,
                                  });
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {/* Stage 2 Actions */}
                        {req.status === 'pending_accounts_tier2' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const notes = prompt('Chief Bursar Endorsement notes (optional):', 'Endorsed for monthly board quorum');
                                if (notes !== null) {
                                  tier2ReviewMutation.mutate({
                                    reqId: req.id,
                                    notes: notes || 'Endorsed',
                                    approved: true,
                                  });
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Endorse into Proposed Monthly Budget</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Decline this requisition?')) {
                                  tier2ReviewMutation.mutate({
                                    reqId: req.id,
                                    notes: 'Declined by Bursar during Stage 2',
                                    approved: false,
                                  });
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors"
                            >
                              Decline
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3">Item Description</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3 text-right">Quantity</th>
                            <th className="py-2.5 px-3 text-right">Est. Unit Cost</th>
                            <th className="py-2.5 px-3 text-right">Total Cost</th>
                            <th className="py-2.5 px-3">Justification</th>
                            <th className="py-2.5 px-3 text-center">Review Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {(req.items || []).map((item) => {
                            const thread = item.query_thread || [];
                            const hasQuery = thread.length > 0;

                            return (
                              <React.Fragment key={item.id}>
                                <tr className="hover:bg-white dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                                    <div className="flex items-center gap-1.5">
                                      <span>{item.item_name}</span>
                                      {item.supplier_quote_ref && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                          {item.supplier_quote_ref}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                    {item.category}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-slate-800 dark:text-slate-200">
                                    {item.quantity_requested} {item.unit_of_measure}
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                                    {fmtUGX(item.estimated_unit_cost)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                                    {fmtUGX(item.total_estimated_cost)}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                                    {item.justification || '—'}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {/* Query button for Reviewers */}
                                      {(req.status === 'pending_accounts_tier1' ||
                                        req.status === 'pending_accounts_tier2') && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setQueryModalItem({
                                              reqId: req.id,
                                              item,
                                              stage:
                                                req.status === 'pending_accounts_tier1'
                                                  ? 'tier1'
                                                  : 'tier2',
                                            });
                                          }}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                                          title="Send a specific query back to the department initiator"
                                        >
                                          <HelpCircle className="w-3 h-3" />
                                          <span>Query Item</span>
                                        </button>
                                      )}

                                      {/* Reply button for Initiators if item was queried */}
                                      {(req.status === 'queried_accounts_tier1' ||
                                        req.status === 'queried_accounts_tier2') && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setReplyModalItem({ reqId: req.id, item });
                                            setAdjustedQty(String(item.quantity_requested));
                                            setAdjustedUnitCost(String(item.estimated_unit_cost));
                                          }}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-xs"
                                        >
                                          <MessageSquare className="w-3 h-3" />
                                          <span>Reply & Revise</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>

                                {/* Query & Reply Discussion Thread */}
                                {hasQuery && (
                                  <tr>
                                    <td colSpan={7} className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border-t border-amber-200/50 dark:border-amber-900/30">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                                          <MessageSquare className="w-3.5 h-3.5" />
                                          <span>Review Discussion & Question Thread:</span>
                                        </div>
                                        <div className="space-y-1.5 pl-5">
                                          {thread.map((entry) => (
                                            <div
                                              key={entry.id}
                                              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                                            >
                                              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                  {entry.author_name} ({entry.author_role})
                                                </span>
                                                <span>
                                                  {new Date(entry.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                  })}
                                                </span>
                                              </div>
                                              <div className="mt-1 text-slate-700 dark:text-slate-300">
                                                {entry.message}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: New Requisition */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Draft Department Monthly Budget Requisition
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Requisitions enter Stage 1 review (Accounts Verification Officer) before Bursar endorsement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewRequisition} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Requesting Department *
                  </label>
                  <select
                    value={formDeptId}
                    onChange={(e) => setFormDeptId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.budget_code || d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Budget Month *
                  </label>
                  <input
                    type="date"
                    value={formMonth}
                    onChange={(e) => setFormMonth(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Supplementary Toggle */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsSupplementary}
                    onChange={(e) => setFormIsSupplementary(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    This is an Emergency / Supplementary Requisition (Mid-Month Add-on)
                  </span>
                </label>

                {formIsSupplementary && (
                  <input
                    type="text"
                    value={formSupplementaryReason}
                    onChange={(e) => setFormSupplementaryReason(e.target.value)}
                    placeholder="Provide justification for supplementary requisition..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              {/* Line Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Requested Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {formItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-500">#{idx + 1}</span>
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-slate-400 hover:text-rose-500 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="Item name (e.g. Posho 50kg, Disposable Gloves)"
                            value={item.item_name}
                            onChange={(e) => {
                              const updated = [...formItems];
                              updated[idx].item_name = e.target.value;
                              setFormItems(updated);
                            }}
                            required
                            className="w-full px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          />
                        </div>

                        <div>
                          <select
                            value={item.category}
                            onChange={(e) => {
                              const updated = [...formItems];
                              updated[idx].category = e.target.value;
                              setFormItems(updated);
                            }}
                            className="w-full px-2 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={item.quantity_requested}
                            onChange={(e) => {
                              const updated = [...formItems];
                              updated[idx].quantity_requested = parseFloat(e.target.value) || 0;
                              setFormItems(updated);
                            }}
                            className="w-full px-2 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500">Unit</label>
                          <select
                            value={item.unit_of_measure}
                            onChange={(e) => {
                              const updated = [...formItems];
                              updated[idx].unit_of_measure = e.target.value;
                              setFormItems(updated);
                            }}
                            className="w-full px-2 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          >
                            {UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500">Est. Unit Cost (UGX)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.estimated_unit_cost}
                            onChange={(e) => {
                              const updated = [...formItems];
                              updated[idx].estimated_unit_cost = parseFloat(e.target.value) || 0;
                              setFormItems(updated);
                            }}
                            className="w-full px-2 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500">Line Subtotal</label>
                          <div className="py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {fmtUGX(item.quantity_requested * item.estimated_unit_cost)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Justification (e.g. Clinical assessment exams)"
                          value={item.justification}
                          onChange={(e) => {
                            const updated = [...formItems];
                            updated[idx].justification = e.target.value;
                            setFormItems(updated);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />
                        <input
                          type="text"
                          placeholder="Supplier quote ref (optional)"
                          value={item.supplier_quote_ref}
                          onChange={(e) => {
                            const updated = [...formItems];
                            updated[idx].supplier_quote_ref = e.target.value;
                            setFormItems(updated);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase">
                  Grand Estimated Requisition Total
                </span>
                <span className="text-base sm:text-lg font-extrabold text-indigo-700 dark:text-indigo-300 font-mono">
                  {fmtUGX(computedFormTotal)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Submitting...' : 'Submit to Accounts Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Query Item */}
      {queryModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Query Item & Send Back to Initiator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQueryModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Item: {queryModalItem.item.item_name}
              </span>
              <div className="mt-0.5 text-slate-500">
                Qty: {queryModalItem.item.quantity_requested} {queryModalItem.item.unit_of_measure} · Unit Cost:{' '}
                {fmtUGX(queryModalItem.item.estimated_unit_cost)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Specific Question or Instructions for the Initiator *
              </label>
              <textarea
                rows={4}
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="e.g., Kindly provide quotation comparisons from two suppliers, or reduce requested volume to match past 30 days consumption."
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setQueryModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!queryText.trim() || queryMutation.isPending}
                onClick={() => {
                  queryMutation.mutate({
                    reqId: queryModalItem.reqId,
                    itemId: queryModalItem.item.id,
                    stage: queryModalItem.stage,
                    message: queryText,
                  });
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
              >
                {queryMutation.isPending ? 'Sending...' : 'Send Query to Initiator'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reply to Query */}
      {replyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Send className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Reply to Query & Revise Item
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReplyModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Item: {replyModalItem.item.item_name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Revised Quantity
                </label>
                <input
                  type="number"
                  step="any"
                  value={adjustedQty}
                  onChange={(e) => setAdjustedQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Revised Unit Cost (UGX)
                </label>
                <input
                  type="number"
                  step="any"
                  value={adjustedUnitCost}
                  onChange={(e) => setAdjustedUnitCost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Response / Clarification Message *
              </label>
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="e.g., Attached revised quotation from Medical Stores Ltd with 10% negotiated discount. Quantity adjusted to 25 boxes."
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReplyModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!replyText.trim() || replyMutation.isPending}
                onClick={() => {
                  replyMutation.mutate({
                    reqId: replyModalItem.reqId,
                    itemId: replyModalItem.item.id,
                    message: replyText,
                    qty: adjustedQty ? parseFloat(adjustedQty) : undefined,
                    cost: adjustedUnitCost ? parseFloat(adjustedUnitCost) : undefined,
                  });
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
              >
                {replyMutation.isPending ? 'Submitting...' : 'Submit Revisions for Re-Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
