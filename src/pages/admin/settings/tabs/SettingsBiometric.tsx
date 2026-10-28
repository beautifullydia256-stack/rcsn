import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Fingerprint, Save, CheckCircle2 } from 'lucide-react';
import { GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

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

  if (loading) {
    return (
      <div className="gov-card p-12 flex items-center justify-center border border-[#CCCCCC]">
        <GovRollingBox size="lg" />
      </div>
    );
  }
  if (!settings) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-[#CCCCCC] pb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-bold tracking-tight text-[#111111] uppercase font-sans">
            BIOMETRIC TERMINAL INTEGRATION
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
            HARDWARE
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded border border-[#EF4444] bg-[#FEF2F2] text-xs font-mono font-bold text-[#B91C1C]">
          {error}
        </div>
      )}

      {/* Feature toggles */}
      <div className="gov-card rounded-lg border border-[#CCCCCC] bg-white p-4 space-y-3">
        <div className="text-[12px] font-mono font-bold uppercase text-[#111111]">
          AUTHENTICATION PROTOCOLS
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 p-2 rounded border border-[#E5E5E5] hover:bg-[#F9FAFB]">
          <div>
            <p className="text-xs font-mono font-bold text-[#111111] uppercase">TRAINEE ATTENDANCE BIOMETRICS</p>
            <p className="text-[11px] font-mono text-[#666666]">Terminal scan marks trainee present for scheduled clinical/lecture block.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.biometric_student_attendance}
            onChange={() => toggle('biometric_student_attendance')}
            className="h-4 w-4 rounded accent-[#111111]"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-4 p-2 rounded border border-[#E5E5E5] hover:bg-[#F9FAFB]">
          <div>
            <p className="text-xs font-mono font-bold text-[#111111] uppercase">FACULTY CLOCK-IN / OUT VIA FINGERPRINT</p>
            <p className="text-[11px] font-mono text-[#666666]">Primary scan registers check-in, subsequent scan registers sign-out.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.biometric_teacher_punch}
            onChange={() => toggle('biometric_teacher_punch')}
            className="h-4 w-4 rounded accent-[#111111]"
          />
        </label>
      </div>

      {/* WhatsApp notifications */}
      <div className="gov-card rounded-lg border border-[#CCCCCC] bg-white p-4 space-y-3">
        <div className="text-[12px] font-mono font-bold uppercase text-[#111111]">
          GUARDIAN AUTOMATED DISPATCH
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 p-2 rounded border border-[#E5E5E5] hover:bg-[#F9FAFB]">
          <div>
            <p className="text-xs font-mono font-bold text-[#111111] uppercase">DISPATCH ON ARRIVAL CONFIRMATION</p>
            <p className="text-[11px] font-mono text-[#666666]">Sends instantaneous timestamp notification to registered parent contact on entry.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.biometric_notify_arrival}
            onChange={() => toggle('biometric_notify_arrival')}
            className="h-4 w-4 rounded accent-[#111111]"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-4 p-2 rounded border border-[#E5E5E5] hover:bg-[#F9FAFB]">
          <div>
            <p className="text-xs font-mono font-bold text-[#111111] uppercase">DISPATCH ON DEPARTURE CONFIRMATION</p>
            <p className="text-[11px] font-mono text-[#666666]">Sends timestamp verification when trainee exits campus perimeter.</p>
          </div>
          <input
            type="checkbox"
            checked={settings.biometric_notify_departure}
            onChange={() => toggle('biometric_notify_departure')}
            className="h-4 w-4 rounded accent-[#111111]"
          />
        </label>
      </div>

      {/* Late cutoff times */}
      <div className="gov-card rounded-lg border border-[#CCCCCC] bg-white p-4 space-y-3">
        <div className="text-[12px] font-mono font-bold uppercase text-[#111111]">
          TARDINESS THRESHOLDS
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-mono font-bold uppercase text-[#555555]">
              TRAINEE LATE ARRIVAL CUTOFF
            </label>
            <input
              type="time"
              value={settings.biometric_late_cutoff_student.slice(0, 5)}
              onChange={(e) => setSettings({ ...settings, biometric_late_cutoff_student: e.target.value + ':00' })}
              className="gov-input w-full text-xs font-mono"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-mono font-bold uppercase text-[#555555]">
              FACULTY LATE ARRIVAL CUTOFF
            </label>
            <input
              type="time"
              value={settings.biometric_late_cutoff_teacher.slice(0, 5)}
              onChange={(e) => setSettings({ ...settings, biometric_late_cutoff_teacher: e.target.value + ':00' })}
              className="gov-input w-full text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Registered devices note */}
      <div className="gov-card rounded-lg border border-[#CCCCCC] bg-white p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-mono font-bold uppercase text-[#111111]">
            REGISTERED HARDWARE TERMINALS
          </div>
          <div className="text-[11px] font-mono text-[#666666] mt-0.5">
            Configure terminal webhooks, device IP sockets, and encryption tokens.
          </div>
        </div>
        <a
          href="/dashboard/admin/biometric-devices"
          className="gov-btn gov-btn-sm"
        >
          MANAGE TERMINALS
        </a>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="gov-btn gov-btn-sm gov-btn-primary"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          {saving ? 'COMMITTING…' : 'SAVE BIOMETRIC CONFIGURATION'}
        </button>
        {saved && (
          <span className="text-xs font-mono font-bold text-[#15803D] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            SYNCHRONIZED
          </span>
        )}
      </div>
    </div>
  );
}
