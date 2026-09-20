import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
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
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  HelpCircle,
  Radio,
  Server,
  Layers,
  X,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

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
  essl: 'eSSL Standalone',
  suprema: 'Suprema BioStation',
  rfid: 'RFID Card Terminal',
  qr: 'Dynamic QR Scanner',
};

const DEVICE_COLORS: Record<DeviceType, string> = {
  hikvision: 'bg-red-500/15 text-red-300 border-red-500/30',
  zkteco: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  essl: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  suprema: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  rfid: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  qr: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
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
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

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
  }, [schoolId]);

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
      setError('Device name is required.');
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
        setSuccessMsg(`Terminal "${data.device_name}" added successfully.`);
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
    setDeletingId(id);
    const { error: e } = await supabase.from('biometric_devices').delete().eq('id', id);
    setDeletingId(null);
    if (!e) {
      setDevices((prev) => prev.filter((d) => d.id !== id));
      setSuccessMsg('Device removed.');
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

  return (
    <AdminPageWrapper
      title="Biometric Hardware Terminals"
      subtitle="Register, monitor, and configure fingerprint and RFID hardware terminals across school gates and facilities."
    >
      <div className="w-full space-y-6">
        {/* Toast / Notifications */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 4-Card Summary Strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'emerald'),
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Active Devices
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Wifi className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.active}
            </p>
            <p className="mt-1 text-xs text-emerald-400/90 font-medium">
              Actively polling &amp; logging
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'blue'),
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Total Terminals
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <Cpu className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.total}
            </p>
            <p className="mt-1 text-xs text-blue-400/90 font-medium">
              Registered hardware units
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'purple'),
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                HTTP Push / ADMS
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                <Server className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.pushCount}
            </p>
            <p className="mt-1 text-xs text-purple-400/90 font-medium">
              Real-time webhook enabled
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'amber'),
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Campuses / Gates
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <MapPin className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.locations}
            </p>
            <p className="mt-1 text-xs text-amber-400/90 font-medium">
              Terminal locations
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"
          style={{
            backgroundColor: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          <div>
            <h2 className="text-base font-semibold text-slate-100" style={{ fontFamily: SORA }}>
              Terminal Hardware Fleet
            </h2>
            <p className="text-xs text-slate-400">
              Supports Hikvision DS-K1A802F, ZKTeco F18, eSSL, Suprema, and RFID scanners.
            </p>
          </div>

          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:from-emerald-500 hover:to-teal-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Biometric Terminal
          </button>
        </div>

        {/* Devices List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          </div>
        ) : devices.length === 0 ? (
          <div
            className="rounded-2xl p-8"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <PosEmptyState
              icon={<Cpu className="w-8 h-8 text-teal-400" />}
              title="No Biometric Terminals Registered"
              description="Register your first fingerprint or RFID terminal to automate real-time attendance logs and SMS notifications."
              accentColor="mint"
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {devices.map((device) => {
              const mode = PUSH_MODE[device.device_type];
              const syncOk = device.sync_status === 'ok';
              const syncTs = device.last_sync_at
                ? new Date(device.last_sync_at).toLocaleString('en-UG', {
                    timeZone: 'Africa/Kampala',
                    hour12: false,
                  })
                : null;

              return (
                <div
                  key={device.id}
                  className={`flex flex-col justify-between rounded-2xl p-5 transition-all hover:scale-[1.005] ${
                    device.is_active ? '' : 'opacity-60'
                  }`}
                  style={{
                    backgroundColor: t.panel,
                    border: `1px solid ${t.stroke}`,
                  }}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400">
                          <Cpu className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-100" style={{ fontFamily: SORA }}>
                              {device.device_name}
                            </h3>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                DEVICE_COLORS[device.device_type]
                              }`}
                            >
                              {DEVICE_LABELS[device.device_type]}
                            </span>
                          </div>
                          {device.location && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                              <MapPin className="h-3 w-3 text-slate-500" />
                              {device.location}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            device.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                          }`}
                        />
                        <span className="text-[11px] font-medium text-slate-400">
                          {device.is_active ? 'Online' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    {/* Meta Specifications */}
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-300">
                      {device.ip_address && (
                        <span className="flex items-center gap-1 font-mono text-slate-300">
                          <Server className="h-3 w-3 text-slate-500" />
                          {device.ip_address}:{device.port}
                        </span>
                      )}
                      {device.serial_number && (
                        <span className="text-slate-400">
                          S/N: <span className="font-mono text-slate-200">{device.serial_number}</span>
                        </span>
                      )}
                      <span className="text-slate-400">
                        Mode:{' '}
                        <strong className="text-teal-300">
                          {mode === 'push'
                            ? 'HTTP Push'
                            : mode === 'poll'
                            ? 'TCP Poll (cron)'
                            : 'Dynamic QR'}
                        </strong>
                      </span>
                      <span className="text-slate-400">
                        Scan:{' '}
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            device.scan_type === 'arrival'
                              ? 'text-emerald-400'
                              : device.scan_type === 'departure'
                              ? 'text-amber-400'
                              : 'text-blue-400'
                          }`}
                        >
                          {device.scan_type === 'arrival' ? (
                            <>
                              <ArrowRight className="h-3 w-3" /> Arrival
                            </>
                          ) : device.scan_type === 'departure' ? (
                            <>
                              <ArrowLeft className="h-3 w-3" /> Departure
                            </>
                          ) : (
                            <>
                              <ArrowLeftRight className="h-3 w-3" /> Both
                            </>
                          )}
                        </span>
                      </span>
                    </div>

                    {syncTs && (
                      <div className="mt-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            syncOk ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {syncOk ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          Last sync: {syncTs}
                        </span>
                      </div>
                    )}

                    {/* Webhook URL for push devices */}
                    {mode === 'push' && (
                      <div className="mt-3 flex items-center gap-2">
                        <code
                          className="flex-1 overflow-x-auto rounded-xl border p-2 font-mono text-[11px] text-teal-300"
                          style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
                        >
                          {webhookUrl(device)}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyUrl(device)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                        >
                          {copiedId === device.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-teal-400" />
                              <span>Copy URL</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(device)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                      >
                        <Edit2 className="h-3 w-3 text-teal-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleActive(device)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                          device.is_active
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                        }`}
                      >
                        <Power className="h-3 w-3" />
                        <span>{device.is_active ? 'Disable' : 'Enable'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete "${device.device_name}"?`)) {
                          deleteDevice(device.id);
                        }
                      }}
                      disabled={deletingId === device.id}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Delete Terminal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Add or Edit Terminal */}
        {editId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div
              className="w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4"
              style={{
                backgroundColor: t.panel,
                border: `1px solid ${t.stroke}`,
              }}
            >
              <div className="flex items-center justify-between border-b pb-3 border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-100" style={{ fontFamily: SORA }}>
                    {editId === 'new' ? 'Register Biometric Terminal' : 'Edit Terminal Settings'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditId(null);
                    setError(null);
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-medium text-slate-300 block mb-1">Terminal Name *</label>
                  <input
                    type="text"
                    required
                    value={form.device_name}
                    onChange={(e) => setForm((f) => ({ ...f, device_name: e.target.value }))}
                    placeholder="e.g. Main Campus Gate Terminal 1"
                    className="w-full rounded-xl border p-2.5 text-slate-100 placeholder-slate-400"
                    style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-300 block mb-1">Device Brand / Model *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['hikvision', 'zkteco'] as DeviceType[]).map((devT) => (
                      <button
                        key={devT}
                        type="button"
                        onClick={() => setType(devT)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          form.device_type === devT
                            ? 'border-teal-500/50 bg-teal-500/15 text-teal-300 font-semibold'
                            : 'border-white/10 bg-white/5 text-slate-400'
                        }`}
                      >
                        <div className="text-xs">{devT === 'hikvision' ? 'Hikvision' : 'ZKTeco'}</div>
                        <div className="mt-0.5 text-[10px] text-slate-500">
                          {devT === 'hikvision' ? 'DS-K1A802F' : 'F18 / F18-N'}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-2">
                    <select
                      value={
                        (['hikvision', 'zkteco'] as DeviceType[]).includes(form.device_type)
                          ? ''
                          : form.device_type
                      }
                      onChange={(e) => {
                        if (e.target.value) setType(e.target.value as DeviceType);
                      }}
                      className="w-full rounded-xl border p-2 text-xs text-slate-200"
                      style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
                    >
                      <option value="">Other device brand…</option>
                      {(['essl', 'suprema', 'rfid', 'qr'] as DeviceType[]).map((k) => (
                        <option key={k} value={k}>
                          {DEVICE_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-300 block mb-1">IP Address</label>
                    <input
                      type="text"
                      value={form.ip_address}
                      onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))}
                      placeholder="192.168.1.100"
                      className="w-full rounded-xl border p-2 font-mono text-slate-100 placeholder-slate-500"
                      style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-300 block mb-1">Port</label>
                    <input
                      type="number"
                      value={form.port}
                      onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                      className="w-full rounded-xl border p-2 font-mono text-slate-100"
                      style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-300 block mb-1">Campus Location</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Main Gate, Library"
                      className="w-full rounded-xl border p-2 text-slate-100 placeholder-slate-500"
                      style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-300 block mb-1">Serial Number</label>
                    <input
                      type="text"
                      value={form.serial_number}
                      onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
                      placeholder="Hardware serial"
                      className="w-full rounded-xl border p-2 font-mono text-slate-100 placeholder-slate-500"
                      style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-medium text-slate-300 block mb-1">Attendance Scan Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['arrival', 'departure', 'both'] as ScanType[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, scan_type: mode }))}
                        className={`rounded-xl border py-2 text-center text-xs font-medium capitalize transition-all ${
                          form.scan_type === mode
                            ? 'border-teal-500/50 bg-teal-500/15 text-teal-300 font-semibold'
                            : 'border-white/10 bg-white/5 text-slate-400'
                        }`}
                      >
                        {mode === 'arrival'
                          ? 'Arrival'
                          : mode === 'departure'
                          ? 'Departure'
                          : 'Both (In/Out)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(null);
                      setError(null);
                    }}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : editId === 'new' ? 'Register Terminal' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
