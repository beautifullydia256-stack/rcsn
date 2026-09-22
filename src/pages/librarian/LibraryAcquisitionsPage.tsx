import { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Plus,
  Wrench,
  CheckCircle2,
  Clock,
  Building2,
  DollarSign,
  X,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

interface AcquisitionOrder {
  id: string;
  bookTitle: string;
  author: string;
  subject: string;
  quantityRequested: number;
  unitCostUGX: number;
  totalCostUGX: number;
  supplier: string;
  requestedBy: string;
  urgency: 'High (Curriculum Core)' | 'Normal' | 'Supplementary';
  status: 'Approved by Head Teacher' | 'Pending Approval' | 'Delivered & Cataloged';
}

const INITIAL_ORDERS: AcquisitionOrder[] = [
  {
    id: 'acq-1',
    bookTitle: 'Luganda Grammar & Composition (O-Level Set)',
    author: 'Makerere Linguistics Dept',
    subject: 'Luganda',
    quantityRequested: 30,
    unitCostUGX: 28000,
    totalCostUGX: 840000,
    supplier: 'Aristoc Booklex Kampala',
    requestedBy: 'Mr. Ssekitoleko (Luganda Dept)',
    urgency: 'High (Curriculum Core)',
    status: 'Approved by Head Teacher',
  },
  {
    id: 'acq-2',
    bookTitle: 'Senior 1 Lower Secondary ICT Textbooks',
    author: 'NCDC Curriculum Team',
    subject: 'Computer Studies',
    quantityRequested: 50,
    unitCostUGX: 22000,
    totalCostUGX: 1100000,
    supplier: 'Fountain Publishers Uganda',
    requestedBy: 'Mr. Mukasa Paul',
    urgency: 'High (Curriculum Core)',
    status: 'Pending Approval',
  },
  {
    id: 'acq-3',
    bookTitle: 'The River Between - Ngugi wa Thiong’o',
    author: 'Ngugi wa Thiong’o',
    subject: 'Literature in English',
    quantityRequested: 25,
    unitCostUGX: 20000,
    totalCostUGX: 500000,
    supplier: 'Uganda Bookshop',
    requestedBy: 'Ms. Nabatanzi (Head of Lit)',
    urgency: 'Normal',
    status: 'Delivered & Cataloged',
  },
];

export default function LibraryAcquisitionsPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [orders, setOrders] = useState<AcquisitionOrder[]>(INITIAL_ORDERS);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newQty, setNewQty] = useState('20');
  const [newUnitCost, setNewUnitCost] = useState('25000');
  const [newSupplier, setNewSupplier] = useState('');
  const [newRequester, setNewRequester] = useState('');

  function handleAddOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const qty = parseInt(newQty, 10) || 10;
    const cost = parseInt(newUnitCost, 10) || 20000;

    const item: AcquisitionOrder = {
      id: `acq-${Date.now()}`,
      bookTitle: newTitle.trim(),
      author: newAuthor.trim() || 'Various Authors',
      subject: newSubject.trim() || 'General Studies',
      quantityRequested: qty,
      unitCostUGX: cost,
      totalCostUGX: qty * cost,
      supplier: newSupplier.trim() || 'Local Educational Publisher',
      requestedBy: newRequester.trim() || 'Library Committee',
      urgency: 'High (Curriculum Core)',
      status: 'Pending Approval',
    };

    setOrders([...orders, item]);
    setShowAddModal(false);
    setNewTitle('');
    setNewAuthor('');
    setNewSubject('');
    setNewSupplier('');
    setNewRequester('');
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Procurement & Binding
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Book Requisitions & Maintenance</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Acquisitions & Book Requisitions
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Coordinate departmental textbook requests, purchase orders, and spine rebinding.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#8b5cf6',
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
          <span>New Book Requisition</span>
        </button>
      </div>

      {/* Requisitions Table */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Requisitioned Title</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Subject & Department</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Qty</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Est. Budget (UGX)</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Supplier</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Approval Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{o.bookTitle}</div>
                    <div style={{ fontSize: 11, color: tk.subText }}>
                      By: {o.author} • Req by: {o.requestedBy}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: tk.text }}>{o.subject}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: tk.text }}>
                    {o.quantityRequested} copies
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: tk.text }}>
                      UGX {o.totalCostUGX.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: tk.subText }}>@ UGX {o.unitCostUGX.toLocaleString()}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: tk.subText, fontSize: 12 }}>{o.supplier}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background:
                          o.status === 'Approved by Head Teacher'
                            ? 'rgba(16,185,129,0.15)'
                            : o.status === 'Delivered & Cataloged'
                            ? 'rgba(14,165,233,0.15)'
                            : 'rgba(245,158,11,0.15)',
                        color:
                          o.status === 'Approved by Head Teacher'
                            ? '#10b981'
                            : o.status === 'Delivered & Cataloged'
                            ? '#0ea5e9'
                            : '#f59e0b',
                      }}
                    >
                      {o.status}
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
                Create Book Requisition
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: tk.subText, cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOrder} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Book Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Uganda Secondary Atlas"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
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
                    Author
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Macmillan"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
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
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Geography"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Quantity
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
                    Estimated Unit Price (UGX)
                  </label>
                  <input
                    type="number"
                    value={newUnitCost}
                    onChange={(e) => setNewUnitCost(e.target.value)}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Preferred Supplier
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Aristoc Booklex"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
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
                    Requested By
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Head of Humanities"
                    value={newRequester}
                    onChange={(e) => setNewRequester(e.target.value)}
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
                    background: '#8b5cf6',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
