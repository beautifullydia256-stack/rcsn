import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import NativeModal from '@/components/NativeModal';
import {
  Cpu,
  Wifi,
  WifiOff,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Copy,
  Check,
  Edit2,
  Trash2,
  Power,
  Server,
  RefreshCw,
  X,
  Radio,
} from 'lucide-react';
import { GovPageLoader, GovRollingBox, GovTableLoader } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

type DeviceType = 'hikvision' | 'zkteco' | 'essl' | 'suprema' | 'rfid' | 'qr';
type ScanType = 'arrival' | 'departure' | 'both';

type Device = {
  id: string;
  device_name: string;
  device_type: DeviceType;
  ip_address: string | null;
  port: number | null;
  serial_number: string | null;
  location: string | null;
  scan_type: ScanType;
  webhook_token: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: string | null;
  sync_message: string | null;
};

const DEVICE_LABELS: Record<DeviceType, string> = {
  hikvision: 'Hikvision DS-K1A802F',
  zkteco: 'ZKTeco F18 / F18-N',
  essl: 'eSSL Standalone Terminal',
  suprema: 'Suprema BioStation 2',
  rfid: 'RFID Card Terminal',
  qr: 'Dynamic QR Scanner Terminal',
};

const DEFAULT_PORT: Record<DeviceType, number> = {
  hikvision: 80,
  zkteco: 4370,
  essl: 4370,
  suprema: 51211,
  rfid: 4370,
  qr: 80,
};

const PUSH_MODE: Record<DeviceType, 'push' | 'poll' | 'qr'> = {
  hikvision: 'push',
  zkteco: 'push',
  essl: 'poll',
  suprema: 'poll',
  rfid: 'push',
  qr: 'qr',
};

type FormState = {
  device_name: string;
  device_type: DeviceType;
  ip_address: string;
  port: string;
  serial_number: string;
  location: string;
  scan_type: ScanType;
};

const emptyForm = (): FormState => ({
  device_name: '',
  device_type: 'hikvision',
  ip_address: '',
  port: '80',
  serial_number: '',
  location: '',
  scan_type: 'arrival',
});

