import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useSchoolName } from '@/lib/useSchoolName';
import { useSchoolType } from '@/hooks/useSchoolType';
import { exportToPdf, exportToExcel, type ExportColumn } from '@/lib/exportUtils';
import { invalidateAllFinancialQueries } from '@/lib/realtimeFinanceSync';
import {
  Armchair,
  Bed,
  Table,
  Layers,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  DollarSign,
  Plus,
  Building2,
  Search,
  Filter,
  Download,
  RefreshCw,
  FileText,
  X,
  ChevronRight,
  Check,
  LayoutGrid,
  List,
  Shield,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
  Edit3,
  MapPin,
  Clock,
  ArrowRight,
  School,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER, fmtUGX } from '@/styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';
import {
  fetchSchoolAssets,
  fetchAssetDamages,
  createSchoolAsset,
  reportAssetDamage,
  recordRepairExpense,
  markAssetAsRepaired,
  updateAssetAllocations,
  deleteSchoolAsset,
  computePropertyKpis,
} from '@/features/property-assets/services/propertyAssetService';
import type {
  SchoolFurnitureAsset,
  AssetDamageReport,
  AssetCategory,
  CreateAssetInput,
  ReportDamageInput,
  RecordRepairExpenseInput,
  ClassroomAllocation,
} from '@/features/property-assets/types';

const CATEGORY_METAS: Record<AssetCategory, { label: string; icon: React.ElementType; color: string }> = {
  furniture_seating: { label: 'Chairs & Seating', icon: Armchair, color: '#10d9a8' },
  furniture_tables: { label: 'Tables & Desks', icon: Table, color: '#3b82f6' },
  dormitory_bedding: { label: 'Beds & Dormitory', icon: Bed, color: '#a855f7' },
  classroom_fixtures: { label: 'Classroom Fixtures', icon: School, color: '#f59e0b' },
  lab_electronics: { label: 'Lab & Electronics', icon: Layers, color: '#ec4899' },
  sports_recreation: { label: 'Sports & Games', icon: Shield, color: '#14b8a6' },
  general_property: { label: 'General Facilities', icon: Building2, color: '#6366f1' },
};

const COMMON_ROOMS = [
  'Senior 1 A',
  'Senior 1 B',
  'Senior 2 A',
  'Senior 2 B',
  'Senior 3 A',
  'Senior 3 B',
  'Senior 4 A',
  'Senior 4 B',
  'Senior 5 Arts',
  'Senior 5 Sciences',
  'Senior 6 Arts',
  'Senior 6 Sciences',
  'Nile House (Boys)',
  'Victoria House (Girls)',
  'Albert House (Boys)',
  'Staff Room',
  'Main Science Lab',
  'Computer Lab',
  'Main Library',
  'Dining Hall',
  'Central Furniture Store',
];

const COMMON_TERTIARY_ROOMS = [
  'Central Institutional Store',
  'Lecture Hall 1',
  'Lecture Hall 2',
  'Lecture Hall 3',
  'Clinical Skills Demonstration Lab',
  'Anatomy & Physiology Lab',
  'Computer & Research Lab',
  'Main Campus Library',
  'Tutors Staff Room',
  'Principal / Dean Office',
  'Trainee Hostel Block A',
  'Trainee Hostel Block B',
  'Campus Dining & Assembly Hall',
];

