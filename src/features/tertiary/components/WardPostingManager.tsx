import React, { useState } from 'react';
import { Printer, CheckCircle2, Clock, Building2, Plus, X, Search, Filter, ShieldCheck } from 'lucide-react';
import { HospitalWardPosting, TertiaryStudentProfile } from '../types';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import { useUIStore } from '@/store/uiStore';
import { getTokens, SORA, INTER } from '@/styles/posThemeTokens';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';
import '@/styles/government-system.css';

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
    <div className="space-y-4">
      {/* ── CONTROL BAR ── */}
      <div className="gov-control-bar">
        <div className="gov-control-bar-left flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#555555] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search ward or hospital…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="gov-input pl-8 font-mono text-xs"
            />
          </div>

          <select
            value={selectedHospital}
            onChange={(e) => setSelectedHospital(e.target.value)}
            className="gov-select w-auto text-xs"
            aria-label="Filter Hospital"
          >
            <option value="all">All Hospitals</option>
            {hospitalsList.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="gov-select w-auto text-xs"
            aria-label="Filter Status"
          >
            <option value="all">Status: All</option>
            <option value="cleared">Status: Cleared</option>
            <option value="pending">Status: Pending</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="gov-btn gov-btn-sm gov-btn-primary"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Ward Allocation</span>
        </button>
      </div>

      {/* ── POSTINGS TABLE ── */}
      {filteredPostings.length === 0 ? (
        <div className="gov-card p-12 text-center text-xs text-[#555555]">
          No clinical rotations match the selected criteria.
        </div>
      ) : (
        <div className="gov-table-container">
          <table className="gov-table">
            <thead>
              <tr>
                <th>Hospital / Facility</th>
                <th>Ward / Unit</th>
                <th>Rotation Period</th>
                <th>Required Hours</th>
                <th>Logbook Inspection</th>
                <th className="text-right">OSCE Eligibility</th>
              </tr>
            </thead>
            <tbody>
              {filteredPostings.map((p) => (
                <tr key={p.id}>
                  <td className="font-semibold text-xs text-[#111111]">
                    {p.hospitalName}
                  </td>
                  <td className="font-mono text-xs font-bold">
                    {p.wardName}
                  </td>
                  <td className="font-mono text-xs text-[#555555]">
                    {p.startDate} — {p.endDate}
                  </td>
                  <td className="font-mono text-xs font-bold">
                    {p.requiredHours || 120} hrs
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleLogbook(p.id, p.physicalLogbookVerified)}
                      className="gov-btn gov-btn-sm"
                      title="Click to toggle logbook verification"
                    >
                      {p.physicalLogbookVerified ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Stamped &amp; Verified</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pending Inspection</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="text-right">
                    {p.physicalLogbookVerified ? (
                      <span className="gov-tag gov-tag-approved">
                        CLEARED
                      </span>
                    ) : (
                      <span className="gov-tag gov-tag-warned">
                        PENDING
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
