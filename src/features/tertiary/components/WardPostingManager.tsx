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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Hospital Ward Postings & Clinical Clearance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student clinical rotations and verify physical stamped council logbooks before UNMEB practical exams.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print Posting Roster
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
          >
            + New Ward Allocation
          </button>
        </div>
      </div>

      {/* Hospital Filter Bar */}
      <div className="flex items-center gap-2 py-4 text-xs">
        <span className="font-semibold text-slate-600">Filter Hospital:</span>
        <select
          value={selectedHospital}
          onChange={(e) => setSelectedHospital(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 font-medium text-slate-800"
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
            <tr className="bg-slate-50 text-slate-700 border-y border-slate-200 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3">Hospital & Health Centre</th>
              <th className="py-3 px-3">Ward / Unit</th>
              <th className="py-3 px-3">Posting Period</th>
              <th className="py-3 px-3 text-center">Required Hours</th>
              <th className="py-3 px-3 text-center">Manual Paper Logbook</th>
              <th className="py-3 px-3 text-center">UNMEB Practical Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPostings.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No ward postings found. Click "+ New Ward Allocation" to add hospital rotations.
                </td>
              </tr>
            ) : (
              filteredPostings.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-3 font-bold text-slate-900">{p.hospitalName}</td>
                  <td className="py-3 px-3 font-semibold text-blue-900">{p.wardName}</td>
                  <td className="py-3 px-3 text-slate-600">
                    {p.startDate} to {p.endDate}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                    {p.requiredHours || 120} hrs
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleToggleLogbook(p.id, p.physicalLogbookVerified)}
                      className={`px-3 py-1 rounded-full font-bold text-[11px] border transition ${
                        p.physicalLogbookVerified
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      {p.physicalLogbookVerified ? 'Stamped Logbook Cleared' : 'Pending Inspection'}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {p.physicalLogbookVerified ? (
                      <span className="text-emerald-700 font-black text-xs inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> CLEARED
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium text-xs">Incomplete</span>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create Hospital Ward Posting</h3>
            <form onSubmit={handleCreatePosting} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Partner Hospital / Health Centre</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Regional Referral Hospital"
                  value={newHospital}
                  onChange={(e) => setNewHospital(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ward / Unit Name</label>
                <select
                  value={newWard}
                  onChange={(e) => setNewWard(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
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
                  <label className="font-semibold text-slate-700 block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Required Ward Hours</label>
                <input
                  type="number"
                  value={newHours}
                  onChange={(e) => setNewHours(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
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
