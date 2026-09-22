import { useState } from 'react';
import {
  BookMarked,
  Search,
  Plus,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  BookOpen,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

interface LoanRecord {
  id: string;
  accessionNumber: string;
  bookTitle: string;
  borrowerName: string;
  borrowerType: 'Student' | 'Teacher';
  borrowerClassOrDept: string;
  borrowerAdmissionNo: string;
  issueDate: string;
  dueDate: string;
  status: 'Active' | 'Returned' | 'Overdue';
  conditionOnIssue: string;
}

const INITIAL_LOANS: LoanRecord[] = [
  {
    id: 'l-1',
    accessionNumber: 'ACC-823-014',
    bookTitle: 'Things Fall Apart - Chinua Achebe',
    borrowerName: 'Grace Nakato',
    borrowerType: 'Student',
    borrowerClassOrDept: 'Senior 4 West',
    borrowerAdmissionNo: 'ADM-2023-082',
    issueDate: '22 Sept 2026',
    dueDate: '06 Oct 2026',
    status: 'Active',
    conditionOnIssue: 'Good (Spine Intact)',
  },
  {
    id: 'l-2',
    accessionNumber: 'ACC-530-088',
    bookTitle: 'Principles of Physics for East Africa',
    borrowerName: 'Mr. Kato Brian',
    borrowerType: 'Teacher',
    borrowerClassOrDept: 'Science Department',
    borrowerAdmissionNo: 'STAFF-T-04',
    issueDate: '15 Sept 2026',
    dueDate: '29 Sept 2026',
    status: 'Active',
    conditionOnIssue: 'Excellent',
  },
  {
    id: 'l-3',
    accessionNumber: 'ACC-896-003',
    bookTitle: 'Song of Lawino - Okot p’Bitek',
    borrowerName: 'Aisha Nakimera',
    borrowerType: 'Student',
    borrowerClassOrDept: 'Senior 3 West',
    borrowerAdmissionNo: 'ADM-2024-098',
    issueDate: '01 Sept 2026',
    dueDate: '15 Sept 2026',
    status: 'Overdue',
    conditionOnIssue: 'Fair',
  },
  {
    id: 'l-4',
    accessionNumber: 'ACC-510-120',
    bookTitle: 'Comprehensive Mathematics S4',
    borrowerName: 'Ronald Mugerwa',
    borrowerType: 'Student',
    borrowerClassOrDept: 'Senior 4 North',
    borrowerAdmissionNo: 'ADM-2023-119',
    issueDate: '08 Sept 2026',
    dueDate: '22 Sept 2026',
    status: 'Returned',
    conditionOnIssue: 'Good',
  },
];

export default function LibraryCirculationPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [loans, setLoans] = useState<LoanRecord[]>(INITIAL_LOANS);
  const [search, setSearch] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Form state
  const [newAccession, setNewAccession] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'Student' | 'Teacher'>('Student');
  const [newClass, setNewClass] = useState('');
  const [newAdm, setNewAdm] = useState('');

  const filtered = loans.filter(
    (l) =>
      l.borrowerName.toLowerCase().includes(search.toLowerCase()) ||
      l.bookTitle.toLowerCase().includes(search.toLowerCase()) ||
      l.accessionNumber.toLowerCase().includes(search.toLowerCase())
  );

  function handleIssueBook(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newName.trim()) return;

    const today = new Date();
    const due = new Date();
    due.setDate(today.getDate() + 14);

    const record: LoanRecord = {
      id: `l-${Date.now()}`,
      accessionNumber: newAccession.trim() || `ACC-${Date.now().toString().slice(-6)}`,
      bookTitle: newTitle.trim(),
      borrowerName: newName.trim(),
      borrowerType: newType,
      borrowerClassOrDept: newClass.trim() || 'General',
      borrowerAdmissionNo: newAdm.trim() || 'N/A',
      issueDate: today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      dueDate: due.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Active',
      conditionOnIssue: 'Good (Inspected)',
    };

    setLoans([record, ...loans]);
    setShowIssueModal(false);
    setNewAccession('');
    setNewTitle('');
    setNewName('');
    setNewClass('');
    setNewAdm('');
  }

  function handleReturnBook(id: string) {
    setLoans(
      loans.map((l) => (l.id === id ? { ...l, status: 'Returned' } : l))
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Circulation Desk
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Check-Out & Check-In Desk</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Book Circulation & Loans
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Issue books with 14-day borrowing rules, verify returns, and monitor overdue status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowIssueModal(true)}
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
          <span>Issue Book to Borrower</span>
        </button>
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
          placeholder="Search borrower name, accession no, or book title..."
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

      {/* Loans Table */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Accession & Book</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Borrower</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Issue Date</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Due Date</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{l.bookTitle}</div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#8b5cf6' }}>
                      {l.accessionNumber}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{l.borrowerName}</div>
                    <div style={{ fontSize: 11, color: tk.subText }}>
                      {l.borrowerClassOrDept} • {l.borrowerAdmissionNo}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: tk.subText, fontSize: 12 }}>{l.issueDate}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: l.status === 'Overdue' ? '#f43f5e' : tk.text }}>
                    {l.dueDate}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background:
                          l.status === 'Active'
                            ? 'rgba(16,185,129,0.15)'
                            : l.status === 'Overdue'
                            ? 'rgba(244,63,94,0.15)'
                            : 'rgba(148,163,184,0.15)',
                        color:
                          l.status === 'Active'
                            ? '#10b981'
                            : l.status === 'Overdue'
                            ? '#f43f5e'
                            : tk.subText,
                      }}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {l.status !== 'Returned' && (
                      <button
                        type="button"
                        onClick={() => handleReturnBook(l.id)}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${tk.cardBorder}`,
                          color: '#10b981',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Check-In Return
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Modal */}
      {showIssueModal && (
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
          onClick={() => setShowIssueModal(false)}
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
                Issue Book to Borrower
              </h3>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                style={{ background: 'transparent', border: 'none', color: tk.subText, cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueBook} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Book Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Things Fall Apart"
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

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Accession / Barcode Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. ACC-823-014"
                  value={newAccession}
                  onChange={(e) => setNewAccession(e.target.value)}
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
                    Borrower Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grace Nakato"
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
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Borrower Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
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
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher / Staff</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Class / Dept
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior 4 West"
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
                    Admission / Staff No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ADM-2023-082"
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

              <div style={{ fontSize: 11, color: tk.subText, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 10, borderRadius: 8 }}>
                Standard lending period is 14 days. Borrower is liable for replacement in case of loss or severe tearing.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
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
                  Issue Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
