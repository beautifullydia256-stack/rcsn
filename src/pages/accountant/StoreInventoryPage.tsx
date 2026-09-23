import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  ArrowUpRight,
  TrendingDown,
  AlertTriangle,
  Search,
  LayoutGrid,
  Table as TableIcon,
  RotateCcw,
  UtensilsCrossed,
  Layers,
  History,
  CheckCircle2,
  X,
  ExternalLink,
  Info,
  Calculator,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  fetchStoreItems,
  fetchStoreTransactions,
  createStoreItem,
  recordRestock,
  recordDailyDispatch,
  recordStockAdjustment,
  computeStoreKpis,
} from '@/features/store-inventory/services/storeInventoryService';
import type {
  StoreItem,
  StoreItemCategory,
  CreateStoreItemInput,
  RestockItemInput,
  DailyDispatchInput,
  StockAdjustmentInput,
} from '@/features/store-inventory/types';
import AdminContentSkeleton from '@/components/layout/AdminContentSkeleton';

function fmtUGX(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
}

const CATEGORY_LABELS: Record<StoreItemCategory, string> = {
  food_kitchen: 'Food & Kitchen Supplies',
  cleaning_sanitation: 'Cleaning & Sanitation',
  scholastic_supplies: 'Scholastic & Stationery',
  general_maintenance: 'Repairs & Maintenance',
  other: 'General Store',
};

const COMMON_UNITS = ['kg', 'liters', 'bags_50kg', 'bags_100kg', 'jerrycans_20l', 'reams', 'boxes', 'pieces', 'bundles'];

