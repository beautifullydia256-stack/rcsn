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
  biometric_notify_arrival: boolean;
  biometric_notify_departure: boolean;
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

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    const run = async () => {
      const { data, error: e } = await supabase
        .from('schools')
        .select('biometric_teacher_punch,biometric_student_attendance,biometric_late_cutoff_teacher,biometric_late_cutoff_student,biometric_webhook_token,biometric_notify_arrival,biometric_notify_departure')
        .eq('school_id', schoolId)
        .single();
      if (e) setError(e.message);
      else setSettings(data as BiometricSettings);
      setLoading(false);
    };
    void run();
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
        biometric_notify_arrival: settings.biometric_notify_arrival,
        biometric_notify_departure: settings.biometric_notify_departure,
      })
      .eq('school_id', schoolId);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function toggle(field: 'biometric_teacher_punch' | 'biometric_student_attendance' | 'biometric_notify_arrival' | 'biometric_notify_departure') {
    if (!settings) return;
    setSettings({ ...settings, [field]: !settings[field] });
  }

  if (loading) return <div className="py-8 text-center text-sm text-gray-500">Loading…</div>;
  if (!settings) return null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Biometric Attendance"
        desc="Configure fingerprint terminal integration for attendance. Supports Hikvision DS-K1A802F and ZKTeco F18. Students and teachers scan their fingerprint — attendance is recorded automatically."
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

      {/* WhatsApp parent notifications */}
      <div className={`${settingsInsetSurface} space-y-4 p-4 sm:p-5`}>
        <div>
          <h3 className="text-sm font-semibold ac-text-primary">Parent WhatsApp Notifications</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            When enabled, parents receive an automatic WhatsApp message each time their child scans.
            Requires WhatsApp (WaSender) to be configured and the notification queue to be running.
          </p>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium ac-text-primary">Notify on student arrival</p>
            <p className="text-xs text-gray-500">Sends a WhatsApp to parents when their child scans in at school.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.biometric_notify_arrival}
            onChange={() => toggle('biometric_notify_arrival')}
            className="h-5 w-5 rounded accent-emerald-500"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium ac-text-primary">Notify on student departure</p>
            <p className="text-xs text-gray-500">Sends a WhatsApp to parents when their child scans out to go home.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.biometric_notify_departure}
            onChange={() => toggle('biometric_notify_departure')}
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

      {/* Devices link */}
      <div className={`${settingsInsetSurface} space-y-2 p-4 sm:p-5`}>
        <h3 className="text-sm font-semibold ac-text-primary">Device Webhook URLs</h3>
        <p className="text-xs text-gray-500">
          Each registered terminal has its own unique webhook URL. Go to{' '}
          <a href="/dashboard/admin/biometric-devices" className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
            Biometric Devices
          </a>{' '}
          to register devices and copy their URLs.
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
