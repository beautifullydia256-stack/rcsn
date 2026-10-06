import React, { useState } from 'react';
import { Printer, CheckCircle2, Clock, Building2, Plus, X, Search, Filter, ShieldCheck } from 'lucide-react';
import { HospitalWardPosting, TertiaryStudentProfile } from '../types';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import { useUIStore } from '@/store/uiStore';
import { getTokens, SORA, INTER } from '@/styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';

const WARD_OPTIONS = [
  { value: 'Maternity / Labour Ward', label: 'Maternity & Labour Ward' },
  { value: 'Medical Ward (Adults)', label: 'Medical Ward (Adults)' },
  { value: 'Surgical Ward', label: 'Surgical Ward & Theatre' },
  { value: 'Paediatric Ward', label: 'Paediatric Ward (Children)' },
  { value: 'Antenatal / Postnatal Clinic', label: 'Antenatal / Postnatal Clinic (ANC/PNC)' },
  { value: 'Outpatient & Primary Health Care', label: 'Outpatient & Primary Health Care (OPD)' },
  { value: 'Mental Health Unit', label: 'Mental Health Unit' },
];

export interface WardPostingManagerProps {
  postings: HospitalWardPosting[];
  students: TertiaryStudentProfile[];
  onUpdatePosting?: (postingId: string, updates: Partial<HospitalWardPosting>) => void;
  onAddPosting?: (newPosting: Omit<HospitalWardPosting, 'id'>) => void;
}

