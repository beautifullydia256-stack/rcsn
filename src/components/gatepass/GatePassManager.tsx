import { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Plus,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Building2,
  Printer,
  QrCode,
  X,
  Phone,
  Calendar,
  LogOut as ExitIcon,
  LogIn as EntryIcon,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

export interface GatePass {
  id: string;
  serialNumber: string;
  studentName: string;
  className: string;
  admissionNo: string;
  destination: string;
  reason: string;
  departureTime: string;
  expectedReturnTime: string;
  actualReturnTime?: string | null;
  guardianName: string;
  guardianPhone: string;
  escortType: 'Parent / Guardian' | 'Staff Member' | 'Unaccompanied (Authorized)';
  approverRole: 'Head Teacher' | 'Administrator' | 'Secretary';
  approverName: string;
  status: 'Pending Approval' | 'Approved' | 'Currently Out' | 'Returned' | 'Overdue Return' | 'Rejected';
  issuedDate: string;
}

const INITIAL_GATE_PASSES: GatePass[] = [
  {
    id: 'gp-1',
    serialNumber: 'GP-2026-0814',
    studentName: 'Grace Nakato',
    className: 'Primary 5 Blue',
    admissionNo: 'ADM-2024-082',
    destination: 'Case Medical Center, Kampala',
    reason: 'Specialist dental appointment and orthodontic check-up',
    departureTime: 'Today, 09:30 AM',
    expectedReturnTime: 'Today, 02:30 PM',
    guardianName: 'Mrs. Mary Nakato',
    guardianPhone: '+256 772 123 456',
    escortType: 'Parent / Guardian',
    approverRole: 'Head Teacher',
    approverName: 'Namyalo Sarah',
    status: 'Currently Out',
    issuedDate: '22 Sept 2026',
  },
  {
    id: 'gp-2',
    serialNumber: 'GP-2026-0815',
    studentName: 'Kasule Brian',
    className: 'Senior 4 East',
    admissionNo: 'ADM-2023-144',
    destination: 'Centenary Bank Masaka Branch',
    reason: 'Clear school fees draft with parent at bank counter',
    departureTime: 'Today, 10:00 AM',
    expectedReturnTime: 'Today, 01:00 PM',
    actualReturnTime: 'Today, 12:45 PM',
    guardianName: 'Mr. John Kasule',
    guardianPhone: '+256 701 443 890',
    escortType: 'Unaccompanied (Authorized)',
    approverRole: 'Administrator',
    approverName: 'Kato Paul',
    status: 'Returned',
    issuedDate: '22 Sept 2026',
  },
  {
    id: 'gp-3',
    serialNumber: 'GP-2026-0816',
    studentName: 'Aisha Nakimera',
    className: 'Senior 3 West',
    admissionNo: 'ADM-2024-098',
    destination: 'Home Residence (Entebbe)',
    reason: 'Attending funeral of paternal grandmother',
    departureTime: 'Today, 11:30 AM',
    expectedReturnTime: 'Tomorrow, 05:00 PM',
    guardianName: 'Mr. Bashir Nakimera',
    guardianPhone: '+256 782 555 120',
    escortType: 'Parent / Guardian',
    approverRole: 'Head Teacher',
    approverName: 'Namyalo Sarah',
    status: 'Approved',
    issuedDate: '22 Sept 2026',
  },
  {
    id: 'gp-4',
    serialNumber: 'GP-2026-0817',
    studentName: 'David Kiggundu',
    className: 'Senior 1 North',
    admissionNo: 'ADM-2025-102',
    destination: 'Town Market',
    reason: 'Buy personal grooming items without guardian call verification',
    departureTime: 'Today, 02:00 PM',
    expectedReturnTime: 'Today, 04:00 PM',
    guardianName: 'Unverified',
    guardianPhone: 'N/A',
    escortType: 'Unaccompanied (Authorized)',
    approverRole: 'Secretary',
    approverName: 'School Secretary',
    status: 'Rejected',
    issuedDate: '22 Sept 2026',
  },
];

export interface GatePassManagerProps {
  portalRole?: 'head-teacher' | 'admin' | 'secretary' | string;
}

export default function GatePassManager({ portalRole = 'admin' }: GatePassManagerProps) {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [passes, setPasses] = useState<GatePass[]>(INITIAL_GATE_PASSES);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedPass, setSelectedPass] = useState<GatePass | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Gate Pass Form
  const [newName, setNewName] = useState('');
  const [newClass, setNewClass] = useState('');
  const [newAdm, setNewAdm] = useState('');
  const [newDest, setNewDest] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newDepTime, setNewDepTime] = useState('');
  const [newRetTime, setNewRetTime] = useState('');
  const [newGuardian, setNewGuardian] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEscort, setNewEscort] = useState<'Parent / Guardian' | 'Staff Member' | 'Unaccompanied (Authorized)'>('Parent / Guardian');

  const currentlyOutCount = passes.filter((p) => p.status === 'Currently Out').length;
  const approvedCount = passes.filter((p) => p.status === 'Approved').length;
  const returnedCount = passes.filter((p) => p.status === 'Returned').length;

  const filtered = useMemo(() => {
    return passes.filter((p) => {
      const matchSearch =
        p.studentName.toLowerCase().includes(search.toLowerCase()) ||
        p.admissionNo.toLowerCase().includes(search.toLowerCase()) ||
        p.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
        p.destination.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [passes, search, statusFilter]);

  function handleCreatePass(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newDest.trim() || !newReason.trim()) return;

    const roleName = portalRole === 'head-teacher' ? 'Head Teacher' : portalRole === 'admin' ? 'Administrator' : 'Secretary';

    const newPass: GatePass = {
      id: `gp-${Date.now()}`,
      serialNumber: `GP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName: newName.trim(),
      className: newClass.trim() || 'General',
      admissionNo: newAdm.trim() || 'N/A',
      destination: newDest.trim(),
      reason: newReason.trim(),
      departureTime: newDepTime.trim() || 'Immediate',
      expectedReturnTime: newRetTime.trim() || 'Same Day 05:00 PM',
      guardianName: newGuardian.trim() || 'Verified by Phone',
      guardianPhone: newPhone.trim() || '+256',
      escortType: newEscort,
      approverRole: roleName,
      approverName: `${roleName} Desk`,
      status: 'Approved',
      issuedDate: '22 Sept 2026',
    };

    setPasses([newPass, ...passes]);
    setShowCreateModal(false);
    setNewName('');
    setNewClass('');
    setNewAdm('');
    setNewDest('');
    setNewReason('');
  }

  function handleApprove(id: string) {
    setPasses(
      passes.map((p) => (p.id === id ? { ...p, status: 'Approved' } : p))
    );
  }

  function handleReject(id: string) {
    setPasses(
      passes.map((p) => (p.id === id ? { ...p, status: 'Rejected' } : p))
    );
  }

  function handleLogReturn(id: string) {
    const timeNow = `Today, ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    setPasses(
      passes.map((p) => (p.id === id ? { ...p, status: 'Returned', actualReturnTime: timeNow } : p))
    );
    if (selectedPass?.id === id) {
      setSelectedPass({ ...selectedPass, status: 'Returned', actualReturnTime: timeNow });
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Perimeter & Exit Authorization
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Campus Permissions System</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Student Gate Passes & Departure Authorizations
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Official serialized gate pass generation, parent verification, departure tracking, and return timestamp recording.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
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
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Issue Official Gate Pass</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>Currently Outside Campus</span>
            <ExitIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', fontFamily: SORA }}>{currentlyOutCount}</div>
          <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>Passed gate security</div>
        </div>

        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>Approved (Pending Exit)</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#8b5cf6', fontFamily: SORA }}>{approvedCount}</div>
          <div style={{ fontSize: 11, color: '#8b5cf6', marginTop: 4 }}>Passes active for today</div>
        </div>

        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>Safely Returned & Checked-In</span>
            <EntryIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', fontFamily: SORA }}>{returnedCount}</div>
          <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Gate check-in recorded</div>
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
            placeholder="Search student, pass serial (e.g. GP-2026), admission no, destination..."
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
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
          <option value="All">All Pass Statuses</option>
          <option value="Approved">Approved</option>
          <option value="Currently Out">Currently Out</option>
          <option value="Returned">Returned & Checked In</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Passes Table */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Pass Code & Student</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Destination & Reason</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Departure / Expected Return</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Guardian Verification</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#10b981', fontFamily: 'monospace', fontSize: 12 }}>
                      {p.serialNumber}
                    </div>
                    <div style={{ fontWeight: 600, color: tk.text, marginTop: 2 }}>{p.studentName}</div>
                    <div style={{ fontSize: 11, color: tk.subText }}>
                      {p.className} • {p.admissionNo}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{p.destination}</div>
                    <div style={{ fontSize: 11, color: tk.subText, maxWidth: 220 }}>{p.reason}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12 }}>
                    <div style={{ color: tk.text }}>
                      <span style={{ color: tk.subText }}>Out: </span>
                      {p.departureTime}
                    </div>
                    <div style={{ color: '#f59e0b', marginTop: 2 }}>
                      <span style={{ color: tk.subText }}>Exp. Back: </span>
                      {p.expectedReturnTime}
                    </div>
                    {p.actualReturnTime && (
                      <div style={{ color: '#10b981', marginTop: 2, fontWeight: 600 }}>
                        <span style={{ color: tk.subText }}>Actual: </span>
                        {p.actualReturnTime}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12 }}>
                    <div style={{ color: tk.text, fontWeight: 600 }}>{p.guardianName}</div>
                    <div style={{ fontSize: 11, color: tk.subText }}>{p.guardianPhone}</div>
                    <div style={{ fontSize: 10, color: '#0ea5e9', marginTop: 2 }}>{p.escortType}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background:
                          p.status === 'Currently Out'
                            ? 'rgba(245,158,11,0.15)'
                            : p.status === 'Approved'
                            ? 'rgba(139,92,246,0.15)'
                            : p.status === 'Returned'
                            ? 'rgba(16,185,129,0.15)'
                            : 'rgba(244,63,94,0.15)',
                        color:
                          p.status === 'Currently Out'
                            ? '#f59e0b'
                            : p.status === 'Approved'
                            ? '#8b5cf6'
                            : p.status === 'Returned'
                            ? '#10b981'
                            : '#f43f5e',
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedPass(p)}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${tk.cardBorder}`,
                          color: tk.text,
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Print Pass
                      </button>
                      {p.status === 'Currently Out' && (
                        <button
                          type="button"
                          onClick={() => handleLogReturn(p.id)}
                          style={{
                            background: '#10b981',
                            border: 'none',
                            color: '#ffffff',
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Log Return
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Pass Slip Modal */}
      {selectedPass && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSelectedPass(null)}
        >
          <div
            style={{
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: 16,
              width: '100%',
              maxWidth: 480,
              padding: 28,
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              border: '2px solid #0f172a',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Stamp */}
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: '#10b981', textTransform: 'uppercase' }}>
                PwezaCore School Management System
              </div>
              <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, fontFamily: SORA, color: '#0f172a' }}>
                OFFICIAL STUDENT GATE PASS
              </h2>
              <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#475569', marginTop: 4 }}>
                SERIAL: {selectedPass.serialNumber}
              </div>
            </div>

            {/* Pass details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Student Name:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedPass.studentName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Class & Admission:</span>
                <span style={{ fontWeight: 600 }}>{selectedPass.className} ({selectedPass.admissionNo})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Destination:</span>
                <span style={{ fontWeight: 600 }}>{selectedPass.destination}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Reason:</span>
                <span style={{ fontWeight: 600 }}>{selectedPass.reason}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Departure:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedPass.departureTime}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Expected Return:</span>
                <span style={{ fontWeight: 700, color: '#d97706' }}>{selectedPass.expectedReturnTime}</span>
              </div>
              {selectedPass.actualReturnTime && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                  <span style={{ color: '#64748b' }}>Recorded Return:</span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>{selectedPass.actualReturnTime}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Authorized Guardian:</span>
                <span style={{ fontWeight: 600 }}>{selectedPass.guardianName} ({selectedPass.guardianPhone})</span>
              </div>
            </div>

            {/* Official Stamp */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 14, borderTop: '2px dashed #cbd5e1' }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Authorized by:</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{selectedPass.approverName}</div>
                <div style={{ fontSize: 10, color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>
                  VERIFIED & SEALED
                </div>
              </div>

              <div style={{ border: '2px solid #10b981', borderRadius: 8, padding: '4px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#10b981', letterSpacing: 1 }}>GATE PASS</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>VALIDATED</div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Printer className="w-4 h-4" />
                <span>Print Physical Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPass(null)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '10px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
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
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: isDark ? '#0f172a' : '#ffffff',
              border: `1px solid ${tk.cardBorder}`,
              borderRadius: 16,
              width: '100%',
              maxWidth: 520,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
                Issue Gate Exit Pass
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: tk.subText, cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePass} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                    Admission Number
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
                  Destination Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Case Hospital, Kampala"
                  value={newDest}
                  onChange={(e) => setNewDest(e.target.value)}
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
                  Exit Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Medical examination with mother"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
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
                    Departure Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    value={newDepTime}
                    onChange={(e) => setNewDepTime(e.target.value)}
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
                    Expected Return
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 04:00 PM"
                    value={newRetTime}
                    onChange={(e) => setNewRetTime(e.target.value)}
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
                    Guardian Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mary Nakato"
                    value={newGuardian}
                    onChange={(e) => setNewGuardian(e.target.value)}
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
                    Guardian Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +256 772 123 456"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
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
                  onClick={() => setShowCreateModal(false)}
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
                    background: '#10b981',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Generate Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
