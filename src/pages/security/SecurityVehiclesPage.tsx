import { useState } from 'react';
import {
  Truck,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  Building2,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

interface VehicleLogItem {
  id: string;
  plateNumber: string;
  vehicleType: 'Delivery Truck' | 'Staff Private Car' | 'Parent / Visitor Car' | 'School Bus' | 'Official Administrative';
  driverName: string;
  driverPhone: string;
  purposeOrCargo: string;
  timeIn: string;
  timeOut?: string | null;
  status: 'Inside Campus' | 'Exited';
}

const INITIAL_VEHICLES: VehicleLogItem[] = [
  {
    id: 'vh-1',
    plateNumber: 'UBK 450M',
    vehicleType: 'Delivery Truck',
    driverName: 'Ssemwanga Peter',
    driverPhone: '+256 701 556 789',
    purposeOrCargo: '50 bags Supa posho & 20 bags Nambale beans for kitchen',
    timeIn: '08:45 AM',
    status: 'Inside Campus',
  },
  {
    id: 'vh-2',
    plateNumber: 'UBA 120A',
    vehicleType: 'Staff Private Car',
    driverName: 'Mr. Kato Brian',
    driverPhone: '+256 772 889 010',
    purposeOrCargo: 'Science Teacher daily commute',
    timeIn: '07:20 AM',
    status: 'Inside Campus',
  },
  {
    id: 'vh-3',
    plateNumber: 'UBG 910X',
    vehicleType: 'Parent / Visitor Car',
    driverName: 'Mrs. Mary Nakato',
    driverPhone: '+256 772 123 456',
    purposeOrCargo: 'Collecting student (Grace Nakato) on approved gate pass',
    timeIn: '09:20 AM',
    timeOut: '09:35 AM',
    status: 'Exited',
  },
];

export default function SecurityVehiclesPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [vehicles, setVehicles] = useState<VehicleLogItem[]>(INITIAL_VEHICLES);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [plate, setPlate] = useState('');
  const [vType, setVType] = useState<'Delivery Truck' | 'Staff Private Car' | 'Parent / Visitor Car' | 'School Bus' | 'Official Administrative'>('Delivery Truck');
  const [driver, setDriver] = useState('');
  const [phone, setPhone] = useState('');
  const [cargo, setCargo] = useState('');

  const filtered = vehicles.filter(
    (v) =>
      v.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.driverName.toLowerCase().includes(search.toLowerCase()) ||
      v.purposeOrCargo.toLowerCase().includes(search.toLowerCase())
  );

  function handleLogEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!plate.trim() || !driver.trim()) return;

    const newV: VehicleLogItem = {
      id: `vh-${Date.now()}`,
      plateNumber: plate.trim().toUpperCase(),
      vehicleType: vType,
      driverName: driver.trim(),
      driverPhone: phone.trim() || '+256',
      purposeOrCargo: cargo.trim() || 'General access',
      timeIn: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status: 'Inside Campus',
    };

    setVehicles([newV, ...vehicles]);
    setShowAddModal(false);
    setPlate('');
    setDriver('');
    setPhone('');
    setCargo('');
  }

  function handleLogExit(id: string) {
    const timeOut = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setVehicles(
      vehicles.map((v) => (v.id === id ? { ...v, status: 'Exited', timeOut } : v))
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#0ea5e9', background: 'rgba(14, 165, 233, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Vehicular Gate Control
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Perimeter Barrier Register</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Gate Vehicle & Delivery Register
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Record number plates, delivery manifests, driver credentials, and entry/exit timestamps.
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
          <span>Log Vehicle In</span>
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
          placeholder="Search number plate (e.g. UBK 450M), driver name, or cargo..."
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

      {/* Vehicles Table */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Number Plate & Type</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Driver Name & Phone</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Purpose / Cargo Manifest</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Time In / Out</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 800, color: '#0ea5e9', fontFamily: 'monospace', fontSize: 14 }}>
                      {v.plateNumber}
                    </div>
                    <div style={{ fontSize: 11, color: tk.subText, marginTop: 2 }}>{v.vehicleType}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{v.driverName}</div>
                    <div style={{ fontSize: 11, color: tk.subText }}>{v.driverPhone}</div>
                  </td>
                  <td style={{ padding: '14px 16px', maxWidth: 240, color: tk.text, fontSize: 12 }}>
                    {v.purposeOrCargo}
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
                          v.status === 'Inside Campus'
                            ? 'rgba(14,165,233,0.15)'
                            : 'rgba(148,163,184,0.15)',
                        color: v.status === 'Inside Campus' ? '#0ea5e9' : tk.subText,
                      }}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {v.status === 'Inside Campus' && (
                      <button
                        type="button"
                        onClick={() => handleLogExit(v.id)}
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
                        Log Exit
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
                Log Vehicle Entry
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: tk.subText, cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogEntry} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Number Plate *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UBK 450M"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: isDark ? '#1e293b' : '#f8fafc',
                      border: `1px solid ${tk.cardBorder}`,
                      color: tk.text,
                      fontSize: 13,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Vehicle Type
                  </label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value as any)}
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
                    <option value="Delivery Truck">Delivery Truck</option>
                    <option value="Staff Private Car">Staff Private Car</option>
                    <option value="Parent / Visitor Car">Parent / Visitor Car</option>
                    <option value="School Bus">School Bus</option>
                    <option value="Official Administrative">Official Administrative</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                    Driver Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ssemwanga Peter"
                    value={driver}
                    onChange={(e) => setDriver(e.target.value)}
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
                    Driver Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +256 701 556 789"
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

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Purpose / Cargo Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50 bags posho food supplies"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
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
                  Log Entry & Open Barrier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
