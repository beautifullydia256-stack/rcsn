import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

type DeviceType = 'hikvision' | 'zkteco' | 'essl' | 'suprema' | 'rfid' | 'qr';

type Device = {
  id: string;
  device_name: string;
  device_type: DeviceType;
  ip_address: string | null;
  port: number | null;
  serial_number: string | null;
  location: string | null;
  webhook_token: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: string | null;
  sync_message: string | null;
};

const DEVICE_LABELS: Record<DeviceType, string> = {
  hikvision: 'Hikvision DS-K1A802F',
  zkteco:    'ZKTeco F18',
  essl:      'eSSL',
  suprema:   'Suprema',
  rfid:      'RFID Reader',
  qr:        'QR Scanner',
};

const DEVICE_COLORS: Record<DeviceType, string> = {
  hikvision: 'bg-red-900/40 text-red-300 border-red-700/40',
  zkteco:    'bg-blue-900/40 text-blue-300 border-blue-700/40',
  essl:      'bg-amber-900/40 text-amber-300 border-amber-700/40',
  suprema:   'bg-purple-900/40 text-purple-300 border-purple-700/40',
  rfid:      'bg-teal-900/40 text-teal-300 border-teal-700/40',
  qr:        'bg-green-900/40 text-green-300 border-green-700/40',
};

const DEFAULT_PORT: Record<DeviceType, number> = {
  hikvision: 80,
  zkteco:    4370,
  essl:      4370,
  suprema:   51211,
  rfid:      4370,
  qr:        80,
};

const PUSH_MODE: Record<DeviceType, 'push' | 'poll' | 'qr'> = {
  hikvision: 'push',
  zkteco:    'push',  // ADMS push; poll also available via cron
  essl:      'poll',
  suprema:   'poll',
  rfid:      'push',
  qr:        'qr',
};

const PUSH_SCRIPT: Record<DeviceType, string> = {
  hikvision: 'hikvision_push.php',
  zkteco:    'zkteco_push.php',
  essl:      'zkteco_push.php',
  suprema:   'hikvision_push.php',
  rfid:      'hikvision_push.php',
  qr:        'hikvision_push.php',
};

type FormState = {
  device_name: string;
  device_type: DeviceType;
  ip_address: string;
  port: string;
  serial_number: string;
  location: string;
};

const emptyForm = (): FormState => ({
  device_name: '',
  device_type: 'hikvision',
  ip_address: '',
  port: '80',
  serial_number: '',
  location: '',
});

