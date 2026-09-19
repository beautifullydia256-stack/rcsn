import React, { useState } from 'react';
import { Printer, CheckCircle2 } from 'lucide-react';
import { HospitalWardPosting, TertiaryStudentProfile } from '../types';

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
  const [postings, setPostings] = useState<HospitalWardPosting[]>(initialPostings);
  const [selectedHospital, setSelectedHospital] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const [newHospital, setNewHospital] = useState('');
  const [newWard, setNewWard] = useState('Maternity / Labour Ward');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newHours, setNewHours] = useState(120);

  const handleToggleLogbook = (id: string, currentStatus: boolean) => {
    const updated = postings.map((p) =>
      p.id === id ? { ...p, physicalLogbookVerified: !currentStatus, status: (!currentStatus ? 'cleared' : 'in_progress') as 'cleared' | 'in_progress' } : p
    );
    setPostings(updated);
    if (onUpdatePosting) {
      onUpdatePosting(id, {
        physicalLogbookVerified: !currentStatus,
        status: !currentStatus ? 'cleared' : 'in_progress',
      });
    }
  };

  const handleCreatePosting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospital || !newWard || !newStartDate || !newEndDate) return;

    const item: HospitalWardPosting = {
      id: 'post-' + Date.now(),
      schoolId: students[0]?.schoolId || 'school-1',
      hospitalName: newHospital,
      wardName: newWard,
      startDate: newStartDate,
      endDate: newEndDate,
      requiredHours: newHours,
      completedHours: 0,
      physicalLogbookVerified: false,
      status: 'scheduled',
    };

    setPostings([item, ...postings]);
    if (onAddPosting) onAddPosting(item);
    setShowAddModal(false);
    setNewHospital('');
  };

  const filteredPostings = selectedHospital === 'all'
    ? postings
    : postings.filter((p) => p.hospitalName.toLowerCase().includes(selectedHospital.toLowerCase()));

  const hospitalsList = Array.from(new Set(postings.map((p) => p.hospitalName)));

  return (
    <div className="ac-glass-card rounded-2xl border border-[var(--pw-border)] p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--pw-border)]">
        <div>
          <h2 className="text-xl font-bold ac-text-primary">Hospital Ward Postings & Clinical Clearance</h2>
          <p className="text-xs ac-text-secondary mt-0.5">
            Manage student clinical rotations and verify physical stamped council logbooks before UNMEB practical exams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="ac-glass-btn-secondary px-3 py-2 rounded-xl text-xs font-semibold ac-text-primary hover:brightness-110 transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print Posting Roster
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-[var(--pw-blue,#3d8ef8)] text-white text-xs font-bold hover:brightness-110 shadow-sm transition"
          >
            + New Ward Allocation
          </button>
        </div>
      </div>

      {/* Hospital Filter Bar */}
      <div className="flex items-center gap-2 py-4 text-xs">
        <span className="font-semibold ac-text-secondary">Filter Hospital:</span>
        <select
          value={selectedHospital}
          onChange={(e) => setSelectedHospital(e.target.value)}
          className="ac-input rounded-xl px-3 py-1.5 font-medium text-xs"
        >
          <option value="all">All Affiliated Hospitals</option>
          {hospitalsList.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>

      {/* Postings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--pw-s3)] ac-text-secondary border-y border-[var(--pw-border)] uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3">Hospital & Health Centre</th>
              <th className="py-3 px-3">Ward / Unit</th>
              <th className="py-3 px-3">Posting Period</th>
              <th className="py-3 px-3 text-center">Required Hours</th>
              <th className="py-3 px-3 text-center">Manual Paper Logbook</th>
              <th className="py-3 px-3 text-center">UNMEB Practical Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--pw-border)]/50">
            {filteredPostings.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center ac-text-muted">
                  No ward postings found. Click "+ New Ward Allocation" to add hospital rotations.
                </td>
              </tr>
            ) : (
              filteredPostings.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--pw-s2)] transition">
                  <td className="py-3 px-3 font-bold ac-text-primary">{p.hospitalName}</td>
                  <td className="py-3 px-3 font-semibold text-[var(--pw-blue,#3d8ef8)]">{p.wardName}</td>
                  <td className="py-3 px-3 ac-text-secondary">
                    {p.startDate} to {p.endDate}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold ac-text-primary">
                    {p.requiredHours || 120} hrs
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleToggleLogbook(p.id, p.physicalLogbookVerified)}
                      className={`px-3 py-1 rounded-full font-bold text-[11px] border transition ${
                        p.physicalLogbookVerified
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      }`}
                    >
                      {p.physicalLogbookVerified ? 'Stamped Logbook Cleared' : 'Pending Inspection'}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {p.physicalLogbookVerified ? (
                      <span className="text-emerald-400 font-bold text-xs inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> CLEARED
                      </span>
                    ) : (
                      <span className="ac-text-muted font-medium text-xs">Incomplete</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="ac-glass-card rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[var(--pw-border)]">
            <h3 className="text-lg font-bold ac-text-primary mb-4">Create Hospital Ward Posting</h3>
            <form onSubmit={handleCreatePosting} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold ac-text-secondary block mb-1">Partner Hospital / Health Centre</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masaka Regional Referral Hospital"
                  value={newHospital}
                  onChange={(e) => setNewHospital(e.target.value)}
                  className="ac-input w-full p-2.5 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold ac-text-secondary block mb-1">Ward / Unit Name</label>
                <select
                  value={newWard}
                  onChange={(e) => setNewWard(e.target.value)}
                  className="ac-input w-full p-2.5 rounded-xl"
                >
                  <option value="Maternity / Labour Ward">Maternity & Labour Ward</option>
                  <option value="Medical Ward (Adults)">Medical Ward (Adults)</option>
                  <option value="Surgical Ward">Surgical Ward & Theatre</option>
                  <option value="Paediatric Ward">Paediatric Ward (Children)</option>
                  <option value="Antenatal / Postnatal Clinic">Antenatal / Postnatal Clinic (ANC/PNC)</option>
                  <option value="Outpatient & Primary Health Care">Outpatient & Primary Health Care (OPD)</option>
                  <option value="Mental Health Unit">Mental Health Unit</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold ac-text-secondary block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="ac-input w-full p-2.5 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold ac-text-secondary block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="ac-input w-full p-2.5 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold ac-text-secondary block mb-1">Required Ward Hours</label>
                <input
                  type="number"
                  value={newHours}
                  onChange={(e) => setNewHours(Number(e.target.value))}
                  className="ac-input w-full p-2.5 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--pw-border)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="ac-glass-btn-secondary px-4 py-2 rounded-xl font-semibold ac-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--pw-blue,#3d8ef8)] text-white rounded-xl font-bold hover:brightness-110 shadow-sm"
                >
                  Save Posting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WardPostingManager;