export default function StoreInventoryPage() {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');

  // Modals state
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [selectedRestockId, setSelectedRestockId] = useState<string>('');
  const [restockQty, setRestockQty] = useState<number | string>('');
  const [restockCost, setRestockCost] = useState<number | string>('');

  // Controlled Add modal state for live computation
  const [addQty, setAddQty] = useState<number | string>('');
  const [addUnitCost, setAddUnitCost] = useState<number | string>('');
  const [addUnitOfMeasure, setAddUnitOfMeasure] = useState('kg');

  const [dispatchItem, setDispatchItem] = useState<StoreItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<StoreItem | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Queries
  const {
    data: items = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['store-items', schoolId],
    queryFn: () => (schoolId ? fetchStoreItems(schoolId) : Promise.resolve([])),
    enabled: Boolean(schoolId),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['store-transactions', schoolId],
    queryFn: () => (schoolId ? fetchStoreTransactions(schoolId, 50) : Promise.resolve([])),
    enabled: Boolean(schoolId),
  });

  const kpis = useMemo(() => computeStoreKpis(items), [items]);

  const activeRestockItem = useMemo(() => {
    if (!items.length) return null;
    return items.find((i) => i.id === selectedRestockId) || items[0] || null;
  }, [items, selectedRestockId]);

  const openAddModal = () => {
    setAddQty('');
    setAddUnitCost('');
    setAddUnitOfMeasure('kg');
    setAddItemOpen(true);
  };

  const openRestockForItem = (item: StoreItem) => {
    setSelectedRestockId(item.id);
    setRestockCost(item.unit_cost || '');
    setRestockQty('');
    setRestockModalOpen(true);
  };

  const openRestockGeneral = () => {
    const first = items[0];
    setSelectedRestockId(first?.id || '');
    setRestockCost(first?.unit_cost || '');
    setRestockQty('');
    setRestockModalOpen(true);
  };

  // Items with low or critical stock for alert banner
  const criticalItems = useMemo(
    () => items.filter((i) => i.stock_status === 'critical' || i.stock_status === 'out_of_stock'),
    [items]
  );
  const lowItems = useMemo(() => items.filter((i) => i.stock_status === 'low'), [items]);

  // Filtered store items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchQ =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.storage_location && item.storage_location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;

      let matchStatus = true;
      if (stockStatusFilter === 'critical') {
        matchStatus = item.stock_status === 'critical' || item.stock_status === 'out_of_stock';
      } else if (stockStatusFilter === 'low') {
        matchStatus = item.stock_status === 'low';
      } else if (stockStatusFilter === 'healthy') {
        matchStatus = item.stock_status === 'healthy';
      }

      return matchQ && matchCat && matchStatus;
    });
  }, [items, searchQuery, selectedCategory, stockStatusFilter]);

  // Add Item Mutation
  const addMutation = useMutation({
    mutationFn: (input: CreateStoreItemInput) =>
      createStoreItem(schoolId!, input, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-items', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['store-transactions', schoolId] });
      setAddItemOpen(false);
    },
  });

  // Restock Mutation
  const restockMutation = useMutation({
    mutationFn: (input: RestockItemInput) =>
      recordRestock(schoolId!, input, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-items', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['store-transactions', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', schoolId] });
      setRestockModalOpen(false);
    },
  });

  // Dispatch Mutation
  const dispatchMutation = useMutation({
    mutationFn: (input: DailyDispatchInput) =>
      recordDailyDispatch(schoolId!, input, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-items', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['store-transactions', schoolId] });
      setDispatchItem(null);
    },
  });

  // Adjust Mutation
  const adjustMutation = useMutation({
    mutationFn: (input: StockAdjustmentInput) =>
      recordStockAdjustment(schoolId!, input, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-items', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['store-transactions', schoolId] });
      setAdjustItem(null);
    },
  });

  if (isLoading) {
    return (
      <div className="w-full min-h-screen px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <AdminContentSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-500 mb-1">
            <Package className="w-4 h-4" />
            <span>Store & Inventory Management</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            School Store & Food Supplies
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track posho, rice, cooking oil, and school supplies with planned daily consumption, runway forecasts, and expense integration.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>Stock Movements Log</span>
          </button>

          <button
            type="button"
            onClick={openRestockGeneral}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition-colors disabled:opacity-50"
            title={items.length === 0 ? 'Add commodities first before restocking' : 'Add stock to an existing commodity'}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Restock Commodity</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Commodity</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Valuation */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Stock Value
            </span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {fmtUGX(kpis.total_stock_value)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Across {kpis.total_items} registered commodities
          </div>
        </div>

        {/* KPI 2: Daily Food Consumables Burn Rate */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Daily Kitchen Burn Rate
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {fmtUGX(kpis.daily_food_burn_rate)}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400"> /day</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Estimated daily food expenditure burn
          </div>
        </div>

        {/* KPI 3: Critical & Low Runway Items */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Low Stock Alerts
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {kpis.critical_stock_count} Critical
            </span>
            {kpis.low_stock_count > 0 && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                (+{kpis.low_stock_count} Low)
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Items reaching or below reorder threshold
          </div>
        </div>

        {/* KPI 4: Monthly Projected Food Outflow */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Monthly Food Projection
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {fmtUGX(kpis.daily_food_burn_rate * 30)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Estimated 30-day kitchen expenditure
          </div>
        </div>
      </div>

      {/* Critical Stock Alert Banner */}
      {criticalItems.length > 0 && (
        <div className="rounded-2xl border border-rose-300 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/20 p-4 shadow-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              Urgent Restock Warning: {criticalItems.length} {criticalItems.length === 1 ? 'item is' : 'items are'} depleted or dangerously low!
            </h3>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {criticalItems.map((item) => (
                <div
                  key={item.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 shadow-xs"
                >
                  <span>{item.name}:</span>
                  <span className="font-bold">{item.current_stock} {item.unit_of_measure} left</span>
                  {item.days_runway !== null && (
                    <span className="text-[11px] text-rose-500 font-normal">
                      (~{item.days_runway} {item.days_runway === 1 ? 'day' : 'days'} runway)
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => openRestockForItem(item)}
                    className="ml-1 text-[11px] font-bold text-teal-600 hover:underline cursor-pointer"
                  >
                    Restock Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar: Search, Filters, View Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/60 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search store items, food supplies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="food_kitchen">Food & Kitchen</option>
            <option value="cleaning_sanitation">Cleaning & Hygiene</option>
            <option value="scholastic_supplies">Scholastic & Stationery</option>
            <option value="general_maintenance">Maintenance</option>
            <option value="other">General</option>
          </select>

          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Stock Levels</option>
            <option value="critical">Critical / Out of Stock</option>
            <option value="low">Low Stock</option>
            <option value="healthy">Adequate / Healthy</option>
          </select>
        </div>

        {/* View Mode Toggle: Icon-based */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
            title="Table View"
          >
            <TableIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content: Table or Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No store commodities found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No items matched your search filter. Clear the search or filter to see all stock.'
              : 'Your store has no items registered yet. Click "Add Store Item" to register posho, rice, cooking oil, or cleaning supplies.'}
          </p>
          <button
            type="button"
            onClick={() => setAddItemOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Store Item</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 overflow-hidden shadow-sm backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Commodity Item</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Current Stock</th>
                  <th className="px-4 py-3.5">Planned Daily Usage</th>
                  <th className="px-4 py-3.5">Days Runway</th>
                  <th className="px-4 py-3.5">Unit Cost</th>
                  <th className="px-4 py-3.5">Total Valuation</th>
                  <th className="px-4 py-3.5 text-right">Store Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => {
                  const isCritical = item.stock_status === 'critical' || item.stock_status === 'out_of_stock';
                  const isLow = item.stock_status === 'low';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.name}
                        </div>
                        {item.storage_location && (
                          <div className="text-[11px] text-slate-400">
                            Loc: {item.storage_location}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isCritical
                                ? 'text-rose-600 dark:text-rose-400'
                                : isLow
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {item.current_stock.toLocaleString()}
                          </span>
                          <span className="text-slate-400 text-[11px]">{item.unit_of_measure}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Min alert: {item.min_reorder_level} {item.unit_of_measure}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {item.planned_daily_usage > 0 ? (
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {item.planned_daily_usage} {item.unit_of_measure}/day
                            </span>
                            <div className="text-[10px] text-slate-400">
                              ~{fmtUGX(item.planned_daily_usage * item.unit_cost)}/day
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {item.days_runway !== null ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                isCritical
                                  ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                                  : isLow
                                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                                  : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                              }`}
                            >
                              {item.days_runway === 0
                                ? 'Exhausted'
                                : `${item.days_runway} ${item.days_runway === 1 ? 'day' : 'days'}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-medium">
                        {fmtUGX(item.unit_cost)}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                        {fmtUGX(item.total_value || 0)}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDispatchItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                            title="Dispatch consumption for daily meal or usage"
                          >
                            <UtensilsCrossed className="w-3 h-3" />
                            <span>Dispatch</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openRestockForItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors"
                            title="Restock this item and record expenditure"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Restock</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAdjustItem(item)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            title="Stocktake audit adjustment"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isCritical = item.stock_status === 'critical' || item.stock_status === 'out_of_stock';
            const isLow = item.stock_status === 'low';

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {item.name}
                      </h3>
                      {item.storage_location && (
                        <div className="text-xs text-slate-400">Loc: {item.storage_location}</div>
                      )}
                    </div>

                    {item.days_runway !== null && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          isCritical
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                            : isLow
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {item.days_runway === 0 ? 'Exhausted' : `${item.days_runway}d Runway`}
                      </span>
                    )}
                  </div>

                  {/* Stock Quantity Highlight */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        In Stock
                      </div>
                      <div
                        className={`text-xl font-bold ${
                          isCritical
                            ? 'text-rose-600 dark:text-rose-400'
                            : isLow
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {item.current_stock.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-400">{item.unit_of_measure}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Stock Value
                      </div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {fmtUGX(item.total_value || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Daily Consumption Rate */}
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Daily usage burn:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {item.planned_daily_usage > 0
                          ? `${item.planned_daily_usage} ${item.unit_of_measure}/day (~${fmtUGX(
                              item.planned_daily_usage * item.unit_cost
                            )})`
                          : 'Not planned'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Unit Cost:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {fmtUGX(item.unit_cost)} / {item.unit_of_measure}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setDispatchItem(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 transition-colors"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>Dispatch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openRestockForItem(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-colors"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Restock</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== MODAL: ADD STORE ITEM ===================== */}
      {addItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Add New Store Commodity
                  </h3>
                  <p className="text-xs text-slate-500">
                    Register food supplies, posho, rice, cooking oil, or stationery.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddItemOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const data = new FormData(form);

                addMutation.mutate({
                  name: data.get('name') as string,
                  category: data.get('category') as StoreItemCategory,
                  unit_of_measure: addUnitOfMeasure || (data.get('unit_of_measure') as string) || 'kg',
                  current_stock: Number(addQty) || 0,
                  min_reorder_level: Number(data.get('min_reorder_level')) || 0,
                  planned_daily_usage: Number(data.get('planned_daily_usage')) || 0,
                  unit_cost: Number(addUnitCost) || 0,
                  storage_location: data.get('storage_location') as string,
                  notes: data.get('notes') as string,
                });
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Commodity Name *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Posho / Maize Flour, Cooking Oil, Super Rice, Beans"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    name="category"
                    required
                    defaultValue="food_kitchen"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="food_kitchen">Food & Kitchen Supplies</option>
                    <option value="cleaning_sanitation">Cleaning & Sanitation</option>
                    <option value="scholastic_supplies">Scholastic & Stationery</option>
                    <option value="general_maintenance">Repairs & Maintenance</option>
                    <option value="other">General Store</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit of Measure *
                  </label>
                  <input
                    name="unit_of_measure"
                    type="text"
                    required
                    value={addUnitOfMeasure}
                    onChange={(e) => setAddUnitOfMeasure(e.target.value)}
                    placeholder="kg, liters, bags, reams"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {['kg', 'liters', 'bags_50kg', 'pieces'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setAddUnitOfMeasure(u)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${
                          addUnitOfMeasure === u
                            ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quantity and Unit Cost with explanatory notes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Initial Current Stock
                  </label>
                  <input
                    name="current_stock"
                    type="number"
                    step="0.01"
                    min="0"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    placeholder="e.g. 120"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    <strong>Initial Current Stock:</strong> Physical quantity currently on your shelves right now (e.g. 120 {addUnitOfMeasure || 'kg'}). If none yet, enter 0.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Unit Cost (UGX)
                  </label>
                  <input
                    name="unit_cost"
                    type="number"
                    step="1"
                    min="0"
                    value={addUnitCost}
                    onChange={(e) => setAddUnitCost(e.target.value)}
                    placeholder="e.g. 3500"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    <strong>Unit Cost:</strong> Purchase price paid for one single {addUnitOfMeasure || 'unit'} (e.g. UGX 3,500 per 1 kg).
                  </p>
                </div>
              </div>

              {/* Dynamic Live Value Calculator Card */}
              {(() => {
                const qtyVal = Number(addQty) || 0;
                const costVal = Number(addUnitCost) || 0;
                const totalVal = qtyVal * costVal;
                return (
                  <div className="p-3.5 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-gradient-to-br from-teal-50/70 to-emerald-50/50 dark:from-teal-950/20 dark:to-emerald-950/20">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-teal-900 dark:text-teal-200">
                        <Calculator className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Calculated Initial Opening Value</span>
                      </div>
                      <span className="font-extrabold text-sm text-teal-700 dark:text-teal-300">
                        {fmtUGX(totalVal)}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <span>Formula: {qtyVal} {addUnitOfMeasure || 'units'} &times; {fmtUGX(costVal)}/unit</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {totalVal > 0 ? 'Total amount spent on current stock' : 'Enter stock & unit cost to see total'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Planned Daily Usage
                  </label>
                  <input
                    name="planned_daily_usage"
                    type="number"
                    step="0.01"
                    defaultValue="0"
                    placeholder="e.g. 20 kg/day"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">
                    Used to calculate stock runway
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Min Reorder Alert Level
                  </label>
                  <input
                    name="min_reorder_level"
                    type="number"
                    step="0.01"
                    defaultValue="50"
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">
                    Triggers low-stock warnings
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Storage Location (Optional)
                </label>
                <input
                  name="storage_location"
                  type="text"
                  placeholder="e.g. Main Kitchen Pantry, Store Room B"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  name="notes"
                  type="text"
                  placeholder="e.g. Quality grade, supplier details, delivery terms"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddItemOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="px-5 py-2 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm disabled:opacity-50"
                >
                  {addMutation.isPending ? 'Saving...' : 'Save Commodity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: RESTOCK / RECORD EXPENSE ===================== */}
      {restockModalOpen && activeRestockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Restock Store Commodity
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add new stock to an existing commodity and record the purchase expense.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestockModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const data = new FormData(form);

                restockMutation.mutate({
                  item_id: activeRestockItem.id,
                  quantity: Number(restockQty),
                  unit_cost: Number(restockCost),
                  supplier: data.get('supplier') as string,
                  notes: data.get('notes') as string,
                  record_as_expense: data.get('record_as_expense') === 'on',
                  payment_method: data.get('payment_method') as string,
                });
              }}
              className="mt-4 space-y-4 text-xs"
            >
              {/* Commodity Selector to allow searching or picking any item */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Commodity to Restock *
                </label>
                <select
                  value={activeRestockItem.id}
                  onChange={(e) => {
                    const found = items.find((i) => i.id === e.target.value);
                    if (found) {
                      setSelectedRestockId(found.id);
                      setRestockCost(found.unit_cost || '');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} — Current: {it.current_stock} {it.unit_of_measure} (Unit Cost: {fmtUGX(it.unit_cost)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Current balance & planned rate info card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Current Balance on Hand
                  </div>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {activeRestockItem.current_stock} {activeRestockItem.unit_of_measure}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Last recorded unit cost: {fmtUGX(activeRestockItem.unit_cost)}/{activeRestockItem.unit_of_measure}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Planned Usage Rate
                  </div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {activeRestockItem.planned_daily_usage > 0
                      ? `${activeRestockItem.planned_daily_usage} ${activeRestockItem.unit_of_measure}/day`
                      : 'Not configured'}
                  </div>
                  {activeRestockItem.days_runway !== null && (
                    <div className="text-[10px] text-slate-500">
                      Runway: {activeRestockItem.days_runway} days
                    </div>
                  )}
                </div>
              </div>

              {/* Added Quantity & Batch Purchase Unit Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Quantity to Add ({activeRestockItem.unit_of_measure}) *
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    placeholder="e.g. 30"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Enter additional {activeRestockItem.unit_of_measure} received from supplier.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Batch Unit Cost (UGX per {activeRestockItem.unit_of_measure}) *
                  </label>
                  <input
                    name="unit_cost"
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={restockCost}
                    onChange={(e) => setRestockCost(e.target.value)}
                    placeholder="e.g. 3800"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Price paid per {activeRestockItem.unit_of_measure} for this specific delivery batch.
                  </p>
                </div>
              </div>

              {/* Dynamic Live Calculation Card for Restock */}
              {(() => {
                const addQ = Number(restockQty) || 0;
                const cost = Number(restockCost) || 0;
                const batchTotal = addQ * cost;
                const newStockTotal = Number(activeRestockItem.current_stock) + addQ;
                return (
                  <div className="p-3.5 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-gradient-to-br from-teal-50/70 to-emerald-50/50 dark:from-teal-950/20 dark:to-emerald-950/20 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-teal-900 dark:text-teal-200">
                        <Calculator className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Live Restock Calculations</span>
                      </div>
                      <span className="font-extrabold text-sm text-teal-700 dark:text-teal-300">
                        {fmtUGX(batchTotal)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-teal-200/50 dark:border-teal-800/40 text-[11px]">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">Total Batch Expenditure:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {addQ > 0 && cost > 0
                            ? `${addQ} ${activeRestockItem.unit_of_measure} × ${fmtUGX(cost)}`
                            : 'Enter quantity & batch cost'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 dark:text-slate-400 block">New Total Stock Balance:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {activeRestockItem.current_stock} + {addQ} = {newStockTotal} {activeRestockItem.unit_of_measure}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supplier / Vendor Name
                </label>
                <input
                  name="supplier"
                  type="text"
                  placeholder="e.g. Tororo Millers Ltd, Mukwano Distributors"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              {/* Automatic Expense Linkage Checkbox */}
              <div className="p-3.5 rounded-xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/50 dark:bg-teal-950/20 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="record_as_expense"
                    defaultChecked
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="font-semibold text-teal-900 dark:text-teal-200">
                    Automatically record as School Expense
                  </span>
                </label>
                <p className="text-[11px] text-teal-700 dark:text-teal-400 pl-6">
                  Links this purchase directly into the Accounts expenses portal under &quot;Feeding & Boarding — Food supplies&quot; for complete financial transparency.
                </p>

                <div className="pl-6 pt-1">
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Payment Method
                  </label>
                  <select
                    name="payment_method"
                    defaultValue="cash"
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Invoice Reference
                </label>
                <input
                  name="notes"
                  type="text"
                  placeholder="e.g. Receipt #INV-4921, 10 bags delivery"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRestockModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={restockMutation.isPending}
                  className="px-5 py-2 rounded-xl font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-sm disabled:opacity-50"
                >
                  {restockMutation.isPending ? 'Recording Restock...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: DAILY KITCHEN DISPATCH ===================== */}
      {dispatchItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Dispatch {dispatchItem.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Record daily kitchen usage and deduct from remaining stock.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const data = new FormData(form);

                dispatchMutation.mutate({
                  item_id: dispatchItem.id,
                  quantity: Number(data.get('quantity')),
                  recipient: data.get('recipient') as string,
                  notes: data.get('notes') as string,
                });
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Current Balance
                  </div>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {dispatchItem.current_stock} {dispatchItem.unit_of_measure}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Target Daily Usage
                  </div>
                  <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {dispatchItem.planned_daily_usage} {dispatchItem.unit_of_measure}/day
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity Dispatched ({dispatchItem.unit_of_measure}) *
                </label>
                <input
                  name="quantity"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={dispatchItem.planned_daily_usage > 0 ? dispatchItem.planned_daily_usage : ''}
                  placeholder={`e.g. ${dispatchItem.planned_daily_usage || 100}`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient / Kitchen Chef
                </label>
                <input
                  name="recipient"
                  type="text"
                  defaultValue="Main Kitchen / Daily Meal Prep"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  name="notes"
                  type="text"
                  placeholder="e.g. Lunch for 420 students and staff"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDispatchItem(null)}
                  className="px-4 py-2 rounded-xl font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatchMutation.isPending}
                  className="px-5 py-2 rounded-xl font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-sm disabled:opacity-50"
                >
                  {dispatchMutation.isPending ? 'Logging Dispatch...' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: STOCK ADJUSTMENT ===================== */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Stocktake Audit: {adjustItem.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Reconcile physical stock count against system records.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const data = new FormData(form);

                adjustMutation.mutate({
                  item_id: adjustItem.id,
                  new_quantity: Number(data.get('new_quantity')),
                  reason: data.get('reason') as string,
                  notes: data.get('notes') as string,
                });
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Actual Physical Count ({adjustItem.unit_of_measure}) *
                </label>
                <input
                  name="new_quantity"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={adjustItem.current_stock}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">
                  System currently records {adjustItem.current_stock} {adjustItem.unit_of_measure}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Reason *
                </label>
                <select
                  name="reason"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="Physical Stocktake Audit">Physical Stocktake Audit</option>
                  <option value="Damaged / Spoilage">Damaged / Spoilage</option>
                  <option value="Weighing Discrepancy">Weighing Discrepancy</option>
                  <option value="Supplier Return">Supplier Return</option>
                  <option value="Other Reconcile">Other Correction</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  name="notes"
                  type="text"
                  placeholder="e.g. End of month physical recount by bursar"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="px-4 py-2 rounded-xl font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm disabled:opacity-50"
                >
                  {adjustMutation.isPending ? 'Saving...' : 'Apply Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: MOVEMENTS / TRANSACTIONS HISTORY ===================== */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Stock Movement History & Audit Log
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chronological record of stock purchases, kitchen dispatches, and adjustments.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 pr-1">
              {transactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No stock transactions recorded yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Commodity</th>
                      <th className="px-3 py-2.5">Movement Type</th>
                      <th className="px-3 py-2.5">Quantity</th>
                      <th className="px-3 py-2.5">Total Cost</th>
                      <th className="px-3 py-2.5">Party / Recipient</th>
                      <th className="px-3 py-2.5">Expense Linked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.map((tx) => {
                      const isPurchase = tx.transaction_type === 'purchase_in';
                      const isDispatch = tx.transaction_type === 'dispatch_out';

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                            {tx.transaction_date}
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                            {tx.item_name}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isPurchase
                                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                                  : isDispatch
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                              }`}
                            >
                              {isPurchase ? '+ Stock In' : isDispatch ? '- Dispatch' : 'Adjust'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-slate-200">
                            {isDispatch ? '-' : '+'}{tx.quantity} {tx.unit_of_measure}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                            {tx.total_cost > 0 ? fmtUGX(tx.total_cost) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                            {tx.recipient_or_supplier || '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            {tx.linked_expense_id ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Recorded</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
