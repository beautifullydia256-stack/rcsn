import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { enqueue } from '../../lib/offlineDb';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Download,
  Plus,
  X,
  Search,
  Calendar,
  UserCheck,
  Clock,
  Phone,
  Building2,
  FileText,
  CheckCircle2,
  LogOut,
  Sparkles,
  Shield,
  Tag,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

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

const EMPTY_FORM: FormState = {
  visitor_name: '',
  purpose: '',
  host_name: '',
  host_role: '',
  phone: '',
  id_number: '',
  badge_number: '',
  notes: '',
};

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return iso.slice(11, 16);
  }
}

export default function VisitorLogPage() {
  const qc = useQueryClient();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;

  const today = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(today);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CHECKED_OUT'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const { data: rawVisitors = [], isLoading } = useQuery({
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
    staleTime: 10_000,
  });

  const field = (k: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleAddVisitor() {
    if (!form.visitor_name.trim() || !form.purpose.trim() || !form.host_name.trim()) {
      setError('Visitor name, purpose and host are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (!navigator.onLine) {
        await enqueue({
          action: {
            type: 'visitor',
            table: 'visitor_log',
            rows: [
              {
                visitor_name: form.visitor_name.trim(),
                purpose: form.purpose.trim(),
                host_name: form.host_name.trim(),
                phone: form.phone.trim() || null,
                school_id: schoolId!,
                check_in_time: new Date().toISOString(),
                created_by: user?.id ?? null,
              },
            ],
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
      if (err) {
        setError(err.message);
        return;
      }
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
    try {
      await supabase.from('visitor_log').update({ check_out_time: new Date().toISOString() }).eq('id', id);
      void qc.invalidateQueries({ queryKey: ['visitor-log', schoolId] });
      void qc.invalidateQueries({ queryKey: ['secretary-dashboard', schoolId] });
    } finally {
      setCheckingOut(null);
    }
  }

  // Filtered visitors
  const visitors = useMemo(() => {
    return rawVisitors.filter((v) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        v.visitor_name.toLowerCase().includes(q) ||
        v.purpose.toLowerCase().includes(q) ||
        v.host_name.toLowerCase().includes(q) ||
        (v.phone && v.phone.includes(q)) ||
        (v.badge_number && v.badge_number.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
          ? !v.check_out_time
          : !!v.check_out_time;

      return matchSearch && matchStatus;
    });
  }, [rawVisitors, search, statusFilter]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = rawVisitors.length;
    const active = rawVisitors.filter((v) => !v.check_out_time).length;
    const checkedOut = rawVisitors.filter((v) => !!v.check_out_time).length;
    return { total, active, checkedOut };
  }, [rawVisitors]);

  function downloadPdf() {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(`Front Desk Visitor Log — ${filterDate}`, 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()} | Total Logged: ${rawVisitors.length}`, 14, 25);

    autoTable(doc, {
      startY: 30,
      head: [['Visitor Name', 'Phone', 'Purpose', 'Visiting / Host', 'Badge / ID', 'Time In', 'Time Out', 'Status']],
      body: rawVisitors.map((v) => [
        v.visitor_name,
        v.phone || '—',
        v.purpose,
        v.host_name + (v.host_role ? ` (${v.host_role})` : ''),
        v.badge_number || v.id_number || '—',
        fmt(v.check_in_time),
        v.check_out_time ? fmt(v.check_out_time) : '—',
        v.check_out_time ? 'Checked Out' : 'ON CAMPUS',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 217, 168], textColor: [5, 8, 15] },
    });

    doc.save(`visitor-log-${filterDate}.pdf`);
  }

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-none"
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
        fontFamily: INTER,
      }}
    >
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
              style={{
                backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(147,51,234,0.12)',
                color: '#a855f7',
                fontFamily: SORA,
              }}
            >
              FRONT DESK & SECURITY
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
            style={{ fontFamily: SORA, color: t.textHi }}
          >
            Visitor Logbook
          </h1>
          <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
            Track visitors, parent inquiries, contractors, and campus check-ins with digital audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={rawVisitors.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg,#10d9a8,#0ea5e9)',
              color: '#05080f',
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Sign In Visitor</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Visitors */}
        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: t.textLow }}>
              Total Logged Today
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(79,142,247,0.15)' : 'rgba(37,99,235,0.1)',
                color: t.blue,
              }}
            >
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {isLoading ? '...' : metrics.total}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Recorded on {filterDate === today ? 'Today' : filterDate}
          </div>
        </div>

        {/* On Campus */}
        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: t.textLow }}>
              Currently On Campus
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(217,119,6,0.1)',
                color: t.gold,
              }}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {isLoading ? '...' : metrics.active}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Pending departure check-out
          </div>
        </div>

        {/* Checked Out */}
        <div
          className="p-5 rounded-2xl relative overflow-hidden transition-all shadow-sm"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: t.textLow }}>
              Departed / Checked Out
            </span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.1)',
                color: t.mint,
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            {isLoading ? '...' : metrics.checkedOut}
          </div>
          <div className="text-xs mt-1" style={{ color: t.textMid }}>
            Completed visits
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.textLow }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search visitor, host, badge..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm transition-all outline-none"
              style={{
                backgroundColor: t.fieldBg,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
              }}
            />
          </div>

          {/* Date Picker */}
          <div className="relative shrink-0">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-semibold outline-none cursor-pointer"
              style={{
                backgroundColor: t.fieldBg,
                border: `1px solid ${t.stroke}`,
                color: t.textHi,
              }}
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex rounded-xl p-1 gap-1 w-full md:w-auto" style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}` }}>
          {(
            [
              { id: 'ALL', label: 'All Visitors' },
              { id: 'ACTIVE', label: 'On Campus' },
              { id: 'CHECKED_OUT', label: 'Checked Out' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all flex-1 md:flex-initial"
              style={{
                backgroundColor: statusFilter === s.id ? (isDark ? 'rgba(255,255,255,0.12)' : '#ffffff') : 'transparent',
                color: statusFilter === s.id ? t.textHi : t.textLow,
                boxShadow: statusFilter === s.id && !isDark ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visitors Log Table */}
      <div
        className="rounded-2xl overflow-hidden shadow-sm"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: t.divider }}>
          <span className="font-bold text-sm tracking-tight" style={{ fontFamily: SORA, color: t.textHi }}>
            Visitor Activity Log
          </span>
          <span className="text-xs" style={{ color: t.textLow }}>
            Showing {visitors.length} entries
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm font-medium" style={{ color: t.textLow }}>
            Loading visitor records...
          </div>
        ) : visitors.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="w-10 h-10 mx-auto mb-2 text-purple-400" />
            <div className="font-semibold text-sm" style={{ color: t.textHi }}>
              No visitors found
            </div>
            <p className="text-xs mt-1" style={{ color: t.textLow }}>
              No visitor entries match your current search and date filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    borderBottom: `1px solid ${t.divider}`,
                    color: t.textLow,
                  }}
                >
                  <th className="py-3 px-4 font-semibold">Visitor Name</th>
                  <th className="py-3 px-4 font-semibold">Purpose</th>
                  <th className="py-3 px-4 font-semibold">Visiting Host</th>
                  <th className="py-3 px-4 font-semibold">Badge / ID</th>
                  <th className="py-3 px-4 font-semibold">Contact</th>
                  <th className="py-3 px-4 font-semibold">Time In</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: t.divider }}>
                {visitors.map((v) => {
                  const isCheckedOut = !!v.check_out_time;

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      {/* Visitor Name */}
                      <td className="py-3.5 px-4 font-semibold" style={{ color: t.textHi }}>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs"
                            style={{
                              backgroundColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(147,51,234,0.12)',
                              color: '#a855f7',
                            }}
                          >
                            {(v.visitor_name || '?').charAt(0)}
                          </div>
                          <div>
                            <div>{v.visitor_name}</div>
                            {v.notes && (
                              <div className="text-[10px] truncate max-w-[140px]" style={{ color: t.textLow }}>
                                Note: {v.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Purpose */}
                      <td className="py-3.5 px-4" style={{ color: t.textMid }}>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-semibold"
                          style={{
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            color: t.textHi,
                          }}
                        >
                          {v.purpose}
                        </span>
                      </td>

                      {/* Host */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium" style={{ color: t.textHi }}>{v.host_name}</div>
                        {v.host_role && (
                          <div className="text-[10px]" style={{ color: t.textLow }}>{v.host_role}</div>
                        )}
                      </td>

                      {/* Badge / ID */}
                      <td className="py-3.5 px-4" style={{ color: t.textMid }}>
                        {v.badge_number ? (
                          <span
                            className="px-2 py-0.5 rounded font-mono text-[10px] font-bold"
                            style={{
                              backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                              color: t.mint,
                            }}
                          >
                            Badge: {v.badge_number}
                          </span>
                        ) : v.id_number ? (
                          <span className="text-[11px]">ID: {v.id_number}</span>
                        ) : (
                          <span style={{ color: t.textLow }}>—</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4" style={{ color: t.textMid }}>
                        {v.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-500" />
                            <span>{v.phone}</span>
                          </div>
                        ) : (
                          <span style={{ color: t.textLow }}>—</span>
                        )}
                      </td>

                      {/* Time In */}
                      <td className="py-3.5 px-4" style={{ color: t.textHi }}>
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3" style={{ color: t.textLow }} />
                          <span>{fmt(v.check_in_time)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor: isCheckedOut
                              ? isDark
                                ? 'rgba(16,217,168,0.15)'
                                : 'rgba(16,185,129,0.12)'
                              : isDark
                              ? 'rgba(245,158,11,0.15)'
                              : 'rgba(217,119,6,0.12)',
                            color: isCheckedOut ? t.mint : t.gold,
                          }}
                        >
                          {isCheckedOut ? `Checked out (${fmt(v.check_out_time!)})` : 'ON CAMPUS'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        {!isCheckedOut ? (
                          <button
                            type="button"
                            onClick={() => handleCheckOut(v.id)}
                            disabled={checkingOut === v.id}
                            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 hover:scale-105 active:scale-95"
                            style={{
                              backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(225,29,72,0.1)',
                              color: t.red,
                              border: `1px solid ${t.red}`,
                            }}
                          >
                            <LogOut className="w-3 h-3" />
                            <span>{checkingOut === v.id ? 'Checking...' : 'Check Out'}</span>
                          </button>
                        ) : (
                          <span className="text-[10px]" style={{ color: t.textLow }}>
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sign In Visitor Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
              color: t.textHi,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: t.divider }}>
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold" style={{ fontFamily: SORA }}>
                  Sign In New Visitor
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="sm:col-span-2">
                <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                  Visitor Full Name *
                </label>
                <input
                  type="text"
                  value={form.visitor_name}
                  onChange={field('visitor_name')}
                  placeholder="e.g. John Mukasa"
                  className="w-full px-3 py-2 rounded-xl outline-none"
                  style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={field('phone')}
                  placeholder="07..."
                  className="w-full px-3 py-2 rounded-xl outline-none"
                  style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                  National ID / Card No.
                </label>
                <input
                  type="text"
                  value={form.id_number}
                  onChange={field('id_number')}
                  placeholder="CM..."
                  className="w-full px-3 py-2 rounded-xl outline-none"
                  style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                  Purpose of Visit *
                </label>
                <input
                  type="text"
                  value={form.purpose}
                  onChange={field('purpose')}
                  placeholder="e.g. Fee Inquiry, Admission"
                  className="w-full px-3 py-2 rounded-xl outline-none"
                  style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                  Visitor Badge Issued #
                </label>
                <input
                  type="text"
                  value={form.badge_number}
                  onChange={field('badge_number')}
                  placeholder="e.g. V-04"
                  className="w-full px-3 py-2 rounded-xl outline-none"
                  style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                  Host / Staff Visiting *
                </label>
                <input
                  type="text"
                  value={form.host_name}
                  onChange={field('host_name')}
                  placeholder="e.g. Head Teacher, Mrs. Sarah"
                  className="w-full px-3 py-2 rounded-xl outline-none"
                  style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                  Host Department / Office
                </label>
                <input
                  type="text"
                  value={form.host_role}
                  onChange={field('host_role')}
                  placeholder="e.g. Administration, Accounts"
                  className="w-full px-3 py-2 rounded-xl outline-none"
                  style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block mb-1 font-semibold" style={{ color: t.textMid }}>
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={field('notes')}
                  placeholder="Items carried, vehicle registration, etc."
                  className="w-full px-3 py-2 rounded-xl outline-none resize-none"
                  style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: t.divider }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ backgroundColor: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textMid }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddVisitor}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg,#10d9a8,#0ea5e9)',
                  color: '#05080f',
                }}
              >
                {saving ? 'Registering...' : 'Sign In Visitor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
