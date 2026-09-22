import { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  AlertTriangle,
  Flame,
  Zap,
  ShieldAlert,
  Plus,
  Package,
  Calendar,
  X,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

interface ReagentItem {
  id: string;
  name: string;
  formula: string;
  category: 'Acid' | 'Base' | 'Salt / Indicator' | 'Organic / Solvent' | 'Biological Stain';
  hazardClassification: 'Corrosive' | 'Flammable' | 'Toxic' | 'Oxidizer' | 'Low Risk';
  currentStock: number;
  unit: 'Litres' | 'Kilograms' | 'Grams' | 'Bottles';
  reorderLevel: number;
  storageCabinet: string;
  msdsNotes: string;
  status: 'Adequate' | 'Low Stock' | 'Depleted';
}

const INITIAL_REAGENTS: ReagentItem[] = [
  {
    id: 'r-1',
    name: 'Hydrochloric Acid (Concentrated ~37%)',
    formula: 'HCl (aq)',
    category: 'Acid',
    hazardClassification: 'Corrosive',
    currentStock: 4.5,
    unit: 'Litres',
    reorderLevel: 2.0,
    storageCabinet: 'Acid Cabinet 1 (Ventilated)',
    msdsNotes: 'Fuming corrosive liquid. Causes severe skin burns. Always dispense in fume cupboard.',
    status: 'Adequate',
  },
  {
    id: 'r-2',
    name: 'Sodium Hydroxide Pellets (AR Grade)',
    formula: 'NaOH (s)',
    category: 'Base',
    hazardClassification: 'Corrosive',
    currentStock: 1.2,
    unit: 'Kilograms',
    reorderLevel: 2.0,
    storageCabinet: 'Base Cabinet 2',
    msdsNotes: 'Hygroscopic solid. Generates extreme heat upon dissolving in water. Eye protection mandatory.',
    status: 'Low Stock',
  },
  {
    id: 'r-3',
    name: 'Ethanol Absolute (99.8%)',
    formula: 'C2H5OH',
    category: 'Organic / Solvent',
    hazardClassification: 'Flammable',
    currentStock: 8.0,
    unit: 'Litres',
    reorderLevel: 4.0,
    storageCabinet: 'Flammable Safety Locker F-3',
    msdsNotes: 'Highly flammable vapour. Keep away from naked flames, spark sources, and Bunsen burners.',
    status: 'Adequate',
  },
  {
    id: 'r-4',
    name: "Benedict's Qualitative Reagent",
    formula: 'CuSO4 / Na2CO3 / Na3C6H5O7',
    category: 'Salt / Indicator',
    hazardClassification: 'Low Risk',
    currentStock: 3.5,
    unit: 'Litres',
    reorderLevel: 1.5,
    storageCabinet: 'Reagent Shelf B',
    msdsNotes: 'Mild skin irritant. Used for reducing sugar identification in biology practicals.',
    status: 'Adequate',
  },
  {
    id: 'r-5',
    name: 'Iodine Solution (0.05M in KI)',
    formula: 'I2 / KI',
    category: 'Biological Stain',
    hazardClassification: 'Low Risk',
    currentStock: 0.8,
    unit: 'Litres',
    reorderLevel: 1.0,
    storageCabinet: 'Amber Bottle Shelf A',
    msdsNotes: 'Stains skin and clothing dark amber. Keep sealed to prevent sublimation.',
    status: 'Low Stock',
  },
  {
    id: 'r-6',
    name: 'Copper (II) Sulphate Pentahydrate',
    formula: 'CuSO4 · 5H2O',
    category: 'Salt / Indicator',
    hazardClassification: 'Toxic',
    currentStock: 2.5,
    unit: 'Kilograms',
    reorderLevel: 1.0,
    storageCabinet: 'General Salts Cabinet S-4',
    msdsNotes: 'Harmful if swallowed. Toxic to aquatic life. Bright blue crystalline granules.',
    status: 'Adequate',
  },
];

export default function LabReagentsPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [reagents, setReagents] = useState<ReagentItem[]>(INITIAL_REAGENTS);
  const [search, setSearch] = useState('');
  const [hazardFilter, setHazardFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [newName, setNewName] = useState('');
  const [newFormula, setNewFormula] = useState('');
  const [newCategory, setNewCategory] = useState<'Acid' | 'Base' | 'Salt / Indicator' | 'Organic / Solvent' | 'Biological Stain'>('Acid');
  const [newHazard, setNewHazard] = useState<'Corrosive' | 'Flammable' | 'Toxic' | 'Oxidizer' | 'Low Risk'>('Corrosive');
  const [newStock, setNewStock] = useState('1');
  const [newUnit, setNewUnit] = useState<'Litres' | 'Kilograms' | 'Grams' | 'Bottles'>('Litres');
  const [newCabinet, setNewCabinet] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const filtered = useMemo(() => {
    return reagents.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.formula.toLowerCase().includes(search.toLowerCase()) ||
        r.storageCabinet.toLowerCase().includes(search.toLowerCase());
      const matchHazard = hazardFilter === 'All' || r.hazardClassification === hazardFilter;
      return matchSearch && matchHazard;
    });
  }, [reagents, search, hazardFilter]);

  function handleAddReagent(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    const item: ReagentItem = {
      id: `r-${Date.now()}`,
      name: newName.trim(),
      formula: newFormula.trim() || 'N/A',
      category: newCategory,
      hazardClassification: newHazard,
      currentStock: parseFloat(newStock) || 1,
      unit: newUnit,
      reorderLevel: 1.0,
      storageCabinet: newCabinet.trim() || 'General Cabinet',
      msdsNotes: newNotes.trim() || 'Standard lab handling required.',
      status: 'Adequate',
    };

    setReagents([...reagents, item]);
    setShowAddModal(false);
    setNewName('');
    setNewFormula('');
    setNewCabinet('');
    setNewNotes('');
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#0ea5e9', background: 'rgba(14, 165, 233, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Chemical Audit
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Hazardous Substances & MSDS Register</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Chemicals & Reagents Inventory
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Track chemical volumes, safety hazard classifications, storage cabinets, and safety sheets.
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
          <span>Add Chemical Stock</span>
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
            placeholder="Search chemical name, formula (e.g. HCl), cabinet..."
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
          value={hazardFilter}
          onChange={(e) => setHazardFilter(e.target.value)}
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
          <option value="All">All Hazard Classes</option>
          <option value="Corrosive">Corrosive (Acids / Alkalis)</option>
          <option value="Flammable">Flammable</option>
          <option value="Toxic">Toxic</option>
          <option value="Low Risk">Low Risk</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Chemical / Reagent</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Hazard Class</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Current Volume</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Storage Cabinet</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Safety & MSDS Notes</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{r.name}</div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#0ea5e9' }}>
                      {r.formula} • {r.category}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background:
                          r.hazardClassification === 'Corrosive'
                            ? 'rgba(244,63,94,0.15)'
                            : r.hazardClassification === 'Flammable'
                            ? 'rgba(245,158,11,0.15)'
                            : r.hazardClassification === 'Toxic'
                            ? 'rgba(168,85,247,0.15)'
                            : 'rgba(16,185,129,0.15)',
                        color:
                          r.hazardClassification === 'Corrosive'
                            ? '#f43f5e'
                            : r.hazardClassification === 'Flammable'
                            ? '#f59e0b'
                            : r.hazardClassification === 'Toxic'
                            ? '#a855f7'
                            : '#10b981',
                      }}
                    >
                      {r.hazardClassification}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: tk.text }}>
                    {r.currentStock} {r.unit}
                  </td>
                  <td style={{ padding: '14px 16px', color: tk.subText, fontSize: 12 }}>
                    {r.storageCabinet}
                  </td>
                  <td style={{ padding: '14px 16px', maxWidth: 280, color: tk.subText, fontSize: 12 }}>
                    {r.msdsNotes}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background:
                          r.status === 'Low Stock'
                            ? 'rgba(245,158,11,0.15)'
                            : 'rgba(16,185,129,0.15)',
                        color: r.status === 'Low Stock' ? '#f59e0b' : '#10b981',
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: isDark ? '#0f172a' : '#ffffff',
              border: `1px solid ${tk.cardBorder}`,
              borderRadius: 16,
              width: '100%',
              maxWidth: 500,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
                Register Chemical Reagent
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: tk.subText, cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddReagent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Chemical Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nitric Acid (68%)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: isDark ? '#1e293b' : '#f8fafc',
                    border: `1px solid ${tk.cardBorder}`,
                    color: tk.text,
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Chemical Formula
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HNO3"
                    value={newFormula}
                    onChange={(e) => setNewFormula(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: isDark ? '#1e293b' : '#f8fafc',
                      border: `1px solid ${tk.cardBorder}`,
                      color: tk.text,
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Hazard Class
                  </label>
                  <select
                    value={newHazard}
                    onChange={(e) => setNewHazard(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: isDark ? '#1e293b' : '#f8fafc',
                      border: `1px solid ${tk.cardBorder}`,
                      color: tk.text,
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Corrosive">Corrosive</option>
                    <option value="Flammable">Flammable</option>
                    <option value="Toxic">Toxic</option>
                    <option value="Oxidizer">Oxidizer</option>
                    <option value="Low Risk">Low Risk</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: isDark ? '#1e293b' : '#f8fafc',
                      border: `1px solid ${tk.cardBorder}`,
                      color: tk.text,
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Unit
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: isDark ? '#1e293b' : '#f8fafc',
                      border: `1px solid ${tk.cardBorder}`,
                      color: tk.text,
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Litres">Litres</option>
                    <option value="Kilograms">Kilograms</option>
                    <option value="Grams">Grams</option>
                    <option value="Bottles">Bottles</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Storage Cabinet Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acid Locker 2"
                  value={newCabinet}
                  onChange={(e) => setNewCabinet(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: isDark ? '#1e293b' : '#f8fafc',
                    border: `1px solid ${tk.cardBorder}`,
                    color: tk.text,
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Safety / MSDS Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Causes severe skin burns. Use nitrile gloves."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: isDark ? '#1e293b' : '#f8fafc',
                    border: `1px solid ${tk.cardBorder}`,
                    color: tk.text,
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${tk.cardBorder}`,
                    color: tk.subText,
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#0ea5e9',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Chemical
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
