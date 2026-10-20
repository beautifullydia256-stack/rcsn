import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  Plus,
  Search,
  Edit2,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import NativeModal from '@/components/NativeModal';

interface Ticket {
  id: string;
  ticket_number: string;
  reporter_name: string;
  department: string;
  location: string;
  category: string; // 'hardware', 'software', 'network', 'printer', 'projector', 'biometric'
  priority: string; // 'low', 'normal', 'urgent'
  status: string; // 'open', 'in_progress', 'resolved', 'closed'
  description: string;
  resolution_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
}

export default function IctHelpdeskPage() {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId) || 'e1b10000-0000-4000-a000-000000000001';

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // New Ticket Form State
  const [reporterName, setReporterName] = useState('');
  const [department, setDepartment] = useState('Nursing Faculty');
  const [location, setLocation] = useState('Lecture Hall 1');
  const [category, setCategory] = useState('projector');
  const [priority, setPriority] = useState('normal');
  const [description, setDescription] = useState('');

  // Resolution Form State
  const [resolutionStatus, setResolutionStatus] = useState('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Fetch real tickets from Supabase
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['ict-helpdesk-tickets', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ict_helpdesk_tickets')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error loading tickets:', error);
        return [];
      }
      return (data || []) as Ticket[];
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      const ticketNum = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
      const { error } = await supabase.from('ict_helpdesk_tickets').insert({
        school_id: schoolId,
        ticket_number: ticketNum,
        reporter_name: reporterName.trim(),
        department,
        location: location.trim(),
        category,
        priority,
        status: 'open',
        description: description.trim(),
        assigned_to: 'ICT Department',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ict-helpdesk-tickets', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['ict-tickets-kpi', schoolId] });
      setIsNewModalOpen(false);
      setReporterName('');
      setDescription('');
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async () => {
      if (!activeTicket) return;
      const isNowResolved = resolutionStatus === 'resolved' || resolutionStatus === 'closed';
      const { error } = await supabase
        .from('ict_helpdesk_tickets')
        .update({
          status: resolutionStatus,
          resolution_notes: resolutionNotes.trim() || null,
          resolved_at: isNowResolved ? new Date().toISOString() : null,
        })
        .eq('id', activeTicket.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ict-helpdesk-tickets', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['ict-tickets-kpi', schoolId] });
      setActiveTicket(null);
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ict_helpdesk_tickets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ict-helpdesk-tickets', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['ict-tickets-kpi', schoolId] });
      setActiveTicket(null);
    },
  });

  const filtered = tickets.filter((t) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      t.ticket_number.toLowerCase().includes(term) ||
      t.reporter_name.toLowerCase().includes(term) ||
      t.description.toLowerCase().includes(term) ||
      t.location.toLowerCase().includes(term);
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;

  return (
    <AdminPageWrapper
      eyebrow="SUPPORT & MAINTENANCE"
      title="Hardware & Helpdesk Requests"
      subtitle="Track IT support requests, classroom audiovisual repairs, lab workstation issues, and biometric maintenance."
    >
      {/* Action & Filter Bar */}
      <div className={`${adminCardClass} flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white'
            }`}
          >
            All Tickets ({tickets.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('open')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'open'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white'
            }`}
          >
            Open ({openCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('in_progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'in_progress'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white'
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('resolved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterStatus === 'resolved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:text-white'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ticket #, reporter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" /> Log New Ticket
          </button>
        </div>
      </div>

      {/* Tickets Table */}
      <div className={adminCardClass}>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">Loading tickets...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              <Wrench className="h-10 w-10 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
              <p className="font-semibold text-slate-900 dark:text-white text-sm">No Helpdesk Tickets Logged</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {search ? 'No tickets match your search criteria.' : 'No active support requests. Click "Log New Ticket" to report a hardware, network, or printer issue.'}
              </p>
              {!search && (
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Log Tech Request
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                  <th className="pb-3">Ticket #</th>
                  <th className="pb-3">Reporter</th>
                  <th className="pb-3">Location / Dept</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">{t.ticket_number}</td>
                    <td className="py-3 font-medium text-slate-800 dark:text-slate-200">{t.reporter_name}</td>
                    <td className="py-3 text-slate-700 dark:text-slate-300">
                      <div>{t.location}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{t.department}</div>
                    </td>
                    <td className="py-3 uppercase text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      {t.category}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">{t.description}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === 'open'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                            : t.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTicket(t);
                          setResolutionStatus(t.status);
                          setResolutionNotes(t.resolution_notes || '');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-semibold"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isNewModalOpen && (
        <NativeModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          title="Log New ICT Helpdesk Ticket"
          size="md"
        >
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Reported By</label>
                <input
                  type="text"
                  placeholder="e.g. Sr. Nakato Mary"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                >
                  <option value="Nursing Faculty">Nursing Faculty</option>
                  <option value="Administration">Administration</option>
                  <option value="Accounts / Bursar">Accounts / Bursar</option>
                  <option value="Library">Library</option>
                  <option value="Hostels">Hostels / Warden</option>
                  <option value="Security">Campus Security</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Campus Location</label>
                <input
                  type="text"
                  placeholder="e.g. Hall 2"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                >
                  <option value="projector">Projector / AV</option>
                  <option value="printer">Printer / Copier</option>
                  <option value="network">Wi-Fi / Internet</option>
                  <option value="hardware">Computer Hardware</option>
                  <option value="software">Portal / Software</option>
                  <option value="biometric">Biometric Terminal</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                >
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Issue Description</label>
              <textarea
                rows={3}
                placeholder="Describe the fault in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reporterName.trim() || !description.trim()}
                onClick={() => createTicketMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm"
              >
                Submit Ticket
              </button>
            </div>
          </div>
        </NativeModal>
      )}

      {/* Update / Resolve Ticket Modal */}
      {activeTicket && (
        <NativeModal
          isOpen={!!activeTicket}
          onClose={() => setActiveTicket(null)}
          title={`Update Ticket ${activeTicket.ticket_number}`}
          size="md"
        >
          <div className="space-y-3 py-2">
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/60 p-3 text-xs space-y-1">
              <p className="text-slate-600 dark:text-slate-400">Reporter: <strong className="text-slate-900 dark:text-white">{activeTicket.reporter_name}</strong> ({activeTicket.department})</p>
              <p className="text-slate-600 dark:text-slate-400">Location: <span className="text-slate-900 dark:text-white font-medium">{activeTicket.location}</span></p>
              <p className="text-slate-600 dark:text-slate-400">Issue: <span className="text-slate-900 dark:text-white font-medium">{activeTicket.description}</span></p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ticket Status</label>
              <select
                value={resolutionStatus}
                onChange={(e) => setResolutionStatus(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              >
                <option value="open">Open (Awaiting Technician)</option>
                <option value="in_progress">In Progress (Work underway)</option>
                <option value="resolved">Resolved (Completed)</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Technician Resolution Notes</label>
              <textarea
                rows={3}
                placeholder="Details of action taken, replacement parts used, or tests conducted..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete ticket ${activeTicket.ticket_number}?`)) {
                    deleteTicketMutation.mutate(activeTicket.id);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-semibold transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Ticket
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTicket(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => updateTicketMutation.mutate()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
                >
                  Save Resolution
                </button>
              </div>
            </div>
          </div>
        </NativeModal>
      )}
    </AdminPageWrapper>
  );
}
