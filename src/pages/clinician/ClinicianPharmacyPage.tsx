import { useState, useMemo } from 'react';
import {
  Pill,
  Search,
  Plus,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Package,
  ArrowUpDown,
  RefreshCw,
  X,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';
import { LiquidGlassSelect } from '@/components/ui/LiquidGlassSelect';

interface MedicineItem {
  id: string;
  name: string;
  category: 'Antimalarial' | 'Analgesic / Antipyretic' | 'Antibiotic' | 'First Aid & Wound Care' | 'Respiratory';
  dosageForm: string;
  currentStock: number;
  unit: string;
  reorderLevel: number;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  status: 'In Stock' | 'Low Stock' | 'Expiring Soon' | 'Out of Stock';
}

const INITIAL_MEDICINES: MedicineItem[] = [
  {
    id: 'm-1',
    name: 'Coartem (Artemether/Lumefantrine 20/120mg)',
    category: 'Antimalarial',
    dosageForm: 'Tablets (Blister 24s)',
    currentStock: 48,
    unit: 'boxes',
    reorderLevel: 15,
    batchNumber: 'CO-UG-2025-09',
    expiryDate: '2027-04-30',
    status: 'In Stock',
  },
  {
    id: 'm-2',
    name: 'Paracetamol 500mg',
    category: 'Analgesic / Antipyretic',
    dosageForm: 'Tablets (Tin 1000s)',
    currentStock: 4,
    unit: 'tins',
    reorderLevel: 2,
    batchNumber: 'PCM-2024-81',
    expiryDate: '2026-11-30',
    status: 'In Stock',
  },
  {
    id: 'm-3',
    name: 'Amoxicillin 250mg / 5ml Suspension',
    category: 'Antibiotic',
    dosageForm: 'Bottles (100ml)',
    currentStock: 3,
    unit: 'bottles',
    reorderLevel: 5,
    batchNumber: 'AMX-2025-11',
    expiryDate: '2026-10-15',
    status: 'Low Stock',
  },
  {
    id: 'm-4',
    name: 'Salbutamol Inhaler (100mcg/dose)',
    category: 'Respiratory',
    dosageForm: 'Metered Dose Inhaler',
    currentStock: 8,
    unit: 'canisters',
    reorderLevel: 3,
    batchNumber: 'SLB-2024-99',
    expiryDate: '2027-08-01',
    status: 'In Stock',
  },
  {
    id: 'm-5',
    name: 'Povidone Iodine 10% Antiseptic Solution',
    category: 'First Aid & Wound Care',
    dosageForm: 'Topical Liquid (500ml)',
    currentStock: 6,
    unit: 'bottles',
    reorderLevel: 2,
    batchNumber: 'PVD-2025-03',
    expiryDate: '2026-10-20',
    status: 'Expiring Soon',
  },
  {
    id: 'm-6',
    name: 'Oral Rehydration Salts (ORS) Sachets',
    category: 'Analgesic / Antipyretic',
    dosageForm: 'Oral Powder Sachets',
    currentStock: 120,
    unit: 'sachets',
    reorderLevel: 30,
    batchNumber: 'ORS-2025-55',
    expiryDate: '2028-01-01',
    status: 'In Stock',
  },
  {
    id: 'm-7',
    name: 'Crepe Elastic Bandages (7.5cm x 4.5m)',
    category: 'First Aid & Wound Care',
    dosageForm: 'Rolls',
    currentStock: 22,
    unit: 'rolls',
    reorderLevel: 10,
    batchNumber: 'CRB-2025-01',
    expiryDate: '2029-12-31',
    status: 'In Stock',
  },
  {
    id: 'm-8',
    name: 'Rapid Diagnostic Malaria Test Strips (RDT)',
    category: 'Antimalarial',
    dosageForm: 'Cassette Kits (25s)',
    currentStock: 2,
    unit: 'kits',
    reorderLevel: 5,
    batchNumber: 'RDT-2024-40',
    expiryDate: '2026-12-15',
    status: 'Low Stock',
  },
];

export default function ClinicianPharmacyPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [medicines, setMedicines] = useState<MedicineItem[]>(INITIAL_MEDICINES);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'Antimalarial' | 'Analgesic / Antipyretic' | 'Antibiotic' | 'First Aid & Wound Care' | 'Respiratory'>('Analgesic / Antipyretic');
  const [newForm, setNewForm] = useState('');
  const [newStock, setNewStock] = useState('10');
  const [newUnit, setNewUnit] = useState('boxes');
  const [newReorder, setNewReorder] = useState('5');
  const [newBatch, setNewBatch] = useState('');
  const [newExpiry, setNewExpiry] = useState('');

  const filtered = useMemo(() => {
    return medicines.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.batchNumber.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'All' || m.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [medicines, search, categoryFilter]);

  const lowStockCount = medicines.filter((m) => m.currentStock <= m.reorderLevel).length;

  function handleAddMedicine(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newExpiry) return;

    const item: MedicineItem = {
      id: `m-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      dosageForm: newForm.trim() || 'Units',
      currentStock: parseInt(newStock, 10) || 0,
      unit: newUnit.trim(),
      reorderLevel: parseInt(newReorder, 10) || 5,
      batchNumber: newBatch.trim() || `BAT-${Date.now().toString().slice(-4)}`,
      expiryDate: newExpiry,
      status: parseInt(newStock, 10) <= parseInt(newReorder, 10) ? 'Low Stock' : 'In Stock',
    };

    setMedicines([...medicines, item]);
    setShowAddModal(false);
    setNewName('');
    setNewForm('');
    setNewBatch('');
    setNewExpiry('');
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Sickbay Pharmacy
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Dispensary & Pharmaceutical Inventory</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Pharmacy & Medicine Stock
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Track drug stock counts, minimum reorder thresholds, and expiration calendar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Add New Stock Item</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>Total Medication Types</span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: tk.text, fontFamily: SORA }}>{medicines.length}</div>
          <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Active formulary items</div>
        </div>

        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>Low Stock Warnings</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', fontFamily: SORA }}>{lowStockCount}</div>
          <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>Below reorder threshold</div>
        </div>

        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>Expiring in &lt; 90 Days</span>
            <Calendar className="w-4 h-4 text-rose-500" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f43f5e', fontFamily: SORA }}>
            {medicines.filter((m) => m.status === 'Expiring Soon').length}
          </div>
          <div style={{ fontSize: 11, color: '#f43f5e', marginTop: 4 }}>Requires immediate replacement</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          background: cardGrad(isDark),
          border: `1px solid ${tk.cardBorder}`,
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260 }}>
          <Search className="w-4 h-4" style={{ color: tk.subText }} />
          <input
            type="text"
            placeholder="Search medication name, batch number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: tk.text,
              fontSize: 13,
              width: '100%',
              fontFamily: INTER,
            }}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            background: isDark ? '#1e293b' : '#ffffff',
            color: tk.text,
            border: `1px solid ${tk.cardBorder}`,
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontFamily: INTER,
          }}
        >
          <option value="All">All Therapeutic Categories</option>
          <option value="Antimalarial">Antimalarial</option>
          <option value="Analgesic / Antipyretic">Analgesic / Antipyretic</option>
          <option value="Antibiotic">Antibiotic</option>
          <option value="First Aid & Wound Care">First Aid & Wound Care</option>
          <option value="Respiratory">Respiratory</option>
        </select>
      </div>

      {/* Stock Table */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Medication Name</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Category & Form</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Current Stock</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Reorder Min</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Batch No</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Expiry Date</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const isLow = m.currentStock <= m.reorderLevel;
                return (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: tk.text }}>
                      {m.name}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ color: tk.text }}>{m.category}</div>
                      <div style={{ fontSize: 11, color: tk.subText }}>{m.dosageForm}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: isLow ? '#f59e0b' : tk.text,
                        }}
                      >
                        {m.currentStock} {m.unit}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: tk.subText }}>
                      {m.reorderLevel} {m.unit}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: tk.subText }}>
                      {m.batchNumber}
                    </td>
                    <td style={{ padding: '14px 16px', color: m.status === 'Expiring Soon' ? '#f43f5e' : tk.text, fontWeight: m.status === 'Expiring Soon' ? 600 : 400 }}>
                      {m.expiryDate}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background:
                            m.status === 'Expiring Soon'
                              ? 'rgba(244,63,94,0.15)'
                              : isLow
                              ? 'rgba(245,158,11,0.15)'
                              : 'rgba(16,185,129,0.15)',
                          color:
                            m.status === 'Expiring Soon'
                              ? '#f43f5e'
                              : isLow
                              ? '#f59e0b'
                              : '#10b981',
                        }}
                      >
                        {m.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      <NativeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register Medication Stock"
        subtitle="Enter dispensary stock levels, packaging form, batch and expiry"
        icon={Pill}
        size="lg"
      >
        <form onSubmit={handleAddMedicine} className="space-y-4">
          <div className="relative z-[45] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Medication Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ibuprofen 400mg"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-[40] focus-within:z-[50]">
            <div className="relative z-[42]">
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Therapeutic Category
              </label>
              <LiquidGlassSelect
                value={newCategory}
                onChange={(val) => setNewCategory(val as any)}
                options={[
                  { value: 'Analgesic / Antipyretic', label: 'Analgesic / Antipyretic' },
                  { value: 'Antimalarial', label: 'Antimalarial' },
                  { value: 'Antibiotic', label: 'Antibiotic' },
                  { value: 'First Aid & Wound Care', label: 'First Aid & Wound Care' },
                  { value: 'Respiratory', label: 'Respiratory' },
                ]}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Form & Packaging
              </label>
              <input
                type="text"
                placeholder="e.g. Blister 10s, Bottle 100ml"
                value={newForm}
                onChange={(e) => setNewForm(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-[35]">
            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Quantity in Stock
              </label>
              <input
                type="number"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Unit of Measure
              </label>
              <input
                type="text"
                placeholder="boxes, bottles, tins"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Min Reorder Level
              </label>
              <input
                type="number"
                value={newReorder}
                onChange={(e) => setNewReorder(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-[30]">
            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Batch Number
              </label>
              <input
                type="text"
                placeholder="e.g. B-2025-09"
                value={newBatch}
                onChange={(e) => setNewBatch(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Expiry Date *
              </label>
              <input
                type="date"
                required
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:ring-1 focus:ring-emerald-400/40 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all"
            >
              Save Stock Item
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
