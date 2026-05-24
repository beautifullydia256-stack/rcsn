import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isValidEmailFormat } from '@/lib/emailValidator';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { useToast } from '@/components/Toast';
import { ArrowLeft, KeyRound, Mail, Send, ShieldCheck } from 'lucide-react';
import { registerApiUrl } from '@/lib/registerApiOrigin';

export default function CreateParentLoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { parent_id: parentIdParam } = useParams<{ parent_id: string }>();
  const parentId = Array.isArray(parentIdParam) ? parentIdParam[0] : parentIdParam || '';

  const [guardianName, setGuardianName] = useState('');
  const [email, setEmail] = useState('');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [hasPortalAccount, setHasPortalAccount] = useState(false);
  const [crossRoleRole, setCrossRoleRole] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: portalRow } = await supabase
        .from('users')
        .select('user_id, email, name')
        .eq('user_id', parentId)
        .eq('role', 'parent')
        .maybeSingle();

      if (portalRow) {
        setHasPortalAccount(true);
        setGuardianName(portalRow.name ? String(portalRow.name) : '');
        setEmail(portalRow.email ? String(portalRow.email) : '');
        const { data: prow } = await supabase
          .from('parents')
          .select('school_id')
          .eq('parent_id', parentId)
          .limit(1)
          .maybeSingle();
        setSchoolId((prow?.school_id as string) || null);
        return;
      }

      const { data: rows } = await supabase
        .from('parents')
        .select('name, email, school_id, is_primary_contact')
        .eq('parent_id', parentId);
      const list = rows ?? [];
      const primary =
        list.find((r: { is_primary_contact?: boolean }) => r.is_primary_contact === true) || list[0];
      const rosterEmail = primary?.email ? String(primary.email) : '';
      setGuardianName(primary?.name ? String(primary.name) : '');
      setEmail(rosterEmail);
      setSchoolId((primary?.school_id as string) || null);
      setHasPortalAccount(false);
      if (rosterEmail) {
        const { data: existing } = await supabase
          .from('users')
          .select('user_id, role')
          .ilike('email', rosterEmail)
          .maybeSingle();
        if (existing?.role && existing.role !== 'parent') {
          setCrossRoleRole(String(existing.role));
        }
      }
    };
    if (parentId) void load();
  }, [parentId]);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!parentId || !schoolId) {
      setError('Missing guardian or school context');
      return;
    }
    const addr = email.trim();
    if (!isValidEmailFormat(addr)) {
      setError('Enter a valid email address.');
      return;
    }
    setSaving(true);
    try {
      try {
        await supabase.from('parents').update({ email: addr }).eq('parent_id', parentId).eq('school_id', schoolId);
      } catch {
        /* non-fatal */
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        const msg = 'Your session expired. Please sign in again.';
        setError(msg);
        toast.error(msg);
        return;
      }
      const url = registerApiUrl('/api/admin/create-user-account');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          sendEmailInvite: true,
          email: addr,
          parentId,
        }),
      });
      const raw = await response.text();
      let data: { error?: string; message?: string; userId?: string } = {};
      try {
        data = JSON.parse(raw) as { error?: string; message?: string; userId?: string };
      } catch {
        /* Vercel/runtime may return non-JSON on hard failures */
      }
      if (!response.ok) {
        const msg =
          data.error ||
          (raw.trim() && raw.length < 800 ? raw.trim() : '') ||
          `Request failed (${response.status})`;
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success(data.message || 'Invitation sent.');
      const nextId = data.userId || parentId;
      setTimeout(() => navigate(`/dashboard/admin/parents/${nextId}`), 1200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const sendResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const addr = email.trim();
    if (!isValidEmailFormat(addr)) {
      setError('Enter a valid email address so we know where to send the new password.');
      return;
    }
    setSaving(true);
    try {
      try {
        if (schoolId) {
          await supabase.from('parents').update({ email: addr }).eq('parent_id', parentId).eq('school_id', schoolId);
        }
      } catch {
        /* non-fatal */
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        const msg = 'Your session expired. Please sign in again.';
        setError(msg);
        toast.error(msg);
        return;
      }
      const url = registerApiUrl('/api/admin/create-user-account');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          resendPortalCredentials: true,
          userId: parentId,
          email: addr,
        }),
      });
      const raw = await response.text();
      let data: { error?: string; message?: string } = {};
      try {
        data = JSON.parse(raw) as { error?: string; message?: string };
      } catch {
        /* ignore */
      }
      if (!response.ok) {
        const msg =
          data.error ||
          (raw.trim() && raw.length < 800 ? raw.trim() : '') ||
          `Request failed (${response.status})`;
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success(data.message || 'Email sent with a new one-time password.');
      setTimeout(() => navigate(`/dashboard/admin/parents/${parentId}`), 1200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPageWrapper>
      <div className="invite-flow mx-auto w-full max-w-xl px-3 pb-8 pt-1 font-['Instrument_Sans',system-ui,sans-serif] sm:px-4 sm:pt-2">
        <button
          type="button"
          onClick={() => navigate(`/dashboard/admin/parents/${parentId}`)}
          className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--ac-border)] bg-white/40 px-4 py-2 text-sm font-medium text-[var(--ac-text-secondary)] shadow-sm backdrop-blur-sm transition hover:bg-white/60 hover:text-[var(--ac-text-primary)] dark:bg-white/5 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          Back to profile
        </button>

        <header className="mb-8 text-center sm:mb-10 sm:text-left">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25 sm:mx-0">
            <Mail className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </div>
          <h1 className="font-['Cabinet_Grotesk',system-ui,sans-serif] text-2xl font-bold leading-tight tracking-tight text-[var(--ac-text-primary)] sm:text-3xl sm:tracking-tight">
            {hasPortalAccount ? 'Resend portal sign-in email' : crossRoleRole ? 'Add parent access' : 'Invite to parent portal'}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-pretty text-[15px] leading-relaxed text-[var(--ac-text-secondary)] sm:mx-0 sm:text-base">
            {hasPortalAccount ? (
              <>
                This guardian already has an account (for example from Add parent with email). If they never received
                credentials or forgot the password, send a <strong>new one-time password</strong> by email. Their old
                password will <strong>stop working</strong> after you send this. You can correct their email below before
                sending.
              </>
            ) : crossRoleRole ? (
              <>
                This person already has a <strong className="capitalize">{crossRoleRole}</strong> account in PwezaCore.{' '}
                No new invitation or password needed — clicking the button below will simply add parent access to their
                existing login. They continue using the same email and password.
              </>
            ) : (
              <>
                Send the same secure welcome email your staff get: one-time password, prefilled sign-in link, then they
                choose their own password. We&apos;ll save this address on their guardian record.
              </>
            )}
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm leading-snug text-red-100 dark:text-red-200/95"
          >
            {error}
          </div>
        )}

        <div className="ac-glass-card overflow-hidden rounded-2xl p-5 shadow-[var(--ac-shadow-strong)] sm:p-8">
          <div className="mb-6 rounded-xl border border-[var(--ac-border)] bg-[var(--ac-sidebar-active-bg)] px-4 py-3 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ac-text-muted)]">
              {hasPortalAccount ? 'Account holder' : 'Inviting'}
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-[var(--ac-text-primary)]">
              {guardianName || 'Guardian'}
            </p>
          </div>

          {!crossRoleRole && <ol className="mb-8 space-y-4 text-sm text-[var(--ac-text-secondary)]">
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <Mail className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="font-medium text-[var(--ac-text-primary)]">Email arrives in their inbox</p>
                <p className="mt-0.5 text-[13px] leading-snug">Professional template with sign-in link (email prefilled).</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <KeyRound className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="font-medium text-[var(--ac-text-primary)]">They use the one-time password once</p>
                <p className="mt-0.5 text-[13px] leading-snug">Then they create a new password they'll keep.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <ShieldCheck className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="font-medium text-[var(--ac-text-primary)]">Parent portal access</p>
                <p className="mt-0.5 text-[13px] leading-snug">
                  {hasPortalAccount
                    ? 'No need to create another account — this only refreshes how they sign in.'
                    : 'They can sign in to see linked children and school updates.'}
                </p>
              </div>
            </li>
          </ol>}

          <form
            className="space-y-5"
            autoComplete="off"
            onSubmit={(e) => void (hasPortalAccount ? sendResend(e) : sendInvite(e))}
          >
            <div>
              <label htmlFor="parent_email" className="mb-2 block text-sm font-semibold text-[var(--ac-text-primary)]">
                Email address
              </label>
              <input
                id="parent_email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className="ac-input min-h-12 w-full rounded-xl border-[var(--ac-border)] px-4 py-3 text-base outline-none transition focus:ring-2 focus:ring-violet-500/40 sm:text-[15px]"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                name="parent_email"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-lpignore="true"
                readOnly={Boolean(crossRoleRole)}
              />
              <p className="mt-2 text-xs leading-relaxed text-[var(--ac-text-muted)]">
                {crossRoleRole
                  ? 'This is their existing account email — no changes needed.'
                  : 'Must be reachable — they need this inbox to receive credentials.'}
              </p>
            </div>

            <button
              type="submit"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-base font-semibold text-white shadow-md shadow-violet-600/20 transition hover:from-violet-500 hover:to-indigo-500 disabled:pointer-events-none disabled:opacity-50 sm:min-h-[3.25rem]"
              disabled={saving}
            >
              <Send className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-95" aria-hidden />
              {saving
                ? crossRoleRole ? 'Adding access...' : hasPortalAccount ? 'Sending...' : 'Sending invitation...'
                : crossRoleRole ? 'Add Parent Access to Existing Account'
                : hasPortalAccount
                  ? 'Email new one-time password'
                  : 'Send invitation email'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-[var(--ac-text-muted)] sm:text-left">
          Inviting several people? Use{' '}
          <span className="font-medium text-[var(--ac-text-secondary)]">User Management → Send invitations</span> for bulk
          roster invites.
        </p>
      </div>
    </AdminPageWrapper>
  );
}
