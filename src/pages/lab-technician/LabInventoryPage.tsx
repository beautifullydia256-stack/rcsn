import { useState, useMemo } from 'react';
import {
  Laptop,
  Search,
  Plus,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Monitor,
  Building2,
  X,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';

interface InventoryItem {
  id: string;
  name: string;
  category: 'Optical / Microscope' | 'Glassware & Stand' | 'Thermal / Heating' | 'ICT Computing & Network' | 'Electronic Measurement';
  serialNumber: string;
  location: string;
  quantity: number;
  condition: 'Operational' | 'Needs Calibration' | 'Under Repair' | 'Decommissioned';
  lastServiced: string;
}

const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    name: 'Olympus Binocular Compound Microscope (1000x Oil Immersion)',
    category: 'Optical / Microscope',
    serialNumber: 'MIC-OLY-2023-04',
    location: 'Biology Lab Cabinet 1',
    quantity: 18,
    condition: 'Operational',
    lastServiced: '14 Aug 2026',
  },
  {
    id: 'inv-2',
    name: 'Class A 50ml Volumetric Burettes with PTFE Stopcock',
    category: 'Glassware & Stand',
    serialNumber: 'BUR-PTFE-50-SET',
    location: 'Chemistry Lab Rack C',
    quantity: 45,
    condition: 'Operational',
    lastServiced: '02 Sept 2026',
  },
  {
    id: 'inv-3',
    name: 'Ohaus Triple Beam Mechanical Balance (0.1g Precision)',
    category: 'Electronic Measurement',
    serialNumber: 'BAL-OHAUS-08',
    location: 'Physics Lab Bench 2',
    quantity: 12,
    condition: 'Needs Calibration',
    lastServiced: '10 June 2026',
  },
  {
    id: 'inv-4',
    name: 'Dell OptiPlex Desktop PCs (Core i5, 16GB RAM, SSD)',
    category: 'ICT Computing & Network',
    serialNumber: 'ICT-PC-DELL-101',
    location: 'Main ICT Computer Lab',
    quantity: 50,
    condition: 'Operational',
    lastServiced: '18 Sept 2026',
  },
  {
    id: 'inv-5',
    name: 'Heavy Duty Bunsen Burners (LPG Gas Connection)',
    category: 'Thermal / Heating',
    serialNumber: 'BN-LPG-SET-A',
    location: 'Chemistry Lab Bench 1-4',
    quantity: 36,
    condition: 'Operational',
    lastServiced: '01 Sept 2026',
  },
  {
    id: 'inv-6',
    name: 'Cisco 24-Port Gigabit Managed Switch & Lab Patch Panel',
    category: 'ICT Computing & Network',
    serialNumber: 'CSCO-SW-24-G',
    location: 'ICT Server Rack B',
    quantity: 2,
    condition: 'Operational',
    lastServiced: '05 Sept 2026',
  },
  {
    id: 'inv-7',
    name: 'Epson High-Lumen Ceiling Classroom Projector',
    category: 'ICT Computing & Network',
    serialNumber: 'EPS-PRJ-2024',
    location: 'Science Demonstration Theater',
    quantity: 2,
    condition: 'Under Repair',
    lastServiced: '20 Sept 2026',
  },
];

export default function LabInventoryPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<'Optical / Microscope' | 'Glassware & Stand' | 'Thermal / Heating' | 'ICT Computing & Network' | 'Electronic Measurement'>('Glassware & Stand');
  const [newSerial, setNewSerial] = useState('');
  const [newLoc, setNewLoc] = useState('');
  const [newQty, setNewQty] = useState('1');

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchSearch =
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
        i.location.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === 'All' || i.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [items, search, catFilter]);

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    const item: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: newName.trim(),
      category: newCat,
      serialNumber: newSerial.trim() || `SN-${Date.now().toString().slice(-4)}`,
      location: newLoc.trim() || 'General Lab Store',
      quantity: parseInt(newQty, 10) || 1,
      condition: 'Operational',
      lastServiced: 'Today',
    };

    setItems([...items, item]);
    setShowAddModal(false);
    setNewName('');
    setNewSerial('');
    setNewLoc('');
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#0ea5e9', background: 'rgba(14, 165, 233, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Apparatus & Hardware
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Science & ICT Capital Equipment</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Apparatus & ICT Hardware Registry
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Track microscopes, computer terminals, precision scales, and specialized apparatus.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#0ea5e9',
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
          <span>Add Apparatus / Hardware</span>
        </button>
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
            placeholder="Search apparatus, serial no, location..."
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
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
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
          <option value="All">All Categories</option>
          <option value="Optical / Microscope">Optical & Microscopes</option>
          <option value="Glassware & Stand">Glassware & Stands</option>
          <option value="Thermal / Heating">Thermal & Heating</option>
          <option value="ICT Computing & Network">ICT PCs & Networks</option>
          <option value="Electronic Measurement">Electronic Measurement</option>
        </select>
      </div>

      {/* Inventory Table */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Equipment / Apparatus</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Category</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Qty</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Location</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Condition</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Last Serviced</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{i.name}</div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: tk.subText }}>
                      SN: {i.serialNumber}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: tk.subText }}>{i.category}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: tk.text }}>{i.quantity}</td>
                  <td style={{ padding: '14px 16px', color: tk.text, fontSize: 12 }}>{i.location}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background:
                          i.condition === 'Operational'
                            ? 'rgba(16,185,129,0.15)'
                            : i.condition === 'Needs Calibration'
                            ? 'rgba(245,158,11,0.15)'
                            : 'rgba(244,63,94,0.15)',
                        color:
                          i.condition === 'Operational'
                            ? '#10b981'
                            : i.condition === 'Needs Calibration'
                            ? '#f59e0b'
                            : '#f43f5e',
                      }}
                    >
                      {i.condition}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: tk.subText, fontSize: 12 }}>{i.lastServiced}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <NativeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register Equipment / Apparatus"
        subtitle="Add newly acquired lab devices, glassware or digital apparatus"
        icon={Wrench}
        size="lg"
      >
        <form onSubmit={handleAddItem} className="flex flex-col gap-3 text-white">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Equipment / Apparatus Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Digital Spectrophotometer"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Category
              </label>
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-slate-900/90 dark:bg-black/90 hover:border-white/35 focus:border-white/70 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
              >
                <option value="Glassware & Stand" className="bg-slate-900 text-white">Glassware & Stand</option>
                <option value="Optical / Microscope" className="bg-slate-900 text-white">Optical / Microscope</option>
                <option value="Thermal / Heating" className="bg-slate-900 text-white">Thermal / Heating</option>
                <option value="ICT Computing & Network" className="bg-slate-900 text-white">ICT Computing & Network</option>
                <option value="Electronic Measurement" className="bg-slate-900 text-white">Electronic Measurement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Quantity
              </label>
              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Serial / Tag Number
              </label>
              <input
                type="text"
                placeholder="e.g. SN-2025-01"
                value={newSerial}
                onChange={(e) => setNewSerial(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. Chemistry Lab Store"
                value={newLoc}
                onChange={(e) => setNewLoc(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 hover:border-white/35 focus:border-white/70 focus:bg-black/40 backdrop-blur-sm text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/15">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition active:scale-95"
            >
              Save Equipment
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
