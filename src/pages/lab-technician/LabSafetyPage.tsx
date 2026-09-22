import { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  FileText,
  Clock,
  Building2,
  Users,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

interface SafetyCheckItem {
  id: string;
  facility: string;
  checkItem: string;
  complianceStatus: 'Pass' | 'Attention Required' | 'Critical Failure';
  lastInspected: string;
  inspector: string;
  correctiveAction?: string;
}

const INITIAL_SAFETY_CHECKS: SafetyCheckItem[] = [
  {
    id: 'sft-1',
    facility: 'Chemistry Lab',
    checkItem: 'Emergency Eye-Wash Station & Drench Shower Plumbing Flow',
    complianceStatus: 'Pass',
    lastInspected: 'Yesterday (21 Sept 2026)',
    inspector: 'Chief Lab Technician',
  },
  {
    id: 'sft-2',
    facility: 'Chemistry Lab',
    checkItem: 'Chemical Fume Hood Exhaust Velocity & Carbon Filtration',
    complianceStatus: 'Pass',
    lastInspected: '15 Sept 2026',
    inspector: 'Chief Lab Technician',
  },
  {
    id: 'sft-3',
    facility: 'Physics & Chem Labs',
    checkItem: 'CO2 & Dry Powder Fire Extinguishers Pressure Gauge Check',
    complianceStatus: 'Pass',
    lastInspected: '10 Sept 2026',
    inspector: 'Safety Officer',
  },
  {
    id: 'sft-4',
    facility: 'Biology Lab',
    checkItem: 'Biohazard Sharp Disposal Bins (Needles / Scalpel Blades)',
    complianceStatus: 'Attention Required',
    lastInspected: '18 Sept 2026',
    inspector: 'Chief Lab Technician',
    correctiveAction: 'Bin reached 75% capacity. Scheduled incinerator collection on Friday.',
  },
  {
    id: 'sft-5',
    facility: 'ICT Computer Lab',
    checkItem: 'Surge Protectors, Earthing Grounding & Cable Trunking',
    complianceStatus: 'Pass',
    lastInspected: '12 Sept 2026',
    inspector: 'ICT Support Engineer',
  },
  {
    id: 'sft-6',
    facility: 'All Labs',
    checkItem: 'Student PPE Supplies (Nitrile Gloves, Polycarbonate Goggles, Lab Coats)',
    complianceStatus: 'Pass',
    lastInspected: '20 Sept 2026',
    inspector: 'Chief Lab Technician',
  },
];

export default function LabSafetyPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [checks, setChecks] = useState<SafetyCheckItem[]>(INITIAL_SAFETY_CHECKS);

  function toggleCheck(id: string) {
    setChecks(
      checks.map((c) =>
        c.id === id
          ? {
              ...c,
              complianceStatus: c.complianceStatus === 'Pass' ? 'Attention Required' : 'Pass',
              lastInspected: 'Today (Just Now)',
            }
          : c
      )
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Safety Compliance
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>UNEB & MoES Science Laboratory Protocols</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Laboratory Safety & Compliance Matrix
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Weekly inspection protocols, eyewash tests, fire extinguisher certifications, and PPE stocks.
          </p>
        </div>
      </div>

      {/* Safety Protocol Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Flame className="w-5 h-5 text-amber-500" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
              Chemical Spill Protocols
            </h3>
          </div>
          <p style={{ fontSize: 12, color: tk.subText, lineHeight: 1.5, margin: '0 0 10px' }}>
            In event of acid spill: Evacuate station immediately, apply dry sodium bicarbonate powder to neutralize. For alkali spills, use dilute boric acid.
          </p>
          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Spill kit stationed at Doorway Chem-1</div>
        </div>

        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
              Mandatory PPE Rules
            </h3>
          </div>
          <p style={{ fontSize: 12, color: tk.subText, lineHeight: 1.5, margin: '0 0 10px' }}>
            No candidate or student allowed into Science Labs without full-length buttoned white lab coat, closed leather shoes, and safety goggles during heating.
          </p>
          <div style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 600 }}>Enforced by Subject Teachers</div>
        </div>

        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
              Emergency Evacuation
            </h3>
          </div>
          <p style={{ fontSize: 12, color: tk.subText, lineHeight: 1.5, margin: '0 0 10px' }}>
            Shut down main master gas valves (Green Lever) and flip Main Power Breaker immediately. Exit via Fire Escape B to Upper Sports Field Assembly Point.
          </p>
          <div style={{ fontSize: 11, color: '#f43f5e', fontWeight: 600 }}>Master gas valve tested weekly</div>
        </div>
      </div>

      {/* Compliance Checklist Table */}
      <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${tk.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
              Weekly Station Inspection Log
            </h3>
            <div style={{ fontSize: 12, color: tk.subText, marginTop: 2 }}>Click any row item to toggle or verify inspection</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.cardBorder}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Laboratory Facility</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Safety Protocol / Item</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Last Inspection</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Inspector</th>
                <th style={{ padding: '12px 16px', color: tk.subText, fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: tk.text }}>
                    {c.facility}
                  </td>
                  <td style={{ padding: '14px 16px', color: tk.text }}>
                    <div>{c.checkItem}</div>
                    {c.correctiveAction && (
                      <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 3 }}>
                        Action: {c.correctiveAction}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background:
                          c.complianceStatus === 'Pass'
                            ? 'rgba(16,185,129,0.15)'
                            : 'rgba(245,158,11,0.15)',
                        color: c.complianceStatus === 'Pass' ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {c.complianceStatus}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: tk.subText }}>{c.lastInspected}</td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: tk.subText }}>{c.inspector}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      type="button"
                      onClick={() => toggleCheck(c.id)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${tk.cardBorder}`,
                        color: tk.text,
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Re-verify
                    </button>
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
