import { useEffect, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Shield,
  Building2,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { facilityAndLiabilityService } from '@/services/facilityAndLiabilityService';

interface GatePassRecord {
  id: string;
  student_name: string;
  admission_number: string;
  current_class: string;
  destination: string;
  reason: string;
  departure_time: string;
  expected_return: string;
  status: 'Currently Out' | 'Returned' | 'Overdue';
}

const SAMPLE_HOSTEL_GATE_PASSES: GatePassRecord[] = [
  {
    id: 'gp-01',
    student_name: 'Babirye Christine',
    admission_number: 'DNS-2025-019',
    current_class: 'Diploma Nursing - Y2 S1',
    destination: 'Kalisizo Hospital (Clinical Duty Handover)',
    reason: 'Clinical evening ward rounds & maternal health assessment',
    departure_time: 'Today, 04:30 PM',
    expected_return: 'Today, 10:00 PM',
    status: 'Currently Out',
  },
  {
    id: 'gp-02',
    student_name: 'Nalwadda Sarah',
    admission_number: 'DMW-2024-042',
    current_class: 'Diploma Midwifery - Y3 S1',
    destination: 'Masaka Regional Referral Hospital',
    reason: 'Emergency Neonatal Resuscitation Workshop',
    departure_time: 'Yesterday, 08:00 AM',
    expected_return: 'Today, 06:00 PM',
    status: 'Currently Out',
  },
  {
    id: 'gp-03',
    student_name: 'Kato Paul',
    admission_number: 'DNS-2025-104',
    current_class: 'Diploma Nursing - Y2 S1',
    destination: 'Home / Medical Leave',
    reason: 'Dental appointment and recovery',
    departure_time: '02 Oct 2026',
    expected_return: '05 Oct 2026, 05:00 PM',
    status: 'Returned',
  },
];

export default function MatronGatePassesPage() {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const [passes, setPasses] = useState<GatePassRecord[]>(SAMPLE_HOSTEL_GATE_PASSES);
  const [search, setSearch] = useState('');

  const filtered = passes.filter(
    (p) =>
      !search ||
      p.student_name.toLowerCase().includes(search.toLowerCase()) ||
      p.admission_number.toLowerCase().includes(search.toLowerCase()) ||
      p.destination.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: tk.textHi }}>
              Resident Gate Passes &amp; Exits
            </h1>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: tk.textLow }}>
              Cross-referenced with campus security gate scanner to verify off-campus permits.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm"
        style={{ backgroundColor: tk.panel, borderColor: tk.stroke }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: tk.stroke }}>
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student, destination or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs border outline-none text-slate-200"
              style={{ backgroundColor: tk.fieldBg, borderColor: tk.stroke }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: tk.stroke, backgroundColor: tk.fieldBg }}>
                <th className="py-3 px-4 font-semibold text-slate-400">Resident Nurse</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Class</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Destination</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Departure</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Expected Return</th>
                <th className="py-3 px-4 font-semibold text-slate-400">Pass Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-100">{p.student_name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">#{p.admission_number}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{p.current_class}</td>
                  <td className="py-3 px-4 text-slate-200">
                    <p className="font-medium">{p.destination}</p>
                    <p className="text-[11px] text-slate-400 truncate max-w-xs">{p.reason}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{p.departure_time}</td>
                  <td className="py-3 px-4 font-medium text-slate-300">{p.expected_return}</td>
                  <td className="py-3 px-4">
                    {p.status === 'Currently Out' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Clock className="w-3 h-3" /> Currently Out
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Returned to Dorm
                      </span>
                    )}
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
