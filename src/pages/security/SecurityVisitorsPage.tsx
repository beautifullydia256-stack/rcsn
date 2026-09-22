import { useState } from 'react';
import {
  UserCheck,
  Search,
  Plus,
  Clock,
  Phone,
  Building2,
  CheckCircle2,
  X,
  CreditCard,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

interface VisitorItem {
  id: string;
  badgeNumber: string;
  name: string;
  nationalIdOrNIN: string;
  phone: string;
  hostDepartment: string;
  hostPerson: string;
  purpose: string;
  timeIn: string;
  timeOut?: string | null;
  status: 'Currently On Campus' | 'Checked Out';
}

const INITIAL_VISITORS: VisitorItem[] = [
  {
    id: 'v-1',
    badgeNumber: 'V-042',
    name: 'Mugisha Dennis',
    nationalIdOrNIN: 'CM89012345ABCD',
    phone: '+256 701 443 890',
    hostDepartment: 'Accounts & Bursar',
    hostPerson: 'Senior Bursar',
    purpose: 'Internal financial audit review and system ledger check',
    timeIn: '09:15 AM',
    status: 'Currently On Campus',
  },
  {
    id: 'v-2',
    badgeNumber: 'V-043',
    name: 'Mrs. Florence Kasozi',
    nationalIdOrNIN: 'CF92098765KLMN',
    phone: '+256 782 119 001',
    hostDepartment: 'Administration',
    hostPerson: 'Head Teacher',
    purpose: 'Senior 1 admission inquiry and interview for daughter',
    timeIn: '10:00 AM',
    status: 'Currently On Campus',
  },
  {
    id: 'v-3',
    badgeNumber: 'V-041',
    name: 'Apollo Ssemakula',
    nationalIdOrNIN: 'CM78044321WXYZ',
    phone: '+256 752 908 123',
    hostDepartment: 'Estates & Facilities',
    hostPerson: 'Estates Officer',
    purpose: 'Maintenance inspection of secondary solar inverter backup',
    timeIn: '08:00 AM',
    timeOut: '10:15 AM',
    status: 'Checked Out',
  },
];

export default function SecurityVisitorsPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [visitors, setVisitors] = useState<VisitorItem[]>(INITIAL_VISITORS);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [nin, setNin] = useState('');
  const [phone, setPhone] = useState('');
  const [hostDept, setHostDept] = useState('Administration');
  const [hostPerson, setHostPerson] = useState('');
  const [purpose, setPurpose] = useState('');
  const [badgeNum, setBadgeNum] = useState('');

  const filtered = visitors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.badgeNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.hostPerson.toLowerCase().includes(search.toLowerCase())
  );

  function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !purpose.trim()) return;

    const newV: VisitorItem = {
      id: `v-${Date.now()}`,
      badgeNumber: badgeNum.trim() || `V-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim(),
      nationalIdOrNIN: nin.trim() || 'N/A',
      phone: phone.trim() || '+256',
      hostDepartment: hostDept,
      hostPerson: hostPerson.trim() || 'Assigned Officer',
      purpose: purpose.trim(),
      timeIn: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status: 'Currently On Campus',
    };

    setVisitors([newV, ...visitors]);
    setShowAddModal(false);
    setName('');
    setNin('');
    setPhone('');
    setHostPerson('');
    setPurpose('');
    setBadgeNum('');
  }

  function handleCheckOut(id: string) {
    const timeOut = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setVisitors(
      visitors.map((v) => (v.id === id ? { ...v, status: 'Checked Out', timeOut } : v))
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Visitor Management
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Perimeter Check-In Log</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Gate Visitor Badging & Logbook
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Issue visitor badges, record identification credentials, and monitor campus visit durations.
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
          <span>Check-In New Visitor</span>
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
          placeholder="Search visitor name, badge number (e.g. V-042), or host..."
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

      {/* Visitors Table */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Badge & Visitor</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>NIN / Phone</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Host & Dept</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Purpose</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Time In / Out</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                      {v.badgeNumber}
                    </span>
                    <div style={{ fontWeight: 600, color: tk.text, marginTop: 4 }}>{v.name}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12 }}>
                    <div style={{ color: tk.text }}>{v.phone}</div>
                    <div style={{ fontSize: 11, color: tk.subText, fontFamily: 'monospace' }}>{v.nationalIdOrNIN}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{v.hostPerson}</div>
                    <div style={{ fontSize: 11, color: tk.subText }}>{v.hostDepartment}</div>
                  </td>
                  <td style={{ padding: '14px 16px', maxWidth: 220, color: tk.text, fontSize: 12 }}>
                    {v.purpose}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12 }}>
                    <div style={{ color: tk.text }}>In: {v.timeIn}</div>
                    {v.timeOut && <div style={{ color: tk.subText }}>Out: {v.timeOut}</div>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background:
                          v.status === 'Currently On Campus'
                            ? 'rgba(16,185,129,0.15)'
                            : 'rgba(148,163,184,0.15)',
                        color: v.status === 'Currently On Campus' ? '#10b981' : tk.subText,
                      }}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {v.status === 'Currently On Campus' && (
                      <button
                        type="button"
                        onClick={() => handleCheckOut(v.id)}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${tk.cardBorder}`,
                          color: '#f59e0b',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Check-Out
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
                Check-In Campus Visitor
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: tk.subText, cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Visitor Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mugisha Dennis"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                    National ID / NIN
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CM89012345ABCD"
                    value={nin}
                    onChange={(e) => setNin(e.target.value)}
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
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +256 701 443 890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                    Department to Visit
                  </label>
                  <select
                    value={hostDept}
                    onChange={(e) => setHostDept(e.target.value)}
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
                    <option value="Administration">Administration</option>
                    <option value="Accounts & Bursar">Accounts & Bursar</option>
                    <option value="Academics / DOS">Academics / DOS</option>
                    <option value="Staff Room / Teacher">Staff Room / Teacher</option>
                    <option value="Sickbay & Clinic">Sickbay & Clinic</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Host Person Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Head Teacher"
                    value={hostPerson}
                    onChange={(e) => setHostPerson(e.target.value)}
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
                  Purpose of Visit *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit review, Fee payment, Admission inquiry"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
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
                  Assigned Badge Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. V-045"
                  value={badgeNum}
                  onChange={(e) => setBadgeNum(e.target.value)}
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
                  Check-In Visitor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
