import { useState } from 'react';
import {
  AlertTriangle,
  Search,
  Plus,
  DollarSign,
  CheckCircle2,
  FileSpreadsheet,
  Building2,
  X,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

interface BreakageRecord {
  id: string;
  studentName: string;
  className: string;
  admissionNo: string;
  itemBroken: string;
  quantityBroken: number;
  replacementFeeUGX: number;
  breakageDate: string;
  supervisingTeacher: string;
  circumstance: string;
  paymentStatus: 'Cleared' | 'Pending Payment' | 'Waived by Administration';
}

const INITIAL_BREAKAGES: BreakageRecord[] = [
  {
    id: 'brk-1',
    studentName: 'Kasule Brian',
    className: 'Senior 4 East',
    admissionNo: 'ADM-2023-144',
    itemBroken: 'Pyrex 250ml Conical Flask',
    quantityBroken: 1,
    replacementFeeUGX: 25000,
    breakageDate: 'Today, 09:40 AM',
    supervisingTeacher: 'Mr. Kato Brian',
    circumstance: 'Slipped from wet hands during washing after titration practical.',
    paymentStatus: 'Pending Payment',
  },
  {
    id: 'brk-2',
    studentName: 'Aisha Nakimera',
    className: 'Senior 3 West',
    admissionNo: 'ADM-2024-098',
    itemBroken: 'Mercury Laboratory Thermometer (-10°C to 110°C)',
    quantityBroken: 1,
    replacementFeeUGX: 45000,
    breakageDate: '19 Sept 2026',
    supervisingTeacher: 'Ms. Nabirye Sarah',
    circumstance: 'Rolled off inclined bench during boiling point investigation.',
    paymentStatus: 'Cleared',
  },
  {
    id: 'brk-3',
    studentName: 'Mukasa Trevor',
    className: 'Senior 2 South',
    admissionNo: 'ADM-2025-012',
    itemBroken: 'ICT USB Optical Mouse & Keycap',
    quantityBroken: 1,
    replacementFeeUGX: 20000,
    breakageDate: '16 Sept 2026',
    supervisingTeacher: 'Mr. Mukasa Paul',
    circumstance: 'Cable pulled forcibly from rear desktop port.',
    paymentStatus: 'Pending Payment',
  },
];

export default function LabBreakagesPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [breakages, setBreakages] = useState<BreakageRecord[]>(INITIAL_BREAKAGES);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [newName, setNewName] = useState('');
  const [newClass, setNewClass] = useState('');
  const [newAdm, setNewAdm] = useState('');
  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newFee, setNewFee] = useState('25000');
  const [newTeacher, setNewTeacher] = useState('');
  const [newCircumstance, setNewCircumstance] = useState('');

  const totalPendingUGX = breakages
    .filter((b) => b.paymentStatus === 'Pending Payment')
    .reduce((sum, b) => sum + b.replacementFeeUGX, 0);

  const filtered = breakages.filter(
    (b) =>
      b.studentName.toLowerCase().includes(search.toLowerCase()) ||
      b.admissionNo.toLowerCase().includes(search.toLowerCase()) ||
      b.itemBroken.toLowerCase().includes(search.toLowerCase())
  );

  function handleAddBreakage(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newItem.trim()) return;

    const record: BreakageRecord = {
      id: `brk-${Date.now()}`,
      studentName: newName.trim(),
      className: newClass.trim(),
      admissionNo: newAdm.trim() || 'N/A',
      itemBroken: newItem.trim(),
      quantityBroken: parseInt(newQty, 10) || 1,
      replacementFeeUGX: parseInt(newFee, 10) || 20000,
      breakageDate: `Today, ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      supervisingTeacher: newTeacher.trim() || 'Lab Instructor',
      circumstance: newCircumstance.trim() || 'Accidental breakage in practical.',
      paymentStatus: 'Pending Payment',
    };

    setBreakages([record, ...breakages]);
    setShowAddModal(false);
    setNewName('');
    setNewClass('');
    setNewAdm('');
    setNewItem('');
    setNewCircumstance('');
  }

  function handleClearPayment(id: string) {
    setBreakages(
      breakages.map((b) => (b.id === id ? { ...b, paymentStatus: 'Cleared' } : b))
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Accountability
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Apparatus Damage & Replacement Ledger</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Student Breakages & Loss Ledger
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Assess apparatus replacement fees, track student liabilities, and record accounts clearance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              background: cardGrad(isDark),
              border: `1px solid ${tk.cardBorder}`,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span style={{ color: tk.subText }}>Uncollected Fees: </span>
            <span style={{ color: '#f43f5e', fontWeight: 800 }}>UGX {totalPendingUGX.toLocaleString()}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#f59e0b',
              color: '#05080f',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Record Breakage Incident</span>
          </button>
        </div>
      </div>

      {/* Breakages Table */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Student</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Damaged Apparatus</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Circumstance</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Replacement Fee</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{b.studentName}</div>
                    <div style={{ fontSize: 11, color: tk.subText }}>
                      {b.className} • {b.admissionNo}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{b.itemBroken}</div>
                    <div style={{ fontSize: 11, color: tk.subText }}>Qty: {b.quantityBroken} • {b.breakageDate}</div>
                  </td>
                  <td style={{ padding: '14px 16px', maxWidth: 220, fontSize: 12, color: tk.subText }}>
                    {b.circumstance}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: tk.text }}>
                    UGX {b.replacementFeeUGX.toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background:
                          b.paymentStatus === 'Cleared'
                            ? 'rgba(16,185,129,0.15)'
                            : 'rgba(244,63,94,0.15)',
                        color: b.paymentStatus === 'Cleared' ? '#10b981' : '#f43f5e',
                      }}
                    >
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {b.paymentStatus === 'Pending Payment' && (
                      <button
                        type="button"
                        onClick={() => handleClearPayment(b.id)}
                        style={{
                          background: 'rgba(16,185,129,0.15)',
                          border: '1px solid rgba(16,185,129,0.3)',
                          color: '#10b981',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Mark Cleared
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
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
                Record Apparatus Breakage
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: tk.subText, cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBreakage} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Student Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasule Brian"
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
                    Class
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior 4 East"
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
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
                    Admission No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ADM-2023-144"
                    value={newAdm}
                    onChange={(e) => setNewAdm(e.target.value)}
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
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Apparatus / Gear Damaged *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50ml Volumetric Burette"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
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
                    Quantity Broken
                  </label>
                  <input
                    type="number"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
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
                    Replacement Fee (UGX)
                  </label>
                  <input
                    type="number"
                    value={newFee}
                    onChange={(e) => setNewFee(e.target.value)}
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
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Circumstance Notes
                </label>
                <input
                  type="text"
                  placeholder="How did breakage occur?"
                  value={newCircumstance}
                  onChange={(e) => setNewCircumstance(e.target.value)}
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
                    background: '#f59e0b',
                    border: 'none',
                    color: '#05080f',
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Save Breakage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
