import { useState } from 'react';
import {
  Clock,
  Search,
  DollarSign,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Building2,
  X,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

interface OverdueRecord {
  id: string;
  studentName: string;
  className: string;
  admissionNo: string;
  bookTitle: string;
  accessionNumber: string;
  dueDate: string;
  daysOverdue: number;
  fineRatePerDay: number;
  accumulatedFineUGX: number;
  parentPhone: string;
  status: 'Pending Fine' | 'Fine Paid' | 'Waived by Head Teacher';
}

const INITIAL_OVERDUES: OverdueRecord[] = [
  {
    id: 'ov-1',
    studentName: 'Aisha Nakimera',
    className: 'Senior 3 West',
    admissionNo: 'ADM-2024-098',
    bookTitle: 'Song of Lawino - Okot p’Bitek',
    accessionNumber: 'ACC-896-003',
    dueDate: '15 Sept 2026',
    daysOverdue: 7,
    fineRatePerDay: 500,
    accumulatedFineUGX: 3500,
    parentPhone: '+256 702 443 890',
    status: 'Pending Fine',
  },
  {
    id: 'ov-2',
    studentName: 'Joshua Kateregga',
    className: 'Senior 3 West',
    admissionNo: 'ADM-2023-119',
    bookTitle: 'Comprehensive Mathematics for Secondary 3',
    accessionNumber: 'ACC-510-044',
    dueDate: '10 Sept 2026',
    daysOverdue: 12,
    fineRatePerDay: 500,
    accumulatedFineUGX: 6000,
    parentPhone: '+256 701 987 654',
    status: 'Pending Fine',
  },
  {
    id: 'ov-3',
    studentName: 'Kasule Brian',
    className: 'Senior 4 East',
    admissionNo: 'ADM-2023-144',
    bookTitle: 'East African History: 1000 AD to Independence',
    accessionNumber: 'ACC-967-012',
    dueDate: '04 Sept 2026',
    daysOverdue: 18,
    fineRatePerDay: 500,
    accumulatedFineUGX: 9000,
    parentPhone: '+256 772 119 400',
    status: 'Pending Fine',
  },
  {
    id: 'ov-4',
    studentName: 'David Kiggundu',
    className: 'Senior 1 North',
    admissionNo: 'ADM-2025-102',
    bookTitle: 'Oxford Advanced Learner’s Dictionary',
    accessionNumber: 'ACC-423-009',
    dueDate: '08 Sept 2026',
    daysOverdue: 14,
    fineRatePerDay: 500,
    accumulatedFineUGX: 7000,
    parentPhone: '+256 701 443 890',
    status: 'Waived by Head Teacher',
  },
];

export default function LibraryOverduePage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [records, setRecords] = useState<OverdueRecord[]>(INITIAL_OVERDUES);
  const [search, setSearch] = useState('');
  const [notifiedId, setNotifiedId] = useState<string | null>(null);

  const totalOutstandingFines = records
    .filter((r) => r.status === 'Pending Fine')
    .reduce((sum, r) => sum + r.accumulatedFineUGX, 0);

  const filtered = records.filter(
    (r) =>
      r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      r.admissionNo.toLowerCase().includes(search.toLowerCase()) ||
      r.bookTitle.toLowerCase().includes(search.toLowerCase())
  );

  function handleClearFine(id: string) {
    setRecords(
      records.map((r) => (r.id === id ? { ...r, status: 'Fine Paid' } : r))
    );
  }

  function handleNotify(id: string) {
    setNotifiedId(id);
    setTimeout(() => setNotifiedId(null), 3000);
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Defaulter Enforcement
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Overdue Loans & Fine Accumulation</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Overdue Books & Fines Ledger
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Enforce library loan recovery, send parent SMS reminders, and clear fine balances.
          </p>
        </div>

        <div
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: cardGrad(isDark),
            border: `1px solid ${tk.cardBorder}`,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span style={{ color: tk.subText }}>Outstanding Fines: </span>
          <span style={{ color: '#f43f5e', fontWeight: 800 }}>UGX {totalOutstandingFines.toLocaleString()}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: cardGrad(isDark),
          border: `1px solid ${tk.cardBorder}`,
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 20,
        }}
      >
        <Search className="w-4 h-4" style={{ color: tk.subText }} />
        <input
          type="text"
          placeholder="Search overdue student name, admission no, or book..."
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

      {/* Overdue Table */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Borrower</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Overdue Title</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Due Date</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Days Late</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Fine (500 UGX/day)</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{r.studentName}</div>
                    <div style={{ fontSize: 11, color: tk.subText }}>
                      {r.className} • {r.admissionNo}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{r.bookTitle}</div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: tk.subText }}>
                      {r.accessionNumber}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#f43f5e', fontSize: 12, fontWeight: 600 }}>
                    {r.dueDate}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontWeight: 700, color: '#f43f5e' }}>{r.daysOverdue} days</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: tk.text }}>
                    UGX {r.accumulatedFineUGX.toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background:
                          r.status === 'Pending Fine'
                            ? 'rgba(244,63,94,0.15)'
                            : r.status === 'Fine Paid'
                            ? 'rgba(16,185,129,0.15)'
                            : 'rgba(245,158,11,0.15)',
                        color:
                          r.status === 'Pending Fine'
                            ? '#f43f5e'
                            : r.status === 'Fine Paid'
                            ? '#10b981'
                            : '#f59e0b',
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {r.status === 'Pending Fine' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleNotify(r.id)}
                            style={{
                              background: 'transparent',
                              border: `1px solid ${tk.cardBorder}`,
                              color: notifiedId === r.id ? '#10b981' : tk.subText,
                              padding: '4px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              cursor: 'pointer',
                            }}
                          >
                            {notifiedId === r.id ? 'SMS Sent!' : 'Send SMS'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleClearFine(r.id)}
                            style={{
                              background: 'rgba(16,185,129,0.15)',
                              border: '1px solid rgba(16,185,129,0.3)',
                              color: '#10b981',
                              padding: '4px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Pay Fine
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
