import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Monitor,
  Cpu,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Wrench,
  Search,
  Filter,
  Check,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import NativeModal from '@/components/NativeModal';

interface Workstation {
  id: string;
  station_code: string;
  row_number: string;
  cpu_specs: string;
  ram_gb: number;
  storage_specs: string;
  os_version: string;
  has_ups: boolean;
  mouse_status: string;
  keyboard_status: string;
  monitor_status: string;
  overall_status: string; // 'operational', 'needs_update', 'faulty_component', 'out_of_service'
  notes: string | null;
  updated_at: string;
}

export default function IctWorkstationsPage() {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId) || 'e1b10000-0000-4000-a000-000000000001';

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingStation, setEditingStation] = useState<Workstation | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // New Station Form State
  const [newCode, setNewCode] = useState('');
  const [newRow, setNewRow] = useState('Row 1');
  const [newCpu, setNewCpu] = useState('Intel Core i5');
  const [newRam, setNewRam] = useState(8);
  const [newStorage, setNewStorage] = useState('256GB SSD');
  const [newOs, setNewOs] = useState('Windows 11 Pro');

const LOCAL_STORAGE_KEY = 'rcsn_ict_workstations';

function getInitialLocalWorkstations(): Workstation[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const list: Workstation[] = [];
  for (let i = 1; i <= 30; i++) {
    const code = `PC-${String(i).padStart(2, '0')}`;
    const row = `Row ${Math.ceil(i / 6)}`;
    list.push({
      id: `local-station-${i}`,
      station_code: code,
      row_number: row,
      cpu_specs: 'Intel Core i5-8500',
      ram_gb: 8,
      storage_specs: '256GB SSD',
      os_version: 'Windows 11 Pro',
      has_ups: true,
      mouse_status: 'working',
      keyboard_status: 'working',
      monitor_status: 'working',
      overall_status: 'operational',
      notes: null,
      updated_at: new Date().toISOString(),
    });
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {}
  return list;
}

  // Fetch workstations
  const { data: workstations = [], isLoading } = useQuery({
    queryKey: ['ict-workstations', schoolId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('ict_workstations')
          .select('*')
          .eq('school_id', schoolId)
          .order('station_code', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          return data as Workstation[];
        }
      } catch {}
      return getInitialLocalWorkstations();
    },
  });

  // Update workstation mutation
  const updateMutation = useMutation({
    mutationFn: async (updated: Partial<Workstation> & { id: string }) => {
      try {
        await supabase
          .from('ict_workstations')
          .update({
            ...updated,
            updated_at: new Date().toISOString(),
          })
          .eq('id', updated.id);
      } catch {}
      const current = getInitialLocalWorkstations();
      const next = current.map((w) => (w.id === updated.id ? { ...w, ...updated, updated_at: new Date().toISOString() } : w));
      try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next)); } catch {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ict-workstations', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['ict-workstations-kpi', schoolId] });
      setEditingStation(null);
    },
  });

  // Add workstation mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const newStation: Workstation = {
        id: `local-station-${Date.now()}`,
        station_code: newCode.trim().toUpperCase(),
        row_number: newRow,
        cpu_specs: newCpu,
        ram_gb: Number(newRam),
        storage_specs: newStorage,
        os_version: newOs,
        has_ups: true,
        mouse_status: 'working',
        keyboard_status: 'working',
        monitor_status: 'working',
        overall_status: 'operational',
        notes: null,
        updated_at: new Date().toISOString(),
      };
      try {
        await supabase.from('ict_workstations').insert({
          school_id: schoolId,
          station_code: newStation.station_code,
          row_number: newStation.row_number,
          cpu_specs: newStation.cpu_specs,
          ram_gb: newStation.ram_gb,
          storage_specs: newStation.storage_specs,
          os_version: newStation.os_version,
          has_ups: newStation.has_ups,
          mouse_status: newStation.mouse_status,
          keyboard_status: newStation.keyboard_status,
          monitor_status: newStation.monitor_status,
          overall_status: newStation.overall_status,
        });
      } catch {}
      const current = getInitialLocalWorkstations();
      current.push(newStation);
      try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current)); } catch {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ict-workstations', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['ict-workstations-kpi', schoolId] });
      setIsNewModalOpen(false);
      setNewCode('');
    },
  });

  const filtered = workstations.filter((w) => {
    const term = search.toLowerCase().trim();
    const matchesSearch = !term || w.station_code.toLowerCase().includes(term) || w.row_number.toLowerCase().includes(term);
    const matchesFilter = filterStatus === 'all' || w.overall_status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const operationalCount = workstations.filter((w) => w.overall_status === 'operational').length;
  const issueCount = workstations.filter((w) => w.overall_status !== 'operational').length;

  return (
    <AdminPageWrapper
      eyebrow="HARDWARE & LAB READINESS"
      title="Computer Lab Workstations"
      subtitle="Monitor PC health, peripheral working status, and hardware specifications for practical sessions."
    >
      {/* Top Header Controls */}
      <div className={`${adminCardClass} space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search station (e.g. PC-05)..."
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
                All ({workstations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('operational')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold ${
                  filterStatus === 'operational'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                Operational ({operationalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('faulty_component')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold ${
                  filterStatus === 'faulty_component'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                Attention ({issueCount})
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Workstation
          </button>
        </div>
      </div>

      {/* Workstations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {filtered.map((w) => {
          const isOperational = w.overall_status === 'operational';
          const hasIssue = !isOperational;

          return (
            <div
              key={w.id}
              className={`rounded-2xl border p-4 transition-all ${
                hasIssue
                  ? 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500/50'
                  : 'border-white/10 bg-slate-900/40 hover:border-emerald-500/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold border ${
                      hasIssue
                        ? 'border-amber-500/30 bg-amber-500/20 text-amber-300'
                        : 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{w.station_code}</h3>
                    <p className="text-[11px] text-slate-400">{w.row_number}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingStation(w)}
                  className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                  title="Configure station"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Hardware Specs */}
              <div className="mt-3.5 space-y-1.5 border-t border-white/5 pt-3 text-[11px] text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">CPU / RAM:</span>
                  <span className="font-mono text-white">{w.cpu_specs} ({w.ram_gb}GB)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Storage / OS:</span>
                  <span className="font-mono text-white">{w.storage_specs}</span>
                </div>
              </div>

              {/* Peripherals Health Chips */}
              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                <span className={`px-2 py-0.5 rounded font-medium ${w.monitor_status === 'working' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                  Screen
                </span>
                <span className={`px-2 py-0.5 rounded font-medium ${w.keyboard_status === 'working' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                  Keyboard
                </span>
                <span className={`px-2 py-0.5 rounded font-medium ${w.mouse_status === 'working' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                  Mouse
                </span>
              </div>

              {w.notes && (
                <p className="mt-2.5 pt-2 border-t border-white/5 text-[10.5px] text-amber-300/80 italic truncate">
                  {w.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Station Modal */}
      {editingStation && (
        <NativeModal
          isOpen={!!editingStation}
          onClose={() => setEditingStation(null)}
          title={`Configure Station ${editingStation.station_code}`}
          size="md"
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-300">Overall Station Status</label>
              <select
                value={editingStation.overall_status}
                onChange={(e) => setEditingStation({ ...editingStation, overall_status: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
              >
                <option value="operational">Operational (Ready for sessions)</option>
                <option value="faulty_component">Faulty Component (Peripheral or Cable)</option>
                <option value="needs_update">Needs Software / Antivirus Update</option>
                <option value="out_of_service">Out of Service</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Monitor</label>
                <select
                  value={editingStation.monitor_status}
                  onChange={(e) => setEditingStation({ ...editingStation, monitor_status: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 rounded-lg border border-white/10 bg-slate-900 text-xs text-white"
                >
                  <option value="working">Working</option>
                  <option value="faulty">Faulty</option>
                  <option value="missing">Missing</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Keyboard</label>
                <select
                  value={editingStation.keyboard_status}
                  onChange={(e) => setEditingStation({ ...editingStation, keyboard_status: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 rounded-lg border border-white/10 bg-slate-900 text-xs text-white"
                >
                  <option value="working">Working</option>
                  <option value="faulty">Faulty</option>
                  <option value="missing">Missing</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Mouse</label>
                <select
                  value={editingStation.mouse_status}
                  onChange={(e) => setEditingStation({ ...editingStation, mouse_status: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 rounded-lg border border-white/10 bg-slate-900 text-xs text-white"
                >
                  <option value="working">Working</option>
                  <option value="faulty">Faulty</option>
                  <option value="missing">Missing</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Maintenance & Repair Notes</label>
              <textarea
                rows={2}
                value={editingStation.notes || ''}
                onChange={(e) => setEditingStation({ ...editingStation, notes: e.target.value })}
                placeholder="e.g. Needs HDMI cable replaced or deep freeze reboot"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingStation(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateMutation.mutate(editingStation)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </NativeModal>
      )}

      {/* Add Workstation Modal */}
      {isNewModalOpen && (
        <NativeModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          title="Add New Computer Lab Workstation"
          size="md"
        >
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Station Code</label>
                <input
                  type="text"
                  placeholder="e.g. PC-31"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Row Number</label>
                <input
                  type="text"
                  value={newRow}
                  onChange={(e) => setNewRow(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Processor (CPU)</label>
                <input
                  type="text"
                  value={newCpu}
                  onChange={(e) => setNewCpu(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">RAM (GB)</label>
                <input
                  type="number"
                  value={newRam}
                  onChange={(e) => setNewRam(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs text-white"
                />
              </div>
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
                disabled={!newCode.trim()}
                onClick={() => addMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs"
              >
                Add Workstation
              </button>
            </div>
          </div>
        </NativeModal>
      )}
    </AdminPageWrapper>
  );
}
