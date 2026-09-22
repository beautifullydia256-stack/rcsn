import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  QrCode,
  UserCheck,
  Truck,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
  Radio,
  Building2,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [gateLocked, setGateLocked] = useState(false);

  const liveMovements = [
    {
      type: 'Gate Pass Exit',
      entity: 'Grace Nakato (P.5 Blue)',
      serial: 'GP-2026-0814',
      time: '09:30 AM',
      guard: 'Officer Okello',
      badge: '#f59e0b',
    },
    {
      type: 'Visitor In',
      entity: 'Mugisha Dennis (Audit Consultant)',
      serial: 'Badge #V-042',
      time: '09:15 AM',
      guard: 'Officer Tumusiime',
      badge: '#10b981',
    },
    {
      type: 'Vehicle In',
      entity: 'Isuzu Elf Truck (UBK 450M) - Food Supplies',
      serial: '50 Bags Posho',
      time: '08:45 AM',
      guard: 'Officer Okello',
      badge: '#0ea5e9',
    },
    {
      type: 'Staff Arrival',
      entity: 'Mr. Kato Brian (Chemistry Dept)',
      serial: 'Vehicle UBA 120A',
      time: '07:20 AM',
      guard: 'Officer Tumusiime',
      badge: '#8b5cf6',
    },
  ];

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Main Perimeter Gatehouse
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Gate A & Gate B Command Center</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Campus Security Operations
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Live gate traffic, visitor badge issuance, student gate pass verification, and perimeter control.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setGateLocked(!gateLocked)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: gateLocked ? '#f43f5e' : 'rgba(16, 185, 129, 0.15)',
              color: gateLocked ? '#ffffff' : '#10b981',
              border: `1px solid ${gateLocked ? '#f43f5e' : 'rgba(16, 185, 129, 0.3)'}`,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Lock className="w-4 h-4" />
            <span>{gateLocked ? 'Campus Gates Locked (Active Lockdown)' : 'Gates Operating Normally'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/dashboard/security/passes')}
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
            <QrCode className="w-4 h-4" />
            <span>Scan Student Gate Pass</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>Active Visitors On Site</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: tk.text, fontFamily: SORA }}>14</div>
          <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Badges currently checked-in</div>
        </div>

        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>Students Out on Gate Pass</span>
            <QrCode className="w-4 h-4 text-amber-400" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', fontFamily: SORA }}>3</div>
          <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>Expected return by 05:00 PM</div>
        </div>

        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>Vehicles Inside Campus</span>
            <Truck className="w-4 h-4 text-cyan-400" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0ea5e9', fontFamily: SORA }}>8</div>
          <div style={{ fontSize: 11, color: '#0ea5e9', marginTop: 4 }}>Staff, delivery & visitor cars</div>
        </div>

        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>Perimeter Watch Status</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', fontFamily: SORA }}>All Clear</div>
          <div style={{ fontSize: 11, color: tk.subText, marginTop: 4 }}>North & South fences secure</div>
        </div>
      </div>

      {/* Live Movements */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 14, padding: 20, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
              Live Gatehouse Movement Register
            </h3>
            <div style={{ fontSize: 12, color: tk.subText, marginTop: 2 }}>Real-time entries, departures, and badge clearances</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {liveMovements.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 10,
                background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${tk.cardBorder}`,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.08)',
                      color: m.badge,
                    }}
                  >
                    {m.type}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>{m.entity}</span>
                </div>
                <div style={{ fontSize: 11, color: tk.subText, marginTop: 4 }}>
                  Ref: {m.serial} • Logged by: {m.guard}
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: tk.text }}>
                {m.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
