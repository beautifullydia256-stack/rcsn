import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { enqueue } from '../../lib/offlineDb';
import AdminPageWrapper, { adminCardClass } from '../../components/layout/AdminPageWrapper';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Plus, X } from 'lucide-react';

interface Visitor {
  id: string;
  visitor_name: string;
  purpose: string;
  host_name: string;
  host_role: string | null;
  phone: string | null;
  id_number: string | null;
  badge_number: string | null;
  notes: string | null;
  check_in_time: string;
  check_out_time: string | null;
}

type FormState = {
  visitor_name: string;
  purpose: string;
  host_name: string;
  host_role: string;
  phone: string;
  id_number: string;
  badge_number: string;
  notes: string;
};

const EMPTY_FORM: FormState = { visitor_name: '', purpose: '', host_name: '', host_role: '', phone: '', id_number: '', badge_number: '', notes: '' };

function fmt(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return iso.slice(11, 16); }
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' }); }
  catch { return iso.slice(0, 10); }
}

export default function VisitorLogPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;

  const today = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ['visitor-log', schoolId, filterDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('visitor_log')
        .select('id, visitor_name, purpose, host_name, host_role, phone, id_number, badge_number, notes, check_in_time, check_out_time')
        .eq('school_id', schoolId!)
        .gte('check_in_time', filterDate)
        .lte('check_in_time', filterDate + 'T23:59:59')
        .order('check_in_time', { ascending: false });
      return (data ?? []) as Visitor[];
    },
    enabled: !!schoolId,
  });

  const field = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleAddVisitor() {
    if (!form.visitor_name.trim() || !form.purpose.trim() || !form.host_name.trim()) {
      setError('Visitor name, purpose and host are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (!navigator.onLine) {
        // Queue for sync when back online
        await enqueue({
          action: {
            type: 'visitor',
            table: 'visitor_log',
            rows: [{
              visitor_name: form.visitor_name.trim(),
              purpose: form.purpose.trim(),
              host_name: form.host_name.trim(),
              phone: form.phone.trim() || null,
              school_id: schoolId!,
              check_in_time: new Date().toISOString(),
              created_by: user?.id ?? null,
            }],
          },
          schoolId: schoolId!,
          createdAt: Date.now(),
        });
        setForm(EMPTY_FORM);
        setShowForm(false);
        return;
      }
      const { error: err } = await supabase.from('visitor_log').insert({
        school_id: schoolId,
        visitor_name: form.visitor_name.trim(),
        purpose: form.purpose.trim(),
        host_name: form.host_name.trim(),
        host_role: form.host_role.trim() || null,
        phone: form.phone.trim() || null,
        id_number: form.id_number.trim() || null,
        badge_number: form.badge_number.trim() || null,
        notes: form.notes.trim() || null,
        created_by: user?.id,
      });
      if (err) { setError(err.message); return; }
      setForm(EMPTY_FORM);
      setShowForm(false);
      void qc.invalidateQueries({ queryKey: ['visitor-log', schoolId] });
      void qc.invalidateQueries({ queryKey: ['secretary-dashboard', schoolId] });
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckOut(id: string) {
    setCheckingOut(id);
    await supabase.from('visitor_log').update({ check_out_time: new Date().toISOString() }).eq('id', id);
    void qc.invalidateQueries({ queryKey: ['visitor-log', schoolId] });
    setCheckingOut(null);
  }

  function downloadPdf() {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(`Visitor Log — ${filterDate}`, 14, 14);
    autoTable(doc, {
      head: [['Visitor', 'Purpose', 'Host', 'Phone', 'ID/Badge', 'Check In', 'Check Out', 'Status']],
      body: visitors.map((v) => [
        v.visitor_name,
        v.purpose,
        v.host_name + (v.host_role ? ` (${v.host_role})` : ''),
        v.phone ?? '—',
        [v.id_number, v.badge_number].filter(Boolean).join(' / ') || '—',
        fmt(v.check_in_time),
        v.check_out_time ? fmt(v.check_out_time) : '—',
        v.check_out_time ? 'Left' : 'Still in',
      ]),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 142, 247] },
    });
    doc.save(`visitor-log-${filterDate}.pdf`);
  }

  const inp = 'bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';

  return (
    <AdminPageWrapper eyebrow="OFFICE" title="Visitor Logbook" subtitle="Track all school visitors — check in and check out">
      {/* Toolbar */}
      <div className={`${adminCardClass} mb-6`}>
        <div className="flex flex-wrap gap-4 items-end p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={downloadPdf} disabled={!visitors.length} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
              PDF
            </button>
            <button onClick={() => { setShowForm(!showForm); setError(''); setForm(EMPTY_FORM); }} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
              {showForm ? 'Cancel' : '+ Log Visitor'}
            </button>
          </div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className={`${adminCardClass} mb-6 p-5`}>
          <h3 className="text-sm font-bold text-slate-200 mb-4">New Visitor</h3>
          {error && <div className="mb-3 text-sm text-red-400 bg-red-900/30 rounded-lg px-3 py-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="block text-xs text-slate-400 mb-1">Visitor Name *</label><input value={form.visitor_name} onChange={field('visitor_name')} placeholder="Full name" className={inp} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Purpose *</label><input value={form.purpose} onChange={field('purpose')} placeholder="e.g. Parent meeting, Delivery, Interview" className={inp} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Visiting (Host) *</label><input value={form.host_name} onChange={field('host_name')} placeholder="Teacher / staff name" className={inp} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Host Role</label><input value={form.host_role} onChange={field('host_role')} placeholder="e.g. Class teacher" className={inp} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Phone</label><input value={form.phone} onChange={field('phone')} placeholder="Visitor's phone" className={inp} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">ID Number</label><input value={form.id_number} onChange={field('id_number')} placeholder="National ID / Passport" className={inp} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Badge Number</label><input value={form.badge_number} onChange={field('badge_number')} placeholder="Visitor badge #" className={inp} /></div>
            <div className="sm:col-span-2"><label className="block text-xs text-slate-400 mb-1">Notes</label><textarea value={form.notes} onChange={field('notes')} placeholder="Any additional notes" rows={2} className={inp} style={{ resize: 'vertical' }} /></div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={handleAddVisitor} disabled={saving} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold transition-colors">
              {saving ? 'Saving…' : 'Check In Visitor'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={adminCardClass}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-sm font-semibold text-slate-300">
            {visitors.length} visitor{visitors.length !== 1 ? 's' : ''} on {filterDate}
          </span>
          <span className="text-xs text-slate-500">{visitors.filter((v) => !v.check_out_time).length} still inside</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                <th className="text-left px-4 pb-2">Visitor</th>
                <th className="text-left px-4 pb-2">Purpose</th>
                <th className="text-left px-4 pb-2">Host</th>
                <th className="text-center px-4 pb-2">Check In</th>
                <th className="text-center px-4 pb-2">Check Out</th>
                <th className="text-center px-4 pb-2">Status</th>
                <th className="px-4 pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-500">Loading…</td></tr>
              ) : !visitors.length ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-500">No visitors logged for this date.</td></tr>
              ) : visitors.map((v) => (
                <tr key={v.id} className="border-b border-slate-800 hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-100">{v.visitor_name}</div>
                    {v.phone && <div className="text-xs text-slate-500">{v.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{v.purpose}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200">{v.host_name}</div>
                    {v.host_role && <div className="text-xs text-slate-500">{v.host_role}</div>}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-green-400">{fmt(v.check_in_time)}</td>
                  <td className="px-4 py-3 text-center font-mono text-red-400">{v.check_out_time ? fmt(v.check_out_time) : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${v.check_out_time ? 'bg-green-900/40 text-green-300 border border-green-700' : 'bg-amber-900/40 text-amber-300 border border-amber-700'}`}>
                      {v.check_out_time ? 'Left' : 'Inside'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {!v.check_out_time && (
                      <button
                        onClick={() => handleCheckOut(v.id)}
                        disabled={checkingOut === v.id}
                        className="px-3 py-1 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                      >
                        {checkingOut === v.id ? '…' : 'Check Out'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
