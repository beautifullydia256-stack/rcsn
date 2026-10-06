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
  Download,
  Loader2,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';

const ESCORT_OPTIONS = [
  { value: 'Parent / Guardian', label: 'Parent / Guardian' },
  { value: 'Staff Member', label: 'Staff Member' },
  { value: 'Unaccompanied (Authorized)', label: 'Unaccompanied (Authorized)' },
];

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
  approverRole: 'Academic Registrar' | 'Head Teacher' | 'Administrator' | 'Institutional Administrator' | 'Secretary' | string;
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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadGatePassPdf = async () => {
    const slipEl = document.getElementById('thermal-gatepass-slip');
    if (!slipEl || isDownloadingPdf || !selectedPass) return;
    setIsDownloadingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(slipEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const slipWidthMm = 80;
      const slipHeightMm = (canvas.height * slipWidthMm) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [slipWidthMm, slipHeightMm + 6],
      });

      pdf.addImage(imgData, 'JPEG', 0, 3, slipWidthMm, slipHeightMm);
      const safeName = selectedPass.studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`GatePass_${selectedPass.serialNumber}_${safeName}.pdf`);
    } catch (err) {
      console.error('Failed to download gate pass PDF:', err);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

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

    const roleName = (portalRole === 'academic-registrar' || portalRole === 'head-teacher') ? 'Academic Registrar' : portalRole === 'admin' ? 'Institutional Administrator' : 'Secretary';

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
      <NativeModal
        isOpen={Boolean(selectedPass)}
        onClose={() => setSelectedPass(null)}
        title="Official Gate Pass & Exit Slip"
        subtitle="Thermal receipt preview with PDF download and 80mm printer support."
        icon={Printer}
        size="md"
      >
        {selectedPass && (
          <div className="space-y-4">
            <div
              id="thermal-gatepass-slip"
              style={{
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: 16,
                width: '100%',
                maxWidth: 390,
                margin: '0 auto',
                padding: '24px 20px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                border: '2px dashed #0f172a',
                fontFamily: INTER,
              }}
            >
              {/* Header / Receipt Letterhead */}
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #94a3b8', paddingBottom: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: '#10b981', textTransform: 'uppercase' }}>
                  PwezaCore Security Network
                </div>
                <h2 style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 800, fontFamily: SORA, color: '#0f172a', letterSpacing: 0.5 }}>
                  OFFICIAL GATE PASS &amp; EXIT
                </h2>
                <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: '#334155', marginTop: 4, letterSpacing: 1 }}>
                  SERIAL: #{selectedPass.serialNumber}
                </div>
              </div>

              {/* Pass details formatted in clean receipt rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Student Name:</span>
                  <strong style={{ color: '#0f172a', textAlign: 'right' }}>{selectedPass.studentName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Class &amp; Reg No:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedPass.className} ({selectedPass.admissionNo})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Destination:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b', textAlign: 'right' }}>{selectedPass.destination}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Reason for Exit:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b', textAlign: 'right' }}>{selectedPass.reason}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Departure:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedPass.departureTime}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Expected Return:</span>
                  <strong style={{ color: '#d97706' }}>{selectedPass.expectedReturnTime}</strong>
                </div>
                {selectedPass.actualReturnTime && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>Recorded Return:</span>
                    <strong style={{ color: '#10b981' }}>{selectedPass.actualReturnTime}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Escort / Guardian:</span>
                  <span style={{ fontWeight: 600, color: '#1e293b', textAlign: 'right' }}>
                    {selectedPass.guardianName} ({selectedPass.guardianPhone})
                  </span>
                </div>
              </div>

              {/* Official Validation Stamp */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 10, borderTop: '2px dashed #94a3b8' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Authorized by:</div>
                  <div style={{ fontWeight: 800, fontSize: 12, color: '#0f172a' }}>{selectedPass.approverName}</div>
                  <div style={{ fontSize: 9.5, color: '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    VERIFIED &amp; APPROVED
                  </div>
                </div>

                <div style={{ border: '2px solid #0f172a', borderRadius: 6, padding: '3px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#10b981', letterSpacing: 1 }}>SECURITY</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#0f172a' }}>PASS VALID</div>
                </div>
              </div>

              {/* Barcode representation */}
              <div style={{ textAlign: 'center', margin: '14px 0 6px' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 4, fontWeight: 700, color: '#334155' }}>
                  ||||| | |||| ||| ||||||| |||
                </div>
                <div style={{ fontSize: 9, color: '#94a3b8' }}>{selectedPass.id} · PRESENT AT SECURITY GATE</div>
              </div>

              {/* Thermal Print Media Styling */}
              <style>{`
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #thermal-gatepass-slip, #thermal-gatepass-slip * {
                    visibility: visible !important;
                  }
                  #thermal-gatepass-slip {
                    position: fixed !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 80mm !important;
                    max-width: 80mm !important;
                    margin: 0 !important;
                    padding: 4mm !important;
                    box-shadow: none !important;
                    border: 1px dashed #000 !important;
                    color: #000 !important;
                    background: #fff !important;
                    border-radius: 0 !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  @page {
                    size: 80mm auto;
                    margin: 2mm;
                  }
                }
              `}</style>
            </div>

            {/* Action buttons */}
            <div className="no-print flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedPass(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/20 transition-all inline-flex items-center gap-2"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip (80mm)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadGatePassPdf}
                disabled={isDownloadingPdf}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 border border-emerald-400/30 transition-all inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>{isDownloadingPdf ? 'Saving...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>
        )}
      </NativeModal>

      {/* Create Modal */}
      <NativeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Issue Gate Exit Pass"
        subtitle="Authorize departure for trainee or escorted student with digital gate logs."
        icon={ExitIcon}
        size="lg"
      >
        <form onSubmit={handleCreatePass} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Student Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kasule Brian"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Class / Cohort
              </label>
              <input
                type="text"
                placeholder="e.g. Senior 4 East or Year 2 Semester 1"
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Admission Number
              </label>
              <input
                type="text"
                placeholder="e.g. ADM-2023-144"
                value={newAdm}
                onChange={(e) => setNewAdm(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 font-mono uppercase transition-all shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Destination Location *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Case Hospital, Kampala"
              value={newDest}
              onChange={(e) => setNewDest(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Exit Reason *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Medical examination with mother"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Departure Time
              </label>
              <input
                type="text"
                placeholder="e.g. 10:00 AM"
                value={newDepTime}
                onChange={(e) => setNewDepTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Expected Return
              </label>
              <input
                type="text"
                placeholder="e.g. 04:00 PM"
                value={newRetTime}
                onChange={(e) => setNewRetTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Guardian / Contact Name
              </label>
              <input
                type="text"
                placeholder="e.g. Mary Nakato"
                value={newGuardian}
                onChange={(e) => setNewGuardian(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Guardian Phone
              </label>
              <input
                type="text"
                placeholder="e.g. +256 772 123 456"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="relative z-[35] focus-within:z-[50]">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Escort Authorization Type *
            </label>
            <LiquidGlassSelect
              value={newEscort}
              onChange={(val) => setNewEscort(val as any)}
              options={ESCORT_OPTIONS}
              placeholder="Select Escort Type..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 border border-emerald-400/30 transition-all"
            >
              Generate Pass
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