export const WardPostingManager: React.FC<WardPostingManagerProps> = ({
  postings: initialPostings,
  students,
  onUpdatePosting,
  onAddPosting,
}) => {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const [postings, setPostings] = useState<HospitalWardPosting[]>(initialPostings);
  const [selectedHospital, setSelectedHospital] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'cleared' | 'pending'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const [newHospital, setNewHospital] = useState('');
  const [newWard, setNewWard] = useState('Maternity / Labour Ward');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newHours, setNewHours] = useState(120);

  // Sync when initialPostings updates
  React.useEffect(() => {
    setPostings(initialPostings);
  }, [initialPostings]);

  const handleToggleLogbook = (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const updated = postings.map((p) =>
      p.id === id
        ? {
            ...p,
            physicalLogbookVerified: nextStatus,
            status: (nextStatus ? 'cleared' : 'in_progress') as 'cleared' | 'in_progress',
            completedHours: nextStatus ? (p.requiredHours || 120) : Math.floor((p.requiredHours || 120) / 2),
          }
        : p
    );
    setPostings(updated);
    if (onUpdatePosting) {
      onUpdatePosting(id, {
        physicalLogbookVerified: nextStatus,
        status: nextStatus ? 'cleared' : 'in_progress',
        completedHours: nextStatus ? (postings.find((p) => p.id === id)?.requiredHours || 120) : 0,
      });
    }
  };

  const handleCreatePosting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospital.trim() || !newWard || !newStartDate || !newEndDate) return;

    const item: HospitalWardPosting = {
      id: 'post-' + Date.now(),
      schoolId: students[0]?.schoolId || 'current',
      hospitalName: newHospital.trim(),
      wardName: newWard,
      startDate: newStartDate,
      endDate: newEndDate,
      requiredHours: newHours,
      completedHours: 0,
      physicalLogbookVerified: false,
      status: 'scheduled',
    };

    const next = [item, ...postings];
    setPostings(next);
    if (onAddPosting) onAddPosting(item);
    setShowAddModal(false);
    setNewHospital('');
    setNewStartDate('');
    setNewEndDate('');
  };

  const hospitalsList = Array.from(new Set(postings.map((p) => p.hospitalName).filter(Boolean)));

  const filteredPostings = postings.filter((p) => {
    const matchHospital =
      selectedHospital === 'all' ||
      p.hospitalName.toLowerCase().includes(selectedHospital.toLowerCase());
    const matchSearch =
      p.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.wardName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'cleared' && p.physicalLogbookVerified) ||
      (statusFilter === 'pending' && !p.physicalLogbookVerified);

    return matchHospital && matchSearch && matchStatus;
  });

  return (
    <div
      className="rounded-2xl p-6 shadow-sm space-y-6"
      style={{
        backgroundColor: t.panel,
        border: `1px solid ${t.stroke}`,
      }}
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h2 className="text-lg font-bold text-slate-100" style={{ fontFamily: SORA }}>
            Hospital Ward Rotations &amp; Clearance Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage student practicum rotations and verify physical stamped council logbooks before UHPAB practical exams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <Printer className="w-3.5 h-3.5 text-teal-400" />
            Print Roster
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:from-emerald-500 hover:to-teal-500"
          >
            <Plus className="w-3.5 h-3.5" />
            New Ward Allocation
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ward or hospital…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-400"
            style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Hospital Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Hospital:</span>
            <select
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              className="rounded-xl border px-3 py-1.5 text-xs font-medium text-slate-200"
              style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
            >
              <option value="all">All Affiliated Hospitals</option>
              {hospitalsList.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="inline-flex rounded-xl p-1" style={{ backgroundColor: t.fieldBg }}>
            {(['all', 'cleared', 'pending'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-teal-500/20 text-teal-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'all' ? 'All Postings' : st === 'cleared' ? 'Cleared' : 'Pending'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Postings Table */}
      {filteredPostings.length === 0 ? (
        <div className="p-8">
          <PosEmptyState
            icon={<Building2 className="w-8 h-8 text-teal-400" />}
            title="No Hospital Rotations Found"
            description="No clinical rotations match the selected criteria. Add a hospital ward allocation to begin tracking practicum."
            accentColor="mint"
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead>
              <tr
                className="border-b text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
              >
                <th className="py-3 px-4">Hospital &amp; Health Centre</th>
                <th className="py-3 px-4">Ward / Unit</th>
                <th className="py-3 px-4">Rotation Period</th>
                <th className="py-3 px-4 text-center">Hours Required</th>
                <th className="py-3 px-4 text-center">Logbook Verification</th>
                <th className="py-3 px-4 text-center">UHPAB Eligibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPostings.map((p) => (
                <tr key={p.id} className="transition hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-100">{p.hospitalName}</p>
                        <p className="text-[11px] text-slate-400">Accredited Practicum Site</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-medium text-teal-300">{p.wardName}</td>

                  <td className="py-3.5 px-4 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {p.startDate} to {p.endDate}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-100">
                    {p.requiredHours || 120} hrs
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleLogbook(p.id, p.physicalLogbookVerified)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border transition-all ${
                        p.physicalLogbookVerified
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                          : 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                      }`}
                    >
                      {p.physicalLogbookVerified ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Stamped &amp; Verified</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Pending Inspection</span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {p.physicalLogbookVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        CLEARED
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-500/15 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
                        Incomplete
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: New Ward Posting */}
      <NativeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create Hospital Ward Allocation"
        subtitle="Schedule clinical practicum rotation and prescribe required logbook hours."
        icon={Building2}
        size="md"
      >
        <form onSubmit={handleCreatePosting} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Partner Hospital / Facility *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Masaka Regional Referral Hospital"
              value={newHospital}
              onChange={(e) => setNewHospital(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
            />
          </div>

          <div className="relative z-[35] focus-within:z-[50]">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Ward / Clinical Department *
            </label>
            <LiquidGlassSelect
              value={newWard}
              onChange={(val) => setNewWard(val)}
              options={WARD_OPTIONS}
              placeholder="Select Ward / Department..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-[20]">
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                End Date *
              </label>
              <input
                type="date"
                required
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="relative z-[10]">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Prescribed Practicum Hours *
            </label>
            <input
              type="number"
              min="1"
              required
              value={newHours}
              onChange={(e) => setNewHours(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 font-mono transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 border border-emerald-400/30 transition-all"
            >
              Save Posting
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
};

export default WardPostingManager;
