import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  CheckCheck,
  Inbox,
  Megaphone,
  RefreshCw,
  Send,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import '@/assets/pwezacore-students-scoped.css';
import './notificationsCenter.css';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

const STALE_TIME_MS = 5 * 60 * 1000;

const INBOX_QUERY_KEY = (userId: string) => ['admin', 'notifications', 'inbox', userId] as const;

export async function fetchNotificationsPage(userId: string): Promise<{ schoolId: string }> {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  return { schoolId: data?.school_id || '' };
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
type BroadcastType = 'finance' | 'general';
type Channel = 'sms' | 'whatsapp';

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
      )}
    </li>
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

  // Broadcast state
  const [broadcastType, setBroadcastType] = useState<BroadcastType>('finance');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [channels, setChannels] = useState<Set<Channel>>(new Set<Channel>(['sms']));
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    queued: number; sms: number; whatsapp: number; message?: string;
  } | null>(null);
  const [waRemaining, setWaRemaining] = useState(0);
  const [processingQueue, setProcessingQueue] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = 'pweza-students-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  // Auto-drain WhatsApp queue every 30 seconds when messages are pending
  useEffect(() => {
    if (!processingQueue || waRemaining <= 0) {
      setProcessingQueue(false);
      return;
    }
    pollTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/notifications/send', { method: 'POST' });
        if (res.ok) {
          const data = (await res.json()) as { whatsapp_remaining?: number; hasMore?: boolean };
          setWaRemaining(data.whatsapp_remaining ?? 0);
          if (!data.hasMore) setProcessingQueue(false);
        } else {
          setProcessingQueue(false);
        }
      } catch {
        setProcessingQueue(false);
      }
    }, 30_000);
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, [processingQueue, waRemaining]);

  const { isLoading: loadingToolsContext } = useQuery({
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

  const toggleChannel = (ch: Channel) => {
    setChannels((prev) => {
      const next = new Set(prev);
      next.has(ch) ? next.delete(ch) : next.add(ch);
      return next;
    });
  };

  const sendBroadcast = async () => {
    const selectedChannels = [...channels] as Channel[];
    if (!selectedChannels.length) { alert('Please select at least one channel (SMS or WhatsApp).'); return; }
    if (broadcastType === 'general' && !broadcastMessage.trim()) { alert('Please write a message for the announcement.'); return; }

    const channelLabel = selectedChannels.map((c) => c === 'sms' ? 'SMS' : 'WhatsApp').join(' and ');
    const typeLabel = broadcastType === 'finance' ? 'outstanding balance reminders' : 'this announcement';
    if (!confirm(`Send ${typeLabel} via ${channelLabel} to parents? This cannot be undone.`)) return;

    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          type: broadcastType,
          channels: selectedChannels,
          message: broadcastType === 'general' ? broadcastMessage.trim() : undefined,
        }),
      });
      const data = await res.json() as { success?: boolean; queued?: number; sms?: number; whatsapp?: number; message?: string; error?: string };
      if (!res.ok) { alert(data.error || 'Broadcast failed'); return; }

      setBroadcastResult({
        queued: data.queued ?? 0,
        sms: data.sms ?? 0,
        whatsapp: data.whatsapp ?? 0,
        message: data.message,
      });

      if ((data.queued ?? 0) > 0) {
        // Immediately trigger first batch of queue processing
        const sendRes = await fetch('/api/notifications/send', { method: 'POST' });
        if (sendRes.ok) {
          const sendData = await sendRes.json() as { whatsapp_remaining?: number; hasMore?: boolean };
          setWaRemaining(sendData.whatsapp_remaining ?? 0);
          if (sendData.hasMore) setProcessingQueue(true);
        }
      }

      if (broadcastType === 'general') setBroadcastMessage('');
    } finally {
      setBroadcasting(false);
    }
  };

  const unread = inboxItems.filter((n) => !n.read_at);
  const readList = inboxItems.filter((n) => n.read_at);
  const showUnreadBlock = inboxFilter === 'all' || inboxFilter === 'unread';
  const showReadBlock = inboxFilter === 'all' || inboxFilter === 'read';

  if (loadingToolsContext && tab === 'tools') {
    return (
      <AdminPageWrapper>
        <div className="pw-students print:bg-[#07090f]">
          <div className="page flex min-h-[40vh] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--teal)]" />
          </div>
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
      <div className="pw-students pw-notif-center print:bg-[#07090f]">
        <div className="page">
          <div className="page-header fade-up">
            <div className="page-title-block">
              <div className="page-eyebrow">Notification registry</div>
              <h1 className="page-title">Notifications</h1>
              <p className="page-sub">Manage school alerts, inbox, and parent contacts.</p>
            </div>
            <div className="page-actions print:hidden !flex-wrap gap-2 sm:gap-3">
              <div
                className="inline-flex items-center gap-2 px-3 py-2"
                style={{
                  borderRadius: 'var(--rs, 7px)',
                  border: '1px solid var(--border)',
                  background: 'var(--s1)',
                }}
              >
                <Bell className="h-4 w-4 shrink-0" style={{ color: 'var(--teal)' }} aria-hidden />
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--t1)' }}>
                  {unread.length === 0 ? 'No new' : `${unread.length} new`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void refreshInbox()}
                disabled={inboxFetching}
                className="btn btn-ghost !px-3 !min-w-[44px] min-h-[44px] justify-center"
                title="Refresh inbox"
              >
                <RefreshCw className={`h-4 w-4 ${inboxFetching ? 'animate-spin' : ''}`} />
              </button>
              <div className="pw-notif-segment w-full basis-full min-[900px]:basis-auto min-[900px]:w-[min(100%,20rem)] sm:max-w-md">
                {tabSegmentBtn('inbox', 'Inbox', <Inbox className="h-4 w-4 shrink-0 opacity-90" />, 'Inbox')}
                {tabSegmentBtn('tools', 'Broadcast', <Send className="h-4 w-4 shrink-0 opacity-90" />, 'Broadcast')}
              </div>
            </div>
          </div>

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
                    <p className="page-title mb-2" style={{ fontSize: '22px' }}>You&apos;re all caught up</p>
                    <p className="page-sub max-w-md mx-auto">When the school adds events or enrollments, they will show up here.</p>
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
            <div className="max-w-2xl space-y-4 sm:space-y-5">
              <div className={`${adminCardClass} !rounded-[20px] !p-0 overflow-hidden`}>
                <div className="flex items-center gap-3 px-4 py-4 sm:px-5 sm:py-4 border-b border-white/10">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#10d9a8]/15 text-[#10d9a8]">
                    <Megaphone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold ac-text-primary">Broadcast announcement</p>
                    <p className="text-xs ac-text-muted mt-0.5">Send SMS or WhatsApp messages directly to parents</p>
                  </div>
                </div>

                <div className="space-y-5 px-4 pb-6 pt-5 sm:px-5">
                  {/* Type selection */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide ac-text-muted">What to send</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(
                        [
                          {
                            id: 'finance' as BroadcastType,
                            title: 'Outstanding balance reminder',
                            desc: "Automatically notify parents whose children have unpaid fees, with each child's balance amount.",
                          },
                          {
                            id: 'general' as BroadcastType,
                            title: 'General announcement',
                            desc: 'Write your own message and send it to all parents in the school.',
                          },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setBroadcastType(opt.id)}
                          className={[
                            'rounded-xl border p-3 text-left transition-colors touch-manipulation',
                            broadcastType === opt.id
                              ? 'border-[#10d9a8]/60 bg-[#10d9a8]/10'
                              : 'border-white/10 bg-white/5 hover:bg-white/[0.08]',
                          ].join(' ')}
                        >
                          <span className="flex items-center gap-2 mb-1">
                            <span
                              className={[
                                'h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                                broadcastType === opt.id ? 'border-[#10d9a8]' : 'border-white/30',
                              ].join(' ')}
                            >
                              {broadcastType === opt.id && (
                                <span className="h-2 w-2 rounded-full bg-[#10d9a8]" />
                              )}
                            </span>
                            <span className="text-sm font-semibold ac-text-primary">{opt.title}</span>
                          </span>
                          <p className="text-xs ac-text-muted pl-6">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message — only for general */}
                  {broadcastType === 'general' && (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide ac-text-muted">
                        Message
                      </label>
                      <textarea
                        className={inputClass + ' min-h-[120px] resize-y'}
                        placeholder="Type your announcement here… e.g. School will be closed on Friday for a sports day."
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Channel selection */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide ac-text-muted">Send via</p>
                    <div className="flex flex-wrap gap-3">
                      {(['sms', 'whatsapp'] as Channel[]).map((ch) => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => toggleChannel(ch)}
                          className={[
                            'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors touch-manipulation',
                            channels.has(ch)
                              ? 'border-[#10d9a8]/60 bg-[#10d9a8]/10 text-[#14f0bb]'
                              : 'border-white/15 bg-white/5 ac-text-secondary hover:bg-white/[0.08]',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0',
                              channels.has(ch) ? 'border-[#10d9a8] bg-[#10d9a8]' : 'border-white/30',
                            ].join(' ')}
                          >
                            {channels.has(ch) && (
                              <Check className="h-2.5 w-2.5 text-slate-900" strokeWidth={3} />
                            )}
                          </span>
                          {ch === 'sms' ? 'SMS' : 'WhatsApp'}
                        </button>
                      ))}
                    </div>
                    {channels.has('whatsapp') && (
                      <p className="mt-2 text-[11px] ac-text-muted">
                        WhatsApp messages are sent in batches of 20 every 30 seconds to stay within rate limits. Large lists will complete automatically in the background.
                      </p>
                    )}
                  </div>

                  {/* Result / status */}
                  {broadcastResult && (
                    <div className="rounded-xl border border-[#10d9a8]/30 bg-[#10d9a8]/8 px-4 py-3 space-y-1">
                      {broadcastResult.message ? (
                        <p className="text-sm ac-text-secondary">{broadcastResult.message}</p>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-[#14f0bb]">
                            {broadcastResult.queued} message{broadcastResult.queued !== 1 ? 's' : ''} queued
                            {broadcastResult.sms > 0 && broadcastResult.whatsapp > 0
                              ? ` — ${broadcastResult.sms} SMS, ${broadcastResult.whatsapp} WhatsApp`
                              : broadcastResult.sms > 0 ? ` — ${broadcastResult.sms} SMS` : ` — ${broadcastResult.whatsapp} WhatsApp`}
                          </p>
                          {processingQueue && waRemaining > 0 && (
                            <p className="flex items-center gap-1.5 text-xs ac-text-muted">
                              <RefreshCw className="h-3 w-3 animate-spin shrink-0" />
                              Sending WhatsApp… {waRemaining} remaining (next batch in ~30 s)
                            </p>
                          )}
                          {!processingQueue && waRemaining === 0 && broadcastResult.whatsapp > 0 && (
                            <p className="text-xs text-[#10d9a8]">All WhatsApp messages delivered.</p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void sendBroadcast()}
                    disabled={broadcasting || channels.size === 0}
                    className="w-full rounded-xl border border-[#10d9a8]/40 bg-[#10d9a8] py-3 text-sm font-semibold text-slate-900 hover:bg-[#14f0bb] disabled:opacity-50 sm:w-auto sm:px-8 touch-manipulation"
                  >
                    {broadcasting ? 'Sending…' : 'Send broadcast'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminPageWrapper>
  );
}