export default function PropertyAssetsPage() {
  const queryClient = useQueryClient();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;
  const schoolName = useSchoolName();
  const { isTertiary } = useSchoolType();

  // Navigation / Tabs state
  const [activeTab, setActiveTab] = useState<'catalog' | 'rooms' | 'repairs'>('catalog');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [isRepairExpenseModalOpen, setIsRepairExpenseModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [selectedAssetForAction, setSelectedAssetForAction] = useState<SchoolFurnitureAsset | null>(null);
  const [selectedDamageForRepair, setSelectedDamageForRepair] = useState<AssetDamageReport | null>(null);
  const [addCategory, setAddCategory] = useState<AssetCategory>('furniture_seating');
  const [addPaymentMethod, setAddPaymentMethod] = useState<string>('Bank Transfer');
  const [damageAssetId, setDamageAssetId] = useState<string>('');
  const [damageType, setDamageType] = useState<string>('broken');
  const [repairPaymentMethod, setRepairPaymentMethod] = useState<string>('Cash');

  // Queries
  const {
    data: assets = [],
    isLoading: loadingAssets,
    refetch: refetchAssets,
    isFetching: fetchingAssets,
  } = useQuery({
    queryKey: ['school-furniture-assets', schoolId, isTertiary],
    queryFn: () => (schoolId ? fetchSchoolAssets(schoolId, isTertiary) : Promise.resolve([])),
    enabled: !!schoolId,
    staleTime: 60_000,
  });

  const {
    data: damages = [],
    isLoading: loadingDamages,
    refetch: refetchDamages,
  } = useQuery({
    queryKey: ['school-asset-damages', schoolId, isTertiary],
    queryFn: () => (schoolId ? fetchAssetDamages(schoolId, isTertiary) : Promise.resolve([])),
    enabled: !!schoolId,
    staleTime: 60_000,
  });

  // KPIs
  const kpis = useMemo(() => computePropertyKpis(assets, damages), [assets, damages]);

  // Extract distinct rooms from allocations
  const distinctRooms = useMemo(() => {
    const baseRooms = isTertiary ? COMMON_TERTIARY_ROOMS : COMMON_ROOMS;
    const set = new Set<string>(baseRooms);
    assets.forEach((a) => {
      a.allocations?.forEach((alloc) => {
        if (alloc.room_name?.trim()) set.add(alloc.room_name.trim());
      });
    });
    return Array.from(set).sort();
  }, [assets, isTertiary]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.asset_code && a.asset_code.toLowerCase().includes(q)) ||
        (a.supplier && a.supplier.toLowerCase().includes(q)) ||
        (a.notes && a.notes.toLowerCase().includes(q)) ||
        a.allocations?.some((alloc) => alloc.room_name.toLowerCase().includes(q))
      );
    });
  }, [assets, categoryFilter, search]);

  // Room-by-room aggregation
  const roomInventory = useMemo(() => {
    const map = new Map<
      string,
      {
        room_name: string;
        items: { asset_name: string; category: AssetCategory; quantity: number }[];
        totalItems: number;
        brokenReports: AssetDamageReport[];
      }
    >();

    distinctRooms.forEach((r) => {
      map.set(r, { room_name: r, items: [], totalItems: 0, brokenReports: [] });
    });

    assets.forEach((a) => {
      a.allocations?.forEach((alloc) => {
        const rn = alloc.room_name?.trim();
        if (!rn) return;
        if (!map.has(rn)) {
          map.set(rn, { room_name: rn, items: [], totalItems: 0, brokenReports: [] });
        }
        const entry = map.get(rn)!;
        entry.items.push({ asset_name: a.name, category: a.category, quantity: alloc.quantity_allocated });
        entry.totalItems += alloc.quantity_allocated;
      });
    });

    damages.forEach((d) => {
      if (d.status !== 'repaired' && map.has(d.room_name)) {
        map.get(d.room_name)!.brokenReports.push(d);
      }
    });

    const list = Array.from(map.values()).filter((e) => e.totalItems > 0 || e.brokenReports.length > 0);
    return list.sort((a, b) => b.totalItems - a.totalItems);
  }, [assets, damages, distinctRooms]);

  // Mutations
  const createAssetMut = useMutation({
    mutationFn: (input: CreateAssetInput) => createSchoolAsset(schoolId!, input, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-furniture-assets'] });
      if (schoolId) {
        invalidateAllFinancialQueries(queryClient, schoolId);
      }
      setIsAddModalOpen(false);
    },
  });

  const reportDamageMut = useMutation({
    mutationFn: (input: ReportDamageInput) => reportAssetDamage(schoolId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-furniture-assets'] });
      queryClient.invalidateQueries({ queryKey: ['school-asset-damages'] });
      setIsDamageModalOpen(false);
    },
  });

  const recordExpenseMut = useMutation({
    mutationFn: (input: RecordRepairExpenseInput) => recordRepairExpense(schoolId!, input, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-furniture-assets'] });
      queryClient.invalidateQueries({ queryKey: ['school-asset-damages'] });
      if (schoolId) {
        invalidateAllFinancialQueries(queryClient, schoolId);
      }
      setIsRepairExpenseModalOpen(false);
    },
  });

  const markRepairedMut = useMutation({
    mutationFn: (damageId: string) => markAssetAsRepaired(schoolId!, damageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-furniture-assets'] });
      queryClient.invalidateQueries({ queryKey: ['school-asset-damages'] });
    },
  });

  const allocateMut = useMutation({
    mutationFn: ({ assetId, allocations }: { assetId: string; allocations: ClassroomAllocation[] }) =>
      updateAssetAllocations(schoolId!, assetId, allocations),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-furniture-assets'] });
      setIsAllocateModalOpen(false);
    },
  });

  const deleteAssetMut = useMutation({
    mutationFn: (assetId: string) => deleteSchoolAsset(schoolId!, assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-furniture-assets'] });
    },
  });

  // PDF Export
  const handleExportPdf = () => {
    const columns: ExportColumn[] = [
      { header: '#', key: 'index', width: 0.6, align: 'center' },
      { header: 'Property Item', key: 'name', width: 2.4 },
      { header: 'Tag / Code', key: 'asset_code', width: 1.4 },
      { header: 'Category', key: 'category_label', width: 1.8 },
      { header: 'Total', key: 'total_quantity', width: 1.0, align: 'right' },
      { header: 'Active', key: 'active_quantity', width: 1.0, align: 'right' },
      { header: 'Broken', key: 'broken_quantity', width: 1.0, align: 'right' },
      { header: 'Unit Cost', key: 'unit_cost', width: 1.5, align: 'right' },
    ];

    const rows = filteredAssets.map((a, i) => ({
      index: i + 1,
      name: a.name,
      asset_code: a.asset_code || '—',
      category_label: CATEGORY_METAS[a.category]?.label || a.category,
      total_quantity: a.total_quantity,
      active_quantity: a.active_quantity,
      broken_quantity: a.broken_quantity,
      unit_cost: a.unit_purchase_cost ? fmtUGX(a.unit_purchase_cost) : '—',
    }));

    exportToPdf({
      title: 'INSTITUTIONAL FURNITURE & PROPERTY INVENTORY',
      subtitle: `Physical Assets Register & Classroom Allocation Audit · ${filteredAssets.length} Item Lines`,
      schoolName: schoolName || 'PwezaCore Educational Institution',
      columns,
      rows,
      filename: `School_Property_Inventory_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  // Excel Export
  const handleExportExcel = () => {
    const columns: ExportColumn[] = [
      { header: 'Item Name', key: 'name' },
      { header: 'Asset Code', key: 'asset_code' },
      { header: 'Category', key: 'category_label' },
      { header: 'Total Quantity', key: 'total_quantity' },
      { header: 'Active / Good', key: 'active_quantity' },
      { header: 'Broken / Damaged', key: 'broken_quantity' },
      { header: 'In Repair', key: 'in_repair_quantity' },
      { header: 'Unit Purchase Cost (UGX)', key: 'unit_purchase_cost' },
      { header: 'Est. Unit Repair Cost (UGX)', key: 'estimated_unit_repair_cost' },
      { header: 'Room Allocations', key: 'allocations' },
      { header: 'Supplier', key: 'supplier' },
      { header: 'Purchase Date', key: 'purchase_date' },
    ];

    const rows = filteredAssets.map((a) => ({
      name: a.name,
      asset_code: a.asset_code || '',
      category_label: CATEGORY_METAS[a.category]?.label || a.category,
      total_quantity: a.total_quantity,
      active_quantity: a.active_quantity,
      broken_quantity: a.broken_quantity,
      in_repair_quantity: a.in_repair_quantity,
      unit_purchase_cost: a.unit_purchase_cost || 0,
      estimated_unit_repair_cost: a.estimated_unit_repair_cost || 0,
      allocations: (a.allocations || []).map((al) => `${al.room_name}: ${al.quantity_allocated}`).join('; '),
      supplier: a.supplier || '',
      purchase_date: a.purchase_date || '',
    }));

    exportToExcel({
      title: 'School Furniture & Property Inventory',
      schoolName: schoolName || 'PwezaCore',
      columns,
      rows,
      filename: `School_Property_Assets_${new Date().toISOString().slice(0, 10)}.xlsx`,
    });
  };

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 min-h-screen"
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
        fontFamily: INTER,
      }}
    >
      {/* ── TOP HEADER & CONTROLS ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
              style={{
                backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                color: t.mint,
                fontFamily: SORA,
              }}
            >
              School Facilities & Property
            </span>
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.08)',
                color: t.blue,
              }}
            >
              Fixed Assets & Furniture Register
            </span>
          </div>

          <h1
            className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight"
            style={{ fontFamily: SORA, color: t.textHi }}
          >
            Furniture & Property Assets
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Add New Purchase CTA */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
            style={{
              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
              color: t.ctaText,
            }}
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Purchase / Asset</span>
          </button>

          {/* Report Breakage CTA */}
          <button
            type="button"
            onClick={() => {
              setSelectedAssetForAction(null);
              setIsDamageModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm"
            style={{
              backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(220,38,38,0.08)',
              border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : 'rgba(220,38,38,0.2)'}`,
              color: t.red,
            }}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Report Broken / Damage</span>
          </button>

          {/* PDF Roster */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={filteredAssets.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
            title="Download printable PDF inventory"
          >
            <Download className="w-3.5 h-3.5" style={{ color: t.mint }} />
            <span>PDF</span>
          </button>

          {/* Excel Export */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredAssets.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
            title="Download Excel spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" style={{ color: t.blue }} />
            <span>Excel</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => {
              refetchAssets();
              refetchDamages();
            }}
            disabled={fetchingAssets}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingAssets ? 'animate-spin' : ''}`} style={{ color: t.mint }} />
          </button>
        </div>
      </div>

      {/* ── KPI STATS STRIP ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Physical Assets */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: t.textLow }}>
              Total Assets
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(61,232,160,0.15)' : 'rgba(16,185,129,0.12)',
                color: t.mint,
              }}
            >
              <Table className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {loadingAssets ? '...' : kpis.total_assets.toLocaleString()}
          </div>
          <div className="text-xs mt-1 truncate" style={{ color: t.textMid }}>
            Valued at ~{fmtUGX(kpis.total_valuation)}
          </div>
        </div>

        {/* Active & Good */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: t.textLow }}>
              Active & Usable
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.10)',
                color: t.blue,
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {loadingAssets ? '...' : kpis.active_assets.toLocaleString()}
          </div>
          <div className="text-xs mt-1 truncate" style={{ color: t.textMid }}>
            {kpis.total_assets > 0 ? `${Math.round((kpis.active_assets / kpis.total_assets) * 100)}% in service` : '0% in service'}
          </div>
        </div>

        {/* Broken / Damaged */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: t.textLow }}>
              Broken / Damaged
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(220,38,38,0.10)',
                color: t.red,
              }}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.red }}>
            {loadingAssets ? '...' : kpis.broken_assets.toLocaleString()}
          </div>
          <div className="text-xs mt-1 truncate" style={{ color: t.textMid }}>
            {kpis.in_repair_assets > 0 ? `(${kpis.in_repair_assets} currently in workshop)` : 'Needs repair attention'}
          </div>
        </div>

        {/* Estimated Repair Burden */}
        <div
          className="p-4 sm:p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: t.textLow }}>
              Est. Repair Burden
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(245,192,68,0.15)' : 'rgba(217,119,6,0.10)',
                color: t.gold,
              }}
            >
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.gold }}>
            {loadingAssets ? '...' : fmtUGX(kpis.estimated_repair_cost_total)}
          </div>
          <div className="text-xs mt-1 truncate" style={{ color: t.textMid }}>
            Loggable directly into Finance expenses
          </div>
        </div>
      </div>

      {/* ── MAIN TABS SWITCHER ────────────────────────────────────────────── */}
      <div
        className="flex items-center p-1 rounded-2xl shadow-sm"
        style={{
          backgroundColor: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all"
          style={{
            backgroundColor: activeTab === 'catalog' ? (isDark ? 'rgba(255,255,255,0.10)' : '#ffffff') : 'transparent',
            color: activeTab === 'catalog' ? t.textHi : t.textLow,
            boxShadow: activeTab === 'catalog' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <Table className="w-4 h-4" />
          <span>Furniture & Asset Catalog ({assets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rooms')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all"
          style={{
            backgroundColor: activeTab === 'rooms' ? (isDark ? 'rgba(255,255,255,0.10)' : '#ffffff') : 'transparent',
            color: activeTab === 'rooms' ? t.textHi : t.textLow,
            boxShadow: activeTab === 'rooms' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <School className="w-4 h-4" />
          <span>Classroom & Room Allocations ({roomInventory.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('repairs')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all"
          style={{
            backgroundColor: activeTab === 'repairs' ? (isDark ? 'rgba(255,255,255,0.10)' : '#ffffff') : 'transparent',
            color: activeTab === 'repairs' ? t.textHi : t.textLow,
            boxShadow: activeTab === 'repairs' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <Wrench className="w-4 h-4" />
          <span>Breakages & Repair Ledger ({damages.filter((d) => d.status !== 'repaired').length} pending)</span>
        </button>
      </div>

      {/* ── TAB 1: FURNITURE & ASSET CATALOG ──────────────────────────────── */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Search, Category Filter, and View Mode Switcher */}
          <div
            className="p-4 rounded-2xl shadow-sm space-y-3.5"
            style={{
              background: cardGrad(isDark),
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: t.textLow }}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search assets by name, code, room, or supplier..."
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl text-xs sm:text-sm transition-all focus:outline-none"
                  style={{
                    backgroundColor: t.fieldBg,
                    border: `1px solid ${t.stroke}`,
                    color: t.textHi,
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: t.textLow }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* View Toggle (Grid / Table) */}
              <div
                className="flex items-center p-1 rounded-xl shrink-0"
                style={{
                  backgroundColor: t.panel,
                  border: `1px solid ${t.stroke}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className="p-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: viewMode === 'grid' ? (isDark ? 'rgba(255,255,255,0.12)' : '#ffffff') : 'transparent',
                    color: viewMode === 'grid' ? t.textHi : t.textLow,
                  }}
                  title="Grid Cards"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className="p-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: viewMode === 'table' ? (isDark ? 'rgba(255,255,255,0.12)' : '#ffffff') : 'transparent',
                    color: viewMode === 'table' ? t.textHi : t.textLow,
                  }}
                  title="Data Table"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t" style={{ borderColor: t.divider }}>
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: categoryFilter === 'ALL' ? t.chipOn : 'transparent',
                  color: categoryFilter === 'ALL' ? t.mint : t.textMid,
                  border: `1px solid ${categoryFilter === 'ALL' ? t.mintRing : 'transparent'}`,
                }}
              >
                All Categories ({assets.length})
              </button>

              {(Object.keys(CATEGORY_METAS) as AssetCategory[]).map((cat) => {
                const meta = CATEGORY_METAS[cat];
                const count = assets.filter((a) => a.category === cat).length;
                const active = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: active ? (isDark ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.10)') : 'transparent',
                      color: active ? t.blue : t.textMid,
                      border: `1px solid ${active ? (isDark ? 'rgba(59,130,246,0.3)' : 'rgba(37,99,235,0.25)') : 'transparent'}`,
                    }}
                  >
                    <meta.icon className="w-3.5 h-3.5" />
                    <span>
                      {meta.label} ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards or Table */}
          {loadingAssets ? (
            <div className="p-12 text-center rounded-2xl flex flex-col items-center justify-center gap-3" style={{ background: cardGrad(isDark), border: `1px solid ${t.stroke}` }}>
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: t.mint }} />
              <div className="text-sm font-semibold">Loading physical furniture and property assets...</div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-12 text-center rounded-2xl flex flex-col items-center justify-center gap-3" style={{ background: cardGrad(isDark), border: `1px solid ${t.stroke}` }}>
              <Table className="w-10 h-10" style={{ color: t.textLow }} />
              <div className="text-base font-bold" style={{ fontFamily: SORA }}>No property assets found</div>
              <p className="text-xs max-w-md" style={{ color: t.textMid }}>
                Try adjusting your search query or category filter, or click "+ Add New Purchase / Asset" to record new school property.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map((a) => {
                const meta = CATEGORY_METAS[a.category] || CATEGORY_METAS.general_property;
                const IconComponent = meta.icon;
                const hasBroken = a.broken_quantity > 0;

                return (
                  <div
                    key={a.id}
                    className="p-5 rounded-2xl flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md relative overflow-hidden"
                    style={{
                      background: cardGrad(isDark),
                      border: `1px solid ${hasBroken ? (isDark ? 'rgba(239,68,68,0.25)' : 'rgba(220,38,38,0.2)') : t.stroke}`,
                    }}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                            style={{
                              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                              color: meta.color,
                            }}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-0.5"
                              style={{
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                color: meta.color,
                              }}
                            >
                              {meta.label}
                            </span>
                            <h2 className="font-bold text-sm leading-snug line-clamp-2" style={{ fontFamily: SORA, color: t.textHi }}>
                              {a.name}
                            </h2>
                          </div>
                        </div>

                        {a.asset_code && (
                          <span
                            className="text-[11px] font-mono px-2 py-0.5 rounded-md border shrink-0"
                            style={{
                              backgroundColor: t.fieldBg,
                              borderColor: t.stroke,
                              color: t.textLow,
                            }}
                          >
                            {a.asset_code}
                          </span>
                        )}
                      </div>

                      {/* Quantities Status Strip */}
                      <div
                        className="p-2.5 rounded-xl grid grid-cols-3 gap-2 text-center text-xs mb-3.5"
                        style={{
                          backgroundColor: t.fieldBg,
                          border: `1px solid ${t.stroke}`,
                        }}
                      >
                        <div>
                          <span className="block text-[10px] font-bold uppercase" style={{ color: t.textLow }}>
                            Total
                          </span>
                          <strong className="text-sm font-extrabold" style={{ fontFamily: SORA, color: t.textHi }}>
                            {a.total_quantity}
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase" style={{ color: t.mint }}>
                            Active
                          </span>
                          <strong className="text-sm font-extrabold" style={{ fontFamily: SORA, color: t.mint }}>
                            {a.active_quantity}
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase" style={{ color: hasBroken ? t.red : t.textLow }}>
                            Broken
                          </span>
                          <strong className="text-sm font-extrabold" style={{ fontFamily: SORA, color: hasBroken ? t.red : t.textLow }}>
                            {a.broken_quantity}
                          </strong>
                        </div>
                      </div>

                      {/* Classroom / Location Allocation Breakdown */}
                      <div className="mb-3.5">
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: t.textLow }}>
                          <span>{isTertiary ? 'Room & Facility Allocation' : 'Classroom Allocation'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAssetForAction(a);
                              setIsAllocateModalOpen(true);
                            }}
                            className="text-xs hover:underline"
                            style={{ color: t.mint }}
                          >
                            Edit Allocations
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(a.allocations || []).map((alloc) => (
                            <span
                              key={alloc.room_name}
                              className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                              style={{
                                backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(37,99,235,0.08)',
                                color: t.blue,
                              }}
                            >
                              {alloc.room_name}: <strong>{alloc.quantity_allocated}</strong>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Valuation / Costs info */}
                      <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor: t.divider }}>
                        <span style={{ color: t.textLow }}>Unit Purchase:</span>
                        <strong style={{ color: t.textHi }}>{a.unit_purchase_cost ? fmtUGX(a.unit_purchase_cost) : '—'}</strong>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span style={{ color: t.textLow }}>Est. Repair / Unit:</span>
                        <strong style={{ color: t.gold }}>{a.estimated_unit_repair_cost ? fmtUGX(a.estimated_unit_repair_cost) : '—'}</strong>
                      </div>
                    </div>

                    {/* Quick Action Footer */}
                    <div className="pt-4 mt-3 border-t flex items-center gap-2" style={{ borderColor: t.divider }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssetForAction(a);
                          setIsDamageModalOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
                        style={{
                          backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(220,38,38,0.08)',
                          color: t.red,
                        }}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Report Broken</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssetForAction(a);
                          setIsAllocateModalOpen(true);
                        }}
                        className="p-2 rounded-xl transition-all shadow-sm"
                        style={{
                          backgroundColor: t.panel,
                          border: `1px solid ${t.stroke}`,
                          color: t.textHi,
                        }}
                        title="Allocate to Classes"
                      >
                        <School className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove "${a.name}" from inventory?`)) {
                            deleteAssetMut.mutate(a.id);
                          }
                        }}
                        className="p-2 rounded-xl transition-all shadow-sm hover:opacity-80"
                        style={{
                          backgroundColor: t.panel,
                          border: `1px solid ${t.stroke}`,
                          color: t.textLow,
                        }}
                        title="Delete Asset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ background: cardGrad(isDark), borderColor: t.stroke }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: t.divider }}>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]" style={{ color: t.textLow }}>Item Name</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]" style={{ color: t.textLow }}>Code</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]" style={{ color: t.textLow }}>Category</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-right" style={{ color: t.textLow }}>Total</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-right" style={{ color: t.mint }}>Active</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-right" style={{ color: t.red }}>Broken</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]" style={{ color: t.textLow }}>{isTertiary ? 'Room Allocations' : 'Class Allocations'}</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px] text-right" style={{ color: t.textLow }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: t.divider }}>
                    {filteredAssets.map((a) => {
                      const meta = CATEGORY_METAS[a.category] || CATEGORY_METAS.general_property;
                      return (
                        <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-bold" style={{ color: t.textHi }}>{a.name}</td>
                          <td className="py-3 px-4 font-mono text-xs" style={{ color: t.textLow }}>{a.asset_code || '—'}</td>
                          <td className="py-3 px-4 text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</td>
                          <td className="py-3 px-4 text-right font-extrabold" style={{ color: t.textHi }}>{a.total_quantity}</td>
                          <td className="py-3 px-4 text-right font-extrabold" style={{ color: t.mint }}>{a.active_quantity}</td>
                          <td className="py-3 px-4 text-right font-extrabold" style={{ color: a.broken_quantity > 0 ? t.red : t.textLow }}>{a.broken_quantity}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {(a.allocations || []).map((alloc) => (
                                <span key={alloc.room_name} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: t.fieldBg, color: t.blue }}>
                                  {alloc.room_name}: {alloc.quantity_allocated}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAssetForAction(a);
                                setIsDamageModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                              style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(220,38,38,0.08)', color: t.red }}
                            >
                              Report Damage
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: CLASSROOM & ROOM ALLOCATIONS ────────────────────────────── */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ background: cardGrad(isDark), border: `1px solid ${t.stroke}` }}>
            <div>
              <h2 className="font-bold text-sm sm:text-base" style={{ fontFamily: SORA, color: t.textHi }}>
                {isTertiary ? 'Lecture Hall, Lab & Facility Audit' : 'Classroom, Dormitory & Room Audit'}
              </h2>
              <p className="text-xs" style={{ color: t.textMid }}>
                Physical property allocated to each specific room, active usable stock, and reported damaged furniture.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: t.textLow }}>Filter Room:</span>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="py-2 px-3 rounded-xl text-xs font-medium cursor-pointer"
                style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
              >
                <option value="ALL">All Rooms ({roomInventory.length})</option>
                {roomInventory.map((r) => (
                  <option key={r.room_name} value={r.room_name}>{r.room_name} ({r.totalItems} items)</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roomInventory
              .filter((r) => selectedRoom === 'ALL' || r.room_name === selectedRoom)
              .map((r) => {
                const hasDamage = r.brokenReports.length > 0;
                return (
                  <div
                    key={r.room_name}
                    className="p-5 rounded-2xl flex flex-col justify-between shadow-sm"
                    style={{
                      background: cardGrad(isDark),
                      border: `1px solid ${hasDamage ? (isDark ? 'rgba(239,68,68,0.25)' : 'rgba(220,38,38,0.2)') : t.stroke}`,
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <School className="w-4 h-4" style={{ color: t.mint }} />
                          <h3 className="font-bold text-base" style={{ fontFamily: SORA, color: t.textHi }}>
                            {r.room_name}
                          </h3>
                        </div>
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: t.chipOn, color: t.mint }}>
                          {r.totalItems} Items
                        </span>
                      </div>

                      {/* Items listed in this room */}
                      <div className="space-y-1.5 text-xs mb-4">
                        {r.items.map((item) => (
                          <div key={item.asset_name} className="flex items-center justify-between py-1 border-b" style={{ borderColor: t.divider }}>
                            <span style={{ color: t.textMid }}>{item.asset_name}</span>
                            <strong style={{ color: t.textHi }}>{item.quantity}</strong>
                          </div>
                        ))}
                      </div>

                      {/* Broken Items in Room alert */}
                      {hasDamage && (
                        <div className="p-2.5 rounded-xl space-y-1 text-xs" style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.10)' : 'rgba(220,38,38,0.06)', border: `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : 'rgba(220,38,38,0.15)'}` }}>
                          <div className="flex items-center gap-1.5 font-bold text-[11px]" style={{ color: t.red }}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Reported Breakages in this Room:</span>
                          </div>
                          {r.brokenReports.map((b) => (
                            <div key={b.id} className="text-[11px]" style={{ color: t.textMid }}>
                              · <strong>{b.quantity_damaged}x {b.asset_name}</strong>: {b.description}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── TAB 3: BREAKAGES & REPAIR LEDGER ───────────────────────────────── */}
      {activeTab === 'repairs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ background: cardGrad(isDark), border: `1px solid ${t.stroke}` }}>
            <div>
              <h2 className="font-bold text-sm sm:text-base" style={{ fontFamily: SORA, color: t.textHi }}>
                Damage, Breakage & Maintenance Ledger
              </h2>
              <p className="text-xs" style={{ color: t.textMid }}>
                Track broken furniture, calculate repair costs, log repairs into Finance Expenses, and restore repaired items back into service.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedAssetForAction(null);
                setIsDamageModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm"
              style={{
                backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(220,38,38,0.08)',
                border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : 'rgba(220,38,38,0.2)'}`,
                color: t.red,
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Report New Breakage</span>
            </button>
          </div>

          {damages.length === 0 ? (
            <div className="p-12 text-center rounded-2xl flex flex-col items-center justify-center gap-3" style={{ background: cardGrad(isDark), border: `1px solid ${t.stroke}` }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: t.mint }} />
              <div className="text-base font-bold" style={{ fontFamily: SORA }}>No damaged furniture reported</div>
              <p className="text-xs max-w-md" style={{ color: t.textMid }}>
                All recorded chairs, tables, desks, and beds are currently in good active service across the institution.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {damages.map((d) => {
                const isRepaired = d.status === 'repaired';
                const isInRepair = d.status === 'in_repair';
                return (
                  <div
                    key={d.id}
                    className="p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                    style={{
                      background: cardGrad(isDark),
                      border: `1px solid ${isRepaired ? t.stroke : isInRepair ? (isDark ? 'rgba(245,192,68,0.25)' : 'rgba(217,119,6,0.2)') : (isDark ? 'rgba(239,68,68,0.25)' : 'rgba(220,38,38,0.2)')}`,
                    }}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: isRepaired
                              ? (isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)')
                              : isInRepair
                              ? (isDark ? 'rgba(245,192,68,0.15)' : 'rgba(217,119,6,0.10)')
                              : (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(220,38,38,0.10)'),
                            color: isRepaired ? t.mint : isInRepair ? t.gold : t.red,
                          }}
                        >
                          {isRepaired ? 'Repaired & Restored' : isInRepair ? 'In Workshop / Under Repair' : 'Broken / Needs Repair'}
                        </span>
                        <span className="text-xs font-mono" style={{ color: t.textLow }}>
                          Reported: {d.reported_date}
                        </span>
                        <span className="text-xs font-medium" style={{ color: t.blue }}>
                          Location: <strong>{d.room_name}</strong>
                        </span>
                      </div>

                      <h3 className="font-bold text-sm sm:text-base leading-snug" style={{ fontFamily: SORA, color: t.textHi }}>
                        {d.quantity_damaged}x {d.asset_name}
                      </h3>
                      <p className="text-xs" style={{ color: t.textMid }}>
                        "{d.description}" — <span style={{ color: t.textLow }}>Reported by {d.reported_by || 'Staff'}</span>
                      </p>

                      <div className="flex items-center gap-4 text-xs pt-1">
                        <div>
                          <span style={{ color: t.textLow }}>Est. Repair Cost: </span>
                          <strong style={{ color: t.gold }}>{fmtUGX(d.estimated_repair_cost)}</strong>
                        </div>
                        {d.actual_repair_cost && (
                          <div>
                            <span style={{ color: t.textLow }}>Actual Cost Paid: </span>
                            <strong style={{ color: t.mint }}>{fmtUGX(d.actual_repair_cost)}</strong>
                          </div>
                        )}
                        {d.linked_expense_id && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ backgroundColor: t.fieldBg, color: t.mint }}>
                            Logged in Finance Expenses
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center flex-wrap gap-2 self-end sm:self-center shrink-0">
                      {!isRepaired && (
                        <>
                          {!d.linked_expense_id && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDamageForRepair(d);
                                setIsRepairExpenseModalOpen(true);
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                              style={{
                                backgroundColor: isDark ? 'rgba(245,192,68,0.15)' : 'rgba(217,119,6,0.10)',
                                border: `1px solid ${isDark ? 'rgba(245,192,68,0.3)' : 'rgba(217,119,6,0.25)'}`,
                                color: t.gold,
                              }}
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Record to Expense</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Confirm that ${d.quantity_damaged}x "${d.asset_name}" have been fully repaired and are ready for classroom use?`)) {
                                markRepairedMut.mutate(d.id);
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                              color: t.ctaText,
                            }}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark as Repaired</span>
                          </button>
                        </>
                      )}

                      {isRepaired && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: t.mint }}>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Restored on {d.repaired_date || 'recently'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: ADD NEW ASSET PURCHASE ─────────────────────────────────── */}
      <NativeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Furniture / Asset Purchase"
        subtitle="Catalog newly procured assets, assign initial room allocations, and log financial purchase ledgers."
        icon={Table}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const input: CreateAssetInput = {
              name: fd.get('name') as string,
              category: addCategory,
              total_quantity: Number(fd.get('total_quantity')) || 1,
              unit_purchase_cost: Number(fd.get('unit_purchase_cost')) || undefined,
              estimated_unit_repair_cost: Number(fd.get('estimated_unit_repair_cost')) || undefined,
              initial_room_name: (fd.get('initial_room_name') as string) || undefined,
              supplier: (fd.get('supplier') as string) || undefined,
              purchase_date: (fd.get('purchase_date') as string) || undefined,
              notes: (fd.get('notes') as string) || undefined,
              record_as_expense: fd.get('record_as_expense') === 'on',
              payment_method: addPaymentMethod,
            };
            createAssetMut.mutate(input);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Asset / Furniture Name *
            </label>
            <input
              required
              name="name"
              placeholder="e.g. Student Wooden Desk, Double-Decker Bunk Bed, Plastic Chair"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative z-[35] focus-within:z-[50]">
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <LiquidGlassSelect
                value={addCategory}
                onChange={(val) => setAddCategory(val as AssetCategory)}
                options={(Object.keys(CATEGORY_METAS) as AssetCategory[]).map((cat) => ({
                  value: cat,
                  label: CATEGORY_METAS[cat].label,
                }))}
                placeholder="Select Category..."
              />
            </div>
            <div className="relative z-[20] focus-within:z-[30]">
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Quantity Purchased *
              </label>
              <input
                required
                type="number"
                min="1"
                defaultValue="10"
                name="total_quantity"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 font-mono transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Unit Purchase Price (UGX)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 85000"
                name="unit_purchase_cost"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 font-mono transition-all shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Est. Unit Repair Cost (UGX)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 15000"
                name="estimated_unit_repair_cost"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 font-mono transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                {isTertiary ? 'Initial Room / Facility Allocation' : 'Initial Room / Class Allocation'}
              </label>
              <input
                list="common-rooms-list"
                name="initial_room_name"
                placeholder={isTertiary ? 'e.g. Lecture Hall 1 or Central Store' : 'e.g. Senior 1 A or Store'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
              />
              <datalist id="common-rooms-list">
                {distinctRooms.map((r) => <option key={r} value={r} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Supplier / Carpenter Name
              </label>
              <input
                name="supplier"
                placeholder="e.g. Kampala Timber Works"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Finance Expense Integration Checkbox */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3 relative z-[25] focus-within:z-[40]">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-white/90">
              <input type="checkbox" name="record_as_expense" defaultChecked className="rounded border-white/30 bg-black/30 text-emerald-500 focus:ring-emerald-400" />
              <span>Automatically Record Purchase in Finance Expenses</span>
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider shrink-0">Payment Method:</span>
              <div className="flex-1">
                <LiquidGlassSelect
                  value={addPaymentMethod}
                  onChange={(val) => setAddPaymentMethod(val)}
                  options={[
                    { value: 'Bank Transfer', label: 'Bank Transfer' },
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Mobile Money', label: 'Mobile Money' },
                    { value: 'Cheque', label: 'Cheque' },
                  ]}
                  placeholder="Select Payment Method"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Notes / Specifications
            </label>
            <textarea
              rows={2}
              name="notes"
              placeholder="Material quality, warranty notes, etc."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAssetMut.isPending}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 border border-emerald-400/30 transition-all disabled:opacity-50"
            >
              {createAssetMut.isPending ? 'Saving...' : 'Save Asset to Inventory'}
            </button>
          </div>
        </form>
      </NativeModal>

      {/* ── MODAL: REPORT DAMAGE / BREAKAGE ──────────────────────────────── */}
      <NativeModal
        isOpen={isDamageModalOpen}
        onClose={() => setIsDamageModalOpen(false)}
        title="Report Broken Furniture / Damage"
        subtitle="Log broken assets for carpentry restoration, welder repair, or student accountability billing."
        icon={AlertTriangle}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            reportDamageMut.mutate({
              asset_id: damageAssetId || selectedAssetForAction?.id || assets[0]?.id || '',
              room_name: fd.get('room_name') as string,
              quantity_damaged: Number(fd.get('quantity_damaged')) || 1,
              damage_type: (damageType as any) || 'broken',
              description: fd.get('description') as string,
              reported_by: (fd.get('reported_by') as string) || undefined,
              estimated_repair_cost: Number(fd.get('estimated_repair_cost')) || undefined,
            });
          }}
          className="space-y-4"
        >
          <div className="relative z-[35] focus-within:z-[50]">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Damaged Asset *
            </label>
            <LiquidGlassSelect
              value={damageAssetId || selectedAssetForAction?.id || assets[0]?.id || ''}
              onChange={(val) => setDamageAssetId(val)}
              options={assets.map((a) => ({
                value: a.id,
                label: `${a.name} (${a.active_quantity} active available)`,
              }))}
              placeholder="Select Damaged Asset..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Room / Class Location *
              </label>
              <input
                required
                list="damage-rooms-list"
                name="room_name"
                placeholder="e.g. Senior 2 B or Nile House"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
              />
              <datalist id="damage-rooms-list">
                {distinctRooms.map((r) => <option key={r} value={r} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Quantity Damaged *
              </label>
              <input
                required
                type="number"
                min="1"
                defaultValue="1"
                name="quantity_damaged"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 font-mono transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative z-[25] focus-within:z-[40]">
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Damage Nature
              </label>
              <LiquidGlassSelect
                value={damageType}
                onChange={(val) => setDamageType(val)}
                options={[
                  { value: 'broken', label: 'Broken / Snapped Joint' },
                  { value: 'cracked', label: 'Cracked Wood' },
                  { value: 'bent_metal', label: 'Bent Metal Frame' },
                  { value: 'missing_parts', label: 'Missing Screws / Parts' },
                  { value: 'wear_and_tear', label: 'General Wear & Tear' },
                  { value: 'vandalized', label: 'Vandalized / Carved' },
                ]}
                placeholder="Select damage nature..."
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Est. Total Repair Cost (UGX)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 25000"
                name="estimated_repair_cost"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 font-mono transition-all shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Description of Damage *
            </label>
            <textarea
              required
              rows={2}
              name="description"
              placeholder="Describe the physical damage so carpenter/welder knows what to fix..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Reported By
            </label>
            <input
              name="reported_by"
              defaultValue={user?.email || 'Class Teacher'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsDamageModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reportDamageMut.isPending}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-lg shadow-rose-500/25 border border-rose-400/30 transition-all disabled:opacity-50"
            >
              {reportDamageMut.isPending ? 'Recording...' : 'Submit Breakage Report'}
            </button>
          </div>
        </form>
      </NativeModal>

      {/* ── MODAL: RECORD REPAIR EXPENSE TO FINANCE ──────────────────────── */}
      <NativeModal
        isOpen={Boolean(isRepairExpenseModalOpen && selectedDamageForRepair)}
        onClose={() => setIsRepairExpenseModalOpen(false)}
        title="Record Repair to Finance Expense"
        subtitle="Post technician invoices and restoration expenses directly to the school finance ledger."
        icon={DollarSign}
        size="md"
      >
        {selectedDamageForRepair && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-1">
              <div className="font-bold text-white text-sm">
                {selectedDamageForRepair.quantity_damaged}x {selectedDamageForRepair.asset_name}
              </div>
              <div className="text-white/70">Location: {selectedDamageForRepair.room_name}</div>
              <div className="text-white/50 italic">"{selectedDamageForRepair.description}"</div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                recordExpenseMut.mutate({
                  damage_report_id: selectedDamageForRepair.id,
                  actual_cost: Number(fd.get('actual_cost')) || selectedDamageForRepair.estimated_repair_cost,
                  payment_method: repairPaymentMethod,
                  technician_name: (fd.get('technician_name') as string) || undefined,
                  notes: (fd.get('notes') as string) || undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Actual Repair Cost Paid (UGX) *
                </label>
                <input
                  required
                  type="number"
                  defaultValue={selectedDamageForRepair.estimated_repair_cost || 20000}
                  name="actual_cost"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative z-[35] focus-within:z-[50]">
                  <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Payment Method *
                  </label>
                  <LiquidGlassSelect
                    value={repairPaymentMethod}
                    onChange={(val) => setRepairPaymentMethod(val)}
                    options={[
                      { value: 'Cash', label: 'Cash' },
                      { value: 'Mobile Money', label: 'Mobile Money' },
                      { value: 'Bank Transfer', label: 'Bank Transfer' },
                      { value: 'Petty Cash', label: 'Petty Cash' },
                    ]}
                    placeholder="Select payment method..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Technician / Welder
                  </label>
                  <input
                    name="technician_name"
                    placeholder="e.g. Master Mukasa"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Repair Notes / Receipt Number
                </label>
                <input
                  name="notes"
                  placeholder="e.g. Welded both bottom legs and repainted frame"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsRepairExpenseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordExpenseMut.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 border border-emerald-400/30 transition-all disabled:opacity-50"
                >
                  {recordExpenseMut.isPending ? 'Logging...' : 'Post to Finance Expenses'}
                </button>
              </div>
            </form>
          </div>
        )}
      </NativeModal>

      {/* ── MODAL: ALLOCATE TO CLASSROOMS & ROOMS ────────────────────────── */}
      <NativeModal
        isOpen={Boolean(isAllocateModalOpen && selectedAssetForAction)}
        onClose={() => setIsAllocateModalOpen(false)}
        title={isTertiary ? `Room & Facility Allocation: ${selectedAssetForAction?.name}` : `Classroom Allocation: ${selectedAssetForAction?.name}`}
        subtitle="Distribute physical asset inventory across classrooms, laboratories, and lecture halls."
        icon={School}
        size="lg"
      >
        {selectedAssetForAction && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs flex items-center justify-between">
              <span className="text-white/70">Total Institutional Stock:</span>
              <strong className="text-emerald-400 font-mono text-sm">{selectedAssetForAction.total_quantity} units</strong>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const rows = form.querySelectorAll('.alloc-row');
                const nextAllocs: ClassroomAllocation[] = [];
                rows.forEach((r, idx) => {
                  const roomInput = r.querySelector<HTMLInputElement>('.room-input');
                  const qtyInput = r.querySelector<HTMLInputElement>('.qty-input');
                  if (roomInput && qtyInput && roomInput.value.trim()) {
                    nextAllocs.push({
                      room_id: `room-${idx}`,
                      room_name: roomInput.value.trim(),
                      room_type: 'classroom',
                      quantity_allocated: Number(qtyInput.value) || 0,
                    });
                  }
                });
                allocateMut.mutate({ assetId: selectedAssetForAction.id, allocations: nextAllocs });
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                {(selectedAssetForAction.allocations || []).map((alloc, i) => (
                  <div key={i} className="alloc-row flex items-center gap-2">
                    <input
                      list="common-rooms-list"
                      defaultValue={alloc.room_name}
                      placeholder={isTertiary ? 'Room, Lab or Store Name' : 'Class or Room Name'}
                      className="room-input flex-1 px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
                    />
                    <input
                      type="number"
                      min="0"
                      defaultValue={alloc.quantity_allocated}
                      placeholder="Qty"
                      className="qty-input w-24 px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-emerald-400 text-center font-bold text-xs font-mono focus:outline-none focus:border-emerald-400 focus:bg-black/35 shadow-inner"
                    />
                  </div>
                ))}
                {/* Additional 3 blank rows for adding new allocations */}
                {[1, 2, 3].map((n) => (
                  <div key={`new-${n}`} className="alloc-row flex items-center gap-2">
                    <input
                      list="common-rooms-list"
                      placeholder={isTertiary ? '+ Add Lecture Hall / Lab / Ward' : '+ Add Another Class / Dormitory'}
                      className="room-input flex-1 px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
                    />
                    <input
                      type="number"
                      min="0"
                      defaultValue={0}
                      placeholder="Qty"
                      className="qty-input w-24 px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-emerald-400 text-center font-bold text-xs font-mono focus:outline-none focus:border-emerald-400 focus:bg-black/35 shadow-inner"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAllocateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocateMut.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 border border-emerald-400/30 transition-all disabled:opacity-50"
                >
                  {allocateMut.isPending ? 'Updating...' : (isTertiary ? 'Save Room Allocations' : 'Save Classroom Allocations')}
                </button>
              </div>
            </form>
          </div>
        )}
      </NativeModal>
    </div>
  );
}
