'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPwezaCoreApiOrigin, registerApiUrl } from '@/lib/registerApiOrigin';

const settingsBtnSecondary =
  'rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s3)] px-3 py-2 text-sm ac-text-primary hover:bg-[var(--pw-s2)] disabled:opacity-50';

const SETTINGS_API_PATH = '/api/integrations/schoolpay/settings';
const SYNC_API_PATH = '/api/integrations/schoolpay/sync';

/**
 * Parses JSON from PwezaCore Next routes. Errors refer to our server, not SchoolPay’s API,
 * so misconfigured hosts (404 HTML from Vercel, etc.) are understandable.
 */
async function parsePwezaCoreJson(r: Response, apiPath: string): Promise<unknown> {
  const text = await r.text();
  const trimmed = text.trim();
  const fullUrl = registerApiUrl(apiPath);
  const configHint =
    'Set VITE_API_URL or NEXT_PUBLIC_SITE_URL to the host that runs Next.js and serves /api (see .env.example). Local dev: run `npm run dev:next` (port 3001) so Vite proxies /api.';

  if (!trimmed) {
    throw new Error(`Empty response from PwezaCore (HTTP ${r.status}) for ${apiPath}. ${configHint}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const snippet = trimmed.replace(/\s+/g, ' ').slice(0, 180);
    const looksHtml = trimmed.startsWith('<') || /<!doctype/i.test(trimmed);
    if (r.status === 404) {
      throw new Error(
        `PwezaCore returned “not found” (HTTP 404) for ${apiPath} — tried ${fullUrl}. This is not a SchoolPay credential problem. ${configHint}`
      );
    }
    throw new Error(
      looksHtml
        ? `PwezaCore returned a web page instead of JSON (HTTP ${r.status}) for ${apiPath} (tried ${fullUrl}). ${configHint} Open DevTools → Network to inspect the response.`
        : `PwezaCore did not return JSON (HTTP ${r.status}) for ${apiPath}: ${snippet}${trimmed.length > 180 ? '…' : ''}`
    );
  }
}

type LedState = 'loading' | 'error' | 'warn' | 'ok';

function StatusLed({ state, label }: { state: LedState; label: string }) {
  const dot =
    state === 'loading'
      ? 'bg-slate-400'
      : state === 'error'
        ? 'bg-red-500'
        : state === 'warn'
          ? 'bg-amber-400'
          : 'bg-emerald-500';
  return (
    <span
      className="inline-flex max-w-[min(100%,22rem)] items-center gap-2 rounded-full border border-white/10 bg-black/20 px-2.5 py-1"
      title={label}
    >
      <span
        className={`relative inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${dot} ${state !== 'loading' ? 'animate-pulse' : 'opacity-70'}`}
        aria-hidden
      />
      <span className="text-[11px] leading-tight text-white/80">{label}</span>
    </span>
  );
}

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
  /** null = not tested this session; true/false from last "Test API" */
  const [schoolPayVerified, setSchoolPayVerified] = useState<boolean | null>(null);
  /** Whether GET settings returned valid JSON and HTTP ok */
  const [settingsApiReachable, setSettingsApiReachable] = useState(false);
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
      const r = await fetch(registerApiUrl(SETTINGS_API_PATH), {
        credentials: 'include',
        headers: await authHeaders(),
      });
      const j = (await parsePwezaCoreJson(r, SETTINGS_API_PATH)) as {
        error?: string;
        enabled?: boolean;
        schoolpaySchoolCode?: string;
        hasApiPassword?: boolean;
        webhookUrl?: string;
        lastSyncAt?: string | null;
        lastSyncError?: string | null;
      };
      if (!r.ok) throw new Error(j.error || 'Failed to load SchoolPay settings');
      setEnabled(!!j.enabled);
      setSchoolCode(j.schoolpaySchoolCode || '');
      setHasApiPassword(!!j.hasApiPassword);
      setWebhookUrl(j.webhookUrl || '');
      setLastSyncAt(j.lastSyncAt || null);
      setLastSyncError(j.lastSyncError || null);
      setSettingsApiReachable(true);
    } catch (e) {
      setSettingsApiReachable(false);
      setMsg(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void load();
  }, [load]);

  const credentialsReady = Boolean(
    schoolCode.trim() && (hasApiPassword || apiPassword.trim())
  );

  const led = useMemo((): { state: LedState; label: string } => {
    if (loading) {
      return { state: 'loading', label: 'Checking SchoolPay API…' };
    }
    if (!settingsApiReachable) {
      return { state: 'error', label: 'Cannot reach PwezaCore SchoolPay API' };
    }
    if (!enabled) {
      return { state: 'ok', label: 'PwezaCore API online — integration off' };
    }
    if (!credentialsReady) {
      return { state: 'error', label: 'Turn on integration: add school code and API password' };
    }
    if (schoolPayVerified === false) {
      return { state: 'error', label: 'SchoolPay test failed — check code/password' };
    }
    if (schoolPayVerified === true) {
      return { state: 'ok', label: 'SchoolPay connection verified' };
    }
    return { state: 'warn', label: 'Run Test API to verify SchoolPay credentials' };
  }, [loading, settingsApiReachable, enabled, credentialsReady, schoolPayVerified]);

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
      const r = await fetch(registerApiUrl(SETTINGS_API_PATH), {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
        body: JSON.stringify(body),
      });
      const j = (await parsePwezaCoreJson(r, SETTINGS_API_PATH)) as { error?: string; webhookUrl?: string; hasApiPassword?: boolean };
      if (!r.ok) throw new Error(j.error || 'Save failed');
      setWebhookUrl(j.webhookUrl || '');
      setHasApiPassword(!!j.hasApiPassword);
      setApiPassword('');
      setMsg('SchoolPay settings saved.');
      setSchoolPayVerified(null);
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
      const r = await fetch(registerApiUrl(SETTINGS_API_PATH), {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
        body: JSON.stringify({ testSyncDate: testDate }),
      });
      const j = (await parsePwezaCoreJson(r, SETTINGS_API_PATH)) as {
        error?: string;
        testResult?: { ok?: boolean; message?: string };
      };
      if (!r.ok) throw new Error(j.error || 'Test failed');
      const t = j.testResult;
      if (t?.ok) {
        setSchoolPayVerified(true);
        setMsg(`Connection OK: ${t.message || 'returnCode 0'}`);
      } else {
        setSchoolPayVerified(false);
        setMsg(`Connection check failed: ${t?.message || 'unknown'}`);
      }
    } catch (e) {
      setSchoolPayVerified(false);
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
      const r = await fetch(registerApiUrl(SYNC_API_PATH), {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
        body: JSON.stringify({}),
      });
      const j = (await parsePwezaCoreJson(r, SYNC_API_PATH)) as {
        error?: string;
        regularPosted?: number;
        regularDup?: number;
        regularFailed?: number;
        suppPosted?: number;
        suppDup?: number;
      };
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
      const r = await fetch(registerApiUrl(SETTINGS_API_PATH), {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
        body: JSON.stringify({ regenerateWebhookToken: true }),
      });
      const j = (await parsePwezaCoreJson(r, SETTINGS_API_PATH)) as { error?: string; webhookUrl?: string };
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
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h3 className="font-medium" style={{ color: 'var(--pw-teal, #10d9a8)' }}>
          SchoolPay (fees collection)
        </h3>
        <StatusLed state={led.state} label={led.label} />
      </div>
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
        stored passwords. The UI calls PwezaCore Next routes at{' '}
        <code className="ac-text-secondary">/api/integrations/schoolpay/*</code>. If the SPA is not served by Next, set{' '}
        <code className="ac-text-secondary">VITE_API_URL</code> or <code className="ac-text-secondary">NEXT_PUBLIC_SITE_URL</code>{' '}
        to that deployment. Local: run <code className="ac-text-secondary">npm run dev:next</code> on 3001 (Vite proxies{' '}
        <code className="ac-text-secondary">/api</code>). Resolved API host:{' '}
        <code className="ac-text-secondary">{getPwezaCoreApiOrigin() || '(same-origin / relative — dev proxy or Next page)'}</code>.
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
