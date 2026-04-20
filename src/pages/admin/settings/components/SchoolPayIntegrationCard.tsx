'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';

const settingsBtnSecondary =
  'rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s3)] px-3 py-2 text-sm ac-text-primary hover:bg-[var(--pw-s2)] disabled:opacity-50';

type Props = { schoolId: string | null };

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    h.Authorization = `Bearer ${session.access_token}`;
  }
  return h;
}

export default function SchoolPayIntegrationCard({ schoolId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  const [apiPassword, setApiPassword] = useState('');
  const [hasApiPassword, setHasApiPassword] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [testDate, setTestDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch(registerApiUrl('/api/integrations/schoolpay/settings'), {
        credentials: 'include',
        headers: await authHeaders(),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to load SchoolPay settings');
      setEnabled(!!j.enabled);
      setSchoolCode(j.schoolpaySchoolCode || '');
      setHasApiPassword(!!j.hasApiPassword);
      setWebhookUrl(j.webhookUrl || '');
      setLastSyncAt(j.lastSyncAt || null);
      setLastSyncError(j.lastSyncError || null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!schoolId) return;
    setSaving(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        enabled,
        schoolpaySchoolCode: schoolCode.trim(),
      };
      if (apiPassword.trim()) body.apiPassword = apiPassword.trim();
      const r = await fetch(registerApiUrl('/api/integrations/schoolpay/settings'), {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Save failed');
      setWebhookUrl(j.webhookUrl || '');
      setHasApiPassword(!!j.hasApiPassword);
      setApiPassword('');
      setMsg('SchoolPay settings saved.');
      setTimeout(() => setMsg(null), 4000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!schoolId) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(registerApiUrl('/api/integrations/schoolpay/settings'), {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
        body: JSON.stringify({ testSyncDate: testDate }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Test failed');
      const t = j.testResult as { ok?: boolean; message?: string } | undefined;
      if (t?.ok) setMsg(`Connection OK: ${t.message || 'returnCode 0'}`);
      else setMsg(`Connection check failed: ${t?.message || 'unknown'}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setSaving(false);
    }
  };

  const syncNow = async () => {
    if (!schoolId) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(registerApiUrl('/api/integrations/schoolpay/sync'), {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
        body: JSON.stringify({}),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Sync failed');
      setMsg(
        `Sync: regular posted ${j.regularPosted ?? 0}, dup ${j.regularDup ?? 0}, failed ${j.regularFailed ?? 0}; other fees posted ${j.suppPosted ?? 0}, dup ${j.suppDup ?? 0}.`
      );
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSaving(false);
    }
  };

  const regenerateWebhook = async () => {
    if (!confirm('Regenerate webhook URL? You must update the URL in the SchoolPay portal.')) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(registerApiUrl('/api/integrations/schoolpay/settings'), {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
        body: JSON.stringify({ regenerateWebhookToken: true }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to rotate URL');
      setWebhookUrl(j.webhookUrl || '');
      setMsg('New webhook URL generated. Copy it below and update SchoolPay.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to rotate URL');
    } finally {
      setSaving(false);
    }
  };

  const copyWebhook = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setMsg('Webhook URL copied.');
      setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg('Could not copy — select and copy manually.');
    }
  };

  if (!schoolId) return null;
  if (loading) {
    return (
      <div className="mb-6 rounded-lg border border-[var(--pw-teal,#10d9a8)]/30 bg-[var(--pw-s3)]/80 p-4 text-sm ac-text-secondary">
        Loading SchoolPay…
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-[var(--pw-teal,#10d9a8)]/35 bg-[var(--pw-s2)] p-4 sm:p-5">
      <h3 className="mb-2 font-medium" style={{ color: 'var(--pw-teal, #10d9a8)' }}>
        SchoolPay (fees collection)
      </h3>
      <p className="mb-4 text-sm ac-text-secondary">
        Connect your SchoolPay school code and transactions API password. Paste the webhook URL into the SchoolPay
        portal. Student payments are matched by{' '}
        <strong className="ac-text-primary">SchoolPay payment code</strong> on each student (or admission number if
        codes align). See{' '}
        <a
          className="underline"
          style={{ color: 'var(--pw-teal, #10d9a8)' }}
          href="https://www.schoolpay.co.ug/apidocumentation"
          target="_blank"
          rel="noreferrer"
        >
          SchoolPay API docs
        </a>
        .
      </p>

      {msg && (
        <div className="mb-3 rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s3)] p-2 text-sm ac-text-primary">
          {msg}
        </div>
      )}

      <label className="mb-3 flex items-center gap-2 text-sm ac-text-primary">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="rounded" />
        Enable SchoolPay integration
      </label>

      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs ac-text-secondary">School code (numeric)</label>
          <input
            value={schoolCode}
            onChange={(e) => setSchoolCode(e.target.value)}
            className="ac-input min-h-[44px] w-full text-sm"
            placeholder="From SchoolPay"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs ac-text-secondary">
            Transactions API password {hasApiPassword ? '(leave blank to keep current)' : ''}
          </label>
          <input
            type="password"
            value={apiPassword}
            onChange={(e) => setApiPassword(e.target.value)}
            className="ac-input min-h-[44px] w-full text-sm"
            placeholder="Never shown again after save"
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs ac-text-secondary">Webhook URL (register in SchoolPay)</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={webhookUrl}
            className="ac-input min-h-[44px] min-w-[200px] flex-1 font-mono text-xs"
          />
          <button type="button" onClick={() => void copyWebhook()} className={settingsBtnSecondary}>
            Copy
          </button>
          <button
            type="button"
            onClick={() => void regenerateWebhook()}
            disabled={saving}
            className="rounded-lg border border-amber-500/40 bg-amber-600/20 px-3 py-2 text-sm text-amber-100 hover:bg-amber-600/30 disabled:opacity-50"
          >
            New URL
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs ac-text-secondary">Test sync date (YYYY-MM-DD)</label>
          <input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="ac-input min-h-[44px] text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? 'Working…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => void testConnection()}
          disabled={saving}
          className={settingsBtnSecondary}
        >
          Test API
        </button>
        <button
          type="button"
          onClick={() => void syncNow()}
          disabled={saving || !enabled}
          className="rounded-lg bg-cyan-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          Sync yesterday
        </button>
      </div>

      <p className="text-xs ac-text-muted">
        Server env <code className="ac-text-secondary">SCHOOLPAY_CREDENTIALS_SECRET</code> (min 16 chars) encrypts
        stored passwords. Ensure <code className="ac-text-secondary">VITE_API_ORIGIN</code> or same-origin points to
        the deployment that serves <code className="ac-text-secondary">/api/integrations/schoolpay/*</code>.
      </p>
      {(lastSyncAt || lastSyncError) && (
        <p className="mt-2 text-xs ac-text-muted">
          Last sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : '—'}
          {lastSyncError ? ` — Error: ${lastSyncError}` : ''}
        </p>
      )}
    </div>
  );
}
