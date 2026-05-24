import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import SectionHeader from './SectionHeader';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';

type BiometricSettings = {
  biometric_teacher_punch: boolean;
  biometric_student_attendance: boolean;
  biometric_late_cutoff_teacher: string;
  biometric_late_cutoff_student: string;
  biometric_webhook_token: string | null;
};

export default function SettingsBiometric({
  schoolId,
  embedded,
}: {
  schoolId: string | null;
  embedded?: boolean;
}) {
  const [settings, setSettings] = useState<BiometricSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    supabase
      .from('schools')
      .select('biometric_teacher_punch,biometric_student_attendance,biometric_late_cutoff_teacher,biometric_late_cutoff_student,biometric_webhook_token')
      .eq('school_id', schoolId)
      .single()
      .then(({ data, error: e }) => {
        if (e) { setError(e.message); return; }
        setSettings(data as BiometricSettings);
      })
      .finally(() => setLoading(false));
  }, [schoolId]);

  async function save() {
    if (!schoolId || !settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: e } = await supabase
      .from('schools')
      .update({
        biometric_teacher_punch: settings.biometric_teacher_punch,
        biometric_student_attendance: settings.biometric_student_attendance,
        biometric_late_cutoff_teacher: settings.biometric_late_cutoff_teacher,
        biometric_late_cutoff_student: settings.biometric_late_cutoff_student,
      })
      .eq('school_id', schoolId);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function webhookUrl() {
    if (!schoolId || !settings?.biometric_webhook_token) return null;
    return `https://yourdomain.com/hikvision/punch.php?s=${schoolId}&t=${settings.biometric_webhook_token}`;
  }

  function copyUrl() {
    const url = webhookUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function toggle(field: 'biometric_teacher_punch' | 'biometric_student_attendance') {
    if (!settings) return;
    setSettings({ ...settings, [field]: !settings[field] });
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-500">Loading…</div>;
  if (!settings) return null;

  const url = webhookUrl();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Biometric Attendance"
        desc="Configure the Hikvision DS-K1A802F fingerprint terminal integration. Students and teachers scan their fingerprint — attendance is recorded automatically."
        embedded={embedded}
      />

      {error && (
        <div className="rounded-lg border border-red-400/40 bg-red-950/50 p-3 text-sm text-red-200">{error}</div>
      )}

      {/* Toggles */}
      <div className={`${settingsInsetSurface} space-y-4 p-4 sm:p-5`}>
        <h3 className="text-sm font-semibold ac-text-primary">Enable Features</h3>

        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium ac-text-primary">Student attendance via fingerprint</p>
            <p className="text-xs text-gray-500">When a student scans, mark them present for the day.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.biometric_student_attendance}
            onChange={() => toggle('biometric_student_attendance')}
            className="h-5 w-5 rounded accent-emerald-500"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium ac-text-primary">Teacher punch-in / punch-out via fingerprint</p>
            <p className="text-xs text-gray-500">First scan = punch in, second scan = punch out. Uses same late-arrival logic as manual punch.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.biometric_teacher_punch}
            onChange={() => toggle('biometric_teacher_punch')}
            className="h-5 w-5 rounded accent-emerald-500"
          />
        </label>
      </div>

      {/* Late cutoff times */}
      <div className={`${settingsInsetSurface} space-y-4 p-4 sm:p-5`}>
        <h3 className="text-sm font-semibold ac-text-primary">Late Arrival Cutoff Times</h3>
        <p className="text-xs text-gray-500">Scans after these times are marked as "late".</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-400">Students</span>
            <input
              type="time"
              value={settings.biometric_late_cutoff_student.slice(0, 5)}
              onChange={(e) => setSettings({ ...settings, biometric_late_cutoff_student: e.target.value + ':00' })}
              className="ac-input w-full min-h-[44px]"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-400">Teachers</span>
            <input
              type="time"
              value={settings.biometric_late_cutoff_teacher.slice(0, 5)}
              onChange={(e) => setSettings({ ...settings, biometric_late_cutoff_teacher: e.target.value + ':00' })}
              className="ac-input w-full min-h-[44px]"
            />
          </label>
        </div>
      </div>

      {/* Webhook URL */}
      <div className={`${settingsInsetSurface} space-y-3 p-4 sm:p-5`}>
        <h3 className="text-sm font-semibold ac-text-primary">Device Webhook URL</h3>
        <p className="text-xs text-gray-500">
          Configure this URL on the Hikvision terminal under <strong>Network → Event Push</strong>. The device will POST to this URL every time a fingerprint is scanned.
        </p>
        {url ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 font-mono text-xs text-emerald-300">
              {url.replace('yourdomain.com', 'YOUR-HOSTGIVER-DOMAIN.COM')}
            </code>
            <button
              onClick={copyUrl}
              className="shrink-0 rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-400 hover:border-emerald-600 hover:text-emerald-300 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ) : (
          <p className="text-xs text-yellow-400">Token not yet generated — save settings to generate one.</p>
        )}
        <p className="text-xs text-gray-600">
          Replace <span className="font-mono text-gray-400">YOUR-HOSTGIVER-DOMAIN.COM</span> with your actual Hostgiver domain before pasting into the device.
        </p>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className={settingsPrimaryActionClass}>
          {saving ? 'Saving…' : 'Save Biometric Settings'}
        </button>
        {saved && <span className="text-sm text-emerald-400">Saved.</span>}
      </div>
    </div>
  );
}
