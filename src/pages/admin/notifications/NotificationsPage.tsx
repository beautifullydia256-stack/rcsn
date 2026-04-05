import { useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  Inbox,
  Mail,
  Megaphone,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import './notificationsCenter.css';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

const STALE_TIME_MS = 5 * 60 * 1000;

const INBOX_QUERY_KEY = (userId: string) => ['admin', 'notifications', 'inbox', userId] as const;

export async function fetchNotificationsPage(userId: string): Promise<{ schoolId: string; classes: string[] }> {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!data?.school_id) return { schoolId: '', classes: [] };
  const { data: classData } = await supabase
    .from('students')
    .select('current_class')
    .eq('school_id', data.school_id)
    .eq('status', 'active');
  const unique = classData
    ? [...new Set(classData.map((s: { current_class?: string }) => s.current_class).filter((c): c is string => Boolean(c)))].sort()
    : [];
  return { schoolId: data.school_id, classes: unique };
}

export type InAppNotificationRow = {
  id: string;
  title: string;
  body: string | null;
  category: string | null;
  read_at: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export async function fetchInAppNotificationsInbox(userId: string): Promise<InAppNotificationRow[]> {
  const { data, error } = await supabase
    .from('user_in_app_notifications')
    .select('id, title, body, category, read_at, created_at, metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []) as InAppNotificationRow[];
}

type TabId = 'inbox' | 'tools';
type InboxFilter = 'all' | 'unread' | 'read';

function formatTimeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (Number.isNaN(diff)) return '';
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function categoryAccent(category: string | null): { Icon: typeof Bell; gradient: string } {
  const c = (category || '').toLowerCase();
  if (c.includes('student')) return { Icon: UserPlus, gradient: 'linear-gradient(135deg,#10d9a8,#3d7eff)' };
  if (c.includes('financ') || c.includes('fee') || c.includes('pay')) return { Icon: Sparkles, gradient: 'linear-gradient(135deg,#ffb547,#ff4f6a)' };
  if (c.includes('exam') || c.includes('grade')) return { Icon: Check, gradient: 'linear-gradient(135deg,#9d7eff,#3d7eff)' };
  if (c.includes('message')) return { Icon: MessageCircle, gradient: 'linear-gradient(135deg,#27e09f,#3d7eff)' };
  return { Icon: Bell, gradient: 'linear-gradient(135deg,#3d7eff,#9d7eff)' };
}

function NotifListRow({
  n,
  unread,
  onMarkRead,
}: {
  n: InAppNotificationRow;
  unread: boolean;
  onMarkRead?: () => void;
}) {
  const { Icon, gradient } = categoryAccent(n.category);
  const body = (n.body || '').trim();

  return (
    <li
      className={[
        'rounded-2xl border border-[var(--nc-border)] transition-shadow hover:shadow-lg hover:shadow-black/20',
        unread ? 'pw-notif-row-unread' : 'pw-notif-row-read',
      ].join(' ')}
    >
      {unread ? (
        <button
          type="button"
          onClick={onMarkRead}
          className="flex w-full gap-3 sm:gap-4 p-4 sm:p-5 text-left min-h-[4.5rem] touch-manipulation"
        >
          <div className="pw-notif-avatar text-white shadow-inner" style={{ background: gradient }}>
            <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="font-semibold text-[15px] sm:text-base ac-text-primary leading-snug pr-2">{n.title}</span>
              <span className="text-[11px] sm:text-xs tabular-nums ac-text-muted shrink-0">{formatTimeAgo(n.created_at)}</span>
            </div>
            {body ? <p className="text-sm leading-relaxed ac-text-secondary line-clamp-3">{body}</p> : null}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {n.category ? (
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#10d9a8]/90 ring-1 ring-white/10">
                  {n.category}
                </span>
              ) : null}
              <span className="text-[11px] font-medium text-[#10d9a8] sm:hidden">Tap to mark read</span>
            </div>
          </div>
          <span
            className="hidden sm:inline-flex mt-1 h-2 w-2 shrink-0 rounded-full bg-[#10d9a8] shadow-[0_0_10px_rgba(16,217,168,0.7)]"
            aria-hidden
          />
        </button>
      ) : (
        <>{divReadRow(n, Icon, gradient, body)}</>
      )}
    </li>
  );
}

function divReadRow(
  n: InAppNotificationRow,
  Icon: typeof Bell,
  gradient: string,
  body: string
) {
  return (
    <div className="flex gap-3 sm:gap-4 p-4 sm:p-5">
      <div className="pw-notif-avatar text-white opacity-80" style={{ background: gradient }}>
        <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="font-medium text-[15px] sm:text-base ac-text-primary leading-snug">{n.title}</span>
          <span className="text-[11px] sm:text-xs tabular-nums ac-text-muted shrink-0 text-right">
            {formatTimeAgo(n.created_at)}
          </span>
        </div>
        {body ? <p className="text-sm leading-relaxed ac-text-secondary/90 line-clamp-3">{body}</p> : null}
      </div>
    </div>
  );
}

function InboxSkeleton() {
  return (
    <div className="space-y-3 animate-pulse px-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-2xl bg-white/5 border border-white/10" />
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>('inbox');
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all');
  const [markingAll, setMarkingAll] = useState(false);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('announcement');
  const [priority, setPriority] = useState('medium');
  const [targetClass, setTargetClass] = useState('all');
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('PwezaCore test');
  const [testMessage, setTestMessage] = useState('Hello from PwezaCore – test email.');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [waPhone, setWaPhone] = useState('');
  const [waMessage, setWaMessage] = useState('Hello from PwezaCore – test WhatsApp.');
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [processingLogs, setProcessingLogs] = useState(false);

  useEffect(() => {
    const id = 'pw-notif-center-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'notifications', user?.id ?? ''],
    queryFn: () => fetchNotificationsPage(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const { data: inboxItems = [], isLoading: inboxLoading, isFetching: inboxFetching } = useQuery({
    queryKey: user?.id ? INBOX_QUERY_KEY(user.id) : ['admin', 'notifications', 'inbox', ''],
    queryFn: () => fetchInAppNotificationsInbox(user!.id),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  const schoolId = data?.schoolId ?? null;
  const classes = data?.classes ?? [];
  const loadingToolsContext = isLoading;

  const refreshInbox = () => {
    if (user?.id) queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY(user.id) });
  };

  const markRead = async (id: string) => {
    const readAt = new Date().toISOString();
    const { error } = await supabase.from('user_in_app_notifications').update({ read_at: readAt }).eq('id', id);
    if (!error) {
      queryClient.setQueryData<InAppNotificationRow[]>(INBOX_QUERY_KEY(user!.id), (prev) =>
        (prev || []).map((n) => (n.id === id ? { ...n, read_at: readAt } : n))
      );
    }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    setMarkingAll(true);
    try {
      const readAt = new Date().toISOString();
      const { error } = await supabase
        .from('user_in_app_notifications')
        .update({ read_at: readAt })
        .eq('user_id', user.id)
        .is('read_at', null);
      if (!error) refreshInbox();
    } finally {
      setMarkingAll(false);
    }
  };

  const unread = inboxItems.filter((n) => !n.read_at);
  const readList = inboxItems.filter((n) => n.read_at);
  const showUnreadBlock = inboxFilter === 'all' || inboxFilter === 'unread';
  const showReadBlock = inboxFilter === 'all' || inboxFilter === 'read';

  const sendAnnouncement = async () => {
    if (!schoolId || !title || !message) {
      alert('Please fill in title and message');
      return;
    }
    setSending(true);
    try {
      let studentsQuery = supabase
        .from('students')
        .select('student_id')
        .eq('school_id', schoolId)
        .eq('status', 'active');
      if (targetClass !== 'all') studentsQuery = studentsQuery.eq('current_class', targetClass);
      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;
      if (!students?.length) {
        alert('No students found for the selected criteria');
        setSending(false);
        return;
      }
      let successCount = 0;
      for (const student of students) {
        const { error } = await supabase.rpc('send_notification', {
          p_school_id: schoolId,
          p_student_id: student.student_id,
          p_category: category,
          p_title: title,
          p_message: message,
          p_priority: priority,
        });
        if (!error) successCount++;
      }
      alert(`Announcement queued. Sent to ${successCount} students.`);
      setTitle('');
      setMessage('');
      setCategory('announcement');
      setPriority('medium');
      setTargetClass('all');
    } catch (e) {
      console.error(e);
      alert('Error sending announcement. The send_notification RPC may not be set up.');
    } finally {
      setSending(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail.trim() || !testMessage.trim()) {
      setTestResult({ ok: false, message: 'Enter email address and message.' });
      return;
    }
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail.trim(),
          subject: testSubject.trim() || 'PwezaCore test',
          message: testMessage.trim(),
        }),
      });

      const raw = await res.text();
      let parsed: { success?: boolean; error?: string; id?: string } | null = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        // ignore non-JSON
      }

      if (!res.ok || !parsed?.success) {
        setTestResult({
          ok: false,
          message: parsed?.error || `Email test failed (${res.status}). ${raw ? `Server said: ${raw.slice(0, 120)}...` : ''}`,
        });
        return;
      }

      setTestResult({
        ok: true,
        message: parsed?.id
          ? `Sent. Resend id: ${parsed.id}. Check inbox and Resend → Logs.`
          : 'Sent. Check inbox and Resend → Logs.',
      });
    } catch (e) {
      setTestResult({ ok: false, message: String(e) });
    } finally {
      setTestSending(false);
    }
  };

  const sendTestWhatsApp = async () => {
    if (!waPhone.trim() || !waMessage.trim()) {
      setWaResult({ ok: false, message: 'Enter phone and message.' });
      return;
    }
    setWaSending(true);
    setWaResult(null);
    try {
      const res = await fetch('/api/notifications/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: waPhone.trim(), message: waMessage.trim() }),
      });
      const raw = await res.text();
      let parsed: { success?: boolean; error?: string; status?: string } | null = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        // ignore non-JSON
      }
      if (!res.ok || !parsed?.success) {
        setWaResult({
          ok: false,
          message: parsed?.error || `Request failed (${res.status}). ${raw ? raw.slice(0, 100) : ''}`,
        });
        return;
      }
      setWaResult({
        ok: true,
        message: `Accepted. Status: ${parsed.status || 'SENT'}. Uganda (+256) only.`,
      });
    } catch (e) {
      setWaResult({ ok: false, message: String(e) });
    } finally {
      setWaSending(false);
    }
  };

  const processPending = async () => {
    setProcessingLogs(true);
    try {
      const res = await fetch('/api/notifications/send', { method: 'POST' });
      const raw = await res.text();
      let parsed: { success?: boolean; sent?: number; failed?: number; error?: string } | null = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        // ignore non-JSON
      }
      if (!parsed) {
        alert(`Process failed (${res.status}). ${raw ? `Server said: ${raw.slice(0, 120)}...` : ''}`);
        return;
      }
      alert(parsed.success ? `Sent: ${parsed.sent}, Failed: ${parsed.failed}` : parsed.error || `Process failed (${res.status}).`);
    } catch (e) {
      alert(String(e));
    } finally {
      setProcessingLogs(false);
    }
  };

  if (loadingToolsContext && tab === 'tools') {
    return (
      <AdminPageWrapper>
        <div className="pw-notif-center flex min-h-[40vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-[#10d9a8]" />
        </div>
      </AdminPageWrapper>
    );
  }

  const inputClass =
    'ac-input w-full rounded-xl border px-3 py-2.5 text-sm ac-text-primary placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#10d9a8]/50';

  const tabSegmentBtn = (id: TabId, label: string, icon: ReactNode, desc: string) => (
    <button key={id} type="button" data-active={tab === id} onClick={() => setTab(id)} title={desc}>
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );

  const filterChip = (id: InboxFilter, label: string, count?: number) => (
    <button
      key={id}
      type="button"
      data-on={inboxFilter === id}
      className="pw-notif-chip"
      onClick={() => setInboxFilter(id)}
    >
      {label}
      {count != null ? <span className="tabular-nums opacity-80">({count})</span> : null}
    </button>
  );

  return (
    <AdminPageWrapper>
      <div className="pw-notif-center w-full max-w-7xl xl:max-w-[90rem] 2xl:max-w-[100rem] mx-auto space-y-6 sm:space-y-8 pb-8 sm:pb-12">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <h1 className="pw-notif-display text-3xl sm:text-4xl lg:text-5xl ac-text-primary tracking-tight shrink-0">
            Notification
          </h1>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end lg:gap-4 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 sm:px-4">
                <Bell className="h-4 w-4 text-[#10d9a8] shrink-0" aria-hidden />
                <div className="text-xs sm:text-sm">
                  <div className="tabular-nums font-bold ac-text-primary leading-tight">{unread.length} new</div>
                  <div className="ac-text-muted leading-tight">{inboxItems.length} total</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void refreshInbox()}
                disabled={inboxFetching}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-ac-text-primary hover:bg-white/10 disabled:opacity-50 touch-manipulation shrink-0"
                title="Refresh inbox"
              >
                <RefreshCw className={`h-4 w-4 ${inboxFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="pw-notif-segment w-full sm:max-w-md lg:w-[min(100%,20rem)] lg:shrink-0">
              {tabSegmentBtn('inbox', 'Inbox', <Inbox className="h-4 w-4 shrink-0 opacity-90" />, 'Inbox')}
              {tabSegmentBtn('tools', 'Broadcast', <Send className="h-4 w-4 shrink-0 opacity-90" />, 'Broadcast')}
            </div>
          </div>
        </header>

        {tab === 'inbox' && (
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-8 xl:gap-10 lg:items-start">
            <aside className="order-1 lg:order-2 lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-4 lg:self-start">
              <div className={`${adminCardClass} !rounded-[20px] border border-white/10 !p-4 sm:!p-5`}>
                <h2 className="text-sm font-semibold ac-text-primary sm:text-base mb-3">Filter</h2>
                <div className="flex flex-wrap gap-2">
                  {filterChip('all', 'All', inboxItems.length)}
                  {filterChip('unread', 'Unread', unread.length)}
                  {filterChip('read', 'Read', readList.length)}
                </div>
                {unread.length > 0 && inboxFilter !== 'read' && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => void markAllRead()}
                      disabled={markingAll}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#10d9a8]/35 bg-[#10d9a8]/10 px-4 py-2.5 text-sm font-semibold text-[#14f0bb] hover:bg-[#10d9a8]/18 disabled:opacity-50 touch-manipulation"
                    >
                      <CheckCheck className="h-4 w-4" />
                      {markingAll ? 'Marking…' : 'Mark all read'}
                    </button>
                  </div>
                )}
              </div>
            </aside>

            <div className="order-2 lg:order-1 lg:col-span-8 xl:col-span-9 min-w-0 space-y-6">
              {inboxLoading ? (
                <InboxSkeleton />
              ) : inboxItems.length === 0 ? (
                <div className={`${adminCardClass} !rounded-[20px] text-center py-14 sm:py-16 lg:py-20`}>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                    <Inbox className="h-8 w-8 ac-text-muted" />
                  </div>
                  <p className="pw-notif-display text-xl ac-text-primary mb-2">You&apos;re all caught up</p>
                  <p className="text-sm ac-text-secondary max-w-md mx-auto">When the school adds events or enrollments, they will show up here.</p>
                </div>
              ) : (
                <div className="space-y-8 sm:space-y-10">
                  {showUnreadBlock && (
                    <section aria-labelledby="notif-unread-heading">
                      <h2 id="notif-unread-heading" className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ac-text-muted sm:text-sm">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#10d9a8]/15">
                          <Bell className="h-3.5 w-3.5 text-[#10d9a8]" />
                        </span>
                        New for you
                        <span className="ml-1 rounded-full bg-[#10d9a8]/20 px-2 py-0.5 text-[11px] font-bold text-[#14f0bb] tabular-nums">
                          {unread.length}
                        </span>
                      </h2>
                      {unread.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-sm ac-text-muted">
                          No unread notifications.
                        </p>
                      ) : (
                        <ul className="space-y-3">
                          {unread.map((n) => (
                            <NotifListRow key={n.id} n={n} unread onMarkRead={() => void markRead(n.id)} />
                          ))}
                        </ul>
                      )}
                    </section>
                  )}

                  {showReadBlock && readList.length > 0 && (
                    <section aria-labelledby="notif-read-heading">
                      <h2 id="notif-read-heading" className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ac-text-muted sm:text-sm">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10">
                          <Check className="h-3.5 w-3.5 ac-text-secondary" />
                        </span>
                        Earlier
                        <span className="ml-1 text-[11px] font-normal opacity-70 tabular-nums">({readList.length})</span>
                      </h2>
                      <ul className="space-y-2.5">
                        {readList.map((n) => (
                          <NotifListRow key={n.id} n={n} unread={false} />
                        ))}
                      </ul>
                    </section>
                  )}

                  {showReadBlock && readList.length === 0 && inboxFilter === 'read' && (
                    <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm ac-text-muted">
                      Nothing in your read history yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'tools' && (
          <div className="space-y-4 sm:space-y-5">
            <div className={`${adminCardClass} !rounded-[20px] !p-4 sm:!p-5`}>
              <h2 className="text-sm font-semibold ac-text-primary mb-3 sm:text-base">Quick actions</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => void sendTestEmail()}
                  disabled={testSending}
                  className="flex items-center justify-center gap-2 rounded-xl border border-blue-500/50 bg-blue-600/90 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 touch-manipulation"
                >
                  <Mail className="h-4 w-4" />
                  Test email
                </button>
                <button
                  type="button"
                  onClick={() => void sendTestWhatsApp()}
                  disabled={waSending}
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-600/90 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 touch-manipulation"
                >
                  <MessageCircle className="h-4 w-4" />
                  Test WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => void processPending()}
                  disabled={processingLogs}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 py-3 text-sm font-semibold ac-text-primary hover:bg-white/[0.14] disabled:opacity-50 touch-manipulation"
                >
                  <RefreshCw className={`h-4 w-4 ${processingLogs ? 'animate-spin' : ''}`} />
                  Process queue
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2 xl:items-start">
            <details className={`${adminCardClass} pw-notif-details group !rounded-[20px] !p-0 overflow-hidden min-w-0`} open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5 sm:py-4 hover:bg-white/[0.03] touch-manipulation">
                <span className="flex items-center gap-3 font-semibold ac-text-primary">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                    <Mail className="h-5 w-5" />
                  </span>
                  Email test
                </span>
                <ChevronDown className="h-5 w-5 shrink-0 text-white/40 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-white/10 px-4 pb-5 pt-4 sm:px-5">
                <p className="text-xs ac-text-secondary">Resend with your verified domain. Set RESEND_API_KEY and RESEND_FROM on the server.</p>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => {
                    setTestEmail(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="recipient@example.com"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={testSubject}
                  onChange={(e) => {
                    setTestSubject(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="Subject (optional)"
                  className={inputClass}
                />
                <textarea
                  value={testMessage}
                  onChange={(e) => {
                    setTestMessage(e.target.value);
                    setTestResult(null);
                  }}
                  rows={3}
                  placeholder="Message"
                  className={inputClass + ' min-h-[80px] resize-y'}
                />
                {testResult ? (
                  <p className={testResult.ok ? 'text-sm text-emerald-400' : 'text-sm text-red-400'}>{testResult.message}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void sendTestEmail()}
                  disabled={testSending || !testEmail.trim() || !testMessage.trim()}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 sm:w-auto sm:px-6 touch-manipulation"
                >
                  {testSending ? 'Sending…' : 'Send test email'}
                </button>
              </div>
            </details>

            <details className={`${adminCardClass} pw-notif-details group !rounded-[20px] !p-0 overflow-hidden min-w-0`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5 sm:py-4 hover:bg-white/[0.03] touch-manipulation">
                <span className="flex items-center gap-3 font-semibold ac-text-primary">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  WhatsApp test
                </span>
                <ChevronDown className="h-5 w-5 shrink-0 text-white/40 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-white/10 px-4 pb-5 pt-4 sm:px-5">
                <p className="text-xs ac-text-secondary">Uganda (+256) only. Set AFRICASTALKING_WHATSAPP_NUMBER on the server.</p>
                <input
                  type="text"
                  value={waPhone}
                  onChange={(e) => {
                    setWaPhone(e.target.value);
                    setWaResult(null);
                  }}
                  placeholder="0712345678 or +256…"
                  className={inputClass}
                />
                <textarea
                  value={waMessage}
                  onChange={(e) => {
                    setWaMessage(e.target.value);
                    setWaResult(null);
                  }}
                  rows={3}
                  placeholder="Message"
                  className={inputClass + ' min-h-[80px] resize-y'}
                />
                {waResult ? (
                  <p className={waResult.ok ? 'text-sm text-emerald-400' : 'text-sm text-red-400'}>{waResult.message}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void sendTestWhatsApp()}
                  disabled={waSending || !waPhone.trim() || !waMessage.trim()}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 sm:w-auto sm:px-6 touch-manipulation"
                >
                  {waSending ? 'Sending…' : 'Send test WhatsApp'}
                </button>
              </div>
            </details>
            </div>

            <details className={`${adminCardClass} pw-notif-details group !rounded-[20px] !p-0 overflow-hidden`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5 sm:py-4 hover:bg-white/[0.03] touch-manipulation">
                <span className="flex items-center gap-3 font-semibold ac-text-primary min-w-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#10d9a8]/15 text-[#10d9a8]">
                    <Megaphone className="h-5 w-5" />
                  </span>
                  <span className="truncate">Broadcast announcement</span>
                </span>
                <ChevronDown className="h-5 w-5 shrink-0 text-white/40 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-4 border-t border-white/10 px-4 pb-5 pt-4 sm:px-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide ac-text-muted">Title</label>
                    <input
                      className={inputClass}
                      placeholder="Announcement title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide ac-text-muted">Category</label>
                    <select
                      className={inputClass}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="announcement">Announcement</option>
                      <option value="academic">Academic</option>
                      <option value="attendance">Attendance</option>
                      <option value="financial">Financial</option>
                      <option value="event">Event</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide ac-text-muted">Message</label>
                  <textarea
                    className={inputClass + ' min-h-[120px] resize-y'}
                    placeholder="Message content"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide ac-text-muted">Priority</label>
                    <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide ac-text-muted">Target class</label>
                    <select className={inputClass} value={targetClass} onChange={(e) => setTargetClass(e.target.value)}>
                      <option value="all">All classes</option>
                      {classes.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void sendAnnouncement()}
                  disabled={sending}
                  className="w-full rounded-xl border border-[#10d9a8]/40 bg-[#10d9a8] py-3 text-sm font-semibold text-slate-900 hover:bg-[#14f0bb] disabled:opacity-50 sm:w-auto sm:px-8 touch-manipulation"
                >
                  {sending ? 'Sending…' : 'Send announcement'}
                </button>
              </div>
            </details>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}