export default function BiometricDevicesPage() {
  const user = useAuthStore((s) => s.user);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const SYNC_HOST = 'biometric.stag.hgivers.online';
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setSchoolId(data?.school_id ?? null));
  }, [user?.id]);

  useEffect(() => {
    if (!schoolId) return;
    fetchDevices();
  }, [schoolId]);

  function fetchDevices() {
    if (!schoolId) return;
    setLoading(true);
    supabase
      .from('biometric_devices')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: true })
      .then(({ data, error: e }) => {
        if (!e && data) setDevices(data as Device[]);
        setLoading(false);
      });
  }

  function webhookUrl(device: Device) {
    if (device.device_type === 'hikvision') {
      return `https://${SYNC_HOST}/hikvision_push.php?token=${device.webhook_token}`;
    }
    return `https://${SYNC_HOST}/zkteco_push.php?token=${device.webhook_token}`;
  }

  function copyUrl(device: Device) {
    navigator.clipboard.writeText(webhookUrl(device));
    setCopiedId(device.id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  function openNew() {
    setForm(emptyForm());
    setEditId('new');
    setError(null);
  }

  function openEdit(d: Device) {
    setForm({
      device_name: d.device_name,
      device_type: d.device_type,
      ip_address: d.ip_address ?? '',
      port: String(d.port ?? DEFAULT_PORT[d.device_type]),
      serial_number: d.serial_number ?? '',
      location: d.location ?? '',
      scan_type: d.scan_type ?? 'arrival',
    });
    setEditId(d.id);
    setError(null);
  }

  function setType(deviceType: DeviceType) {
    setForm((f) => ({ ...f, device_type: deviceType, port: String(DEFAULT_PORT[deviceType]) }));
  }

  async function save() {
    if (!schoolId) return;
    if (!form.device_name.trim()) {
      setError('Terminal device name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      school_id: schoolId,
      device_name: form.device_name.trim(),
      device_type: form.device_type,
      ip_address: form.ip_address.trim() || null,
      port: form.port ? parseInt(form.port, 10) : DEFAULT_PORT[form.device_type],
      serial_number: form.serial_number.trim() || null,
      location: form.location.trim() || null,
      scan_type: form.scan_type,
    };
    let err: unknown = null;
    if (editId === 'new') {
      const { error: e, data } = await supabase
        .from('biometric_devices')
        .insert(payload)
        .select('*')
        .single();
      err = e;
      if (!e && data) {
        setDevices((prev) => [...prev, data as Device]);
        setSuccessMsg(`Terminal "${data.device_name}" registered successfully.`);
      }
    } else if (editId) {
      const { error: e, data } = await supabase
        .from('biometric_devices')
        .update(payload)
        .eq('id', editId)
        .select('*')
        .single();
      err = e;
      if (!e && data) {
        setDevices((prev) => prev.map((d) => (d.id === editId ? (data as Device) : d)));
        setSuccessMsg(`Terminal "${data.device_name}" updated.`);
      }
    }
    setSaving(false);
    if (err) {
      setError((err as { message?: string }).message ?? 'Save failed');
      return;
    }
    setEditId(null);
    setTimeout(() => setSuccessMsg(null), 3500);
  }

  async function toggleActive(device: Device) {
    const { error: e } = await supabase
      .from('biometric_devices')
      .update({ is_active: !device.is_active })
      .eq('id', device.id);
    if (!e) {
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? { ...d, is_active: !device.is_active } : d))
      );
    }
  }

  async function deleteDevice(id: string) {
    if (!confirm('Are you sure you want to decommission this hardware terminal?')) return;
    setDeletingId(id);
    const { error: e } = await supabase.from('biometric_devices').delete().eq('id', id);
    setDeletingId(null);
    if (!e) {
      setDevices((prev) => prev.filter((d) => d.id !== id));
      setSuccessMsg('Terminal decommissioned successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  }

  // Summary Metrics
  const stats = useMemo(() => {
    const total = devices.length;
    const active = devices.filter((d) => d.is_active).length;
    const pushCount = devices.filter((d) => PUSH_MODE[d.device_type] === 'push').length;
    const locations = new Set(devices.map((d) => d.location).filter(Boolean)).size;
    return { total, active, pushCount, locations };
  }, [devices]);

  const filteredDevices = useMemo(() => {
    if (!search.trim()) return devices;
    const q = search.toLowerCase();
    return devices.filter(
      (d) =>
        d.device_name.toLowerCase().includes(q) ||
        (d.location ?? '').toLowerCase().includes(q) ||
        (d.ip_address ?? '').includes(q) ||
        (d.serial_number ?? '').toLowerCase().includes(q)
    );
  }, [devices, search]);

  return (
    <div className="admin-terminal-page space-y-5">
      {/* ── 1. TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            CAMPUS BIOMETRIC TERMINAL REGISTRY
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            HARDWARE ENDPOINTS, REALTIME WEBHOOKS &amp; CAMPUS ACCESS AUDIT
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDevices}
            disabled={loading}
            className="gov-btn gov-btn-sm flex items-center gap-1.5"
            title="Refresh Terminals"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>SYNC</span>
          </button>
          <button
            type="button"
            onClick={openNew}
            className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>REGISTER TERMINAL</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="border border-rose-300 bg-rose-50 p-3 text-xs font-mono text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-700 hover:text-rose-950 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="border border-emerald-300 bg-emerald-50 p-3 text-xs font-mono text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 2. MONOCHROME KPI SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            ACTIVE TERMINALS
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {stats.active.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            ONLINE &amp; POLLING
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            TOTAL REGISTERED
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.total.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            HARDWARE ASSETS
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            HTTP PUSH / ADMS
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.pushCount.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            REALTIME WEBHOOK ENDPOINTS
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            CAMPUS POSTS &amp; GATES
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.locations.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            MONITORED ENTRYPOINTS
          </div>
        </div>
      </div>

      {/* ── 3. CONTROL BAR ── */}
      <div className="gov-control-bar flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#CCCCCC]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#555555]">
            REGISTERED FLEET:
          </span>
          <span className="text-xs font-mono font-bold text-[#111111]">
            {filteredDevices.length} UNITS
          </span>
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search terminal name, IP, serial…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="gov-input text-xs font-mono w-full"
          />
        </div>
      </div>

      {/* ── 4. DATA TABLE ── */}
      <div className="gov-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="gov-table w-full text-left">
            <thead>
              <tr>
                <th>TERMINAL DESIGNATION</th>
                <th>MODEL / ARCHITECTURE</th>
                <th>NETWORK ENDPOINT</th>
                <th>GATE / FACILITY</th>
                <th>SCAN DIRECTION</th>
                <th>WEBHOOK SYNCHRONIZATION</th>
                <th>STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <GovTableLoader colSpan={8} />
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-xs font-mono text-[#777777]">
                    NO HARDWARE TERMINALS CURRENTLY REGISTERED
                  </td>
                </tr>
              ) : (
                filteredDevices.map((d) => {
                  const isCopied = copiedId === d.id;
                  const mode = PUSH_MODE[d.device_type];

                  return (
                    <tr key={d.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="font-bold text-xs text-[#111111]">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-[#555555] shrink-0" />
                          <span>{d.device_name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-[#555555]">
                        {DEVICE_LABELS[d.device_type]}
                      </td>
                      <td className="font-mono text-xs text-[#333333]">
                        {d.ip_address ? `${d.ip_address}:${d.port ?? DEFAULT_PORT[d.device_type]}` : '—'}
                      </td>
                      <td className="font-mono text-xs text-[#555555]">
                        {d.location || 'Main Gate'}
                      </td>
                      <td className="font-mono text-[11px] uppercase text-[#333333]">
                        {d.scan_type === 'both' ? 'Bi-directional' : d.scan_type}
                      </td>
                      <td className="font-mono text-xs">
                        {mode === 'push' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => copyUrl(d)}
                              className="gov-btn gov-btn-sm py-0.5 px-2 flex items-center gap-1 text-[10px]"
                              title="Copy Webhook URL"
                            >
                              {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-[#555555]" />}
                              <span>{isCopied ? 'COPIED' : 'COPY WEBHOOK'}</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[#888888] text-[10px]">POLL-BASED</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleActive(d)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border ${
                            d.is_active
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                              : 'border-zinc-300 bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${d.is_active ? 'bg-emerald-600' : 'bg-zinc-400'}`} />
                          {d.is_active ? 'ONLINE' : 'OFFLINE'}
                        </button>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(d)}
                            className="gov-btn gov-btn-sm"
                          >
                            CONFIGURE
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDevice(d.id)}
                            disabled={deletingId === d.id}
                            className="gov-btn gov-btn-sm text-rose-700 hover:text-rose-900"
                            title="Decommission Terminal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. TERMINAL CONFIGURATION MODAL ── */}
      {editId && (
        <NativeModal
          isOpen={true}
          onClose={() => setEditId(null)}
          title={editId === 'new' ? 'REGISTER HARDWARE TERMINAL' : `CONFIGURE TERMINAL: ${form.device_name}`}
          subtitle="Configure biometric hardware endpoint communication and webhook integration."
          icon={Cpu}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#333333] mb-1 font-semibold">
                  Device Name / Label *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Campus Entrance Gate 1"
                  value={form.device_name}
                  onChange={(e) => setForm((f) => ({ ...f, device_name: e.target.value }))}
                  className="gov-input w-full font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#333333] mb-1 font-semibold">
                  Terminal Hardware Model *
                </label>
                <select
                  value={form.device_type}
                  onChange={(e) => setType(e.target.value as DeviceType)}
                  className="gov-select w-full font-mono text-xs"
                >
                  {Object.entries(DEVICE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#333333] mb-1 font-semibold">
                  Static IP Address (LAN)
                </label>
                <input
                  type="text"
                  placeholder="192.168.1.201"
                  value={form.ip_address}
                  onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))}
                  className="gov-input w-full font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#333333] mb-1 font-semibold">
                  Network Port
                </label>
                <input
                  type="text"
                  placeholder={String(DEFAULT_PORT[form.device_type])}
                  value={form.port}
                  onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                  className="gov-input w-full font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#333333] mb-1 font-semibold">
                  Serial Number (Hardware Barcode)
                </label>
                <input
                  type="text"
                  placeholder="DS-K1A802F-20240901"
                  value={form.serial_number}
                  onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
                  className="gov-input w-full font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#333333] mb-1 font-semibold">
                  Location / Physical Gate
                </label>
                <input
                  type="text"
                  placeholder="Clinical Skills Lab / Hostel Gate"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="gov-input w-full font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#333333] mb-1 font-semibold">
                Scan Direction Classification
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['arrival', 'departure', 'both'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, scan_type: dir }))}
                    className={`py-2 px-3 text-xs font-mono uppercase tracking-wider border transition-colors ${
                      form.scan_type === dir
                        ? 'border-[#111111] bg-[#111111] text-white font-bold'
                        : 'border-[#CCCCCC] bg-white text-[#555555] hover:bg-[#F3F4F6]'
                    }`}
                  >
                    {dir === 'arrival' ? 'Clock In Only' : dir === 'departure' ? 'Clock Out Only' : 'Both (In & Out)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="gov-btn gov-btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
              >
                {saving ? <GovRollingBox size="sm" /> : <Check className="w-3.5 h-3.5" />}
                <span>{editId === 'new' ? 'Register Endpoint' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </NativeModal>
      )}
    </div>
  );
}
