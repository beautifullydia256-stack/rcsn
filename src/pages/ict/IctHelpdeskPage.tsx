import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Filter,
  Check,
  Edit2,
  FileText,
  Building2,
  MapPin,
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
  priority: string; // 'urgent', 'normal', 'low'
  status: string; // 'open', 'in_progress', 'resolved', 'closed'
  description: string;
  resolution_notes: string | null;
  assigned_to: string;
  created_at: string;
  resolved_at: string | null;
}

export default function IctHelpdeskPage() {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId) || 'e1b10000-0000-4000-a000-000000000001';

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

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

const HELPDESK_LOCAL_KEY = 'rcsn_ict_helpdesk_tickets';

function getInitialLocalTickets(): Ticket[] {
  try {
    const raw = localStorage.getItem(HELPDESK_LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const sampleTickets: Ticket[] = [
    {
      id: 'local-tkt-1',
      ticket_number: 'TKT-1042',
      reporter_name: 'Sr. Nakato Agnes',
      department: 'Nursing Faculty',
      location: 'Lecture Hall 1',
      category: 'projector',
      priority: 'urgent',
      status: 'in_progress',
      description: 'HDMI display cable flickering during clinical simulations.',
      resolution_notes: 'Replacement 10m high-speed HDMI cable tested and deployed.',
      assigned_to: 'ICT Department',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      resolved_at: null,
    },
    {
      id: 'local-tkt-2',
      ticket_number: 'TKT-1088',
      reporter_name: 'Mr. Kato Joseph',
      department: 'Library',
      location: 'Library Reading Hall',
      category: 'network',
      priority: 'normal',
      status: 'open',
      description: 'Wi-Fi AP latency high during evening e-library revision hour.',
      resolution_notes: null,
      assigned_to: 'ICT Department',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      resolved_at: null,
    },
    {
      id: 'local-tkt-3',
      ticket_number: 'TKT-1095',
      reporter_name: 'Matron Babirye',
      department: 'Hostels',
      location: 'Female Hostel Reception',
      category: 'biometric',
      priority: 'normal',
      status: 'resolved',
      description: 'Biometric gate scanner clock was off by 4 minutes.',
      resolution_notes: 'Re-synced NTP server settings to africa.pool.ntp.org.',
      assigned_to: 'ICT Department',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      resolved_at: new Date().toISOString(),
    },
  ];
  try { localStorage.setItem(HELPDESK_LOCAL_KEY, JSON.stringify(sampleTickets)); } catch {}
  return sampleTickets;
}

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['ict-helpdesk-tickets', schoolId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('ict_helpdesk_tickets')
          .select('*')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) return data as Ticket[];
      } catch {}
      return getInitialLocalTickets();
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      const ticketNum = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
      const newTicket: Ticket = {
        id: `local-tkt-${Date.now()}`,
        ticket_number: ticketNum,
        reporter_name: reporterName,
        department,
        location,
        category,
        priority,
        status: 'open',
        description,
        resolution_notes: null,
        assigned_to: 'ICT Department',
        created_at: new Date().toISOString(),
        resolved_at: null,
      };
      try {
        await supabase.from('ict_helpdesk_tickets').insert({
          school_id: schoolId,
          ticket_number: newTicket.ticket_number,
          reporter_name: newTicket.reporter_name,
          department: newTicket.department,
          location: newTicket.location,
          category: newTicket.category,
          priority: newTicket.priority,
          status: 'open',
          description: newTicket.description,
          assigned_to: 'ICT Department',
        });
      } catch {}
      const current = getInitialLocalTickets();
      current.unshift(newTicket);
      try { localStorage.setItem(HELPDESK_LOCAL_KEY, JSON.stringify(current)); } catch {}
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
      const isResolved = resolutionStatus === 'resolved' || resolutionStatus === 'closed';
      try {
        await supabase
          .from('ict_helpdesk_tickets')
          .update({
            status: resolutionStatus,
            resolution_notes: resolutionNotes,
            resolved_at: isResolved ? new Date().toISOString() : null,
          })
          .eq('id', activeTicket.id);
      } catch {}
      const current = getInitialLocalTickets();
      const next = current.map((t) =>
        t.id === activeTicket.id
          ? {
              ...t,
              status: resolutionStatus,
              resolution_notes: resolutionNotes,
              resolved_at: isResolved ? new Date().toISOString() : null,
            }
          : t
      );
      try { localStorage.setItem(HELPDESK_LOCAL_KEY, JSON.stringify(next)); } catch {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ict-helpdesk-tickets', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['ict-tickets-kpi', schoolId] });
      setActiveTicket(null);
    },
  });

  const filtered = tickets.filter((t) => {
    const term = search.toLowerCase().trim();
    const matchSearch =
      !term ||
      t.ticket_number.toLowerCase().includes(term) ||
      t.reporter_name.toLowerCase().includes(term) ||
      t.location.toLowerCase().includes(term) ||
      t.description.toLowerCase().includes(term);

    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <AdminPageWrapper
      eyebrow="SUPPORT & HARDWARE REPAIRS"
      title="ICT Helpdesk & Repair Tickets"
      subtitle="Track faculty tech support requests, printer servicing, projector fixes, and lab maintenance."
    >
      {/* Controls Bar */}
      <div className={`${adminCardClass} flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tickets, reporter, issue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-slate-900/60 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold ${
                filterStatus === 'all'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'border border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              All ({tickets.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('open')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold ${
                filterStatus === 'open'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'border border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('resolved')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold ${
                filterStatus === 'resolved'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'border border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              Resolved
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Log Support Ticket
        </button>
      </div>

      {/* Tickets List */}
      <div className={adminCardClass}>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading tickets...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
              No tickets found matching current filter.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Ticket #</th>
                  <th className="pb-3">Reporter / Dept</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 font-mono font-bold text-white">{t.ticket_number}</td>
                    <td className="py-3">
                      <p className="font-semibold text-white">{t.reporter_name}</p>
                      <p className="text-[10.5px] text-slate-400">{t.department}</p>
                    </td>
                    <td className="py-3 text-slate-300 font-medium">{t.location}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-slate-300 uppercase tracking-wide">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          t.priority === 'urgent'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300 max-w-sm">
                      <p className="truncate">{t.description}</p>
                      {t.resolution_notes && (
                        <p className="text-[10px] text-emerald-400 italic truncate mt-0.5">
                          Resolution: {t.resolution_notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          t.status === 'open'
                            ? 'bg-amber-500/20 text-amber-300'
                            : t.status === 'in_progress'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {t.status.replace(/_/g, ' ')}
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-medium"
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
                <label className="text-xs font-semibold text-slate-300">Reported By</label>
                <input
                  type="text"
                  placeholder="e.g. Sr. Nakato Mary"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
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
                <label className="text-xs font-semibold text-slate-300">Campus Location</label>
                <input
                  type="text"
                  placeholder="e.g. Hall 2"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
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
                <label className="text-xs font-semibold text-slate-300">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                >
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Issue Description</label>
              <textarea
                rows={3}
                placeholder="Describe the fault in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reporterName.trim() || !description.trim()}
                onClick={() => createTicketMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs"
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
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 text-xs space-y-1">
              <p className="text-slate-400">Reporter: <strong className="text-white">{activeTicket.reporter_name}</strong> ({activeTicket.department})</p>
              <p className="text-slate-400">Location: <span className="text-white">{activeTicket.location}</span></p>
              <p className="text-slate-400">Issue: <span className="text-white">{activeTicket.description}</span></p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Ticket Status</label>
              <select
                value={resolutionStatus}
                onChange={(e) => setResolutionStatus(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
              >
                <option value="open">Open (Awaiting Technician)</option>
                <option value="in_progress">In Progress (Work underway)</option>
                <option value="resolved">Resolved (Completed)</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Technician Resolution Notes</label>
              <textarea
                rows={3}
                placeholder="Details of action taken, replacement parts used, or tests conducted..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateTicketMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Save Resolution
              </button>
            </div>
          </div>
        </NativeModal>
      )}
    </AdminPageWrapper>
  );
}