export default function BiometricDevicesPage() {
  const user = useAuthStore((s) => s.user);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [hostgiverDomain, setHostgiverDomain] = useState('yourdomain.com');
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('users').select('school_id').eq('user_id', user.id).single()
      .then(({ data }) => setSchoolId(data?.school_id ?? null));
  }, [user?.id]);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    supabase.from('biometric_devices').select('*').eq('school_id', schoolId).order('created_at')
      .then(({ data }) => { setDevices((data ?? []) as Device[]); setLoading(false); });
  }, [schoolId]);

  function webhookUrl(device: Device): string {
    const script = PUSH_SCRIPT[device.device_type];
    return `https://${hostgiverDomain}/biometric/${script}?d=${device.id}&t=${device.webhook_token}`;
  }

  function copyUrl(device: Device) {
    navigator.clipboard.writeText(webhookUrl(device)).then(() => {
      setCopiedId(device.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
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
    });
    setEditId(d.id);
    setError(null);
  }

  function setType(t: DeviceType) {
    setForm((f) => ({ ...f, device_type: t, port: String(DEFAULT_PORT[t]) }));
  }

  async function save() {
    if (!schoolId) return;
    if (!form.device_name.trim()) { setError('Device name is required.'); return; }
    setSaving(true);
    setError(null);
    const payload = {
      school_id:     schoolId,
      device_name:   form.device_name.trim(),
      device_type:   form.device_type,
      ip_address:    form.ip_address.trim() || null,
      port:          form.port ? parseInt(form.port) : DEFAULT_PORT[form.device_type],
      serial_number: form.serial_number.trim() || null,
      location:      form.location.trim() || null,
    };
    let err: unknown = null;
    if (editId === 'new') {
      const { error: e, data } = await supabase.from('biometric_devices').insert(payload).select('*').single();
      err = e;
      if (!e && data) setDevices((prev) => [...prev, data as Device]);
    } else if (editId) {
      const { error: e, data } = await supabase.from('biometric_devices').update(payload).eq('id', editId).select('*').single();
      err = e;
      if (!e && data) setDevices((prev) => prev.map((d) => d.id === editId ? data as Device : d));
    }
    setSaving(false);
    if (err) { setError((err as { message?: string }).message ?? 'Save failed'); return; }
    setEditId(null);
  }

  async function toggleActive(device: Device) {
    const { data } = await supabase.from('biometric_devices').update({ is_active: !device.is_active }).eq('id', device.id).select('*').single();
    if (data) setDevices((prev) => prev.map((d) => d.id === device.id ? data as Device : d));
  }

  async function deleteDevice(id: string) {
    setDeletingId(id);
    await supabase.from('biometric_devices').delete().eq('id', id);
    setDevices((prev) => prev.filter((d) => d.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 text-gray-100 sm:p-6">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">Biometric Devices</h1>
            <p className="mt-1 text-sm text-gray-400">
              Register and manage all fingerprint terminals across your school.
              Supports Hikvision, ZKTeco F18, and more.
            </p>
          </div>
          <button onClick={openNew} className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            + Add Device
          </button>
        </div>

        {/* Hostgiver domain config */}
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <span className="text-xs font-medium text-gray-400 shrink-0">Your Hostgiver domain:</span>
          <input
            type="text"
            value={hostgiverDomain}
            onChange={(e) => setHostgiverDomain(e.target.value)}
            placeholder="yourdomain.com"
            className="flex-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
          />
          <span className="text-xs text-gray-600">Used to build webhook URLs below.</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500">Loading devices…</div>
        ) : devices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-800 py-16 text-center">
            <p className="text-2xl">👆</p>
            <p className="mt-2 font-medium text-gray-400">No biometric devices registered yet</p>
            <p className="mt-1 text-sm text-gray-600">Click "Add Device" to register your first terminal.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => {
              const mode   = PUSH_MODE[device.device_type];
              const syncOk = device.sync_status === 'ok';
              const syncTs = device.last_sync_at
                ? new Date(device.last_sync_at).toLocaleString('en-UG', { timeZone: 'Africa/Kampala', hour12: false })
                : null;

              return (
                <div key={device.id} className={`rounded-2xl border ${device.is_active ? 'border-gray-800' : 'border-gray-800/40 opacity-60'} bg-gray-900 p-5`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${DEVICE_COLORS[device.device_type]}`}>
                        {DEVICE_LABELS[device.device_type]}
                      </span>
                      <h3 className="font-semibold text-gray-100">{device.device_name}</h3>
                      {device.location && <span className="text-xs text-gray-500">📍 {device.location}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${device.is_active ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                      <span className="text-xs text-gray-500">{device.is_active ? 'Active' : 'Disabled'}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
                    {device.ip_address && <span>IP: <span className="font-mono text-gray-300">{device.ip_address}:{device.port}</span></span>}
                    {device.serial_number && <span>S/N: {device.serial_number}</span>}
                    <span>
                      Mode: <span className="text-gray-300">{mode === 'push' ? 'HTTP Push' : mode === 'poll' ? 'TCP Poll (cron)' : 'QR'}</span>
                    </span>
                    {syncTs && (
                      <span className={syncOk ? 'text-emerald-400' : 'text-red-400'}>
                        Last sync: {syncTs} {syncOk ? '✓' : '✗'}
                      </span>
                    )}
                  </div>

                  {/* Webhook URL */}
                  {mode === 'push' && (
                    <div className="mt-3 flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto rounded border border-gray-800 bg-gray-950 px-2 py-1.5 font-mono text-xs text-emerald-300">
                        {webhookUrl(device)}
                      </code>
                      <button onClick={() => copyUrl(device)} className="shrink-0 rounded border border-gray-700 px-2.5 py-1 text-xs text-gray-400 hover:text-emerald-300">
                        {copiedId === device.id ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}
                  {mode === 'poll' && (
                    <p className="mt-2 text-xs text-gray-500">
                      TCP polling via cron — configure IP above, then set up the cron job on Hostgiver.
                    </p>
                  )}

                  {device.sync_message && device.sync_status === 'error' && (
                    <p className="mt-2 text-xs text-red-400">⚠ {device.sync_message}</p>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex gap-2 border-t border-gray-800 pt-3">
                    <button onClick={() => openEdit(device)} className="rounded px-3 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-100">Edit</button>
                    <button onClick={() => toggleActive(device)} className="rounded px-3 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-100">
                      {device.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete "${device.device_name}"?`)) deleteDevice(device.id); }}
                      disabled={deletingId === device.id}
                      className="rounded px-3 py-1 text-xs text-red-400 hover:bg-red-900/30"
                    >
                      {deletingId === device.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h2 className="mb-5 text-lg font-semibold text-gray-100">
              {editId === 'new' ? 'Add Biometric Device' : 'Edit Device'}
            </h2>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-400">Device Name *</span>
                <input type="text" value={form.device_name} onChange={(e) => setForm((f) => ({ ...f, device_name: e.target.value }))}
                  placeholder="e.g. Main Gate Terminal"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-emerald-500 focus:outline-none" />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-400">Device Brand / Type *</span>
                <select value={form.device_type} onChange={(e) => setType(e.target.value as DeviceType)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-emerald-500 focus:outline-none">
                  {(Object.entries(DEVICE_LABELS) as [DeviceType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-400">IP Address</span>
                  <input type="text" value={form.ip_address} onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))}
                    placeholder="192.168.1.100"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-100 placeholder-gray-600 focus:border-emerald-500 focus:outline-none" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-400">Port</span>
                  <input type="number" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-100 focus:border-emerald-500 focus:outline-none" />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-400">Location / Campus</span>
                <input type="text" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Main Gate, Library, Staff Room"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-emerald-500 focus:outline-none" />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-400">Serial Number <span className="text-gray-600">(optional)</span></span>
                <input type="text" value={form.serial_number} onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
                  placeholder="Found on device label"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-100 placeholder-gray-600 focus:border-emerald-500 focus:outline-none" />
              </label>

              {/* Integration hint */}
              <div className="rounded-lg border border-gray-800 bg-gray-950 p-3 text-xs text-gray-500">
                {form.device_type === 'hikvision' && (
                  <p><strong className="text-gray-300">Hikvision:</strong> After saving, copy the webhook URL and paste it into the device web interface under <em>Network → Event Push → HTTP URL</em>.</p>
                )}
                {form.device_type === 'zkteco' && (
                  <p><strong className="text-gray-300">ZKTeco F18:</strong> After saving, copy the webhook URL and enter it in the device menu under <em>Cloud Server (ADMS)</em>. For TCP polling, also set up the cron job on Hostgiver.</p>
                )}
                {(form.device_type === 'essl' || form.device_type === 'suprema') && (
                  <p><strong className="text-gray-300">TCP Poll mode:</strong> Enter the device IP and port. The Hostgiver cron job will connect to the device every 5 minutes to pull logs.</p>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => { setEditId(null); setError(null); }} className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-gray-100">Cancel</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
                {saving ? 'Saving…' : editId === 'new' ? 'Add Device' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
