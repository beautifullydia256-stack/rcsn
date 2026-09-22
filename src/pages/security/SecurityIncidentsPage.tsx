import { useState } from 'react';
import {
  AlertOctagon,
  Search,
  Plus,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Building2,
  AlertTriangle,
  Radio,
  X,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

interface IncidentItem {
  id: string;
  incidentType: 'Perimeter Breach Attempt' | 'Contraband Confiscated' | 'Dormitory Curfew Infraction' | 'Property Damage' | 'Suspicious Loitering';
  location: string;
  timestamp: string;
  reportedByGuard: string;
  severity: 'Critical' | 'Moderate' | 'Low / Resolved';
  description: string;
  actionTaken: string;
}

const INITIAL_INCIDENTS: IncidentItem[] = [
  {
    id: 'inc-1',
    incidentType: 'Perimeter Breach Attempt',
    location: 'Rear Southern Fence (Behind Boys Dorm 3)',
    timestamp: 'Yesterday, 11:45 PM',
    reportedByGuard: 'Officer Tumusiime (Night Watch)',
    severity: 'Critical',
    description: 'Two non-student individuals attempted to scale perimeter chain-link fence. Spotlight illuminated them; individuals fled towards valley swamp.',
    actionTaken: 'Perimeter alarm activated. Patrolling frequency doubled on South wire fence.',
  },
  {
    id: 'inc-2',
    incidentType: 'Contraband Confiscated',
    location: 'Main Gate A Pedestrian Search',
    timestamp: '20 Sept 2026, 04:30 PM',
    reportedByGuard: 'Officer Okello',
    severity: 'Moderate',
    description: 'Day-scholar student attempted to bring unapproved smartphone concealed inside mathematics textbook cavity.',
    actionTaken: 'Phone confiscated and tagged #CTB-082. Handed over to Deputy Head Teacher.',
  },
  {
    id: 'inc-3',
    incidentType: 'Dormitory Curfew Infraction',
    location: 'Nile Hostel Block C',
    timestamp: '19 Sept 2026, 10:30 PM',
    reportedByGuard: 'Officer Okello',
    severity: 'Low / Resolved',
    description: '3 students found outside hostel dorms after 10:00 PM lights-out bell.',
    actionTaken: 'Escorted back to Dorm Warden. Disciplinary record submitted.',
  },
];

export default function SecurityIncidentsPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [incidents, setIncidents] = useState<IncidentItem[]>(INITIAL_INCIDENTS);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [type, setType] = useState<'Perimeter Breach Attempt' | 'Contraband Confiscated' | 'Dormitory Curfew Infraction' | 'Property Damage' | 'Suspicious Loitering'>('Perimeter Breach Attempt');
  const [loc, setLoc] = useState('');
  const [guard, setGuard] = useState('Officer on Duty');
  const [severity, setSeverity] = useState<'Critical' | 'Moderate' | 'Low / Resolved'>('Moderate');
  const [desc, setDesc] = useState('');
  const [action, setAction] = useState('');

  const filtered = incidents.filter(
    (i) =>
      i.incidentType.toLowerCase().includes(search.toLowerCase()) ||
      i.location.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase())
  );

  function handleAddIncident(e: React.FormEvent) {
    e.preventDefault();
    if (!loc.trim() || !desc.trim()) return;

    const newInc: IncidentItem = {
      id: `inc-${Date.now()}`,
      incidentType: type,
      location: loc.trim(),
      timestamp: `Today, ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      reportedByGuard: guard.trim(),
      severity: severity,
      description: desc.trim(),
      actionTaken: action.trim() || 'Logged and under active surveillance.',
    };

    setIncidents([newInc, ...incidents]);
    setShowAddModal(false);
    setLoc('');
    setDesc('');
    setAction('');
  }

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Patrol & Enforcement
            </span>
            <span style={{ fontSize: 12, color: tk.subText }}>Security Blotter Logbook</span>
          </div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Incident Reports & Night Watch Blotter
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Document perimeter security breaches, contraband seizures, dormitory patrols, and disciplinary escalations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#f43f5e',
            color: '#ffffff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Plus className="w-4 h-4" />
          <span>File Incident Blotter</span>
        </button>
      </div>

      {/* Incident List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map((i) => (
          <div
            key={i.id}
            style={{
              background: cardGrad(isDark),
              border: `1px solid ${i.severity === 'Critical' ? 'rgba(244,63,94,0.35)' : tk.cardBorder}`,
              borderRadius: 14,
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background:
                      i.severity === 'Critical'
                        ? 'rgba(244,63,94,0.15)'
                        : i.severity === 'Moderate'
                        ? 'rgba(245,158,11,0.15)'
                        : 'rgba(16,185,129,0.15)',
                    color:
                      i.severity === 'Critical'
                        ? '#f43f5e'
                        : i.severity === 'Moderate'
                        ? '#f59e0b'
                        : '#10b981',
                  }}
                >
                  {i.severity}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
                  {i.incidentType}
                </span>
              </div>

              <div style={{ fontSize: 12, color: tk.subText, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock className="w-3.5 h-3.5" />
                <span>{i.timestamp}</span>
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 600, marginBottom: 8 }}>
              Location: <span style={{ color: tk.text }}>{i.location}</span>
            </div>

            <p style={{ fontSize: 13, color: tk.text, margin: '0 0 12px', lineHeight: 1.5 }}>
              {i.description}
            </p>

            <div style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: '#10b981' }}>Action Taken: </span>
              <span style={{ color: tk.subText }}>{i.actionTaken}</span>
            </div>

            <div style={{ fontSize: 11, color: tk.subText }}>
              Investigating Guard: <span style={{ color: tk.text }}>{i.reportedByGuard}</span>
            </div>
          </div>
        ))}
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
                Record Security Incident
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: tk.subText, cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddIncident} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Incident Classification
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
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
                  <option value="Perimeter Breach Attempt">Perimeter Breach Attempt</option>
                  <option value="Contraband Confiscated">Contraband Confiscated</option>
                  <option value="Dormitory Curfew Infraction">Dormitory Curfew Infraction</option>
                  <option value="Property Damage">Property Damage</option>
                  <option value="Suspicious Loitering">Suspicious Loitering</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Exact Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rear North Fence behind library"
                  value={loc}
                  onChange={(e) => setLoc(e.target.value)}
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
                  Severity Level
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
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
                  <option value="Low / Resolved">Low / Resolved</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Critical">Critical (Immediate Escalation)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.subText, display: 'block', marginBottom: 4 }}>
                  Incident Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail observed activity, persons involved, and time..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
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
                  Action Taken
                </label>
                <input
                  type="text"
                  placeholder="e.g. Handed to Disciplinary Master"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
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
                    background: '#f43f5e',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save to Blotter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
